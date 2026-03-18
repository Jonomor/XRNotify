// =============================================================================
// XRNotify Platform - Delivery Service
// =============================================================================
// Delivery creation, tracking, querying, replay, and idempotency
// =============================================================================

import type { 
  Delivery, 
  DeliveryStatus, 
  DeliveryErrorCode,
  XrplEvent,
  EventType,
} from '@xrnotify/shared';
import { generateDeliveryId, nowISO } from '@xrnotify/shared';
import { query, queryOne, queryAll, withTransaction } from '../db';
import { 
  streamAdd, 
  streamLen, 
  get, 
  set, 
  del,
  exists,
} from '../redis';
import { createModuleLogger } from '../logger';
import { 
  recordWebhookDelivery, 
  recordWebhookRetry, 
  recordWebhookDlq,
  setQueueDepth,
  setDlqDepth,
} from '../metrics';
import { getConfig, redisKey } from '../config';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface DeliveryFilter {
  tenantId: string;
  webhookId?: string;
  eventType?: EventType;
  status?: DeliveryStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface DeliveryAttempt {
  attempt_number: number;
  status_code: number | null;
  response_body: string | null;
  error_message: string | null;
  duration_ms: number;
  attempted_at: string;
}

export interface DeliveryWithAttempts extends Delivery {
  attempts: DeliveryAttempt[];
}

export interface CreateDeliveryInput {
  webhookId: string;
  tenantId: string;
  eventId: string;
  eventType: EventType;
  payload: Record<string, unknown>;
  url: string;
}

export interface RecordAttemptInput {
  deliveryId: string;
  attemptNumber: number;
  statusCode: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  durationMs: number;
  success: boolean;
}

export interface DeliveryStats {
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  retrying: number;
  successRate: number;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const DELIVERY_STREAM = 'stream:deliveries';
const DLQ_STREAM = 'stream:dlq';
const REPLAY_STREAM = 'stream:replay';
const IDEMPOTENCY_PREFIX = 'idempotency:';
const IDEMPOTENCY_TTL = 86400; // 24 hours

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = createModuleLogger('delivery-service');

// -----------------------------------------------------------------------------
// Create Delivery
// -----------------------------------------------------------------------------

/**
 * Create a new delivery and queue it
 */
export async function createDelivery(input: CreateDeliveryInput): Promise<Delivery> {
  const config = getConfig();
  const deliveryId = generateDeliveryId();

  // Check idempotency
  const idempotencyKey = `${IDEMPOTENCY_PREFIX}${input.webhookId}:${input.eventId}`;
  const existingDeliveryId = await get(idempotencyKey);
  
  if (existingDeliveryId) {
    logger.debug({ 
      webhookId: input.webhookId, 
      eventId: input.eventId,
      existingDeliveryId,
    }, 'Duplicate delivery detected, returning existing');
    
    const existing = await getDeliveryById(existingDeliveryId);
    if (existing) {
      return existing;
    }
    // If we can't find it, fall through and create a new one
  }

  // Create delivery record
  const delivery = await queryOne<Delivery>(`
    INSERT INTO deliveries (
      id,
      webhook_id,
      tenant_id,
      event_id,
      event_type,
      payload,
      url,
      status,
      attempt_count,
      max_attempts,
      next_retry_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    RETURNING *
  `, [
    deliveryId,
    input.webhookId,
    input.tenantId,
    input.eventId,
    input.eventType,
    JSON.stringify(input.payload),
    input.url,
    'pending',
    0,
    config.webhook.maxRetries,
  ]);

  if (!delivery) {
    throw new Error('Failed to create delivery');
  }

  // Set idempotency key
  await set(idempotencyKey, deliveryId, IDEMPOTENCY_TTL);

  // Add to delivery queue
  await queueDelivery(delivery);

  logger.info({ 
    deliveryId, 
    webhookId: input.webhookId, 
    eventId: input.eventId,
    eventType: input.eventType,
  }, 'Delivery created and queued');

  return formatDelivery(delivery);
}

/**
 * Create multiple deliveries for an event
 */
export async function createDeliveriesForEvent(
  event: XrplEvent<EventType, unknown>,
  webhooks: Array<{
    webhookId: string;
    tenantId: string;
    url: string;
  }>
): Promise<Delivery[]> {
  const deliveries: Delivery[] = [];

  for (const webhook of webhooks) {
    try {
      const delivery = await createDelivery({
        webhookId: webhook.webhookId,
        tenantId: webhook.tenantId,
        eventId: event.event_id,
        eventType: event.event_type,
        payload: event as unknown as Record<string, unknown>,
        url: webhook.url,
      });
      deliveries.push(delivery);
    } catch (error) {
      logger.error({ 
        error, 
        webhookId: webhook.webhookId, 
        eventId: event.event_id,
      }, 'Failed to create delivery');
    }
  }

  return deliveries;
}

// -----------------------------------------------------------------------------
// Queue Management
// -----------------------------------------------------------------------------

/**
 * Add delivery to the processing queue
 */
export async function queueDelivery(delivery: Delivery): Promise<string> {
  const messageId = await streamAdd(DELIVERY_STREAM, {
    delivery_id: delivery.id,
    webhook_id: delivery.webhook_id,
    tenant_id: delivery.tenant_id,
    event_id: delivery.event_id,
    event_type: delivery.event_type,
    attempt: String(delivery.attempt_count + 1),
    queued_at: nowISO(),
  });

  // Update queue depth metric
  const depth = await streamLen(DELIVERY_STREAM);
  setQueueDepth('deliveries', depth);

  return messageId;
}

/**
 * Add delivery to dead letter queue
 */
export async function moveToDeadLetterQueue(
  delivery: Delivery,
  reason: string
): Promise<void> {
  await streamAdd(DLQ_STREAM, {
    delivery_id: delivery.id,
    webhook_id: delivery.webhook_id,
    tenant_id: delivery.tenant_id,
    event_id: delivery.event_id,
    event_type: delivery.event_type,
    reason,
    moved_at: nowISO(),
  });

  // Update delivery status
  await updateDeliveryStatus(delivery.id, 'dead_letter', {
    error_code: 'MAX_RETRIES_EXCEEDED',
    error_message: reason,
  });

  // Update metrics
  recordWebhookDlq(delivery.event_type);
  const dlqDepth = await streamLen(DLQ_STREAM);
  setDlqDepth(dlqDepth);

  logger.warn({ 
    deliveryId: delivery.id, 
    webhookId: delivery.webhook_id,
    reason,
  }, 'Delivery moved to dead letter queue');
}

/**
 * Queue delivery for replay
 */
export async function queueForReplay(deliveryId: string): Promise<boolean> {
  const delivery = await getDeliveryById(deliveryId);
  
  if (!delivery) {
    return false;
  }

  // Reset status and attempt count
  await query(`
    UPDATE deliveries
    SET 
      status = 'pending',
      attempt_count = 0,
      error_code = NULL,
      error_message = NULL,
      next_retry_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `, [deliveryId]);

  // Add to replay queue
  await streamAdd(REPLAY_STREAM, {
    delivery_id: deliveryId,
    webhook_id: delivery.webhook_id,
    tenant_id: delivery.tenant_id,
    event_id: delivery.event_id,
    event_type: delivery.event_type,
    replay_requested_at: nowISO(),
  });

  logger.info({ deliveryId }, 'Delivery queued for replay');

  return true;
}

/**
 * Queue multiple deliveries for replay
 */
export async function queueBatchForReplay(
  tenantId: string,
  filter: {
    webhookId?: string;
    eventType?: EventType;
    status?: DeliveryStatus;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<number> {
  // Build query conditions
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let paramIndex = 2;

  if (filter.webhookId) {
    conditions.push(`webhook_id = $${paramIndex}`);
    params.push(filter.webhookId);
    paramIndex++;
  }

  if (filter.eventType) {
    conditions.push(`event_type = $${paramIndex}`);
    params.push(filter.eventType);
    paramIndex++;
  }

  if (filter.status) {
    conditions.push(`status = $${paramIndex}`);
    params.push(filter.status);
    paramIndex++;
  }

  if (filter.startDate) {
    conditions.push(`created_at >= $${paramIndex}`);
    params.push(filter.startDate);
    paramIndex++;
  }

  if (filter.endDate) {
    conditions.push(`created_at <= $${paramIndex}`);
    params.push(filter.endDate);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // Get deliveries to replay
  const deliveries = await queryAll<{ id: string }>(`
    SELECT id FROM deliveries
    WHERE ${whereClause}
    LIMIT 1000
  `, params);

  // Queue each delivery
  let count = 0;
  for (const delivery of deliveries) {
    const success = await queueForReplay(delivery.id);
    if (success) count++;
  }

  logger.info({ tenantId, filter, count }, 'Batch replay queued');

  return count;
}

// -----------------------------------------------------------------------------
// Record Attempts
// -----------------------------------------------------------------------------

/**
 * Record a delivery attempt
 */
export async function recordAttempt(input: RecordAttemptInput): Promise<void> {
  const { 
    deliveryId, 
    attemptNumber, 
    statusCode, 
    responseBody, 
    errorMessage, 
    durationMs,
    success,
  } = input;

  // Insert attempt record
  await query(`
    INSERT INTO delivery_attempts (
      delivery_id,
      attempt_number,
      status_code,
      response_body,
      error_message,
      duration_ms
    )
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    deliveryId,
    attemptNumber,
    statusCode,
    responseBody ? truncateResponse(responseBody) : null,
    errorMessage,
    durationMs,
  ]);

  // Get delivery for metrics
  const delivery = await getDeliveryById(deliveryId);
  
  if (delivery) {
    const status = success ? 'success' : 'failed';
    recordWebhookDelivery(
      { status, event_type: delivery.event_type },
      durationMs / 1000
    );

    if (!success) {
      recordWebhookRetry(delivery.event_type);
    }
  }

  logger.debug({ 
    deliveryId, 
    attemptNumber, 
    statusCode, 
    success,
    durationMs,
  }, 'Delivery attempt recorded');
}

/**
 * Update delivery status
 */
export async function updateDeliveryStatus(
  deliveryId: string,
  status: DeliveryStatus,
  options?: {
    error_code?: DeliveryErrorCode;
    error_message?: string;
    next_retry_at?: Date;
    increment_attempt?: boolean;
  }
): Promise<void> {
  const updates: string[] = [
    'status = $2',
    'updated_at = NOW()',
  ];
  const params: unknown[] = [deliveryId, status];
  let paramIndex = 3;

  if (options?.error_code) {
    updates.push(`error_code = $${paramIndex}`);
    params.push(options.error_code);
    paramIndex++;
  }

  if (options?.error_message) {
    updates.push(`error_message = $${paramIndex}`);
    params.push(options.error_message);
    paramIndex++;
  }

  if (options?.next_retry_at) {
    updates.push(`next_retry_at = $${paramIndex}`);
    params.push(options.next_retry_at);
    paramIndex++;
  }

  if (options?.increment_attempt) {
    updates.push('attempt_count = attempt_count + 1');
  }

  if (status === 'delivered') {
    updates.push('delivered_at = NOW()');
  }

  await query(`
    UPDATE deliveries
    SET ${updates.join(', ')}
    WHERE id = $1
  `, params);
}

// -----------------------------------------------------------------------------
// Query Deliveries
// -----------------------------------------------------------------------------

/**
 * Get delivery by ID
 */
export async function getDeliveryById(deliveryId: string): Promise<Delivery | null> {
  const delivery = await queryOne<Delivery>(`
    SELECT * FROM deliveries WHERE id = $1
  `, [deliveryId]);

  return delivery ? formatDelivery(delivery) : null;
}

/**
 * Get delivery with attempts
 */
export async function getDeliveryWithAttempts(
  deliveryId: string,
  tenantId: string
): Promise<DeliveryWithAttempts | null> {
  const delivery = await queryOne<Delivery>(`
    SELECT * FROM deliveries 
    WHERE id = $1 AND tenant_id = $2
  `, [deliveryId, tenantId]);

  if (!delivery) {
    return null;
  }

  const attempts = await queryAll<DeliveryAttempt>(`
    SELECT 
      attempt_number,
      status_code,
      response_body,
      error_message,
      duration_ms,
      attempted_at
    FROM delivery_attempts
    WHERE delivery_id = $1
    ORDER BY attempt_number ASC
  `, [deliveryId]);

  return {
    ...formatDelivery(delivery),
    attempts: attempts.map(formatAttempt),
  };
}

/**
 * List deliveries with filtering
 */
export async function listDeliveries(filter: DeliveryFilter): Promise<{
  deliveries: Delivery[];
  total: number;
}> {
  const { 
    tenantId, 
    webhookId, 
    eventType, 
    status, 
    startDate, 
    endDate,
    limit = 50, 
    offset = 0,
  } = filter;

  // Build query conditions
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let paramIndex = 2;

  if (webhookId) {
    conditions.push(`webhook_id = $${paramIndex}`);
    params.push(webhookId);
    paramIndex++;
  }

  if (eventType) {
    conditions.push(`event_type = $${paramIndex}`);
    params.push(eventType);
    paramIndex++;
  }

  if (status) {
    conditions.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (startDate) {
    conditions.push(`created_at >= $${paramIndex}`);
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    conditions.push(`created_at <= $${paramIndex}`);
    params.push(endDate);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = await queryOne<{ count: string }>(`
    SELECT COUNT(*) as count FROM deliveries WHERE ${whereClause}
  `, params);

  const total = parseInt(countResult?.count ?? '0', 10);

  // Get deliveries
  const deliveries = await queryAll<Delivery>(`
    SELECT * FROM deliveries
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, [...params, limit, offset]);

  return {
    deliveries: deliveries.map(formatDelivery),
    total,
  };
}

/**
 * Get pending deliveries for retry
 */
export async function getPendingRetries(limit: number = 100): Promise<Delivery[]> {
  const deliveries = await queryAll<Delivery>(`
    SELECT * FROM deliveries
    WHERE status IN ('pending', 'retrying')
      AND next_retry_at <= NOW()
      AND attempt_count < max_attempts
    ORDER BY next_retry_at ASC
    LIMIT $1
  `, [limit]);

  return deliveries.map(formatDelivery);
}

// -----------------------------------------------------------------------------
// Stats
// -----------------------------------------------------------------------------

/**
 * Get delivery stats for a tenant
 */
export async function getDeliveryStats(
  tenantId: string,
  startDate?: Date,
  endDate?: Date
): Promise<DeliveryStats> {
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let paramIndex = 2;

  if (startDate) {
    conditions.push(`created_at >= $${paramIndex}`);
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    conditions.push(`created_at <= $${paramIndex}`);
    params.push(endDate);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  const result = await queryOne<{
    total: string;
    delivered: string;
    failed: string;
    pending: string;
    retrying: string;
  }>(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE status IN ('failed', 'dead_letter')) as failed,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'retrying') as retrying
    FROM deliveries
    WHERE ${whereClause}
  `, params);

  const total = parseInt(result?.total ?? '0', 10);
  const delivered = parseInt(result?.delivered ?? '0', 10);
  const failed = parseInt(result?.failed ?? '0', 10);
  const pending = parseInt(result?.pending ?? '0', 10);
  const retrying = parseInt(result?.retrying ?? '0', 10);

  return {
    total,
    delivered,
    failed,
    pending,
    retrying,
    successRate: total > 0 ? (delivered / total) * 100 : 0,
  };
}

/**
 * Get delivery stats grouped by time
 */
export async function getDeliveryTimeSeries(
  tenantId: string,
  interval: 'hour' | 'day' | 'week',
  startDate: Date,
  endDate: Date
): Promise<Array<{
  timestamp: string;
  total: number;
  delivered: number;
  failed: number;
}>> {
  const intervalMap = {
    hour: '1 hour',
    day: '1 day',
    week: '1 week',
  };

  const result = await queryAll<{
    bucket: Date;
    total: string;
    delivered: string;
    failed: string;
  }>(`
    SELECT 
      date_trunc($1, created_at) as bucket,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      COUNT(*) FILTER (WHERE status IN ('failed', 'dead_letter')) as failed
    FROM deliveries
    WHERE tenant_id = $2
      AND created_at >= $3
      AND created_at <= $4
    GROUP BY bucket
    ORDER BY bucket ASC
  `, [interval, tenantId, startDate, endDate]);

  return result.map((row) => ({
    timestamp: row.bucket.toISOString(),
    total: parseInt(row.total, 10),
    delivered: parseInt(row.delivered, 10),
    failed: parseInt(row.failed, 10),
  }));
}

// -----------------------------------------------------------------------------
// Cleanup
// -----------------------------------------------------------------------------

/**
 * Delete old deliveries (retention policy)
 */
export async function cleanupOldDeliveries(
  retentionDays: number
): Promise<number> {
  const result = await query(`
    DELETE FROM deliveries
    WHERE created_at < NOW() - INTERVAL '1 day' * $1
  `, [retentionDays]);

  const deleted = result.rowCount ?? 0;
  
  if (deleted > 0) {
    logger.info({ deleted, retentionDays }, 'Old deliveries cleaned up');
  }

  return deleted;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Format delivery from database row
 */
function formatDelivery(row: Delivery): Delivery {
  return {
    id: row.id,
    webhook_id: row.webhook_id,
    tenant_id: row.tenant_id,
    event_id: row.event_id,
    event_type: row.event_type,
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    url: row.url,
    status: row.status,
    attempt_count: row.attempt_count,
    max_attempts: row.max_attempts,
    error_code: row.error_code ?? undefined,
    error_message: row.error_message ?? undefined,
    next_retry_at: row.next_retry_at ?? undefined,
    delivered_at: row.delivered_at ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Format attempt from database row
 */
function formatAttempt(row: DeliveryAttempt): DeliveryAttempt {
  return {
    attempt_number: row.attempt_number,
    status_code: row.status_code,
    response_body: row.response_body,
    error_message: row.error_message,
    duration_ms: row.duration_ms,
    attempted_at: row.attempted_at,
  };
}

/**
 * Truncate response body for storage
 */
function truncateResponse(body: string, maxLength: number = 10000): string {
  if (body.length <= maxLength) {
    return body;
  }
  return body.substring(0, maxLength) + '... [truncated]';
}
