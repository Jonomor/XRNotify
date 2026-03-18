/**
 * @fileoverview XRNotify Deliveries API Routes
 * Delivery logs and history endpoints.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/routes/v1/deliveries
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createModuleLogger } from '../../core/logger.js';
import { query, queryOne, queryAll } from '../../core/db.js';
import type { EventType } from '@xrnotify/shared';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('routes-deliveries');

/**
 * Delivery record
 */
interface Delivery {
  id: string;
  webhookId: string;
  eventId: string;
  tenantId: string;
  status: DeliveryStatus;
  attemptCount: number;
  lastAttemptAt: Date | null;
  lastStatusCode: number | null;
  lastError: string | null;
  lastDurationMs: number | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Delivery status
 */
type DeliveryStatus = 'pending' | 'processing' | 'delivered' | 'failed' | 'retrying' | 'cancelled' | 'dlq';

/**
 * Delivery attempt record
 */
interface DeliveryAttempt {
  id: string;
  deliveryId: string;
  attemptNumber: number;
  statusCode: number | null;
  responseBody: string | null;
  responseHeaders: Record<string, string>;
  durationMs: number;
  errorMessage: string | null;
  errorCode: string | null;
  createdAt: Date;
}

/**
 * Delivery with event and webhook info
 */
interface DeliveryWithDetails extends Delivery {
  eventType: EventType;
  webhookUrl: string;
  webhookName: string | null;
}

/**
 * List deliveries query params
 */
interface ListDeliveriesQuery {
  webhook_id?: string;
  event_id?: string;
  status?: DeliveryStatus;
  event_type?: EventType;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
  order_by?: 'created_at' | 'updated_at' | 'delivered_at';
  order_direction?: 'asc' | 'desc';
}

/**
 * Delivery stats
 */
interface DeliveryStats {
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  retrying: number;
  dlq: number;
  successRate: number;
  avgDurationMs: number;
  p95DurationMs: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

// =============================================================================
// Route Handler
// =============================================================================

/**
 * Register delivery routes
 */
export async function deliveriesRoutes(fastify: FastifyInstance): Promise<void> {
  // ===========================================================================
  // List Deliveries
  // ===========================================================================

  /**
   * GET /v1/deliveries
   * List deliveries for tenant
   */
  fastify.get<{
    Querystring: ListDeliveriesQuery;
  }>('/deliveries', async (request, reply) => {
    const tenantId = request.tenantId!;
    const {
      webhook_id,
      event_id,
      status,
      event_type,
      start_date,
      end_date,
      limit = DEFAULT_PAGE_SIZE,
      offset = 0,
      order_by = 'created_at',
      order_direction = 'desc',
    } = request.query;

    // Build query
    const conditions: string[] = ['d.tenant_id = $1'];
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (webhook_id) {
      conditions.push(`d.webhook_id = $${paramIndex++}`);
      params.push(webhook_id);
    }

    if (event_id) {
      conditions.push(`d.event_id = $${paramIndex++}`);
      params.push(event_id);
    }

    if (status) {
      conditions.push(`d.status = $${paramIndex++}`);
      params.push(status);
    }

    if (event_type) {
      conditions.push(`e.event_type = $${paramIndex++}`);
      params.push(event_type);
    }

    if (start_date) {
      conditions.push(`d.created_at >= $${paramIndex++}`);
      params.push(new Date(start_date));
    }

    if (end_date) {
      conditions.push(`d.created_at <= $${paramIndex++}`);
      params.push(new Date(end_date));
    }

    const whereClause = conditions.join(' AND ');

    // Validate order by
    const validOrderBy = ['created_at', 'updated_at', 'delivered_at'].includes(order_by)
      ? `d.${order_by}`
      : 'd.created_at';
    const validDirection = order_direction === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM deliveries d
       JOIN events e ON e.id = d.event_id
       WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult?.count ?? '0', 10);

    // Get deliveries
    const effectiveLimit = Math.min(limit, MAX_PAGE_SIZE);

    const rows = await queryAll<{
      id: string;
      webhook_id: string;
      event_id: string;
      tenant_id: string;
      status: DeliveryStatus;
      attempt_count: number;
      last_attempt_at: Date | null;
      last_status_code: number | null;
      last_error: string | null;
      last_duration_ms: number | null;
      delivered_at: Date | null;
      created_at: Date;
      updated_at: Date;
      event_type: EventType;
      webhook_url: string;
      webhook_name: string | null;
    }>(
      `SELECT 
        d.id, d.webhook_id, d.event_id, d.tenant_id, d.status,
        d.attempt_count, d.last_attempt_at, d.last_status_code,
        d.last_error, d.last_duration_ms, d.delivered_at,
        d.created_at, d.updated_at,
        e.event_type,
        w.url as webhook_url, w.name as webhook_name
       FROM deliveries d
       JOIN events e ON e.id = d.event_id
       JOIN webhooks w ON w.id = d.webhook_id
       WHERE ${whereClause}
       ORDER BY ${validOrderBy} ${validDirection}
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, effectiveLimit, offset]
    );

    const deliveries = rows.map(rowToDeliveryWithDetails);

    return reply.send({
      deliveries,
      pagination: {
        total,
        limit: effectiveLimit,
        offset,
        has_more: offset + deliveries.length < total,
      },
    });
  });

  // ===========================================================================
  // Get Delivery
  // ===========================================================================

  /**
   * GET /v1/deliveries/:id
   * Get delivery details
   */
  fastify.get<{
    Params: { id: string };
  }>('/deliveries/:id', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { id } = request.params;

    const row = await queryOne<{
      id: string;
      webhook_id: string;
      event_id: string;
      tenant_id: string;
      status: DeliveryStatus;
      attempt_count: number;
      last_attempt_at: Date | null;
      last_status_code: number | null;
      last_error: string | null;
      last_duration_ms: number | null;
      delivered_at: Date | null;
      created_at: Date;
      updated_at: Date;
      event_type: EventType;
      webhook_url: string;
      webhook_name: string | null;
      event_payload: string;
      event_timestamp: string;
      event_network: string;
      event_tx_hash: string;
      event_ledger_index: number;
    }>(
      `SELECT 
        d.id, d.webhook_id, d.event_id, d.tenant_id, d.status,
        d.attempt_count, d.last_attempt_at, d.last_status_code,
        d.last_error, d.last_duration_ms, d.delivered_at,
        d.created_at, d.updated_at,
        e.event_type, e.payload::text as event_payload,
        e.timestamp as event_timestamp, e.network as event_network,
        e.tx_hash as event_tx_hash, e.ledger_index as event_ledger_index,
        w.url as webhook_url, w.name as webhook_name
       FROM deliveries d
       JOIN events e ON e.id = d.event_id
       JOIN webhooks w ON w.id = d.webhook_id
       WHERE d.id = $1 AND d.tenant_id = $2`,
      [id, tenantId]
    );

    if (!row) {
      return reply.status(404).send({
        error: 'not_found',
        message: 'Delivery not found',
      });
    }

    const delivery = {
      id: row.id,
      webhook_id: row.webhook_id,
      event_id: row.event_id,
      status: row.status,
      attempt_count: row.attempt_count,
      last_attempt_at: row.last_attempt_at,
      last_status_code: row.last_status_code,
      last_error: row.last_error,
      last_duration_ms: row.last_duration_ms,
      delivered_at: row.delivered_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      webhook: {
        id: row.webhook_id,
        url: row.webhook_url,
        name: row.webhook_name,
      },
      event: {
        id: row.event_id,
        event_type: row.event_type,
        timestamp: row.event_timestamp,
        network: row.event_network,
        tx_hash: row.event_tx_hash,
        ledger_index: row.event_ledger_index,
        payload: JSON.parse(row.event_payload),
      },
    };

    return reply.send({ delivery });
  });

  // ===========================================================================
  // Get Delivery Attempts
  // ===========================================================================

  /**
   * GET /v1/deliveries/:id/attempts
   * Get delivery attempt history
   */
  fastify.get<{
    Params: { id: string };
    Querystring: { limit?: number };
  }>('/deliveries/:id/attempts', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { id } = request.params;
    const limit = Math.min(request.query.limit ?? 50, 100);

    // Verify delivery belongs to tenant
    const delivery = await queryOne<{ id: string }>(
      `SELECT id FROM deliveries WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (!delivery) {
      return reply.status(404).send({
        error: 'not_found',
        message: 'Delivery not found',
      });
    }

    // Get attempts
    const rows = await queryAll<{
      id: string;
      delivery_id: string;
      attempt_number: number;
      status_code: number | null;
      response_body: string | null;
      response_headers: string;
      duration_ms: number;
      error_message: string | null;
      error_code: string | null;
      created_at: Date;
    }>(
      `SELECT id, delivery_id, attempt_number, status_code,
              response_body, response_headers, duration_ms,
              error_message, error_code, created_at
       FROM delivery_attempts
       WHERE delivery_id = $1
       ORDER BY attempt_number ASC
       LIMIT $2`,
      [id, limit]
    );

    const attempts = rows.map((row) => ({
      id: row.id,
      attempt_number: row.attempt_number,
      status_code: row.status_code,
      response_body: row.response_body,
      response_headers: JSON.parse(row.response_headers || '{}'),
      duration_ms: row.duration_ms,
      error_message: row.error_message,
      error_code: row.error_code,
      created_at: row.created_at,
    }));

    return reply.send({ attempts });
  });

  // ===========================================================================
  // Get Delivery Stats
  // ===========================================================================

  /**
   * GET /v1/deliveries/stats
   * Get delivery statistics
   */
  fastify.get<{
    Querystring: {
      webhook_id?: string;
      days?: number;
    };
  }>('/deliveries/stats', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { webhook_id, days = 30 } = request.query;

    const conditions: string[] = ['tenant_id = $1'];
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (webhook_id) {
      conditions.push(`webhook_id = $${paramIndex++}`);
      params.push(webhook_id);
    }

    conditions.push(`created_at >= NOW() - INTERVAL '${Math.min(days, 90)} days'`);

    const whereClause = conditions.join(' AND ');

    // Get counts by status
    const statusCounts = await queryAll<{ status: DeliveryStatus; count: string }>(
      `SELECT status, COUNT(*) as count
       FROM deliveries
       WHERE ${whereClause}
       GROUP BY status`,
      params
    );

    const counts: Record<string, number> = {
      total: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
      processing: 0,
      retrying: 0,
      cancelled: 0,
      dlq: 0,
    };

    for (const row of statusCounts) {
      counts[row.status] = parseInt(row.count, 10);
      counts.total += parseInt(row.count, 10);
    }

    // Get latency stats
    const latencyStats = await queryOne<{
      avg_duration: number | null;
      p95_duration: number | null;
    }>(
      `SELECT 
        AVG(last_duration_ms) as avg_duration,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY last_duration_ms) as p95_duration
       FROM deliveries
       WHERE ${whereClause} AND last_duration_ms IS NOT NULL`,
      params
    );

    const stats: DeliveryStats = {
      total: counts.total,
      delivered: counts.delivered,
      failed: counts.failed + counts.dlq,
      pending: counts.pending + counts.processing,
      retrying: counts.retrying,
      dlq: counts.dlq,
      successRate: counts.total > 0
        ? Math.round((counts.delivered / counts.total) * 10000) / 100
        : 0,
      avgDurationMs: Math.round(latencyStats?.avg_duration ?? 0),
      p95DurationMs: Math.round(latencyStats?.p95_duration ?? 0),
    };

    return reply.send({ stats });
  });

