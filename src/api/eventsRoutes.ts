import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { query, logger, addToStream, config } from '../core/index.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { 
  ReplayRequestSchema, 
  PaginationSchema, 
  ErrorResponse,
  DeliveryStatus,
} from '../schemas/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface DeliveryRow {
  id: number;
  webhook_id: number;
  event_id: string;
  event_type: string;
  event_hash: string;
  status: string;
  status_code: number | null;
  attempts: number;
  max_attempts: number;
  next_retry_at: Date | null;
  last_attempt_at: Date;
  latency_ms: number | null;
  error_message: string | null;
  created_at: Date;
  webhook_url?: string;
}

function formatDelivery(row: DeliveryRow) {
  return {
    id: row.id,
    webhookId: row.webhook_id,
    webhookUrl: row.webhook_url,
    eventId: row.event_id,
    eventType: row.event_type,
    eventHash: row.event_hash,
    status: row.status,
    statusCode: row.status_code,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    nextRetryAt: row.next_retry_at?.toISOString(),
    lastAttemptAt: row.last_attempt_at.toISOString(),
    latencyMs: row.latency_ms,
    errorMessage: row.error_message,
    createdAt: row.created_at.toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Delivery Routes
// ═══════════════════════════════════════════════════════════════════════════════

export async function deliveryRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  // ─────────────────────────────────────────────────────────────────────────────
  // List Deliveries
  // ─────────────────────────────────────────────────────────────────────────────
  app.get('/', {
    preHandler: requirePermission('events:read'),
    handler: async (
      request: FastifyRequest<{
        Querystring: z.infer<typeof PaginationSchema> & {
          webhookId?: string;
          status?: string;
          eventType?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const pagination = PaginationSchema.parse(request.query);
      const offset = (pagination.page - 1) * pagination.limit;

      const filters: string[] = ['w.owner_id = $1'];
      const values: unknown[] = [request.ownerId];
      let paramIndex = 2;

      if (request.query.webhookId) {
        filters.push(`d.webhook_id = $${paramIndex++}`);
        values.push(parseInt(request.query.webhookId, 10));
      }
      if (request.query.status) {
        const statusParse = DeliveryStatus.safeParse(request.query.status);
        if (statusParse.success) {
          filters.push(`d.status = $${paramIndex++}`);
          values.push(statusParse.data);
        }
      }
      if (request.query.eventType) {
        filters.push(`d.event_type = $${paramIndex++}`);
        values.push(request.query.eventType);
      }

      const whereClause = filters.join(' AND ');

      const countResult = await query<{ count: string }>(`
        SELECT COUNT(*) 
        FROM deliveries d
        JOIN webhooks w ON d.webhook_id = w.id
        WHERE ${whereClause}
      `, values);
      const total = parseInt(countResult.rows[0].count, 10);

      values.push(pagination.limit, offset);
      const result = await query<DeliveryRow>(`
        SELECT 
          d.id, d.webhook_id, d.event_id, d.event_type, d.event_hash,
          d.status, d.status_code, d.attempts, d.max_attempts,
          d.next_retry_at, d.last_attempt_at, d.latency_ms,
          d.error_message, d.created_at,
          w.url as webhook_url
        FROM deliveries d
        JOIN webhooks w ON d.webhook_id = w.id
        WHERE ${whereClause}
        ORDER BY d.created_at ${pagination.sortOrder}
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `, values);

      return reply.send({
        items: result.rows.map(formatDelivery),
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
          hasNext: pagination.page * pagination.limit < total,
          hasPrev: pagination.page > 1,
        },
      });
    },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Get Single Delivery
  // ─────────────────────────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/:id', {
    preHandler: requirePermission('events:read'),
    handler: async (request, reply) => {
      const deliveryId = parseInt(request.params.id, 10);
      if (isNaN(deliveryId)) {
        const error: ErrorResponse = {
          code: 400,
          message: 'Invalid delivery ID',
          requestId: request.correlationId,
        };
        return reply.status(400).send(error);
      }

      const result = await query<DeliveryRow>(`
        SELECT 
          d.id, d.webhook_id, d.event_id, d.event_type, d.event_hash,
          d.status, d.status_code, d.attempts, d.max_attempts,
          d.next_retry_at, d.last_attempt_at, d.latency_ms,
          d.error_message, d.created_at,
          w.url as webhook_url
        FROM deliveries d
        JOIN webhooks w ON d.webhook_id = w.id
        WHERE d.id = $1 AND w.owner_id = $2
      `, [deliveryId, request.ownerId]);

      if (result.rows.length === 0) {
        const error: ErrorResponse = {
          code: 404,
          message: 'Delivery not found',
          requestId: request.correlationId,
        };
        return reply.status(404).send(error);
      }

      return reply.send(formatDelivery(result.rows[0]));
    },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Delivery Statistics
  // ─────────────────────────────────────────────────────────────────────────────
  app.get('/stats', {
    preHandler: requirePermission('analytics:read'),
    handler: async (request, reply) => {
      const timeRange = (request.query as { hours?: string }).hours || '24';
      const hours = parseInt(timeRange, 10) || 24;

      const result = await query<{
        total: string;
        success: string;
        failed: string;
        retry: string;
        pending: string;
        avg_latency: number | null;
        p95_latency: number | null;
      }>(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE d.status = 'success') as success,
          COUNT(*) FILTER (WHERE d.status = 'failed') as failed,
          COUNT(*) FILTER (WHERE d.status = 'retry') as retry,
          COUNT(*) FILTER (WHERE d.status = 'pending') as pending,
          AVG(d.latency_ms) FILTER (WHERE d.status = 'success') as avg_latency,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY d.latency_ms) 
            FILTER (WHERE d.status = 'success') as p95_latency
        FROM deliveries d
        JOIN webhooks w ON d.webhook_id = w.id
        WHERE w.owner_id = $1 
          AND d.created_at > NOW() - INTERVAL '1 hour' * $2
      `, [request.ownerId, hours]);

      const stats = result.rows[0];

      return reply.send({
        timeRange: `${hours}h`,
        total: parseInt(stats.total, 10),
        byStatus: {
          success: parseInt(stats.success, 10),
          failed: parseInt(stats.failed, 10),
          retry: parseInt(stats.retry, 10),
          pending: parseInt(stats.pending, 10),
        },
        successRate: parseInt(stats.total, 10) > 0
          ? (parseInt(stats.success, 10) / parseInt(stats.total, 10) * 100).toFixed(2)
          : 0,
        latency: {
          avgMs: stats.avg_latency ? Math.round(stats.avg_latency) : null,
          p95Ms: stats.p95_latency ? Math.round(stats.p95_latency) : null,
        },
      });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Event Replay Routes
// ═══════════════════════════════════════════════════════════════════════════════

export async function replayRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  // ─────────────────────────────────────────────────────────────────────────────
  // Replay Events
  // ─────────────────────────────────────────────────────────────────────────────
  app.post('/', {
    preHandler: requirePermission('events:replay'),
    handler: async (
      request: FastifyRequest<{ Body: z.infer<typeof ReplayRequestSchema> }>,
      reply: FastifyReply
    ) => {
      const parseResult = ReplayRequestSchema.safeParse(request.body);
      if (!parseResult.success) {
        const error: ErrorResponse = {
          code: 400,
          message: 'Validation failed',
          details: parseResult.error.flatten(),
          requestId: request.correlationId,
        };
        return reply.status(400).send(error);
      }

      const data = parseResult.data;

      // Build query filters
      const filters: string[] = ['w.owner_id = $1', 'd.created_at BETWEEN $2 AND $3'];
      const values: unknown[] = [request.ownerId, data.startTime, data.endTime];
      let paramIndex = 4;

      if (data.eventTypes && data.eventTypes.length > 0) {
        filters.push(`d.event_type = ANY($${paramIndex++})`);
        values.push(data.eventTypes);
      }

      if (data.webhookIds && data.webhookIds.length > 0) {
        filters.push(`d.webhook_id = ANY($${paramIndex++})`);
        values.push(data.webhookIds);
      }

      const whereClause = filters.join(' AND ');

      // Get events to replay
      values.push(data.limit);
      const result = await query<{
        event_id: string;
        event_type: string;
        webhook_id: number;
      }>(`
        SELECT DISTINCT d.event_id, d.event_type, d.webhook_id
        FROM deliveries d
        JOIN webhooks w ON d.webhook_id = w.id
        WHERE ${whereClause}
        ORDER BY d.created_at DESC
        LIMIT $${paramIndex}
      `, values);

      if (result.rows.length === 0) {
        return reply.send({
          message: 'No events found to replay',
          eventsQueued: 0,
        });
      }

      // Queue events for replay
      let queued = 0;
      for (const row of result.rows) {
        try {
          await addToStream(
            `${config.streamKey}_replay`,
            {
              event_id: row.event_id,
              event_type: row.event_type,
              webhook_id: row.webhook_id.toString(),
              replay: 'true',
            },
            config.streamMaxLen
          );
          queued++;
        } catch (error) {
          logger.error('Failed to queue replay event', {
            eventId: row.event_id,
            error: (error as Error).message,
          });
        }
      }

      logger.info('Events queued for replay', {
        eventsQueued: queued,
        ownerId: request.ownerId,
        startTime: data.startTime,
        endTime: data.endTime,
      });

      return reply.send({
        message: `Queued ${queued} events for replay`,
        eventsQueued: queued,
        timeRange: {
          start: data.startTime,
          end: data.endTime,
        },
      });
    },
  });
}
