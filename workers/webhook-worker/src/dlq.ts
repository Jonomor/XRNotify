// =============================================================================
// XRNotify Webhook Worker - Dead Letter Queue (DLQ)
// =============================================================================
// Handles permanently failed deliveries for inspection, replay, and purging
// =============================================================================

import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface DlqConfig {
  /** Redis stream key for DLQ */
  streamKey: string;
  /** Maximum entries to retain */
  maxEntries: number;
  /** Retention period in milliseconds (0 = indefinite) */
  retentionMs: number;
}

export interface DlqEntry {
  /** Unique DLQ entry ID */
  dlqId: string;
  /** Original delivery ID */
  deliveryId: string;
  /** Webhook ID */
  webhookId: string;
  /** Tenant ID */
  tenantId: string;
  /** Event ID */
  eventId: string;
  /** Event type */
  eventType: string;
  /** Webhook URL */
  url: string;
  /** Number of delivery attempts made */
  attempts: number;
  /** Last error message */
  lastError: string;
  /** Last HTTP status code (0 if network error) */
  lastStatusCode: number;
  /** Serialized original payload */
  payload: string;
  /** Timestamp when first attempted */
  firstAttemptAt: string;
  /** Timestamp when added to DLQ */
  addedAt: string;
  /** Reason for DLQ */
  reason: DlqReason;
}

export type DlqReason = 
  | 'max_retries_exceeded'
  | 'webhook_disabled'
  | 'webhook_deleted'
  | 'tenant_suspended'
  | 'invalid_payload'
  | 'permanent_error';

export interface DlqStats {
  /** Total entries in DLQ */
  totalEntries: number;
  /** Entries by reason */
  byReason: Record<DlqReason, number>;
  /** Entries by webhook */
  byWebhook: Record<string, number>;
  /** Oldest entry timestamp */
  oldestEntry: string | null;
  /** Newest entry timestamp */
  newestEntry: string | null;
}

// -----------------------------------------------------------------------------
// Dead Letter Queue Class
// -----------------------------------------------------------------------------

export class DeadLetterQueue {
  private readonly redis: Redis;
  private readonly config: DlqConfig;
  private readonly logger: Logger;

  constructor(redis: Redis, config: DlqConfig, logger: Logger) {
    this.redis = redis;
    this.config = config;
    this.logger = logger.child({ component: 'dlq' });
  }

  // ---------------------------------------------------------------------------
  // Add Entry
  // ---------------------------------------------------------------------------

  async addEntry(entry: Omit<DlqEntry, 'dlqId' | 'addedAt'>): Promise<string> {
    const dlqId = `dlq_${randomUUID()}`;
    const addedAt = new Date().toISOString();

    const fullEntry: DlqEntry = {
      ...entry,
      dlqId,
      addedAt,
    };

    const log = this.logger.child({
      dlqId,
      deliveryId: entry.deliveryId,
      webhookId: entry.webhookId,
      eventId: entry.eventId,
      reason: entry.reason,
    });

    // Add to Redis stream
    await this.redis.xadd(
      this.config.streamKey,
      'MAXLEN', '~', this.config.maxEntries.toString(),
      '*',
      'dlq_id', dlqId,
      'delivery_id', entry.deliveryId,
      'webhook_id', entry.webhookId,
      'tenant_id', entry.tenantId,
      'event_id', entry.eventId,
      'event_type', entry.eventType,
      'url', entry.url,
      'attempts', entry.attempts.toString(),
      'last_error', entry.lastError,
      'last_status_code', entry.lastStatusCode.toString(),
      'payload', entry.payload,
      'first_attempt_at', entry.firstAttemptAt,
      'added_at', addedAt,
      'reason', entry.reason
    );

    log.info('Added entry to DLQ');

    return dlqId;
  }

  // ---------------------------------------------------------------------------
  // Fetch Entries
  // ---------------------------------------------------------------------------

