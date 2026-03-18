/**
 * @fileoverview XRNotify Delivery Worker Service
 * Consumer group loop for webhook delivery processing with graceful shutdown.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/worker
 */

import { EventEmitter } from 'node:events';
import { createModuleLogger } from '../core/logger.js';
import { getConfig } from '../core/config.js';
import { getRedis } from '../core/redis.js';
import { queryOne, query } from '../core/db.js';
import {
  recordWebhookDelivery,
  recordDeliveryLatency,
  recordDeliveryRetry,
} from '../core/metrics.js';
import {
  Streams,
  ConsumerGroups,
  StreamConfigs,
  initializeStream,
  generateConsumerName,
  type StreamName,
} from '../queue/streams.js';
import {
  deserializeDeliveryJob,
  deserializeRetryJob,
  scheduleRetry,
  type DeliveryJobPayload,
  type RetryJobPayload,
} from '../queue/publish.js';
import {
  executeDelivery,
  shouldRetry,
  type DeliveryRequest,
  type DeliveryResponse,
} from './delivery/httpDeliver.js';
import { buildWebhookHeaders } from './delivery/sign.js';
import {
  acquireDeliveryLock,
  releaseDeliveryLock,
  updateIdempotencyStatus,
  generateIdempotencyKey,
} from './delivery/idempotency.js';
import {
  makeRetryDecision,
  getRetryPolicyForWebhook,
} from './delivery/retryPolicy.js';
import { moveToDlq } from './delivery/dlq.js';
import type { DeliveryStatus } from './delivery/idempotency.js';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('worker');

/**
 * Worker configuration
 */
export interface WorkerConfig {
  /**
   * Worker ID (auto-generated if not provided)
   */
  workerId?: string;

  /**
   * Streams to consume from
   */
  streams?: StreamName[];

  /**
   * Number of concurrent delivery jobs
   */
  concurrency?: number;

  /**
   * Block timeout for XREADGROUP (ms)
   */
  blockTimeoutMs?: number;

  /**
   * Batch size for reading from streams
   */
  batchSize?: number;

  /**
   * Claim timeout for pending entries (ms)
   */
  claimTimeoutMs?: number;

  /**
   * How often to claim pending entries (ms)
   */
  claimIntervalMs?: number;

  /**
   * Graceful shutdown timeout (ms)
   */
  shutdownTimeoutMs?: number;

  /**
   * Health check interval (ms)
   */
  healthCheckIntervalMs?: number;
}

/**
 * Worker state
 */
export type WorkerState = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

/**
 * Worker statistics
 */
export interface WorkerStats {
  state: WorkerState;
  workerId: string;
  startedAt: Date | null;
  uptime: number;
  deliveriesProcessed: number;
  deliveriesSucceeded: number;
  deliveriesFailed: number;
  deliveriesRetried: number;
  deliveriesDlq: number;
  currentConcurrency: number;
  maxConcurrency: number;
  lastActivityAt: Date | null;
}

/**
 * Stream entry from XREADGROUP
 */
interface StreamEntry {
  id: string;
  fields: Record<string, string>;
}

/**
 * Webhook data from database
 */
interface WebhookData {
  id: string;
  tenantId: string;
  url: string;
  secret: string;
  active: boolean;
  retryMaxAttempts: number;
  timeoutMs: number;
  consecutiveFailures: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONCURRENCY = 10;
const DEFAULT_BLOCK_TIMEOUT = 5000;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_CLAIM_TIMEOUT = 60000;
const DEFAULT_CLAIM_INTERVAL = 30000;
const DEFAULT_SHUTDOWN_TIMEOUT = 30000;
const DEFAULT_HEALTH_CHECK_INTERVAL = 30000;

// =============================================================================
// Delivery Worker Service
// =============================================================================

/**
 * Delivery Worker Service
 *
 * Consumes webhook delivery jobs from Redis streams and executes them.
 */
export class DeliveryWorker extends EventEmitter {
  private config: Required<WorkerConfig>;
  private state: WorkerState = 'stopped';
  private isShuttingDown = false;

