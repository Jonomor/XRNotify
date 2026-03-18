// =============================================================================
// XRNotify Webhook Worker - Retry Module
// =============================================================================
// Handles retry scheduling with exponential backoff, jitter, and queue management
// =============================================================================

import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface RetryConfig {
  /** Base delay in milliseconds */
  baseDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Jitter factor (0-1, e.g., 0.25 = ±25%) */
  jitterFactor: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
}

export interface RetryableItem {
  /** Unique ID for this retry item */
  id: string;
  /** Delivery ID from original attempt */
  deliveryId: string;
  /** Webhook ID */
  webhookId: string;
  /** Event ID */
  eventId: string;
  /** Serialized payload */
  payload: string;
  /** Current attempt number (1-based) */
  attempt: number;
  /** Last error message */
  lastError: string;
  /** Timestamp of original delivery attempt */
  originalAttemptedAt: string;
  /** Timestamp when this retry was scheduled */
  scheduledAt: string;
}

export interface RetryQueueConfig {
  /** Redis sorted set key for retry queue */
  queueKey: string;
  /** Redis hash key for retry data */
  dataKey: string;
}

// -----------------------------------------------------------------------------
// Backoff Calculation
// -----------------------------------------------------------------------------

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig
): number {
  // Exponential backoff: baseDelay * (multiplier ^ (attempt - 1))
  const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  
  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  
  // Apply jitter: ±jitterFactor
  const jitterRange = cappedDelay * config.jitterFactor;
  const jitter = (Math.random() * 2 - 1) * jitterRange;
  
  // Ensure delay is at least baseDelayMs
  return Math.max(config.baseDelayMs, Math.round(cappedDelay + jitter));
}

/**
 * Get next retry timestamp
 */
export function getNextRetryTime(
  attempt: number,
  config: RetryConfig
): number {
  const delayMs = calculateBackoffDelay(attempt, config);
  return Date.now() + delayMs;
}

/**
 * Check if retry should be attempted
 */
export function shouldRetry(attempt: number, config: RetryConfig): boolean {
  return attempt < config.maxAttempts;
}

// -----------------------------------------------------------------------------
// Retry Queue Class
// -----------------------------------------------------------------------------

export class RetryQueue {
  private readonly redis: Redis;
  private readonly config: RetryConfig;
  private readonly queueConfig: RetryQueueConfig;
  private readonly logger: Logger;

  constructor(
    redis: Redis,
    config: RetryConfig,
    queueConfig: RetryQueueConfig,
    logger: Logger
  ) {
    this.redis = redis;
    this.config = config;
    this.queueConfig = queueConfig;
    this.logger = logger.child({ component: 'retry-queue' });
  }

  // ---------------------------------------------------------------------------
  // Queue Operations
  // ---------------------------------------------------------------------------

  /**
   * Schedule an item for retry
   */
  async scheduleRetry(item: Omit<RetryableItem, 'id' | 'scheduledAt'>): Promise<string | null> {
    if (!shouldRetry(item.attempt, this.config)) {
      this.logger.info(
        { deliveryId: item.deliveryId, attempt: item.attempt, maxAttempts: this.config.maxAttempts },
        'Max retry attempts reached'
      );
      return null;
    }

    const id = randomUUID();
    const scheduledAt = new Date().toISOString();
    const nextRetryTime = getNextRetryTime(item.attempt, this.config);

    const fullItem: RetryableItem = {
      ...item,
      id,
      scheduledAt,
    };

    const delayMs = nextRetryTime - Date.now();

    this.logger.info(
      { 
        id, 
        deliveryId: item.deliveryId, 
        attempt: item.attempt, 
        delayMs,
        nextRetryTime: new Date(nextRetryTime).toISOString(),
      },
      'Scheduling retry'
    );

    // Store item data
    await this.redis.hset(
      this.queueConfig.dataKey,
      id,
      JSON.stringify(fullItem)
    );

    // Add to sorted set with score = next retry timestamp
    await this.redis.zadd(
      this.queueConfig.queueKey,
      nextRetryTime,
      id
    );

    return id;
  }

  /**
   * Get items ready for retry (score <= now)
   */
  async getReadyItems(limit: number = 100): Promise<RetryableItem[]> {
    const now = Date.now();

    // Get IDs of items ready for retry
    const ids = await this.redis.zrangebyscore(
      this.queueConfig.queueKey,
      '-inf',
      now,
      'LIMIT',
      0,
      limit
    );

    if (ids.length === 0) {
      return [];
    }

    // Get item data
    const items: RetryableItem[] = [];

    for (const id of ids) {
      const data = await this.redis.hget(this.queueConfig.dataKey, id);
      if (data) {
        try {
          items.push(JSON.parse(data) as RetryableItem);
        } catch (error) {
          this.logger.error({ id, error }, 'Failed to parse retry item');
        }
      }
    }

    return items;
  }

  /**
   * Remove item from retry queue (after successful delivery or moving to DLQ)
   */
  async removeItem(id: string): Promise<void> {
    await Promise.all([
      this.redis.zrem(this.queueConfig.queueKey, id),
      this.redis.hdel(this.queueConfig.dataKey, id),
    ]);

    this.logger.debug({ id }, 'Removed item from retry queue');
  }