  async fetchEntries(
    options: {
      limit?: number;
      webhookId?: string;
      tenantId?: string;
      reason?: DlqReason;
      startId?: string;
    } = {}
  ): Promise<{ entries: DlqEntry[]; nextId: string | null }> {
    const limit = options.limit ?? 100;
    const startId = options.startId ?? '-';

    // Read from stream
    const results = await this.redis.xrange(
      this.config.streamKey,
      startId === '-' ? '-' : `(${startId}`,
      '+',
      'COUNT',
      limit + 1 // Fetch one extra to check if there's more
    ) as [string, string[]][];

    const entries: DlqEntry[] = [];
    let nextId: string | null = null;

    for (let i = 0; i < results.length; i++) {
      if (i === limit) {
        // This is the extra entry - use its ID for pagination
        nextId = results[i]?.[0] ?? null;
        break;
      }

      const [messageId, fields] = results[i] ?? [];
      if (!messageId || !fields) continue;

      const entry = this.parseEntry(messageId, fields);
      if (!entry) continue;

      // Apply filters
      if (options.webhookId && entry.webhookId !== options.webhookId) continue;
      if (options.tenantId && entry.tenantId !== options.tenantId) continue;
      if (options.reason && entry.reason !== options.reason) continue;

      entries.push(entry);
    }

    return { entries, nextId };
  }