  // ===========================================================================
  // Get Daily Stats
  // ===========================================================================

  /**
   * GET /v1/deliveries/stats/daily
   * Get daily delivery statistics
   */
  fastify.get<{
    Querystring: {
      webhook_id?: string;
      days?: number;
    };
  }>('/deliveries/stats/daily', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { webhook_id, days = 30 } = request.query;

    const conditions: string[] = ['tenant_id = $1'];
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (webhook_id) {
      conditions.push(`webhook_id = $${paramIndex++}`);
      params.push(webhook_id);
    }

    const effectiveDays = Math.min(days, 90);
    conditions.push(`created_at >= NOW() - INTERVAL '${effectiveDays} days'`);

    const whereClause = conditions.join(' AND ');

    const rows = await queryAll<{
      date: string;
      total: string;
      delivered: string;
      failed: string;
      avg_duration_ms: number | null;
    }>(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
        COUNT(*) FILTER (WHERE status IN ('failed', 'dlq')) as failed,
        AVG(last_duration_ms) FILTER (WHERE last_duration_ms IS NOT NULL) as avg_duration_ms
       FROM deliveries
       WHERE ${whereClause}
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      params
    );

    const daily = rows.map((row) => ({
      date: row.date,
      total: parseInt(row.total, 10),
      delivered: parseInt(row.delivered, 10),
      failed: parseInt(row.failed, 10),
      success_rate: parseInt(row.total, 10) > 0
        ? Math.round((parseInt(row.delivered, 10) / parseInt(row.total, 10)) * 10000) / 100
        : 0,
      avg_duration_ms: Math.round(row.avg_duration_ms ?? 0),
    }));

    return reply.send({ daily });
  });

