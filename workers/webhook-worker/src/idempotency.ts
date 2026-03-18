// =============================================================================
// XRNotify Webhook Worker - Idempotency Module
// =============================================================================
// Ensures exactly-once delivery effect via (webhook_id, event_id) uniqueness
// =============================================================================

import { Redis } from 'ioredis';
import type { Pool } from 'pg';
import type { Logger } from 'pino';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface IdempotencyConfig {
  /** Redis key prefix for idempotency locks */
  redisKeyPrefix: string;
  /** Lock TTL in seconds */
  lockTtlSeconds: number;
  /** Cache TTL for completed deliveries in seconds */
  completedCacheTtlSeconds: number;
}

export interface IdempotencyKey {
  webhookId: string;
  eventId: string;
}

export type IdempotencyStatus = 
  | 'new'           // Never processed
  | 'in_progress'   // Currently being processed
  | 'completed'     // Successfully delivered
  | 'failed';       // Permanently failed (in DLQ)

export interface IdempotencyCheck {
  status: IdempotencyStatus;
  deliveryId?: string;
  completedAt?: string;
}

// -----------------------------------------------------------------------------
// Idempotency Manager Class
// -----------------------------------------------------------------------------

export class IdempotencyManager {
  private readonly redis: Redis;
  private readonly db: Pool;
  private readonly config: IdempotencyConfig;
  private readonly logger: Logger;

  constructor(
    redis: Redis,
    db: Pool,
    config: IdempotencyConfig,
    logger: Logger
  ) {
    this.redis = redis;
    this.db = db;
    this.config = config;
    this.logger = logger.child({ component: 'idempotency' });
  }

  // ---------------------------------------------------------------------------
  // Key Generation
  // ---------------------------------------------------------------------------

  private getLockKey(key: IdempotencyKey): string {
    return `${this.config.redisKeyPrefix}:lock:${key.webhookId}:${key.eventId}`;
  }

  private getCompletedKey(key: IdempotencyKey): string {
    return `${this.config.redisKeyPrefix}:done:${key.webhookId}:${key.eventId}`;
  }

  // ---------------------------------------------------------------------------
  // Check Status
  // ---------------------------------------------------------------------------

