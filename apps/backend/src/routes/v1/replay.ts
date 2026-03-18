/**
 * @fileoverview XRNotify Event Replay API Routes
 * Replay historical events to webhooks.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/routes/v1/replay
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createModuleLogger } from '../../core/logger.js';
import { query, queryOne, queryAll } from '../../core/db.js';
import {
  requestReplay,
  requestBulkReplay,
  createDeliveryJob,
} from '../../queue/publish.js';
import { uuid, nowISO } from '@xrnotify/shared';
import type { EventType } from '@xrnotify/shared';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('routes-replay');

/**
 * Replay request
 */
interface ReplayRequest {
  id: string;
  tenantId: string;
  webhookId: string;
  status: ReplayStatus;
  eventFilter: EventFilter;
  eventCount: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  requestedBy: string;
  requestedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Replay status
 */
type ReplayStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * Event filter for replay
 */
interface EventFilter {
  event_types?: EventType[];
  start_date?: string;
  end_date?: string;
  accounts?: string[];
  networks?: string[];
  tx_hashes?: string[];
  ledger_index_min?: number;
  ledger_index_max?: number;
}

/**
 * Replay creation body
 */
interface CreateReplayBody {
  webhook_id: string;
  filter: EventFilter;
  options?: {
    batch_size?: number;
    delay_between_ms?: number;
    skip_delivered?: boolean;
  };
}

/**
 * Single event replay body
 */
interface ReplaySingleBody {
  webhook_id: string;
  event_id: string;
}

/**
 * Bulk event replay body
 */
interface ReplayBulkBody {
  webhook_id: string;
  event_ids: string[];
}

// =============================================================================
// Constants
// =============================================================================

const MAX_REPLAY_EVENTS = 10000;
const MAX_BULK_EVENTS = 100;
const DEFAULT_BATCH_SIZE = 50;

// =============================================================================
// Route Handler
// =============================================================================

/**
 * Register replay routes
 */
export async function replayRoutes(fastify: FastifyInstance): Promise<void> {
  // ===========================================================================
  // Create Replay Request
  // ===========================================================================

  /**
   * POST /v1/replay
   * Create a new replay request
   */
  fastify.post<{
    Body: CreateReplayBody;
  }>('/replay', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { webhook_id, filter, options = {} } = request.body;

    // Validate webhook belongs to tenant
    const webhook = await queryOne<{ id: string; active: boolean }>(
      `SELECT id, active FROM webhooks WHERE id = $1 AND tenant_id = $2`,
      [webhook_id, tenantId]
    );

    if (!webhook) {
      return reply.status(404).send({
        error: 'not_found',
        message: 'Webhook not found',
      });
    }

    if (!webhook.active) {
      return reply.status(400).send({
        error: 'webhook_inactive',
        message: 'Webhook is not active',
      });
    }

    // Validate filter
    if (!filter || Object.keys(filter).length === 0) {
      return reply.status(400).send({
        error: 'invalid_filter',
        message: 'At least one filter criteria is required',
      });
    }

    // Build event query
    const { whereClause, params } = buildEventFilterQuery(filter, tenantId);

    // Count matching events
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM events e
       WHERE ${whereClause}`,
      params
    );

    const eventCount = parseInt(countResult?.count ?? '0', 10);

    if (eventCount === 0) {
      return reply.status(400).send({
        error: 'no_events',
        message: 'No events match the filter criteria',
      });
    }

    if (eventCount > MAX_REPLAY_EVENTS) {
      return reply.status(400).send({
        error: 'too_many_events',
        message: `Maximum ${MAX_REPLAY_EVENTS} events per replay request. Found: ${eventCount}`,
      });
    }

    // Check for existing pending replay
    const existingReplay = await queryOne<{ id: string }>(
      `SELECT id FROM replay_requests
       WHERE webhook_id = $1 AND tenant_id = $2 AND status IN ('pending', 'processing')
       LIMIT 1`,
      [webhook_id, tenantId]
    );

    if (existingReplay) {
      return reply.status(409).send({
        error: 'replay_in_progress',
        message: 'A replay request is already in progress for this webhook',
        existing_replay_id: existingReplay.id,
      });
    }

    // Create replay request
    const replayId = `rpl_${uuid()}`;
    const batchSize = Math.min(options.batch_size ?? DEFAULT_BATCH_SIZE, 100);
    const skipDelivered = options.skip_delivered ?? true;

    const row = await queryOne<{
      id: string;
      tenant_id: string;
      webhook_id: string;
      status: ReplayStatus;
      event_filter: EventFilter;
      event_count: number;
      processed_count: number;
      success_count: number;
      failed_count: number;
      requested_by: string;
      requested_at: Date;
      started_at: Date | null;
      completed_at: Date | null;
      error: string | null;
      metadata: Record<string, unknown>;
    }>(
      `INSERT INTO replay_requests (
        id, tenant_id, webhook_id, status, event_filter,
        event_count, processed_count, success_count, failed_count,
        requested_by, requested_at, metadata
      ) VALUES (
        $1, $2, $3, 'pending', $4,
        $5, 0, 0, 0,
        $6, NOW(), $7
      )
      RETURNING *`,
      [
        replayId,
        tenantId,
        webhook_id,
        JSON.stringify(filter),
        eventCount,
        request.apiKeyId ?? 'api',
        JSON.stringify({
          batch_size: batchSize,
          delay_between_ms: options.delay_between_ms ?? 0,
          skip_delivered: skipDelivered,
        }),
      ]
    );

    if (!row) {
      throw new Error('Failed to create replay request');
    }

    // Start processing asynchronously
    processReplayRequest(row.id, tenantId, webhook_id, filter, {
      batchSize,
      delayBetweenMs: options.delay_between_ms ?? 0,
      skipDelivered,
    }).catch((error) => {
      logger.error({ err: error, replayId: row.id }, 'Replay processing failed');
    });

    logger.info(
      { replayId: row.id, webhookId: webhook_id, eventCount },
      'Replay request created'
    );

    return reply.status(201).send({
      replay: rowToReplayRequest(row),
      message: `Replay request created. ${eventCount} events will be replayed.`,
    });
  });

  // ===========================================================================
  // Replay Single Event
  // ===========================================================================

  /**
   * POST /v1/replay/single
   * Replay a single event to a webhook
   */
  fastify.post<{
    Body: ReplaySingleBody;
  }>('/replay/single', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { webhook_id, event_id } = request.body;

    // Validate webhook
    const webhook = await queryOne<{ id: string; active: boolean; url: string; timeout_ms: number; retry_max_attempts: number }>(
      `SELECT id, active, url, timeout_ms, retry_max_attempts
       FROM webhooks WHERE id = $1 AND tenant_id = $2`,
      [webhook_id, tenantId]
    );

    if (!webhook) {
      return reply.status(404).send({
        error: 'not_found',
        message: 'Webhook not found',
      });
    }

    if (!webhook.active) {
      return reply.status(400).send({
        error: 'webhook_inactive',
        message: 'Webhook is not active',
      });
    }

    // Validate event exists
    const event = await queryOne<{ id: string; event_type: EventType }>(
      `SELECT id, event_type FROM events WHERE id = $1`,
      [event_id]
    );

    if (!event) {
      return reply.status(404).send({
        error: 'not_found',
        message: 'Event not found',
      });
    }

    // Create delivery
    const deliveryId = `del_${uuid()}`;

    await query(
      `INSERT INTO deliveries (
        id, webhook_id, event_id, tenant_id, idempotency_key,
        status, attempt_count, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        'pending', 0, NOW(), NOW()
      )
      ON CONFLICT (idempotency_key) DO UPDATE SET
        status = 'pending',
        attempt_count = 0,
        updated_at = NOW()
      RETURNING id`,
      [deliveryId, webhook_id, event_id, tenantId, `${webhook_id}:${event_id}:replay`]
    );

    // Queue for delivery
    await createDeliveryJob({
      deliveryId,
      webhookId: webhook_id,
      eventId: event_id,
      tenantId,
      eventType: event.event_type,
      url: webhook.url,
      maxAttempts: webhook.retry_max_attempts,
      timeoutMs: webhook.timeout_ms,
    });

    logger.info(
      { deliveryId, webhookId: webhook_id, eventId: event_id },
      'Single event replay queued'
    );

    return reply.status(201).send({
      message: 'Event queued for replay',
      delivery_id: deliveryId,
      event_id,
      webhook_id,
    });
  });

  // ===========================================================================
  // Replay Bulk Events
  // ===========================================================================

  /**
   * POST /v1/replay/bulk
   * Replay multiple events to a webhook
   */
  fastify.post<{
    Body: ReplayBulkBody;
  }>('/replay/bulk', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { webhook_id, event_ids } = request.body;

    if (!event_ids || event_ids.length === 0) {
      return reply.status(400).send({
        error: 'invalid_request',
        message: 'event_ids is required',
      });
    }

    if (event_ids.length > MAX_BULK_EVENTS) {
      return reply.status(400).send({
        error: 'too_many_events',
        message: `Maximum ${MAX_BULK_EVENTS} events per request`,
      });
    }

    // Validate webhook
    const webhook = await queryOne<{ id: string; active: boolean; url: string; timeout_ms: number; retry_max_attempts: number }>(
      `SELECT id, active, url, timeout_ms, retry_max_attempts
       FROM webhooks WHERE id = $1 AND tenant_id = $2`,
      [webhook_id, tenantId]
    );

    if (!webhook) {
      return reply.status(404).send({
        error: 'not_found',
        message: 'Webhook not found',
      });
    }

    if (!webhook.active) {
      return reply.status(400).send({
        error: 'webhook_inactive',
        message: 'Webhook is not active',
      });
    }

    // Validate events exist
    const events = await queryAll<{ id: string; event_type: EventType }>(
      `SELECT id, event_type FROM events WHERE id = ANY($1)`,
      [event_ids]
    );

    const foundIds = new Set(events.map((e) => e.id));
    const notFoundIds = event_ids.filter((id) => !foundIds.has(id));

    if (events.length === 0) {
      return reply.status(404).send({
        error: 'not_found',
        message: 'No events found',
      });
    }

    // Create deliveries
    const deliveries: Array<{ deliveryId: string; eventId: string; eventType: EventType }> = [];

    for (const event of events) {
      const deliveryId = `del_${uuid()}`;

      await query(
        `INSERT INTO deliveries (
          id, webhook_id, event_id, tenant_id, idempotency_key,
          status, attempt_count, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          'pending', 0, NOW(), NOW()
        )
        ON CONFLICT (idempotency_key) DO UPDATE SET
          status = 'pending',
          attempt_count = 0,
          updated_at = NOW()`,
        [deliveryId, webhook_id, event.id, tenantId, `${webhook_id}:${event.id}:replay`]
      );

      deliveries.push({
        deliveryId,
        eventId: event.id,
        eventType: event.event_type,
      });
    }

    // Queue for delivery
    for (const delivery of deliveries) {
      await createDeliveryJob({
        deliveryId: delivery.deliveryId,
        webhookId: webhook_id,
        eventId: delivery.eventId,
        tenantId,
        eventType: delivery.eventType,
        url: webhook.url,
        maxAttempts: webhook.retry_max_attempts,
        timeoutMs: webhook.timeout_ms,
      });
    }

    logger.info(
      { webhookId: webhook_id, queued: deliveries.length, notFound: notFoundIds.length },
      'Bulk event replay queued'
    );

    return reply.status(201).send({
      message: `${deliveries.length} events queued for replay`,
      queued: deliveries.length,
      not_found: notFoundIds,
      delivery_ids: deliveries.map((d) => d.deliveryId),
    });
  });

  // ===========================================================================
  // Get Replay Request
  // ===========================================================================

  /**
   * GET /v1/replay/:id
   * Get replay request details
   */
  fastify.get<{
    Params: { id: string };
  }>('/replay/:id', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { id } = request.params;

    const row = await queryOne<ReplayRequestRow>(
      `SELECT * FROM replay_requests WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (!row) {
      return reply.status(404).send({
        error: 'not_found',
        message: 'Replay request not found',
      });
    }

    return reply.send({ replay: rowToReplayRequest(row) });
  });

