/**
 * @fileoverview XRNotify Webhook Service
 * Core webhook delivery and management logic.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/services/webhooks
 */

import { createModuleLogger } from '../../core/logger.js';
import { getConfig } from '../../core/config.js';
import { query, queryOne, queryAll, withTransaction, type PoolClient } from '../../core/db.js';
import { getRedis, publishMessage } from '../../core/redis.js';
import { deliverWebhook, type DeliveryResult } from '../../core/http.js';
import {
  recordWebhookDelivery,
  recordDeliveryLatency,
  recordDeliveryRetry,
  recordDeliveryDlq,
} from '../../core/metrics.js';
import { generateSignature, nowISO, uuid } from '@xrnotify/shared';
import type { XrplEvent, EventType } from '@xrnotify/shared';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('webhook-service');

/**
 * Webhook configuration from database
 */
export interface WebhookConfig {
  id: string;
  tenantId: string;
  url: string;
  secretHash: string;
  events: EventType[];
  filterAccounts: string[] | null;
  filterNetwork: string | null;
  filterMinXrpAmount: number | null;
  retryMaxAttempts: number;
  timeoutMs: number;
  active: boolean;
  consecutiveFailures: number;
}

/**
 * Delivery record
 */
export interface DeliveryRecord {
  id: string;
  webhookId: string;
  eventId: string;
  tenantId: string;
  eventType: EventType;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  attempt: number;
  maxAttempts: number;
  nextRetryAt: Date | null;
  responseStatus: number | null;
  durationMs: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  deliveredAt: Date | null;
  failedAt: Date | null;
}

/**
 * Event payload for webhook delivery
 */
export interface WebhookPayload {
  event_id: string;
  event_type: EventType;
  ledger_index: number;
  tx_hash: string;
  timestamp: string;
  network: string;
  account_context: string[];
  payload: Record<string, unknown>;
  result_code?: string;
}

/**
 * Queued delivery job
 */
export interface DeliveryJob {
  deliveryId: string;
  webhookId: string;
  eventId: string;
  attempt: number;
  scheduledAt: Date;
}

/**
 * Batch delivery options
 */