  /**
   * Get item by ID
   */
  async getItem(id: string): Promise<RetryableItem | null> {
    const data = await this.redis.hget(this.queueConfig.dataKey, id);
    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as RetryableItem;
    } catch {
      return null;
    }
  }

  /**
   * Update item (e.g., increment attempt, update error)
   */
  async updateItem(
    id: string,
    updates: Partial<Pick<RetryableItem, 'attempt' | 'lastError'>>
  ): Promise<void> {
    const item = await this.getItem(id);
    if (!item) {
      return;
    }

    const updatedItem: RetryableItem = {
      ...item,
      ...updates,
    };

    await this.redis.hset(
      this.queueConfig.dataKey,
      id,
      JSON.stringify(updatedItem)
    );
  }

  /**
   * Reschedule item for next retry
   */
  async rescheduleItem(id: string, newAttempt: number, lastError: string): Promise<boolean> {
    if (!shouldRetry(newAttempt, this.config)) {
      return false;
    }

    const item = await this.getItem(id);
    if (!item) {
      return false;
    }

    const nextRetryTime = getNextRetryTime(newAttempt, this.config);

    // Update item data
    const updatedItem: RetryableItem = {
      ...item,
      attempt: newAttempt,
      lastError,
      scheduledAt: new Date().toISOString(),
    };

    await this.redis.hset(
      this.queueConfig.dataKey,
      id,
      JSON.stringify(updatedItem)
    );

    // Update score in sorted set
    await this.redis.zadd(
      this.queueConfig.queueKey,
      nextRetryTime,
      id
    );

    this.logger.info(
      { id, attempt: newAttempt, nextRetryTime: new Date(nextRetryTime).toISOString() },
      'Rescheduled retry'
    );

    return true;
  }

  // ---------------------------------------------------------------------------
  // Queue Stats
  // ---------------------------------------------------------------------------

  async getStats(): Promise<{
    queueSize: number;
    readyCount: number;
    oldestItemAge: number | null;
  }> {
    const now = Date.now();

    const [queueSize, readyCount, oldest] = await Promise.all([
      this.redis.zcard(this.queueConfig.queueKey),
      this.redis.zcount(this.queueConfig.queueKey, '-inf', now),
      this.redis.zrange(this.queueConfig.queueKey, 0, 0, 'WITHSCORES'),
    ]);

    let oldestItemAge: number | null = null;
    if (oldest.length >= 2) {
      const oldestScore = parseInt(oldest[1] ?? '0', 10);
      oldestItemAge = now - oldestScore;
    }

    return {
      queueSize,
      readyCount,
      oldestItemAge,
    };
  }

  /**
   * Get items by webhook ID (for debugging)
   */
  async getItemsByWebhook(webhookId: string): Promise<RetryableItem[]> {
    const allData = await this.redis.hgetall(this.queueConfig.dataKey);
    const items: RetryableItem[] = [];

    for (const data of Object.values(allData)) {
      try {
        const item = JSON.parse(data) as RetryableItem;
        if (item.webhookId === webhookId) {
          items.push(item);
        }
      } catch {
        // Skip invalid items
      }
    }

    return items;
  }

  /**
   * Clear all items for a webhook (when webhook is deleted)
   */
  async clearWebhookItems(webhookId: string): Promise<number> {
    const items = await this.getItemsByWebhook(webhookId);
    
    for (const item of items) {
      await this.removeItem(item.id);
    }

    this.logger.info({ webhookId, count: items.length }, 'Cleared retry items for webhook');

    return items.length;
  }
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  baseDelayMs: 1000,        // 1 second
  maxDelayMs: 3600000,      // 1 hour
  maxAttempts: 10,          // 10 attempts total
  jitterFactor: 0.25,       // ±25%
  backoffMultiplier: 2,     // Double each time
};

export const DEFAULT_QUEUE_CONFIG: RetryQueueConfig = {
  queueKey: 'xrnotify:retry_queue',
  dataKey: 'xrnotify:retry_data',
};

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

export function createRetryQueue(
  redis: Redis,
  logger: Logger,
  retryConfig?: Partial<RetryConfig>,
  queueConfig?: Partial<RetryQueueConfig>
): RetryQueue {
  return new RetryQueue(
    redis,
    { ...DEFAULT_RETRY_CONFIG, ...retryConfig },
    { ...DEFAULT_QUEUE_CONFIG, ...queueConfig },
    logger
  );
}

// -----------------------------------------------------------------------------
// Retry Schedule Preview
// -----------------------------------------------------------------------------

/**
 * Preview the retry schedule for debugging/display
 */
export function previewRetrySchedule(config: RetryConfig = DEFAULT_RETRY_CONFIG): string[] {
  const schedule: string[] = [];

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    const minDelay = calculateBackoffDelay(attempt, { ...config, jitterFactor: 0 }) * (1 - config.jitterFactor);
    const maxDelay = calculateBackoffDelay(attempt, { ...config, jitterFactor: 0 }) * (1 + config.jitterFactor);

    const formatDuration = (ms: number): string => {
      if (ms < 1000) return `${ms}ms`;
      if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
      if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
      return `${(ms / 3600000).toFixed(1)}h`;
    };

    schedule.push(
      `Attempt ${attempt}: ${formatDuration(minDelay)} - ${formatDuration(maxDelay)}`
    );
  }

  return schedule;
}