  async checkStatus(key: IdempotencyKey): Promise<IdempotencyCheck> {
    const log = this.logger.child({ 
      webhookId: key.webhookId, 
      eventId: key.eventId 
    });

    // 1. Check Redis cache for completed deliveries (fast path)
    const completedKey = this.getCompletedKey(key);
    const cached = await this.redis.get(completedKey);
    
    if (cached) {
      try {
        const data = JSON.parse(cached) as { deliveryId: string; completedAt: string };
        log.debug('Found completed delivery in cache');
        return {
          status: 'completed',
          deliveryId: data.deliveryId,
          completedAt: data.completedAt,
        };
      } catch {
        // Invalid cache entry, continue to DB check
      }
    }

    // 2. Check Redis for in-progress lock
    const lockKey = this.getLockKey(key);
    const lockValue = await this.redis.get(lockKey);
    
    if (lockValue) {
      log.debug('Found in-progress lock');
      return {
        status: 'in_progress',
        deliveryId: lockValue,
      };
    }

    // 3. Check database for historical delivery
    const dbResult = await this.db.query<{
      id: string;
      status: string;
      delivered_at: Date | null;
    }>(
      `SELECT id, status, delivered_at 
       FROM deliveries 
       WHERE webhook_id = $1 AND event_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [key.webhookId, key.eventId]
    );

    if (dbResult.rows.length > 0) {
      const row = dbResult.rows[0]!;
      
      if (row.status === 'delivered') {
        // Cache in Redis for future lookups
        await this.cacheCompleted(key, row.id, row.delivered_at?.toISOString() ?? new Date().toISOString());
        
        return {
          status: 'completed',
          deliveryId: row.id,
          completedAt: row.delivered_at?.toISOString(),
        };
      }

      if (row.status === 'failed') {
        return {
          status: 'failed',
          deliveryId: row.id,
        };
      }

      // Pending status - might be stale, treat as new
      log.debug('Found pending delivery in DB, treating as new');
    }

    return { status: 'new' };
  }

  // ---------------------------------------------------------------------------
  // Acquire Lock
  // ---------------------------------------------------------------------------

  async acquireLock(
    key: IdempotencyKey,
    deliveryId: string
  ): Promise<boolean> {
    const lockKey = this.getLockKey(key);
    
    // SET NX with expiry
    const result = await this.redis.set(
      lockKey,
      deliveryId,
      'EX',
      this.config.lockTtlSeconds,
      'NX'
    );

    const acquired = result === 'OK';

    this.logger.debug(
      { webhookId: key.webhookId, eventId: key.eventId, deliveryId, acquired },
      acquired ? 'Acquired idempotency lock' : 'Failed to acquire lock'
    );

    return acquired;
  }

  // ---------------------------------------------------------------------------
  // Release Lock
  // ---------------------------------------------------------------------------

  async releaseLock(key: IdempotencyKey, deliveryId: string): Promise<boolean> {
    const lockKey = this.getLockKey(key);

    // Only release if we own the lock (compare and delete)
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(script, 1, lockKey, deliveryId) as number;
    const released = result === 1;

    this.logger.debug(
      { webhookId: key.webhookId, eventId: key.eventId, deliveryId, released },
      'Released idempotency lock'
    );

    return released;
  }

  // ---------------------------------------------------------------------------
  // Mark Completed
  // ---------------------------------------------------------------------------

  async markCompleted(
    key: IdempotencyKey,
    deliveryId: string
  ): Promise<void> {
    // Release lock and cache completion
    await Promise.all([
      this.releaseLock(key, deliveryId),
      this.cacheCompleted(key, deliveryId, new Date().toISOString()),
    ]);

    this.logger.debug(
      { webhookId: key.webhookId, eventId: key.eventId, deliveryId },
      'Marked delivery as completed'
    );
  }

  private async cacheCompleted(
    key: IdempotencyKey,
    deliveryId: string,
    completedAt: string
  ): Promise<void> {
    const completedKey = this.getCompletedKey(key);
    const value = JSON.stringify({ deliveryId, completedAt });
    
    await this.redis.setex(
      completedKey,
      this.config.completedCacheTtlSeconds,
      value
    );
  }

  // ---------------------------------------------------------------------------
  // Mark Failed (Permanent)
  // ---------------------------------------------------------------------------

  async markFailed(key: IdempotencyKey, deliveryId: string): Promise<void> {
    // Just release the lock - don't cache failures
    await this.releaseLock(key, deliveryId);

    this.logger.debug(
      { webhookId: key.webhookId, eventId: key.eventId, deliveryId },
      'Marked delivery as failed'
    );
  }

  // ---------------------------------------------------------------------------
  // Extend Lock
  // ---------------------------------------------------------------------------

  async extendLock(
    key: IdempotencyKey,
    deliveryId: string,
    additionalSeconds?: number
  ): Promise<boolean> {
    const lockKey = this.getLockKey(key);
    const ttl = additionalSeconds ?? this.config.lockTtlSeconds;

    // Only extend if we own the lock
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("expire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    const result = await this.redis.eval(script, 1, lockKey, deliveryId, ttl) as number;
    return result === 1;
  }

  // ---------------------------------------------------------------------------
  // Batch Operations
  // ---------------------------------------------------------------------------

  async checkMultiple(keys: IdempotencyKey[]): Promise<Map<string, IdempotencyCheck>> {
    const results = new Map<string, IdempotencyCheck>();

    // Check all in parallel
    await Promise.all(
      keys.map(async (key) => {
        const mapKey = `${key.webhookId}:${key.eventId}`;
        const status = await this.checkStatus(key);
        results.set(mapKey, status);
      })
    );

    return results;
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  async cleanup(key: IdempotencyKey): Promise<void> {
    const lockKey = this.getLockKey(key);
    const completedKey = this.getCompletedKey(key);

    await this.redis.del(lockKey, completedKey);
  }
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

export const DEFAULT_IDEMPOTENCY_CONFIG: IdempotencyConfig = {
  redisKeyPrefix: 'xrnotify:idempotency',
  lockTtlSeconds: 300,           // 5 minutes
  completedCacheTtlSeconds: 86400, // 24 hours
};

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

export function createIdempotencyManager(
  redis: Redis,
  db: Pool,
  config: Partial<IdempotencyConfig> = {},
  logger: Logger
): IdempotencyManager {
  const fullConfig: IdempotencyConfig = {
    ...DEFAULT_IDEMPOTENCY_CONFIG,
    ...config,
  };

  return new IdempotencyManager(redis, db, fullConfig, logger);
}

// -----------------------------------------------------------------------------
// Idempotency Guard (Higher-Order Function)
// -----------------------------------------------------------------------------

export function withIdempotency<T>(
  manager: IdempotencyManager,
  key: IdempotencyKey,
  deliveryId: string,
  fn: () => Promise<T>,
  logger: Logger
): Promise<{ executed: boolean; result?: T; reason?: string }> {
  return (async () => {
    // Check current status
    const status = await manager.checkStatus(key);

    if (status.status === 'completed') {
      logger.debug({ key, status }, 'Skipping - already completed');
      return { 
        executed: false, 
        reason: `Already completed by delivery ${status.deliveryId}` 
      };
    }

    if (status.status === 'in_progress') {
      logger.debug({ key, status }, 'Skipping - in progress');
      return { 
        executed: false, 
        reason: `In progress by delivery ${status.deliveryId}` 
      };
    }

    // Acquire lock
    const acquired = await manager.acquireLock(key, deliveryId);
    if (!acquired) {
      return { 
        executed: false, 
        reason: 'Failed to acquire lock' 
      };
    }

    try {
      // Execute the function
      const result = await fn();
      
      // Mark completed
      await manager.markCompleted(key, deliveryId);
      
      return { executed: true, result };
    } catch (error) {
      // Release lock on error (don't mark completed)
      await manager.releaseLock(key, deliveryId);
      throw error;
    }
  })();
}