  // ===========================================================================
  // List Replay Requests
  // ===========================================================================

  /**
   * GET /v1/replay
   * List replay requests
   */
  fastify.get<{
    Querystring: {
      webhook_id?: string;
      status?: ReplayStatus;
      limit?: number;
      offset?: number;
    };
  }>('/replay', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { webhook_id, status, limit = 50, offset = 0 } = request.query;

    const conditions: string[] = ['tenant_id = $1'];
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (webhook_id) {
      conditions.push(`webhook_id = $${paramIndex++}`);
      params.push(webhook_id);
    }

    if (status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = conditions.join(' AND ');
    const effectiveLimit = Math.min(limit, 100);

    // Get count
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM replay_requests WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult?.count ?? '0', 10);

    // Get rows
    const rows = await queryAll<ReplayRequestRow>(
      `SELECT * FROM replay_requests
       WHERE ${whereClause}
       ORDER BY requested_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, effectiveLimit, offset]
    );

    const replays = rows.map(rowToReplayRequest);

    return reply.send({
      replays,
      pagination: {
        total,
        limit: effectiveLimit,
        offset,
        has_more: offset + replays.length < total,
      },
    });
  });

  // ===========================================================================
  // Cancel Replay Request
  // ===========================================================================

  /**
   * POST /v1/replay/:id/cancel
   * Cancel a pending or processing replay request
   */
  fastify.post<{
    Params: { id: string };
  }>('/replay/:id/cancel', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { id } = request.params;

    // Get replay
    const replay = await queryOne<{ status: ReplayStatus }>(
      `SELECT status FROM replay_requests WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (!replay) {
      return reply.status(404).send({
        error: 'not_found',
        message: 'Replay request not found',
      });
    }

    if (!['pending', 'processing'].includes(replay.status)) {
      return reply.status(400).send({
        error: 'invalid_status',
        message: `Cannot cancel replay with status: ${replay.status}`,
      });
    }

    // Update status
    await query(
      `UPDATE replay_requests SET
        status = 'cancelled',
        completed_at = NOW()
       WHERE id = $1`,
      [id]
    );

    logger.info({ replayId: id, tenantId }, 'Replay request cancelled');

    return reply.send({
      message: 'Replay request cancelled',
      replay_id: id,
    });
  });