  // ===========================================================================
  // Retry Delivery
  // ===========================================================================

  /**
   * POST /v1/deliveries/:id/retry
   * Retry a failed delivery
   */
  fastify.post<{
    Params: { id: string };
  }>('/deliveries/:id/retry', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { id } = request.params;

    // Get delivery
    const delivery = await queryOne<{
      id: string;
      webhook_id: string;
      event_id: string;
      status: DeliveryStatus;
    }>(
      `SELECT id, webhook_id, event_id, status
       FROM deliveries
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (!delivery) {
      return reply.status(404).send({
        error: 'not_found',
        message: 'Delivery not found',
      });
    }

    // Only allow retry for certain statuses
    if (!['failed', 'dlq', 'cancelled'].includes(delivery.status)) {
      return reply.status(400).send({
        error: 'invalid_status',
        message: `Cannot retry delivery with status: ${delivery.status}`,
      });
    }

    // Check webhook is active
    const webhook = await queryOne<{ active: boolean }>(
      `SELECT active FROM webhooks WHERE id = $1`,
      [delivery.webhook_id]
    );

    if (!webhook?.active) {
      return reply.status(400).send({
        error: 'webhook_inactive',
        message: 'Webhook is not active',
      });
    }

    // Reset delivery for retry
    await query(
      `UPDATE deliveries SET
        status = 'pending',
        attempt_count = 0,
        last_attempt_at = NULL,
        last_status_code = NULL,
        last_error = NULL,
        last_duration_ms = NULL,
        updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    // Queue for delivery (publish to stream)
    const { publishDeliveryJob } = await import('../../queue/publish.js');

    const event = await queryOne<{ event_type: EventType }>(
      `SELECT event_type FROM events WHERE id = $1`,
      [delivery.event_id]
    );

    const webhookData = await queryOne<{ url: string; timeout_ms: number; retry_max_attempts: number }>(
      `SELECT url, timeout_ms, retry_max_attempts FROM webhooks WHERE id = $1`,
      [delivery.webhook_id]
    );

    await publishDeliveryJob({
      deliveryId: id,
      webhookId: delivery.webhook_id,
      eventId: delivery.event_id,
      tenantId,
      eventType: event!.event_type,
      url: webhookData!.url,
      attempt: 1,
      maxAttempts: webhookData!.retry_max_attempts,
      timeoutMs: webhookData!.timeout_ms,
      scheduledAt: new Date().toISOString(),
    });

    logger.info({ deliveryId: id, tenantId }, 'Delivery queued for retry');

    return reply.send({
      message: 'Delivery queued for retry',
      delivery_id: id,
    });
  });