  // Consumer
  private consumerName: string;
  private activeJobs = new Set<string>();

  // Timers
  private claimTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;

  // Statistics
  private startedAt: Date | null = null;
  private lastActivityAt: Date | null = null;
  private deliveriesProcessed = 0;
  private deliveriesSucceeded = 0;
  private deliveriesFailed = 0;
  private deliveriesRetried = 0;
  private deliveriesDlq = 0;

  constructor(config: WorkerConfig = {}) {
    super();

    this.consumerName = config.workerId ?? generateConsumerName('delivery');

    this.config = {
      workerId: this.consumerName,
      streams: config.streams ?? [Streams.DELIVERIES, Streams.RETRIES],
      concurrency: config.concurrency ?? DEFAULT_CONCURRENCY,
      blockTimeoutMs: config.blockTimeoutMs ?? DEFAULT_BLOCK_TIMEOUT,
      batchSize: config.batchSize ?? DEFAULT_BATCH_SIZE,
      claimTimeoutMs: config.claimTimeoutMs ?? DEFAULT_CLAIM_TIMEOUT,
      claimIntervalMs: config.claimIntervalMs ?? DEFAULT_CLAIM_INTERVAL,
      shutdownTimeoutMs: config.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT,
      healthCheckIntervalMs: config.healthCheckIntervalMs ?? DEFAULT_HEALTH_CHECK_INTERVAL,
    };

    logger.info(
      {
        workerId: this.consumerName,
        concurrency: this.config.concurrency,
        streams: this.config.streams,
      },
      'Delivery worker initialized'
    );
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.state !== 'stopped') {
      logger.warn({ state: this.state }, 'Worker already running');
      return;
    }

    this.state = 'starting';
    this.isShuttingDown = false;
    this.startedAt = new Date();

    logger.info({ workerId: this.consumerName }, 'Starting delivery worker');

    try {
      // Initialize streams
      for (const stream of this.config.streams) {
        await initializeStream(stream);
      }

      // Start claim timer
      this.startClaimTimer();

      // Start health check timer
      this.startHealthCheckTimer();

      // Start consumer loop
      this.state = 'running';
      this.emit('started');

      // Run consumer loops
      this.runConsumerLoop();

      logger.info({ workerId: this.consumerName }, 'Delivery worker started');
    } catch (error) {
      this.state = 'error';
      logger.error({ err: error }, 'Failed to start worker');
      throw error;
    }
  }