  private parseEntry(messageId: string, fields: string[]): DlqEntry | null {
    try {
      const data: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        const key = fields[i];
        const value = fields[i + 1];
        if (key !== undefined && value !== undefined) {
          data[key] = value;
        }
      }

      return {
        dlqId: data['dlq_id'] ?? messageId,
        deliveryId: data['delivery_id'] ?? '',
        webhookId: data['webhook_id'] ?? '',
        tenantId: data['tenant_id'] ?? '',
        eventId: data['event_id'] ?? '',
        eventType: data['event_type'] ?? '',
        url: data['url'] ?? '',
        attempts: parseInt(data['attempts'] ?? '0', 10),
        lastError: data['last_error'] ?? '',
        lastStatusCode: parseInt(data['last_status_code'] ?? '0', 10),
        payload: data['payload'] ?? '{}',
        firstAttemptAt: data['first_attempt_at'] ?? '',
        addedAt: data['added_at'] ?? '',
        reason: (data['reason'] ?? 'max_retries_exceeded') as DlqReason,
      };
    } catch (error) {
      this.logger.error({ error, messageId }, 'Failed to parse DLQ entry');
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Get Single Entry
  // ---------------------------------------------------------------------------

  async getEntry(dlqId: string): Promise<DlqEntry | null> {
    // Scan through entries to find by dlqId
    // This is not efficient but DLQ access should be infrequent
    let cursor = '-';
    
    while (true) {
      const results = await this.redis.xrange(
        this.config.streamKey,
        cursor === '-' ? '-' : `(${cursor}`,
        '+',
        'COUNT',
        100
      ) as [string, string[]][];

      if (results.length === 0) break;

      for (const [messageId, fields] of results) {
        const entry = this.parseEntry(messageId, fields);
        if (entry?.dlqId === dlqId) {
          return entry;
        }
        cursor = messageId;
      }
    }

    return null;
  }

  // ---------------------------------------------------------------------------
  // Remove Entry
  // ---------------------------------------------------------------------------

  async removeEntry(dlqId: string): Promise<boolean> {
    // Find and delete the entry
    let cursor = '-';
    
    while (true) {
      const results = await this.redis.xrange(
        this.config.streamKey,
        cursor === '-' ? '-' : `(${cursor}`,
        '+',
        'COUNT',
        100
      ) as [string, string[]][];

      if (results.length === 0) break;

      for (const [messageId, fields] of results) {
        const data: Record<string, string> = {};
        for (let i = 0; i < fields.length; i += 2) {
          const key = fields[i];
          const value = fields[i + 1];
          if (key !== undefined && value !== undefined) {
            data[key] = value;
          }
        }

        if (data['dlq_id'] === dlqId) {
          await this.redis.xdel(this.config.streamKey, messageId);
          this.logger.info({ dlqId, messageId }, 'Removed DLQ entry');
          return true;
        }
        cursor = messageId;
      }
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Purge Entries
  // ---------------------------------------------------------------------------

  async purgeByWebhook(webhookId: string): Promise<number> {
    return this.purgeByField('webhook_id', webhookId);
  }

  async purgeByTenant(tenantId: string): Promise<number> {
    return this.purgeByField('tenant_id', tenantId);
  }

  async purgeByReason(reason: DlqReason): Promise<number> {
    return this.purgeByField('reason', reason);
  }

  private async purgeByField(field: string, value: string): Promise<number> {
    const toDelete: string[] = [];
    let cursor = '-';

    while (true) {
      const results = await this.redis.xrange(
        this.config.streamKey,
        cursor === '-' ? '-' : `(${cursor}`,
        '+',
        'COUNT',
        100
      ) as [string, string[]][];

      if (results.length === 0) break;

      for (const [messageId, fields] of results) {
        const data: Record<string, string> = {};
        for (let i = 0; i < fields.length; i += 2) {
          const key = fields[i];
          const val = fields[i + 1];
          if (key !== undefined && val !== undefined) {
            data[key] = val;
          }
        }

        if (data[field] === value) {
          toDelete.push(messageId);
        }
        cursor = messageId;
      }
    }

    if (toDelete.length > 0) {
      await this.redis.xdel(this.config.streamKey, ...toDelete);
      this.logger.info({ field, value, count: toDelete.length }, 'Purged DLQ entries');
    }

    return toDelete.length;
  }

  async purgeOlderThan(timestampMs: number): Promise<number> {
    const cutoffDate = new Date(timestampMs).toISOString();
    const toDelete: string[] = [];
    let cursor = '-';

    while (true) {
      const results = await this.redis.xrange(
        this.config.streamKey,
        cursor === '-' ? '-' : `(${cursor}`,
        '+',
        'COUNT',
        100
      ) as [string, string[]][];

      if (results.length === 0) break;

      for (const [messageId, fields] of results) {
        const data: Record<string, string> = {};
        for (let i = 0; i < fields.length; i += 2) {
          const key = fields[i];
          const val = fields[i + 1];
          if (key !== undefined && val !== undefined) {
            data[key] = val;
          }
        }

        const addedAt = data['added_at'];
        if (addedAt && addedAt < cutoffDate) {
          toDelete.push(messageId);
        }
        cursor = messageId;
      }
    }

    if (toDelete.length > 0) {
      await this.redis.xdel(this.config.streamKey, ...toDelete);
      this.logger.info({ cutoffDate, count: toDelete.length }, 'Purged old DLQ entries');
    }

    return toDelete.length;
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  async getStats(): Promise<DlqStats> {
    const byReason: Record<DlqReason, number> = {
      max_retries_exceeded: 0,
      webhook_disabled: 0,
      webhook_deleted: 0,
      tenant_suspended: 0,
      invalid_payload: 0,
      permanent_error: 0,
    };
    const byWebhook: Record<string, number> = {};
    let oldestEntry: string | null = null;
    let newestEntry: string | null = null;
    let totalEntries = 0;

    let cursor = '-';

    while (true) {
      const results = await this.redis.xrange(
        this.config.streamKey,
        cursor === '-' ? '-' : `(${cursor}`,
        '+',
        'COUNT',
        100
      ) as [string, string[]][];

      if (results.length === 0) break;

      for (const [messageId, fields] of results) {
        totalEntries++;

        const data: Record<string, string> = {};
        for (let i = 0; i < fields.length; i += 2) {
          const key = fields[i];
          const val = fields[i + 1];
          if (key !== undefined && val !== undefined) {
            data[key] = val;
          }
        }

        const reason = (data['reason'] ?? 'max_retries_exceeded') as DlqReason;
        byReason[reason] = (byReason[reason] ?? 0) + 1;

        const webhookId = data['webhook_id'] ?? 'unknown';
        byWebhook[webhookId] = (byWebhook[webhookId] ?? 0) + 1;

        const addedAt = data['added_at'];
        if (addedAt) {
          if (!oldestEntry || addedAt < oldestEntry) {
            oldestEntry = addedAt;
          }
          if (!newestEntry || addedAt > newestEntry) {
            newestEntry = addedAt;
          }
        }

        cursor = messageId;
      }
    }

    return {
      totalEntries,
      byReason,
      byWebhook,
      oldestEntry,
      newestEntry,
    };
  }

  // ---------------------------------------------------------------------------
  // Clear All
  // ---------------------------------------------------------------------------

  async clearAll(): Promise<number> {
    const length = await this.redis.xlen(this.config.streamKey);
    await this.redis.del(this.config.streamKey);
    this.logger.warn({ count: length }, 'Cleared entire DLQ');
    return length;
  }
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

export const DEFAULT_DLQ_CONFIG: DlqConfig = {
  streamKey: 'xrnotify:dlq',
  maxEntries: 10000,
  retentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

export function createDeadLetterQueue(
  redis: Redis,
  config: Partial<DlqConfig> = {},
  logger: Logger
): DeadLetterQueue {
  const fullConfig: DlqConfig = {
    ...DEFAULT_DLQ_CONFIG,
    ...config,
  };

  return new DeadLetterQueue(redis, fullConfig, logger);
}