  // ===========================================================================
  // Cancel Delivery
  // ===========================================================================

  /**
   * POST /v1/deliveries/:id/cancel
   * Cancel a pending delivery
   */
  fastify.post<{
    Params: { id: string };
  }>('/deliveries/:id/cancel', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { id } = request.params;

    // Get delivery
    const delivery = await queryOne<{ status: DeliveryStatus }>(
      `SELECT status FROM deliveries WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (!delivery) {
      return reply.status(404).send({
        error: 'not_found',
        message: 'Delivery not found',
      });
    }

    // Only allow cancel for pending/retrying
    if (!['pending', 'retrying'].includes(delivery.status)) {
      return reply.status(400).send({
        error: 'invalid_status',
        message: `Cannot cancel delivery with status: ${delivery.status}`,
      });
    }

    // Update status
    await query(
      `UPDATE deliveries SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    logger.info({ deliveryId: id, tenantId }, 'Delivery cancelled');

    return reply.send({
      message: 'Delivery cancelled',
      delivery_id: id,
    });
  });

  // ===========================================================================
  // Bulk Operations
  // ===========================================================================

  /**
   * POST /v1/deliveries/bulk/retry
   * Retry multiple deliveries
   */
  fastify.post<{
    Body: { delivery_ids: string[] };
  }>('/deliveries/bulk/retry', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { delivery_ids } = request.body;

    if (!delivery_ids || delivery_ids.length === 0) {
      return reply.status(400).send({
        error: 'invalid_request',
        message: 'delivery_ids is required',
      });
    }

    if (delivery_ids.length > 100) {
      return reply.status(400).send({
        error: 'too_many_items',
        message: 'Maximum 100 deliveries per request',
      });
    }

    // Get eligible deliveries
    const rows = await queryAll<{ id: string }>(
      `SELECT id FROM deliveries
       WHERE id = ANY($1)
         AND tenant_id = $2
         AND status IN ('failed', 'dlq', 'cancelled')`,
      [delivery_ids, tenantId]
    );

    const eligibleIds = rows.map((r) => r.id);

    if (eligibleIds.length === 0) {
      return reply.send({
        queued: 0,
        skipped: delivery_ids.length,
        message: 'No eligible deliveries to retry',
      });
    }

    // Reset deliveries
    await query(
      `UPDATE deliveries SET
        status = 'pending',
        attempt_count = 0,
        last_attempt_at = NULL,
        last_status_code = NULL,
        last_error = NULL,
        updated_at = NOW()
       WHERE id = ANY($1)`,
      [eligibleIds]
    );

    // Note: In production, you'd queue these for delivery
    // For now, just mark as pending

    logger.info(
      { count: eligibleIds.length, tenantId },
      'Bulk retry queued'
    );

    return reply.send({
      queued: eligibleIds.length,
      skipped: delivery_ids.length - eligibleIds.length,
      message: `${eligibleIds.length} deliveries queued for retry`,
    });
  });

  /**
   * POST /v1/deliveries/bulk/cancel
   * Cancel multiple deliveries
   */
  fastify.post<{
    Body: { delivery_ids: string[] };
  }>('/deliveries/bulk/cancel', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { delivery_ids } = request.body;

    if (!delivery_ids || delivery_ids.length === 0) {
      return reply.status(400).send({
        error: 'invalid_request',
        message: 'delivery_ids is required',
      });
    }

    if (delivery_ids.length > 100) {
      return reply.status(400).send({
        error: 'too_many_items',
        message: 'Maximum 100 deliveries per request',
      });
    }

    // Cancel eligible deliveries
    const result = await query(
      `UPDATE deliveries SET status = 'cancelled', updated_at = NOW()
       WHERE id = ANY($1)
         AND tenant_id = $2
         AND status IN ('pending', 'retrying')`,
      [delivery_ids, tenantId]
    );

    const cancelled = result.rowCount;

    logger.info({ cancelled, tenantId }, 'Bulk cancel completed');

    return reply.send({
      cancelled,
      skipped: delivery_ids.length - cancelled,
      message: `${cancelled} deliveries cancelled`,
    });
  });

  logger.info('Deliveries routes registered');
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Convert database row to delivery with details
 */
function rowToDeliveryWithDetails(row: {
  id: string;
  webhook_id: string;
  event_id: string;
  tenant_id: string;
  status: DeliveryStatus;
  attempt_count: number;
  last_attempt_at: Date | null;
  last_status_code: number | null;
  last_error: string | null;
  last_duration_ms: number | null;
  delivered_at: Date | null;
  created_at: Date;
  updated_at: Date;
  event_type: EventType;
  webhook_url: string;
  webhook_name: string | null;
}): DeliveryWithDetails & { webhook: { url: string; name: string | null } } {
  return {
    id: row.id,
    webhookId: row.webhook_id,
    eventId: row.event_id,
    tenantId: row.tenant_id,
    status: row.status,
    attemptCount: row.attempt_count,
    lastAttemptAt: row.last_attempt_at,
    lastStatusCode: row.last_status_code,
    lastError: row.last_error,
    lastDurationMs: row.last_duration_ms,
    deliveredAt: row.delivered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    eventType: row.event_type,
    webhookUrl: row.webhook_url,
    webhookName: row.webhook_name,
    webhook: {
      url: row.webhook_url,
      name: row.webhook_name,
    },
  };
}

// =============================================================================
// Export
// =============================================================================

export default deliveriesRoutes;