  /**
   * Stop the worker gracefully
   */
  async stop(): Promise<void> {
    if (this.state === 'stopped' || this.state === 'stopping') {
      return;
    }

    logger.info({ workerId: this.consumerName }, 'Stopping delivery worker');

    this.state = 'stopping';
    this.isShuttingDown = true;

    // Stop timers
    this.stopClaimTimer();
    this.stopHealthCheckTimer();

    // Wait for active jobs to complete
    const startTime = Date.now();

    while (this.activeJobs.size > 0) {
      const elapsed = Date.now() - startTime;

      if (elapsed > this.config.shutdownTimeoutMs) {
        logger.warn(
          { activeJobs: this.activeJobs.size },
          'Shutdown timeout reached, forcing stop'
        );
        break;
      }

      logger.debug(
        { activeJobs: this.activeJobs.size, elapsed },
        'Waiting for active jobs to complete'
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    this.state = 'stopped';
    this.emit('stopped');

    logger.info(
      {
        workerId: this.consumerName,
        processed: this.deliveriesProcessed,
        succeeded: this.deliveriesSucceeded,
        failed: this.deliveriesFailed,
      },
      'Delivery worker stopped'
    );
  }

  /**
   * Get worker state
   */
  getState(): WorkerState {
    return this.state;
  }

  /**
   * Get worker statistics
   */
  getStats(): WorkerStats {
    return {
      state: this.state,
      workerId: this.consumerName,
      startedAt: this.startedAt,
      uptime: this.startedAt ? Date.now() - this.startedAt.getTime() : 0,
      deliveriesProcessed: this.deliveriesProcessed,
      deliveriesSucceeded: this.deliveriesSucceeded,
      deliveriesFailed: this.deliveriesFailed,
      deliveriesRetried: this.deliveriesRetried,
      deliveriesDlq: this.deliveriesDlq,
      currentConcurrency: this.activeJobs.size,
      maxConcurrency: this.config.concurrency,
      lastActivityAt: this.lastActivityAt,
    };
  }

  /**
   * Check if worker is healthy
   */
  isHealthy(): boolean {
    if (this.state !== 'running') {
      return false;
    }

    // Check for stalled worker
    if (this.lastActivityAt) {
      const idleTime = Date.now() - this.lastActivityAt.getTime();
      // Unhealthy if idle for more than 5 minutes
      if (idleTime > 5 * 60 * 1000) {
        return false;
      }
    }

    return true;
  }

  // ===========================================================================
  // Consumer Loop
  // ===========================================================================

  /**
   * Run the main consumer loop
   */
  private async runConsumerLoop(): Promise<void> {
    while (!this.isShuttingDown) {
      try {
        // Check concurrency limit
        if (this.activeJobs.size >= this.config.concurrency) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          continue;
        }

        // Read from streams
        const entries = await this.readFromStreams();

        if (entries.length === 0) {
          continue;
        }

        this.lastActivityAt = new Date();

        // Process entries
        for (const { stream, entry } of entries) {
          if (this.isShuttingDown) {
            break;
          }

          // Process asynchronously to maintain concurrency
          this.processEntry(stream, entry).catch((error) => {
            logger.error({ err: error, entryId: entry.id }, 'Error processing entry');
          });
        }
      } catch (error) {
        logger.error({ err: error }, 'Consumer loop error');

        if (!this.isShuttingDown) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }
  }

  /**
   * Read entries from streams using XREADGROUP
   */
  private async readFromStreams(): Promise<Array<{ stream: StreamName; entry: StreamEntry }>> {
    const redis = getRedis();
    const results: Array<{ stream: StreamName; entry: StreamEntry }> = [];

    try {
      // Build XREADGROUP arguments
      const streamArgs: string[] = [];
      const idArgs: string[] = [];

      for (const stream of this.config.streams) {
        const config = StreamConfigs[stream];
        streamArgs.push(stream);
        idArgs.push('>'); // Only new entries
      }

      // Execute XREADGROUP
      const response = await redis.xreadgroup(
        'GROUP',
        ConsumerGroups.DELIVERY_WORKERS,
        this.consumerName,
        'COUNT',
        this.config.batchSize,
        'BLOCK',
        this.config.blockTimeoutMs,
        'STREAMS',
        ...streamArgs,
        ...idArgs
      ) as Array<[string, Array<[string, string[]]>]> | null;

      if (!response) {
        return results;
      }

      // Parse response
      for (const [streamName, entries] of response) {
        for (const [id, fieldArray] of entries) {
          const fields: Record<string, string> = {};

          for (let i = 0; i < fieldArray.length; i += 2) {
            fields[fieldArray[i]!] = fieldArray[i + 1]!;
          }

          results.push({
            stream: streamName as StreamName,
            entry: { id, fields },
          });
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Error reading from streams');
    }

    return results;
  }

  /**
   * Process a single stream entry
   */
  private async processEntry(stream: StreamName, entry: StreamEntry): Promise<void> {
    const entryId = entry.id;

    // Track active job
    this.activeJobs.add(entryId);

    try {
      if (stream === Streams.DELIVERIES) {
        const job = deserializeDeliveryJob(entry.fields);
        await this.processDeliveryJob(job);
      } else if (stream === Streams.RETRIES) {
        const job = deserializeRetryJob(entry.fields);
        await this.processRetryJob(job);
      }

      // Acknowledge entry
      await this.acknowledgeEntry(stream, entryId);
    } catch (error) {
      logger.error(
        { err: error, stream, entryId },
        'Error processing entry'
      );

      // Don't acknowledge - will be reprocessed or claimed
    } finally {
      this.activeJobs.delete(entryId);
    }
  }

  /**
   * Acknowledge stream entry
   */
  private async acknowledgeEntry(stream: StreamName, entryId: string): Promise<void> {
    const redis = getRedis();

    try {
      await redis.xack(stream, ConsumerGroups.DELIVERY_WORKERS, entryId);
    } catch (error) {
      logger.error({ err: error, stream, entryId }, 'Error acknowledging entry');
    }
  }

  // ===========================================================================
  // Delivery Processing
  // ===========================================================================

  /**
   * Process delivery job
   */
  private async processDeliveryJob(job: DeliveryJobPayload): Promise<void> {
    const { deliveryId, webhookId, eventId, tenantId, eventType, attempt } = job;

    logger.debug(
      { deliveryId, webhookId, eventId, attempt },
      'Processing delivery job'
    );

    // Acquire lock
    const lock = await acquireDeliveryLock(deliveryId, this.consumerName);

    if (!lock.acquired) {
      logger.debug(
        { deliveryId, existingHolder: lock.existingLockHolder },
        'Delivery already locked'
      );
      return;
    }

    try {
      // Get webhook data
      const webhook = await this.getWebhook(webhookId);

      if (!webhook) {
        logger.warn({ webhookId }, 'Webhook not found');
        await this.updateDeliveryStatus(deliveryId, 'cancelled');
        return;
      }

      if (!webhook.active) {
        logger.warn({ webhookId }, 'Webhook not active');
        await this.updateDeliveryStatus(deliveryId, 'cancelled');
        return;
      }

      // Get event payload
      const event = await this.getEvent(eventId);

      if (!event) {
        logger.warn({ eventId }, 'Event not found');
        await this.updateDeliveryStatus(deliveryId, 'cancelled');
        return;
      }

      // Update status to processing
      await this.updateDeliveryStatus(deliveryId, 'processing');

      // Execute delivery
      const request: DeliveryRequest = {
        url: webhook.url,
        payload: event.payload,
        secret: webhook.secret,
        deliveryId,
        eventType,
        webhookId,
        tenantId,
        timeoutMs: webhook.timeoutMs,
        attempt,
      };

      const response = await executeDelivery(request);

      // Process result
      await this.processDeliveryResult(job, webhook, response);

      this.deliveriesProcessed++;
    } finally {
      await releaseDeliveryLock(deliveryId, lock.lockId!);
    }
  }

  /**
   * Process delivery result
   */
  private async processDeliveryResult(
    job: DeliveryJobPayload,
    webhook: WebhookData,
    response: DeliveryResponse
  ): Promise<void> {
    const { deliveryId, webhookId, eventId, tenantId, eventType, attempt, maxAttempts } = job;

    // Update delivery record
    await this.recordDeliveryAttempt(deliveryId, attempt, response);

    if (response.success) {
      // Success
      await this.updateDeliveryStatus(deliveryId, 'delivered');
      await this.updateWebhookSuccess(webhookId);

      // Update idempotency cache
      const idempotencyKey = generateIdempotencyKey({ webhookId, eventId });
      await updateIdempotencyStatus(idempotencyKey, deliveryId, 'delivered');

      this.deliveriesSucceeded++;

      logger.info(
        { deliveryId, webhookId, eventId, attempt, durationMs: response.durationMs },
        'Delivery succeeded'
      );

      return;
    }

    // Failure
    this.deliveriesFailed++;
    await this.updateWebhookFailure(webhookId);

    // Check if should retry
    const retryPolicy = getRetryPolicyForWebhook({
      retryMaxAttempts: Math.min(webhook.retryMaxAttempts, maxAttempts),
    });

    const decision = makeRetryDecision({
      currentAttempt: attempt,
      maxAttempts: retryPolicy.maxAttempts,
      errorCode: response.errorCode,
      statusCode: response.statusCode,
      config: retryPolicy,
    });

    if (decision.shouldRetry) {
      // Schedule retry
      await this.updateDeliveryStatus(deliveryId, 'retrying');

      await scheduleRetry({
        deliveryId,
        webhookId,
        eventId,
        attempt: decision.nextAttempt,
        maxAttempts: retryPolicy.maxAttempts,
        retryDelayMs: decision.delayMs,
        reason: response.error ?? 'Unknown error',
      });

      recordDeliveryRetry(eventType);
      this.deliveriesRetried++;

      logger.info(
        {
          deliveryId,
          webhookId,
          attempt,
          nextAttempt: decision.nextAttempt,
          retryIn: decision.delayHuman,
          error: response.error,
        },
        'Delivery scheduled for retry'
      );
    } else {
      // Move to DLQ
      await this.updateDeliveryStatus(deliveryId, 'dlq');

      // Get first attempt time
      const firstAttemptAt = await this.getFirstAttemptTime(deliveryId);

      await moveToDlq({
        deliveryId,
        webhookId,
        eventId,
        tenantId,
        eventType,
        url: webhook.url,
        payload: (await this.getEvent(eventId))?.payload ?? '',
        finalError: response.error ?? 'Unknown error',
        finalErrorCode: response.errorCode ?? undefined,
        finalStatusCode: response.statusCode ?? undefined,
        totalAttempts: attempt,
        firstAttemptAt: firstAttemptAt ?? new Date(),
        lastAttemptAt: new Date(),
      });

      this.deliveriesDlq++;

      logger.warn(
        {
          deliveryId,
          webhookId,
          eventId,
          totalAttempts: attempt,
          error: response.error,
        },
        'Delivery moved to DLQ'
      );
    }
  }

  /**
   * Process retry job
   */
  private async processRetryJob(job: RetryJobPayload): Promise<void> {
    const { deliveryId, webhookId, eventId, attempt, maxAttempts, retryAt, reason } = job;

    // Check if retry time has passed
    const retryTime = new Date(retryAt);

    if (retryTime > new Date()) {
      // Not ready yet - requeue
      const delayMs = retryTime.getTime() - Date.now();

      if (delayMs > 1000) {
        // Significant delay - put back in queue
        await scheduleRetry({
          deliveryId,
          webhookId,
          eventId,
          attempt,
          maxAttempts,
          retryDelayMs: delayMs,
          reason,
        });
        return;
      }

      // Small delay - wait
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    // Get delivery info
    const delivery = await this.getDelivery(deliveryId);

    if (!delivery) {
      logger.warn({ deliveryId }, 'Delivery not found for retry');
      return;
    }

    // Process as new delivery job
    await this.processDeliveryJob({
      deliveryId,
      webhookId,
      eventId,
      tenantId: delivery.tenantId,
      eventType: delivery.eventType,
      url: delivery.url,
      attempt,
      maxAttempts,
      timeoutMs: delivery.timeoutMs,
      scheduledAt: retryAt,
    });
  }

  // ===========================================================================
  // Claim Pending Entries
  // ===========================================================================

  /**
   * Start claim timer
   */
  private startClaimTimer(): void {
    this.stopClaimTimer();

    this.claimTimer = setInterval(async () => {
      await this.claimPendingEntries();
    }, this.config.claimIntervalMs);
  }

  /**
   * Stop claim timer
   */
  private stopClaimTimer(): void {
    if (this.claimTimer) {
      clearInterval(this.claimTimer);
      this.claimTimer = null;
    }
  }

  /**
   * Claim pending entries from other consumers
   */
  private async claimPendingEntries(): Promise<void> {
    const redis = getRedis();

    for (const stream of this.config.streams) {
      try {
        // Get pending entries
        const pending = await redis.xpending(
          stream,
          ConsumerGroups.DELIVERY_WORKERS,
          '-',
          '+',
          10
        ) as Array<[string, string, number, number]>;

        for (const [entryId, consumer, idleTime, deliveryCount] of pending) {
          // Skip if not idle long enough
          if (idleTime < this.config.claimTimeoutMs) {
            continue;
          }

          // Skip our own entries
          if (consumer === this.consumerName) {
            continue;
          }

          // Claim the entry
          try {
            const claimed = await redis.xclaim(
              stream,
              ConsumerGroups.DELIVERY_WORKERS,
              this.consumerName,
              this.config.claimTimeoutMs,
              entryId
            ) as Array<[string, string[]]>;

            if (claimed.length > 0) {
              logger.info(
                { stream, entryId, previousConsumer: consumer, idleTime },
                'Claimed pending entry'
              );

              // Process claimed entry
              const [id, fieldArray] = claimed[0]!;
              const fields: Record<string, string> = {};

              for (let i = 0; i < fieldArray.length; i += 2) {
                fields[fieldArray[i]!] = fieldArray[i + 1]!;
              }

              this.processEntry(stream, { id, fields }).catch((error) => {
                logger.error({ err: error, entryId }, 'Error processing claimed entry');
              });
            }
          } catch (claimError) {
            logger.error({ err: claimError, entryId }, 'Error claiming entry');
          }
        }
      } catch (error) {
        logger.error({ err: error, stream }, 'Error getting pending entries');
      }
    }
  }

  // ===========================================================================
  // Health Check
  // ===========================================================================

  /**
   * Start health check timer
   */
  private startHealthCheckTimer(): void {
    this.stopHealthCheckTimer();

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * Stop health check timer
   */
  private stopHealthCheckTimer(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    const stats = this.getStats();

    logger.debug(
      {
        workerId: this.consumerName,
        state: stats.state,
        processed: stats.deliveriesProcessed,
        succeeded: stats.deliveriesSucceeded,
        failed: stats.deliveriesFailed,
        currentConcurrency: stats.currentConcurrency,
      },
      'Worker health check'
    );

    this.emit('healthCheck', stats);
  }

  // ===========================================================================
  // Database Operations
  // ===========================================================================

  /**
   * Get webhook data
   */
  private async getWebhook(webhookId: string): Promise<WebhookData | null> {
    const row = await queryOne<{
      id: string;
      tenant_id: string;
      url: string;
      secret_hash: string;
      active: boolean;
      retry_max_attempts: number;
      timeout_ms: number;
      consecutive_failures: number;
    }>(
      `SELECT id, tenant_id, url, secret_hash, active, 
              retry_max_attempts, timeout_ms, consecutive_failures
       FROM webhooks WHERE id = $1`,
      [webhookId]
    );

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      tenantId: row.tenant_id,
      url: row.url,
      secret: row.secret_hash, // Note: This is the raw secret, not hash
      active: row.active,
      retryMaxAttempts: row.retry_max_attempts,
      timeoutMs: row.timeout_ms,
      consecutiveFailures: row.consecutive_failures,
    };
  }

  /**
   * Get event data
   */
  private async getEvent(eventId: string): Promise<{ payload: string } | null> {
    const row = await queryOne<{ payload: string }>(
      `SELECT payload::text FROM events WHERE id = $1`,
      [eventId]
    );

    return row;
  }

  /**
   * Get delivery data
   */
  private async getDelivery(deliveryId: string): Promise<{
    tenantId: string;
    eventType: string;
    url: string;
    timeoutMs: number;
  } | null> {
    const row = await queryOne<{
      tenant_id: string;
      event_type: string;
      url: string;
      timeout_ms: number;
    }>(
      `SELECT d.tenant_id, e.event_type, w.url, w.timeout_ms
       FROM deliveries d
       JOIN events e ON e.id = d.event_id
       JOIN webhooks w ON w.id = d.webhook_id
       WHERE d.id = $1`,
      [deliveryId]
    );

    if (!row) {
      return null;
    }

    return {
      tenantId: row.tenant_id,
      eventType: row.event_type,
      url: row.url,
      timeoutMs: row.timeout_ms,
    };
  }

  /**
   * Update delivery status
   */
  private async updateDeliveryStatus(
    deliveryId: string,
    status: DeliveryStatus
  ): Promise<void> {
    const column = status === 'delivered' ? 'delivered_at' : 'updated_at';

    await query(
      `UPDATE deliveries SET status = $2, ${column} = NOW() WHERE id = $1`,
      [deliveryId, status]
    );
  }

  /**
   * Record delivery attempt
   */
  private async recordDeliveryAttempt(
    deliveryId: string,
    attempt: number,
    response: DeliveryResponse
  ): Promise<void> {
    await query(
      `INSERT INTO delivery_attempts (
        id, delivery_id, attempt_number, status_code,
        response_body, response_headers, duration_ms,
        error_message, error_code, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
      )`,
      [
        `att_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        deliveryId,
        attempt,
        response.statusCode,
        response.responseBody?.substring(0, 4096) ?? null,
        JSON.stringify(response.responseHeaders),
        response.durationMs,
        response.error,
        response.errorCode,
      ]
    );

    // Update delivery record
    await query(
      `UPDATE deliveries SET
        last_attempt_at = NOW(),
        attempt_count = $2,
        last_status_code = $3,
        last_error = $4,
        last_duration_ms = $5
       WHERE id = $1`,
      [deliveryId, attempt, response.statusCode, response.error, response.durationMs]
    );
  }

  /**
   * Get first attempt time
   */
  private async getFirstAttemptTime(deliveryId: string): Promise<Date | null> {
    const row = await queryOne<{ created_at: Date }>(
      `SELECT created_at FROM delivery_attempts
       WHERE delivery_id = $1
       ORDER BY attempt_number ASC
       LIMIT 1`,
      [deliveryId]
    );

    return row?.created_at ?? null;
  }

  /**
   * Update webhook on success
   */
  private async updateWebhookSuccess(webhookId: string): Promise<void> {
    await query(
      `UPDATE webhooks SET
        consecutive_failures = 0,
        last_success_at = NOW(),
        successful_deliveries = successful_deliveries + 1,
        total_deliveries = total_deliveries + 1
       WHERE id = $1`,
      [webhookId]
    );
  }

  /**
   * Update webhook on failure
   */
  private async updateWebhookFailure(webhookId: string): Promise<void> {
    await query(
      `UPDATE webhooks SET
        consecutive_failures = consecutive_failures + 1,
        last_failure_at = NOW(),
        failed_deliveries = failed_deliveries + 1,
        total_deliveries = total_deliveries + 1
       WHERE id = $1`,
      [webhookId]
    );
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create and start delivery worker
 */
export async function startDeliveryWorker(
  config: WorkerConfig = {}
): Promise<DeliveryWorker> {
  const worker = new DeliveryWorker(config);
  await worker.start();
  return worker;
}

/**
 * Create multiple workers
 */
export async function startWorkerPool(
  count: number,
  config: WorkerConfig = {}
): Promise<DeliveryWorker[]> {
  const workers: DeliveryWorker[] = [];

  for (let i = 0; i < count; i++) {
    const worker = await startDeliveryWorker({
      ...config,
      workerId: `worker-${i + 1}`,
    });
    workers.push(worker);
  }

  return workers;
}

/**
 * Stop all workers
 */
export async function stopWorkerPool(workers: DeliveryWorker[]): Promise<void> {
  await Promise.all(workers.map((w) => w.stop()));
}

// =============================================================================
// Export
// =============================================================================

export default DeliveryWorker;
