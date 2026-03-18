// =============================================================================
// XRNotify Webhook Worker - Redis Streams Consumer
// =============================================================================
// Consumes events from Redis Streams using consumer groups for reliable delivery
// =============================================================================

import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
import type { XrplEvent } from '@xrnotify/shared';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ConsumerConfig {
  /** Redis stream key */
  streamKey: string;
  /** Consumer group name */
  groupName: string;
  /** Unique consumer name */
  consumerName: string;
  /** Block timeout in milliseconds (0 = indefinite) */
  blockMs: number;
  /** Number of events to read per batch */
  batchSize: number;
  /** Claim pending messages older than this (ms) */
  claimAfterMs: number;
  /** How often to check for pending messages (ms) */
  pendingCheckIntervalMs: number;
}

export interface StreamMessage {
  /** Redis stream message ID */
  messageId: string;
  /** Parsed event data */
  event: XrplEvent;
  /** Correlation ID for logging */
  correlationId: string;
}

export type MessageHandler = (message: StreamMessage) => Promise<void>;

// -----------------------------------------------------------------------------
// Consumer Class
// -----------------------------------------------------------------------------

export class StreamConsumer {
  private readonly redis: Redis;
  private readonly config: ConsumerConfig;
  private readonly logger: Logger;
  private readonly handler: MessageHandler;
  
  private isRunning = false;
  private pendingCheckTimer: NodeJS.Timeout | null = null;

  constructor(
    redis: Redis,
    config: ConsumerConfig,
    handler: MessageHandler,
    logger: Logger
  ) {
    this.redis = redis;
    this.config = config;
    this.handler = handler;
    this.logger = logger.child({ 
      component: 'consumer',
      consumerName: config.consumerName,
    });
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Consumer already running');
      return;
    }

    this.isRunning = true;
    this.logger.info({ config: this.config }, 'Starting consumer');

    // Ensure consumer group exists
    await this.ensureConsumerGroup();

    // Start pending message recovery
    this.startPendingCheck();

    // Start main consumption loop
    this.consumeLoop().catch((error) => {
      this.logger.error({ error }, 'Consumer loop crashed');
      this.isRunning = false;
    });
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping consumer');
    this.isRunning = false;

    if (this.pendingCheckTimer) {
      clearInterval(this.pendingCheckTimer);
      this.pendingCheckTimer = null;
    }

    // Give current processing time to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // ---------------------------------------------------------------------------
  // Consumer Group Management
  // ---------------------------------------------------------------------------