export interface BatchDeliveryOptions {
  maxConcurrent?: number;
  stopOnError?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const WEBHOOK_CHANNEL = 'webhooks';
const DELIVERY_QUEUE_KEY = 'queue:deliveries';
const RETRY_QUEUE_KEY = 'queue:retries';
const DLQ_KEY = 'queue:dlq';

/**
 * Exponential backoff intervals (in milliseconds)
 */
const RETRY_INTERVALS = [
  1000,      // 1 second
  5000,      // 5 seconds
  30000,     // 30 seconds
  60000,     // 1 minute
  300000,    // 5 minutes
];

// =============================================================================
// Webhook Matching
// =============================================================================

/**
 * Find webhooks matching an event
 */
export async function findMatchingWebhooks(
  event: XrplEvent
): Promise<WebhookConfig[]> {
  const rows = await queryAll<{
    id: string;
    tenant_id: string;
    url: string;
    secret_hash: string;
    events: EventType[];
    filter_accounts: string[] | null;
    filter_network: string | null;
    filter_min_xrp_amount: string | null;
    retry_max_attempts: number;
    timeout_ms: number;
    active: boolean;
    consecutive_failures: number;
  }>(
    `SELECT 
      w.id, w.tenant_id, w.url, w.secret_hash,
      w.events, w.filter_accounts, w.filter_network, w.filter_min_xrp_amount,
      w.retry_max_attempts, w.timeout_ms, w.active, w.consecutive_failures
    FROM webhooks w
    INNER JOIN webhook_event_subscriptions wes ON wes.webhook_id = w.id
    WHERE 
      w.active = TRUE
      AND wes.event_type = $1
      AND (w.filter_network IS NULL OR w.filter_network = $2)
      AND (w.filter_accounts IS NULL OR w.filter_accounts && $3)
      AND w.consecutive_failures < 100`,
    [event.event_type, event.network, event.account_context]
  );

  // Apply additional filters that can't be done in SQL easily
  const webhooks: WebhookConfig[] = [];

  for (const row of rows) {
    // Check min XRP amount filter
    if (row.filter_min_xrp_amount !== null) {
      const minAmount = parseFloat(row.filter_min_xrp_amount);
      const eventAmount = extractXrpAmount(event);
      
      if (eventAmount === null || eventAmount < minAmount) {
        continue;
      }
    }

    webhooks.push({
      id: row.id,
      tenantId: row.tenant_id,
      url: row.url,
      secretHash: row.secret_hash,
      events: row.events,
      filterAccounts: row.filter_accounts,
      filterNetwork: row.filter_network,
      filterMinXrpAmount: row.filter_min_xrp_amount ? parseFloat(row.filter_min_xrp_amount) : null,
      retryMaxAttempts: row.retry_max_attempts,
      timeoutMs: row.timeout_ms,
      active: row.active,
      consecutiveFailures: row.consecutive_failures,
    });
  }

  return webhooks;
}

/**
 * Extract XRP amount from event payload
 */
function extractXrpAmount(event: XrplEvent): number | null {
  const payload = event.payload as Record<string, unknown>;

  // Common patterns for XRP amounts
  if ('Amount' in payload && typeof payload.Amount === 'string') {
    // XRP is in drops, convert to XRP
    return parseInt(payload.Amount, 10) / 1_000_000;
  }

  if ('amount' in payload) {
    const amount = payload.amount;
    if (typeof amount === 'string') {
      return parseInt(amount, 10) / 1_000_000;
    }
    if (typeof amount === 'number') {
      return amount;
    }
  }

  if ('delivered_amount' in payload && typeof payload.delivered_amount === 'string') {
    return parseInt(payload.delivered_amount, 10) / 1_000_000;
  }

  return null;
}

// =============================================================================
// Delivery Creation
// =============================================================================

/**
 * Create delivery records for an event
 */
export async function createDeliveries(
  event: XrplEvent,
  webhooks: WebhookConfig[]
): Promise<DeliveryRecord[]> {
  if (webhooks.length === 0) {
    return [];
  }

  const deliveries: DeliveryRecord[] = [];

  await withTransaction(async (client: PoolClient) => {
    for (const webhook of webhooks) {
      const deliveryId = uuid();
      const idempotencyKey = `${webhook.id}:${event.id}`;

      // Use ON CONFLICT to handle idempotency
      const result = await client.query<{
        id: string;
        webhook_id: string;
        event_id: string;
        tenant_id: string;
        event_type: EventType;
        status: string;
        attempt: number;
        max_attempts: number;
        next_retry_at: Date | null;
        created_at: Date;
      }>(
        `INSERT INTO deliveries (
          id, idempotency_key, webhook_id, event_id, tenant_id,
          event_type, status, attempt, max_attempts, request_url
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', 0, $7, $8)
        ON CONFLICT (idempotency_key) DO UPDATE SET id = deliveries.id
        RETURNING id, webhook_id, event_id, tenant_id, event_type,
                  status, attempt, max_attempts, next_retry_at, created_at`,
        [
          deliveryId,
          idempotencyKey,
          webhook.id,
          event.id,
          webhook.tenantId,
          event.event_type,
          webhook.retryMaxAttempts,
          webhook.url,
        ]
      );

      if (result.rows[0]) {
        const row = result.rows[0];
        deliveries.push({
          id: row.id,
          webhookId: row.webhook_id,
          eventId: row.event_id,
          tenantId: row.tenant_id,
          eventType: row.event_type,
          status: row.status as DeliveryRecord['status'],
          attempt: row.attempt,
          maxAttempts: row.max_attempts,
          nextRetryAt: row.next_retry_at,
          responseStatus: null,
          durationMs: null,
          errorCode: null,
          errorMessage: null,
          createdAt: row.created_at,
          deliveredAt: null,
          failedAt: null,
        });
      }
    }
  });

  logger.debug(
    { eventId: event.id, deliveryCount: deliveries.length },
    'Created delivery records'
  );

  return deliveries;
}

// =============================================================================
// Delivery Execution
// =============================================================================

/**
 * Build webhook payload from event
 */
export function buildWebhookPayload(event: XrplEvent): WebhookPayload {
  return {
    event_id: event.id,
    event_type: event.event_type,
    ledger_index: event.ledger_index,
    tx_hash: event.tx_hash,
    timestamp: event.timestamp,
    network: event.network,
    account_context: event.account_context,
    payload: event.payload,
    result_code: event.result_code,
  };
}

/**
 * Execute a single webhook delivery
 */
export async function executeDelivery(
  delivery: DeliveryRecord,
  webhook: WebhookConfig,
  event: XrplEvent,
  secret: string
): Promise<DeliveryResult> {
  const payload = buildWebhookPayload(event);
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = generateSignature(body, secret, timestamp);

  const result = await deliverWebhook({
    url: webhook.url,
    payload,
    signature,
    timestamp,
    timeoutMs: webhook.timeoutMs,
  });

  // Record metrics
  recordWebhookDelivery(result.success, delivery.eventType);
  if (result.durationMs) {
    recordDeliveryLatency(result.durationMs, delivery.eventType);
  }

  return result;
}

/**
 * Process delivery result and update database
 */
export async function processDeliveryResult(
  delivery: DeliveryRecord,
  result: DeliveryResult
): Promise<{
  status: 'delivered' | 'retrying' | 'failed';
  nextRetryAt: Date | null;
  movedToDlq: boolean;
}> {
  const newAttempt = delivery.attempt + 1;
  let status: 'delivered' | 'retrying' | 'failed';
  let nextRetryAt: Date | null = null;
  let movedToDlq = false;

  if (result.success) {
    status = 'delivered';
  } else if (newAttempt >= delivery.maxAttempts) {
    status = 'failed';
  } else {
    status = 'retrying';
    // Calculate next retry time with exponential backoff and jitter
    const baseInterval = RETRY_INTERVALS[Math.min(newAttempt - 1, RETRY_INTERVALS.length - 1)]!;
    const jitter = Math.random() * 0.25 * baseInterval;
    nextRetryAt = new Date(Date.now() + baseInterval + jitter);
  }

  // Record attempt in database
  await query(
    `SELECT record_delivery_attempt($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      delivery.id,
      newAttempt,
      result.success,
      result.statusCode ?? null,
      result.responseHeaders ? JSON.stringify(result.responseHeaders) : null,
      result.responseBody ?? null,
      result.durationMs ?? null,
      result.errorCode ?? null,
      result.error ?? null,
    ]
  );

  // If failed permanently, move to DLQ
  if (status === 'failed') {
    await moveToDlq(delivery);
    movedToDlq = true;
    recordDeliveryDlq(delivery.eventType);
  }

  // If retrying, record metric
  if (status === 'retrying') {
    recordDeliveryRetry(delivery.eventType);
  }

  logger.info(
    {
      deliveryId: delivery.id,
      webhookId: delivery.webhookId,
      eventId: delivery.eventId,
      attempt: newAttempt,
      status,
      durationMs: result.durationMs,
      statusCode: result.statusCode,
      errorCode: result.errorCode,
    },
    `Delivery ${status}`
  );

  return { status, nextRetryAt, movedToDlq };
}

/**
 * Move failed delivery to dead letter queue
 */
async function moveToDlq(delivery: DeliveryRecord): Promise<void> {
  await query('SELECT move_to_dlq($1)', [delivery.id]);

  logger.warn(
    { deliveryId: delivery.id, webhookId: delivery.webhookId, eventId: delivery.eventId },
    'Delivery moved to DLQ'
  );
}

// =============================================================================
// Queue Management
// =============================================================================

/**
 * Enqueue delivery for processing
 */
export async function enqueueDelivery(delivery: DeliveryRecord): Promise<void> {
  const redis = getRedis();

  const job: DeliveryJob = {
    deliveryId: delivery.id,
    webhookId: delivery.webhookId,
    eventId: delivery.eventId,
    attempt: delivery.attempt,
    scheduledAt: new Date(),
  };

  await redis.lpush(DELIVERY_QUEUE_KEY, JSON.stringify(job));

  logger.debug(
    { deliveryId: delivery.id, webhookId: delivery.webhookId },
    'Delivery enqueued'
  );
}

/**
 * Enqueue multiple deliveries
 */
export async function enqueueDeliveries(deliveries: DeliveryRecord[]): Promise<void> {
  if (deliveries.length === 0) {
    return;
  }

  const redis = getRedis();
  const jobs = deliveries.map((delivery) =>
    JSON.stringify({
      deliveryId: delivery.id,
      webhookId: delivery.webhookId,
      eventId: delivery.eventId,
      attempt: delivery.attempt,
      scheduledAt: new Date(),
    } as DeliveryJob)
  );

  await redis.lpush(DELIVERY_QUEUE_KEY, ...jobs);

  logger.debug(
    { count: deliveries.length },
    'Deliveries enqueued'
  );
}

/**
 * Dequeue delivery job for processing
 */
export async function dequeueDelivery(timeoutSeconds: number = 5): Promise<DeliveryJob | null> {
  const redis = getRedis();

  const result = await redis.brpop(DELIVERY_QUEUE_KEY, timeoutSeconds);

  if (!result) {
    return null;
  }

  try {
    return JSON.parse(result[1]) as DeliveryJob;
  } catch (error) {
    logger.error({ err: error, raw: result[1] }, 'Failed to parse delivery job');
    return null;
  }
}

/**
 * Schedule retry for a delivery
 */
export async function scheduleRetry(
  delivery: DeliveryRecord,
  retryAt: Date
): Promise<void> {
  const redis = getRedis();

  const job: DeliveryJob = {
    deliveryId: delivery.id,
    webhookId: delivery.webhookId,
    eventId: delivery.eventId,
    attempt: delivery.attempt + 1,
    scheduledAt: retryAt,
  };

  // Use sorted set with retry time as score
  await redis.zadd(RETRY_QUEUE_KEY, retryAt.getTime(), JSON.stringify(job));

  logger.debug(
    { deliveryId: delivery.id, retryAt: retryAt.toISOString() },
    'Retry scheduled'
  );
}

/**
 * Get due retries
 */
export async function getDueRetries(limit: number = 100): Promise<DeliveryJob[]> {
  const redis = getRedis();
  const now = Date.now();

  // Get jobs with score <= now
  const results = await redis.zrangebyscore(RETRY_QUEUE_KEY, '-inf', now, 'LIMIT', 0, limit);

  if (results.length === 0) {
    return [];
  }

  // Remove retrieved jobs
  await redis.zremrangebyscore(RETRY_QUEUE_KEY, '-inf', now);

  const jobs: DeliveryJob[] = [];
  for (const result of results) {
    try {
      jobs.push(JSON.parse(result) as DeliveryJob);
    } catch (error) {
      logger.error({ err: error, raw: result }, 'Failed to parse retry job');
    }
  }

  return jobs;
}

// =============================================================================
// Batch Processing
// =============================================================================

/**
 * Process event for all matching webhooks
 */
export async function processEvent(
  event: XrplEvent,
  options: BatchDeliveryOptions = {}
): Promise<{
  webhooksMatched: number;
  deliveriesCreated: number;
  deliveriesEnqueued: number;
}> {
  // Find matching webhooks
  const webhooks = await findMatchingWebhooks(event);

  if (webhooks.length === 0) {
    logger.debug({ eventId: event.id, eventType: event.event_type }, 'No matching webhooks');
    return { webhooksMatched: 0, deliveriesCreated: 0, deliveriesEnqueued: 0 };
  }

  // Create delivery records
  const deliveries = await createDeliveries(event, webhooks);

  // Enqueue for processing
  await enqueueDeliveries(deliveries);

  // Publish event notification
  await publishMessage(WEBHOOK_CHANNEL, JSON.stringify({
    type: 'event_processed',
    eventId: event.id,
    eventType: event.event_type,
    webhookCount: webhooks.length,
    deliveryCount: deliveries.length,
    timestamp: nowISO(),
  }));

  logger.info(
    {
      eventId: event.id,
      eventType: event.event_type,
      webhooksMatched: webhooks.length,
      deliveriesCreated: deliveries.length,
    },
    'Event processed for webhooks'
  );

  return {
    webhooksMatched: webhooks.length,
    deliveriesCreated: deliveries.length,
    deliveriesEnqueued: deliveries.length,
  };
}

/**
 * Get delivery with related data for processing
 */
export async function getDeliveryForProcessing(
  deliveryId: string
): Promise<{
  delivery: DeliveryRecord;
  webhook: WebhookConfig;
  event: XrplEvent;
} | null> {
  const row = await queryOne<{
    // Delivery fields
    d_id: string;
    d_webhook_id: string;
    d_event_id: string;
    d_tenant_id: string;
    d_event_type: EventType;
    d_status: string;
    d_attempt: number;
    d_max_attempts: number;
    d_next_retry_at: Date | null;
    d_response_status: number | null;
    d_duration_ms: number | null;
    d_error_code: string | null;
    d_error_message: string | null;
    d_created_at: Date;
    d_delivered_at: Date | null;
    d_failed_at: Date | null;
    // Webhook fields
    w_id: string;
    w_tenant_id: string;
    w_url: string;
    w_secret_hash: string;
    w_events: EventType[];
    w_filter_accounts: string[] | null;
    w_filter_network: string | null;
    w_filter_min_xrp_amount: string | null;
    w_retry_max_attempts: number;
    w_timeout_ms: number;
    w_active: boolean;
    w_consecutive_failures: number;
    // Event fields
    e_id: string;
    e_event_type: EventType;
    e_ledger_index: string;
    e_tx_hash: string;
    e_network: string;
    e_account_context: string[];
    e_payload: Record<string, unknown>;
    e_result_code: string | null;
    e_timestamp: Date;
  }>(
    `SELECT 
      d.id as d_id, d.webhook_id as d_webhook_id, d.event_id as d_event_id,
      d.tenant_id as d_tenant_id, d.event_type as d_event_type, d.status as d_status,
      d.attempt as d_attempt, d.max_attempts as d_max_attempts,
      d.next_retry_at as d_next_retry_at, d.response_status as d_response_status,
      d.duration_ms as d_duration_ms, d.error_code as d_error_code,
      d.error_message as d_error_message, d.created_at as d_created_at,
      d.delivered_at as d_delivered_at, d.failed_at as d_failed_at,
      w.id as w_id, w.tenant_id as w_tenant_id, w.url as w_url,
      w.secret_hash as w_secret_hash, w.events as w_events,
      w.filter_accounts as w_filter_accounts, w.filter_network as w_filter_network,
      w.filter_min_xrp_amount as w_filter_min_xrp_amount,
      w.retry_max_attempts as w_retry_max_attempts, w.timeout_ms as w_timeout_ms,
      w.active as w_active, w.consecutive_failures as w_consecutive_failures,
      e.id as e_id, e.event_type as e_event_type, e.ledger_index as e_ledger_index,
      e.tx_hash as e_tx_hash, e.network as e_network,
      e.account_context as e_account_context, e.payload as e_payload,
      e.result_code as e_result_code, e.created_at as e_timestamp
    FROM deliveries d
    JOIN webhooks w ON w.id = d.webhook_id
    JOIN events e ON e.id = d.event_id
    WHERE d.id = $1`,
    [deliveryId]
  );

  if (!row) {
    return null;
  }

  return {
    delivery: {
      id: row.d_id,
      webhookId: row.d_webhook_id,
      eventId: row.d_event_id,
      tenantId: row.d_tenant_id,
      eventType: row.d_event_type,
      status: row.d_status as DeliveryRecord['status'],
      attempt: row.d_attempt,
      maxAttempts: row.d_max_attempts,
      nextRetryAt: row.d_next_retry_at,
      responseStatus: row.d_response_status,
      durationMs: row.d_duration_ms,
      errorCode: row.d_error_code,
      errorMessage: row.d_error_message,
      createdAt: row.d_created_at,
      deliveredAt: row.d_delivered_at,
      failedAt: row.d_failed_at,
    },
    webhook: {
      id: row.w_id,
      tenantId: row.w_tenant_id,
      url: row.w_url,
      secretHash: row.w_secret_hash,
      events: row.w_events,
      filterAccounts: row.w_filter_accounts,
      filterNetwork: row.w_filter_network,
      filterMinXrpAmount: row.w_filter_min_xrp_amount
        ? parseFloat(row.w_filter_min_xrp_amount)
        : null,
      retryMaxAttempts: row.w_retry_max_attempts,
      timeoutMs: row.w_timeout_ms,
      active: row.w_active,
      consecutiveFailures: row.w_consecutive_failures,
    },
    event: {
      id: row.e_id,
      event_type: row.e_event_type,
      ledger_index: parseInt(row.e_ledger_index, 10),
      tx_hash: row.e_tx_hash,
      network: row.e_network as XrplEvent['network'],
      account_context: row.e_account_context,
      payload: row.e_payload,
      result_code: row.e_result_code ?? undefined,
      timestamp: row.e_timestamp.toISOString(),
    },
  };
}

// =============================================================================
// DLQ Management
// =============================================================================

/**
 * Requeue a delivery from DLQ
 */
export async function requeueFromDlq(dlqId: string): Promise<string | null> {
  const result = await queryOne<{ requeue_from_dlq: string | null }>(
    'SELECT requeue_from_dlq($1)',
    [dlqId]
  );

  const newDeliveryId = result?.requeue_from_dlq ?? null;

  if (newDeliveryId) {
    // Enqueue the new delivery
    const delivery = await queryOne<DeliveryRecord>(
      'SELECT * FROM deliveries WHERE id = $1',
      [newDeliveryId]
    );

    if (delivery) {
      await enqueueDelivery(delivery);
    }

    logger.info({ dlqId, newDeliveryId }, 'Requeued from DLQ');
  }

  return newDeliveryId;
}

/**
 * Get DLQ entries for a webhook
 */
export async function getDlqEntries(
  webhookId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{
  entries: Array<{
    id: string;
    deliveryId: string;
    eventId: string;
    eventType: EventType;
    finalStatus: number | null;
    finalErrorCode: string | null;
    finalErrorMessage: string | null;
    totalAttempts: number;
    dlqStatus: string;
    createdAt: Date;
    expiresAt: Date;
  }>;
  total: number;
}> {
  const countResult = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM delivery_dlq WHERE webhook_id = $1 AND dlq_status = $2',
    [webhookId, 'pending']
  );
  const total = parseInt(countResult?.count ?? '0', 10);

  const rows = await queryAll<{
    id: string;
    delivery_id: string;
    event_id: string;
    event_type: EventType;
    final_status: number | null;
    final_error_code: string | null;
    final_error_message: string | null;
    total_attempts: number;
    dlq_status: string;
    created_at: Date;
    expires_at: Date;
  }>(
    `SELECT * FROM delivery_dlq 
     WHERE webhook_id = $1 AND dlq_status = 'pending'
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [webhookId, limit, offset]
  );

  return {
    entries: rows.map((row) => ({
      id: row.id,
      deliveryId: row.delivery_id,
      eventId: row.event_id,
      eventType: row.event_type,
      finalStatus: row.final_status,
      finalErrorCode: row.final_error_code,
      finalErrorMessage: row.final_error_message,
      totalAttempts: row.total_attempts,
      dlqStatus: row.dlq_status,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    })),
    total,
  };
}

/**
 * Discard DLQ entry
 */
export async function discardDlqEntry(dlqId: string, reason: string): Promise<boolean> {
  const result = await query(
    `UPDATE delivery_dlq SET
      dlq_status = 'discarded',
      discarded_at = NOW(),
      discard_reason = $2
    WHERE id = $1 AND dlq_status = 'pending'`,
    [dlqId, reason]
  );

  return (result.rowCount ?? 0) > 0;
}

// =============================================================================
// Statistics
// =============================================================================

/**
 * Get webhook delivery statistics
 */
export async function getWebhookStats(
  webhookId: string,
  hours: number = 24
): Promise<{
  total: number;
  delivered: number;
  failed: number;
  retrying: number;
  pending: number;
  successRate: number;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
  p99LatencyMs: number | null;
}> {
  const row = await queryOne<{
    total: string;
    delivered: string;
    failed: string;
    retrying: string;
    pending: string;
    avg_latency: string | null;
    p95_latency: string | null;
    p99_latency: string | null;
  }>(
    `SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE status = 'retrying') as retrying,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as avg_latency,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) 
        FILTER (WHERE duration_ms IS NOT NULL) as p95_latency,
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) 
        FILTER (WHERE duration_ms IS NOT NULL) as p99_latency
    FROM deliveries
    WHERE webhook_id = $1 AND created_at > NOW() - $2 * INTERVAL '1 hour'`,
    [webhookId, hours]
  );

  if (!row) {
    return {
      total: 0,
      delivered: 0,
      failed: 0,
      retrying: 0,
      pending: 0,
      successRate: 100,
      avgLatencyMs: null,
      p95LatencyMs: null,
      p99LatencyMs: null,
    };
  }

  const total = parseInt(row.total, 10);
  const delivered = parseInt(row.delivered, 10);
  const failed = parseInt(row.failed, 10);

  return {
    total,
    delivered,
    failed: parseInt(row.failed, 10),
    retrying: parseInt(row.retrying, 10),
    pending: parseInt(row.pending, 10),
    successRate: total > 0 ? Math.round((delivered / (delivered + failed)) * 100 * 100) / 100 : 100,
    avgLatencyMs: row.avg_latency ? Math.round(parseFloat(row.avg_latency)) : null,
    p95LatencyMs: row.p95_latency ? Math.round(parseFloat(row.p95_latency)) : null,
    p99LatencyMs: row.p99_latency ? Math.round(parseFloat(row.p99_latency)) : null,
  };
}

// =============================================================================
// Export
// =============================================================================

export default {
  findMatchingWebhooks,
  createDeliveries,
  buildWebhookPayload,
  executeDelivery,
  processDeliveryResult,
  enqueueDelivery,
  enqueueDeliveries,
  dequeueDelivery,
  scheduleRetry,
  getDueRetries,
  processEvent,
  getDeliveryForProcessing,
  requeueFromDlq,
  getDlqEntries,
  discardDlqEntry,
  getWebhookStats,
};