  // ===========================================================================
  // Get Replay Progress
  // ===========================================================================

  /**
   * GET /v1/replay/:id/progress
   * Get real-time replay progress
   */
  fastify.get<{
    Params: { id: string };
  }>('/replay/:id/progress', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { id } = request.params;

    const row = await queryOne<{
      status: ReplayStatus;
      event_count: number;
      processed_count: number;
      success_count: number;
      failed_count: number;
      started_at: Date | null;
    }>(
      `SELECT status, event_count, processed_count, success_count, failed_count, started_at
       FROM replay_requests WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (!row) {
      return reply.status(404).send({
        error: 'not_found',
        message: 'Replay request not found',
      });
    }

    const progress = row.event_count > 0
      ? Math.round((row.processed_count / row.event_count) * 10000) / 100
      : 0;

    let estimatedRemainingMs: number | null = null;

    if (row.started_at && row.processed_count > 0 && row.status === 'processing') {
      const elapsed = Date.now() - row.started_at.getTime();
      const avgPerEvent = elapsed / row.processed_count;
      const remaining = row.event_count - row.processed_count;
      estimatedRemainingMs = Math.round(avgPerEvent * remaining);
    }

    return reply.send({
      replay_id: id,
      status: row.status,
      event_count: row.event_count,
      processed_count: row.processed_count,
      success_count: row.success_count,
      failed_count: row.failed_count,
      progress_percent: progress,
      estimated_remaining_ms: estimatedRemainingMs,
    });
  });

  // ===========================================================================
  // List Replayable Events
  // ===========================================================================

  /**
   * POST /v1/replay/preview
   * Preview events that would be replayed
   */
  fastify.post<{
    Body: { filter: EventFilter };
    Querystring: { limit?: number };
  }>('/replay/preview', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { filter } = request.body;
    const limit = Math.min(request.query.limit ?? 100, 500);

    if (!filter || Object.keys(filter).length === 0) {
      return reply.status(400).send({
        error: 'invalid_filter',
        message: 'At least one filter criteria is required',
      });
    }

    const { whereClause, params } = buildEventFilterQuery(filter, tenantId);

    // Get count
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM events e WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult?.count ?? '0', 10);

    // Get sample events
    const rows = await queryAll<{
      id: string;
      event_type: EventType;
      ledger_index: number;
      tx_hash: string;
      network: string;
      timestamp: string;
      account_context: string[];
    }>(
      `SELECT id, event_type, ledger_index, tx_hash, network, timestamp, account_context
       FROM events e
       WHERE ${whereClause}
       ORDER BY ledger_index DESC
       LIMIT $${params.length + 1}`,
      [...params, limit]
    );

    return reply.send({
      total_events: total,
      sample_events: rows,
      would_exceed_limit: total > MAX_REPLAY_EVENTS,
      max_replay_events: MAX_REPLAY_EVENTS,
    });
  });

  logger.info('Replay routes registered');
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Database row type
 */
interface ReplayRequestRow {
  id: string;
  tenant_id: string;
  webhook_id: string;
  status: ReplayStatus;
  event_filter: EventFilter;
  event_count: number;
  processed_count: number;
  success_count: number;
  failed_count: number;
  requested_by: string;
  requested_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  error: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Convert database row to replay request
 */
function rowToReplayRequest(row: ReplayRequestRow): ReplayRequest {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    webhookId: row.webhook_id,
    status: row.status,
    eventFilter: row.event_filter,
    eventCount: row.event_count,
    processedCount: row.processed_count,
    successCount: row.success_count,
    failedCount: row.failed_count,
    requestedBy: row.requested_by,
    requestedAt: row.requested_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    error: row.error,
    metadata: row.metadata,
  };
}

/**
 * Build event filter query
 */
function buildEventFilterQuery(
  filter: EventFilter,
  tenantId: string
): { whereClause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  // Event types
  if (filter.event_types && filter.event_types.length > 0) {
    conditions.push(`e.event_type = ANY($${paramIndex++})`);
    params.push(filter.event_types);
  }

  // Date range
  if (filter.start_date) {
    conditions.push(`e.timestamp >= $${paramIndex++}`);
    params.push(filter.start_date);
  }

  if (filter.end_date) {
    conditions.push(`e.timestamp <= $${paramIndex++}`);
    params.push(filter.end_date);
  }

  // Accounts
  if (filter.accounts && filter.accounts.length > 0) {
    conditions.push(`e.account_context && $${paramIndex++}`);
    params.push(filter.accounts);
  }

  // Networks
  if (filter.networks && filter.networks.length > 0) {
    conditions.push(`e.network = ANY($${paramIndex++})`);
    params.push(filter.networks);
  }

  // Transaction hashes
  if (filter.tx_hashes && filter.tx_hashes.length > 0) {
    conditions.push(`e.tx_hash = ANY($${paramIndex++})`);
    params.push(filter.tx_hashes);
  }

  // Ledger index range
  if (filter.ledger_index_min !== undefined) {
    conditions.push(`e.ledger_index >= $${paramIndex++}`);
    params.push(filter.ledger_index_min);
  }

  if (filter.ledger_index_max !== undefined) {
    conditions.push(`e.ledger_index <= $${paramIndex++}`);
    params.push(filter.ledger_index_max);
  }

  // Default: last 30 days if no date filter
  if (!filter.start_date && !filter.end_date) {
    conditions.push(`e.created_at >= NOW() - INTERVAL '30 days'`);
  }

  const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

  return { whereClause, params };
}

/**
 * Process replay request asynchronously
 */
async function processReplayRequest(
  replayId: string,
  tenantId: string,
  webhookId: string,
  filter: EventFilter,
  options: {
    batchSize: number;
    delayBetweenMs: number;
    skipDelivered: boolean;
  }
): Promise<void> {
  try {
    // Update status to processing
    await query(
      `UPDATE replay_requests SET status = 'processing', started_at = NOW() WHERE id = $1`,
      [replayId]
    );

    // Get webhook info
    const webhook = await queryOne<{ url: string; timeout_ms: number; retry_max_attempts: number }>(
      `SELECT url, timeout_ms, retry_max_attempts FROM webhooks WHERE id = $1`,
      [webhookId]
    );

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    // Build query
    const { whereClause, params } = buildEventFilterQuery(filter, tenantId);

    // Process events in batches
    let offset = 0;
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    while (true) {
      // Check if cancelled
      const status = await queryOne<{ status: ReplayStatus }>(
        `SELECT status FROM replay_requests WHERE id = $1`,
        [replayId]
      );

      if (status?.status === 'cancelled') {
        logger.info({ replayId }, 'Replay cancelled');
        break;
      }

      // Fetch batch
      const events = await queryAll<{ id: string; event_type: EventType }>(
        `SELECT id, event_type FROM events e
         WHERE ${whereClause}
         ORDER BY ledger_index ASC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, options.batchSize, offset]
      );