  private async ensureConsumerGroup(): Promise<void> {
    try {
      await this.redis.xgroup(
        'CREATE',
        this.config.streamKey,
        this.config.groupName,
        '0',
        'MKSTREAM'
      );
      this.logger.info('Created consumer group');
    } catch (error) {
      // Group already exists - this is fine
      if (error instanceof Error && error.message.includes('BUSYGROUP')) {
        this.logger.debug('Consumer group already exists');
      } else {
        throw error;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Main Consumption Loop
  // ---------------------------------------------------------------------------

  private async consumeLoop(): Promise<void> {
    this.logger.info('Starting consumption loop');

    while (this.isRunning) {
      try {
        const messages = await this.readMessages();

        if (messages.length === 0) {
          continue;
        }

        this.logger.debug({ count: messages.length }, 'Processing batch');

        for (const message of messages) {
          if (!this.isRunning) break;

          try {
            await this.handler(message);
            await this.acknowledgeMessage(message.messageId);
          } catch (error) {
            this.logger.error(
              { error, messageId: message.messageId, correlationId: message.correlationId },
              'Error processing message'
            );
            // Don't ack - message will be retried via pending recovery
          }
        }
      } catch (error) {
        this.logger.error({ error }, 'Error in consumption loop');
        // Back off on errors
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.logger.info('Consumption loop stopped');
  }

  // ---------------------------------------------------------------------------
  // Message Reading
  // ---------------------------------------------------------------------------

  private async readMessages(): Promise<StreamMessage[]> {
    // XREADGROUP GROUP <group> <consumer> [COUNT count] [BLOCK ms] STREAMS <key> >
    const result = await this.redis.xreadgroup(
      'GROUP',
      this.config.groupName,
      this.config.consumerName,
      'COUNT',
      this.config.batchSize,
      'BLOCK',
      this.config.blockMs,
      'STREAMS',
      this.config.streamKey,
      '>' // Only new messages
    ) as [string, [string, string[]][]][] | null;

    if (!result || result.length === 0) {
      return [];
    }

    const messages: StreamMessage[] = [];

    for (const [_streamKey, entries] of result) {
      for (const [messageId, fields] of entries) {
        const parsed = this.parseStreamEntry(messageId, fields);
        if (parsed) {
          messages.push(parsed);
        }
      }
    }

    return messages;
  }

  private parseStreamEntry(
    messageId: string,
    fields: string[]
  ): StreamMessage | null {
    try {
      // Fields come as [key1, value1, key2, value2, ...]
      const data: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        const key = fields[i];
        const value = fields[i + 1];
        if (key !== undefined && value !== undefined) {
          data[key] = value;
        }
      }

      const event: XrplEvent = {
        event_id: data['event_id'] ?? '',
        event_type: data['event_type'] as XrplEvent['event_type'],
        ledger_index: parseInt(data['ledger_index'] ?? '0', 10),
        tx_hash: data['tx_hash'] ?? '',
        timestamp: data['timestamp'] ?? new Date().toISOString(),
        accounts: JSON.parse(data['accounts'] ?? '[]') as string[],
        payload: JSON.parse(data['payload'] ?? '{}') as Record<string, unknown>,
      };

      return {
        messageId,
        event,
        correlationId: randomUUID(),
      };
    } catch (error) {
      this.logger.error({ error, messageId, fields }, 'Failed to parse stream entry');
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Acknowledgment
  // ---------------------------------------------------------------------------

  private async acknowledgeMessage(messageId: string): Promise<void> {
    await this.redis.xack(
      this.config.streamKey,
      this.config.groupName,
      messageId
    );
  }

  // ---------------------------------------------------------------------------
  // Pending Message Recovery
  // ---------------------------------------------------------------------------

  private startPendingCheck(): void {
    this.pendingCheckTimer = setInterval(
      () => this.recoverPendingMessages().catch(error => {
        this.logger.error({ error }, 'Error recovering pending messages');
      }),
      this.config.pendingCheckIntervalMs
    );
  }

  private async recoverPendingMessages(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Find messages that have been pending too long
      const pending = await this.redis.xpending(
        this.config.streamKey,
        this.config.groupName,
        '-',
        '+',
        100 // Max pending to check
      ) as [string, string, number, [string, number][]][];

      if (!pending || pending.length === 0) {
        return;
      }

      const now = Date.now();
      const claimIds: string[] = [];

      for (const entry of pending) {
        const [messageId, _consumer, idleTime] = entry as unknown as [string, string, number];
        
        if (idleTime > this.config.claimAfterMs) {
          claimIds.push(messageId);
        }
      }

      if (claimIds.length === 0) {
        return;
      }

      this.logger.info({ count: claimIds.length }, 'Claiming pending messages');

      // Claim the messages
      const claimed = await this.redis.xclaim(
        this.config.streamKey,
        this.config.groupName,
        this.config.consumerName,
        this.config.claimAfterMs,
        ...claimIds
      ) as [string, string[]][];

      // Process claimed messages
      for (const [messageId, fields] of claimed) {
        const parsed = this.parseStreamEntry(messageId, fields);
        if (parsed) {
          try {
            await this.handler(parsed);
            await this.acknowledgeMessage(messageId);
          } catch (error) {
            this.logger.error(
              { error, messageId, correlationId: parsed.correlationId },
              'Error processing claimed message'
            );
          }
        }
      }
    } catch (error) {
      this.logger.error({ error }, 'Error in pending message recovery');
    }
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  async getStats(): Promise<{
    streamLength: number;
    pendingCount: number;
    consumers: number;
  }> {
    const [streamLength, groupInfo] = await Promise.all([
      this.redis.xlen(this.config.streamKey),
      this.redis.xinfo('GROUPS', this.config.streamKey).catch(() => []),
    ]);

    let pendingCount = 0;
    let consumers = 0;

    if (Array.isArray(groupInfo)) {
      for (const group of groupInfo) {
        if (Array.isArray(group)) {
          const groupData = this.parseXInfoArray(group);
          if (groupData['name'] === this.config.groupName) {
            pendingCount = parseInt(groupData['pending'] ?? '0', 10);
            consumers = parseInt(groupData['consumers'] ?? '0', 10);
            break;
          }
        }
      }
    }

    return { streamLength, pendingCount, consumers };
  }

  private parseXInfoArray(arr: unknown[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (let i = 0; i < arr.length; i += 2) {
      const key = arr[i];
      const value = arr[i + 1];
      if (typeof key === 'string' && value !== undefined) {
        result[key] = String(value);
      }
    }
    return result;
  }
}

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

export function createConsumer(
  redis: Redis,
  config: Partial<ConsumerConfig> & Pick<ConsumerConfig, 'streamKey' | 'groupName' | 'consumerName'>,
  handler: MessageHandler,
  logger: Logger
): StreamConsumer {
  const fullConfig: ConsumerConfig = {
    streamKey: config.streamKey,
    groupName: config.groupName,
    consumerName: config.consumerName,
    blockMs: config.blockMs ?? 5000,
    batchSize: config.batchSize ?? 10,
    claimAfterMs: config.claimAfterMs ?? 60000, // 1 minute
    pendingCheckIntervalMs: config.pendingCheckIntervalMs ?? 30000, // 30 seconds
  };

  return new StreamConsumer(redis, fullConfig, handler, logger);
}