      if (events.length === 0) {
        break;
      }

      // Create deliveries
      for (const event of events) {
        try {
          // Check if already delivered (if skipping)
          if (options.skipDelivered) {
            const existing = await queryOne<{ status: string }>(
              `SELECT status FROM deliveries
               WHERE webhook_id = $1 AND event_id = $2 AND status = 'delivered'
               LIMIT 1`,
              [webhookId, event.id]
            );

            if (existing) {
              processedCount++;
              successCount++;
              continue;
            }
          }

          // Create delivery
          const deliveryId = `del_${uuid()}`;

          await query(
            `INSERT INTO deliveries (
              id, webhook_id, event_id, tenant_id, idempotency_key,
              status, attempt_count, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5,
              'pending', 0, NOW(), NOW()
            )
            ON CONFLICT (idempotency_key) DO UPDATE SET
              status = 'pending',
              attempt_count = 0,
              updated_at = NOW()`,
            [deliveryId, webhookId, event.id, tenantId, `${webhookId}:${event.id}:replay:${replayId}`]
          );

          // Queue for delivery
          await createDeliveryJob({
            deliveryId,
            webhookId,
            eventId: event.id,
            tenantId,
            eventType: event.event_type,
            url: webhook.url,
            maxAttempts: webhook.retry_max_attempts,
            timeoutMs: webhook.timeout_ms,
          });

          successCount++;
        } catch (error) {
          logger.error({ err: error, eventId: event.id, replayId }, 'Failed to queue event');
          failedCount++;
        }

        processedCount++;
      }

      // Update progress
      await query(
        `UPDATE replay_requests SET
          processed_count = $2,
          success_count = $3,
          failed_count = $4
         WHERE id = $1`,
        [replayId, processedCount, successCount, failedCount]
      );

      offset += events.length;

      // Delay between batches
      if (options.delayBetweenMs > 0 && events.length === options.batchSize) {
        await new Promise((resolve) => setTimeout(resolve, options.delayBetweenMs));
      }
    }

    // Update completion status
    await query(
      `UPDATE replay_requests SET
        status = 'completed',
        completed_at = NOW(),
        processed_count = $2,
        success_count = $3,
        failed_count = $4
       WHERE id = $1`,
      [replayId, processedCount, successCount, failedCount]
    );

    logger.info(
      { replayId, processedCount, successCount, failedCount },
      'Replay completed'
    );
  } catch (error) {
    const err = error as Error;

    await query(
      `UPDATE replay_requests SET
        status = 'failed',
        completed_at = NOW(),
        error = $2
       WHERE id = $1`,
      [replayId, err.message]
    );

    logger.error({ err, replayId }, 'Replay failed');
    throw error;
  }
}

// =============================================================================
// Export
// =============================================================================

export default replayRoutes;
