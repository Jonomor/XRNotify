import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { z } from 'zod';
import { query, logger, cacheSet, cacheDelete } from '../core/index.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { 
  CreateWebhookSchema, 
  UpdateWebhookSchema,
  PaginationSchema,
  ErrorResponse,
} from '../schemas/index.js';
import { activeWebhooks } from '../core/metrics.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface WebhookRow {
  id: number;
  owner_id: string;
  url: string;
  secret_prefix: string;
  event_filter: string[];
  description: string | null;
  metadata: Record<string, string> | null;
  enabled: boolean;
  max_retries: number;
  retry_delays: number[] | null;
  delivery_count: number;
  failure_count: number;
  created_at: Date;
  updated_at: Date;
  last_triggered_at: Date | null;
}

function formatWebhook(row: WebhookRow) {
  return {
    id: row.id,
    url: row.url,
    secretPrefix: row.secret_prefix,
    eventFilter: row.event_filter,
    description: row.description,
    metadata: row.metadata,
    enabled: row.enabled,
    retryPolicy: {
      maxRetries: row.max_retries,
      retryDelays: row.retry_delays,
    },
    stats: {
      deliveryCount: row.delivery_count,
      failureCount: row.failure_count,
    },
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    lastTriggeredAt: row.last_triggered_at?.toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Routes
// ═══════════════════════════════════════════════════════════════════════════════

export async function webhookRoutes(app: FastifyInstance): Promise<void> {
  // Add authentication to all routes
  app.addHook('preHandler', authenticate);

  // ─────────────────────────────────────────────────────────────────────────────
  // List Webhooks
  // ─────────────────────────────────────────────────────────────────────────────
  app.get('/', {
    preHandler: requirePermission('webhooks:read'),
    handler: async (
      request: FastifyRequest<{ Querystring: z.infer<typeof PaginationSchema> }>,
      reply: FastifyReply
    ) => {
      const pagination = PaginationSchema.parse(request.query);
      const offset = (pagination.page - 1) * pagination.limit;

      const countResult = await query<{ count: string }>(
        'SELECT COUNT(*) FROM webhooks WHERE owner_id = $1',
        [request.ownerId]
      );
      const total = parseInt(countResult.rows[0].count, 10);

      const result = await query<WebhookRow>(`
        SELECT 
          id, owner_id, url, secret_prefix, event_filter, description, metadata,
          enabled, max_retries, retry_delays, delivery_count, failure_count,
          created_at, updated_at, last_triggered_at
        FROM webhooks
        WHERE owner_id = $1
        ORDER BY ${pagination.sortBy === 'createdAt' ? 'created_at' : 'id'} ${pagination.sortOrder}
        LIMIT $2 OFFSET $3
      `, [request.ownerId, pagination.limit, offset]);

      return reply.send({
        items: result.rows.map(formatWebhook),
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
  // Get Single Webhook
  // ─────────────────────────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/:id', {
    preHandler: requirePermission('webhooks:read'),
    handler: async (request, reply) => {
      const webhookId = parseInt(request.params.id, 10);
      if (isNaN(webhookId)) {
        const error: ErrorResponse = {
          code: 400,
          message: 'Invalid webhook ID',
          requestId: request.correlationId,
        };
        return reply.status(400).send(error);
      }

      const result = await query<WebhookRow>(`
        SELECT 
          id, owner_id, url, secret_prefix, event_filter, description, metadata,
          enabled, max_retries, retry_delays, delivery_count, failure_count,
          created_at, updated_at, last_triggered_at
        FROM webhooks
        WHERE id = $1 AND owner_id = $2
      `, [webhookId, request.ownerId]);

      if (result.rows.length === 0) {
        const error: ErrorResponse = {
          code: 404,
          message: 'Webhook not found',
          requestId: request.correlationId,
        };
        return reply.status(404).send(error);
      }

      return reply.send(formatWebhook(result.rows[0]));
    },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Create Webhook
  // ─────────────────────────────────────────────────────────────────────────────
  app.post('/', {
    preHandler: requirePermission('webhooks:write'),
    handler: async (
      request: FastifyRequest<{ Body: z.infer<typeof CreateWebhookSchema> }>,
      reply: FastifyReply
    ) => {
      const parseResult = CreateWebhookSchema.safeParse(request.body);
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

      // Generate secret if not provided
      const secret = data.secret || crypto.randomBytes(32).toString('base64url');
      const secretPrefix = secret.slice(0, 8);

      // Check for duplicate URL
      const existingResult = await query<{ id: number }>(
        'SELECT id FROM webhooks WHERE owner_id = $1 AND url = $2',
        [request.ownerId, data.url]
      );

      if (existingResult.rows.length > 0) {
        const error: ErrorResponse = {
          code: 409,
          message: 'Webhook with this URL already exists',
          hint: 'Use PUT to update existing webhook',
          requestId: request.correlationId,
        };
        return reply.status(409).send(error);
      }

      const result = await query<WebhookRow>(`
        INSERT INTO webhooks (
          owner_id, url, secret, secret_prefix, event_filter, description, metadata,
          enabled, max_retries, retry_delays
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING 
          id, owner_id, url, secret_prefix, event_filter, description, metadata,
          enabled, max_retries, retry_delays, delivery_count, failure_count,
          created_at, updated_at, last_triggered_at
      `, [
        request.ownerId,
        data.url,
        secret,
        secretPrefix,
        data.eventFilter,
        data.description || null,
        data.metadata || null,
        data.enabled ?? true,
        data.retryPolicy?.maxRetries ?? 3,
        data.retryPolicy?.retryDelays || null,
      ]);

      // Update active webhooks metric
      const countResult = await query<{ count: string }>(
        'SELECT COUNT(*) FROM webhooks WHERE enabled = true'
      );
      activeWebhooks.set(parseInt(countResult.rows[0].count, 10));

      // Invalidate cache
      for (const eventType of data.eventFilter) {
        await cacheDelete(`webhooks:${eventType}`);
      }

      logger.info('Webhook created', {
        webhookId: result.rows[0].id,
        url: data.url,
        eventFilter: data.eventFilter,
        ownerId: request.ownerId,
      });

      // Return with secret (only shown once)
      return reply.status(201).send({
        ...formatWebhook(result.rows[0]),
        secret, // Full secret returned only on creation
      });
    },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Update Webhook
  // ─────────────────────────────────────────────────────────────────────────────
  app.put<{ Params: { id: string }; Body: z.infer<typeof UpdateWebhookSchema> }>('/:id', {
    preHandler: requirePermission('webhooks:write'),
    handler: async (request, reply) => {
      const webhookId = parseInt(request.params.id, 10);
      if (isNaN(webhookId)) {
        const error: ErrorResponse = {
          code: 400,
          message: 'Invalid webhook ID',
          requestId: request.correlationId,
        };
        return reply.status(400).send(error);
      }

      const parseResult = UpdateWebhookSchema.safeParse(request.body);
      if (!parseResult.success) {
        const error: ErrorResponse = {
          code: 400,
          message: 'Validation failed',
          details: parseResult.error.flatten(),
          requestId: request.correlationId,
        };
        return reply.status(400).send(error);
      }

      // Check ownership
      const existingResult = await query<{ id: number; event_filter: string[] }>(
        'SELECT id, event_filter FROM webhooks WHERE id = $1 AND owner_id = $2',
        [webhookId, request.ownerId]
      );

      if (existingResult.rows.length === 0) {
        const error: ErrorResponse = {
          code: 404,
          message: 'Webhook not found',
          requestId: request.correlationId,
        };
        return reply.status(404).send(error);
      }

      const data = parseResult.data;
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.url !== undefined) {
        updates.push(`url = $${paramIndex++}`);
        values.push(data.url);
      }
      if (data.eventFilter !== undefined) {
        updates.push(`event_filter = $${paramIndex++}`);
        values.push(data.eventFilter);
      }
      if (data.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(data.description);
      }
      if (data.metadata !== undefined) {
        updates.push(`metadata = $${paramIndex++}`);
        values.push(data.metadata);
      }
      if (data.enabled !== undefined) {
        updates.push(`enabled = $${paramIndex++}`);
        values.push(data.enabled);
      }
      if (data.retryPolicy?.maxRetries !== undefined) {
        updates.push(`max_retries = $${paramIndex++}`);
        values.push(data.retryPolicy.maxRetries);
      }
      if (data.retryPolicy?.retryDelays !== undefined) {
        updates.push(`retry_delays = $${paramIndex++}`);
        values.push(data.retryPolicy.retryDelays);
      }
      if (data.secret !== undefined) {
        updates.push(`secret = $${paramIndex++}`);
        values.push(data.secret);
        updates.push(`secret_prefix = $${paramIndex++}`);
        values.push(data.secret.slice(0, 8));
      }

      if (updates.length === 0) {
        const error: ErrorResponse = {
          code: 400,
          message: 'No updates provided',
          requestId: request.correlationId,
        };
        return reply.status(400).send(error);
      }

      updates.push(`updated_at = NOW()`);
      values.push(webhookId, request.ownerId);

      const result = await query<WebhookRow>(`
        UPDATE webhooks 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++} AND owner_id = $${paramIndex}
        RETURNING 
          id, owner_id, url, secret_prefix, event_filter, description, metadata,
          enabled, max_retries, retry_delays, delivery_count, failure_count,
          created_at, updated_at, last_triggered_at
      `, values);

      // Invalidate cache for old and new event filters
      const oldFilters = existingResult.rows[0].event_filter;
      const newFilters = data.eventFilter || oldFilters;
      const allFilters = [...new Set([...oldFilters, ...newFilters])];
      for (const eventType of allFilters) {
        await cacheDelete(`webhooks:${eventType}`);
      }

      // Update metrics
      const countResult = await query<{ count: string }>(
        'SELECT COUNT(*) FROM webhooks WHERE enabled = true'
      );
      activeWebhooks.set(parseInt(countResult.rows[0].count, 10));

      logger.info('Webhook updated', {
        webhookId,
        ownerId: request.ownerId,
      });

      return reply.send(formatWebhook(result.rows[0]));
    },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Delete Webhook
  // ─────────────────────────────────────────────────────────────────────────────
  app.delete<{ Params: { id: string } }>('/:id', {
    preHandler: requirePermission('webhooks:write'),
    handler: async (request, reply) => {
      const webhookId = parseInt(request.params.id, 10);
      if (isNaN(webhookId)) {
        const error: ErrorResponse = {
          code: 400,
          message: 'Invalid webhook ID',
          requestId: request.correlationId,
        };
        return reply.status(400).send(error);
      }

      // Get webhook to invalidate cache
      const existingResult = await query<{ event_filter: string[] }>(
        'SELECT event_filter FROM webhooks WHERE id = $1 AND owner_id = $2',
        [webhookId, request.ownerId]
      );

      if (existingResult.rows.length === 0) {
        const error: ErrorResponse = {
          code: 404,
          message: 'Webhook not found',
          requestId: request.correlationId,
        };
        return reply.status(404).send(error);
      }

      // Soft delete (mark as disabled and add deleted timestamp)
      await query(
        `UPDATE webhooks SET enabled = false, deleted_at = NOW(), updated_at = NOW() 
         WHERE id = $1 AND owner_id = $2`,
        [webhookId, request.ownerId]
      );

      // Invalidate cache
      for (const eventType of existingResult.rows[0].event_filter) {
        await cacheDelete(`webhooks:${eventType}`);
      }

      // Update metrics
      const countResult = await query<{ count: string }>(
        'SELECT COUNT(*) FROM webhooks WHERE enabled = true'
      );
      activeWebhooks.set(parseInt(countResult.rows[0].count, 10));

      logger.info('Webhook deleted', {
        webhookId,
        ownerId: request.ownerId,
      });

      return reply.status(204).send();
    },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Rotate Webhook Secret
  // ─────────────────────────────────────────────────────────────────────────────
  app.post<{ Params: { id: string } }>('/:id/rotate-secret', {
    preHandler: requirePermission('webhooks:write'),
    handler: async (request, reply) => {
      const webhookId = parseInt(request.params.id, 10);
      if (isNaN(webhookId)) {
        const error: ErrorResponse = {
          code: 400,
          message: 'Invalid webhook ID',
          requestId: request.correlationId,
        };
        return reply.status(400).send(error);
      }

      // Check ownership
      const existingResult = await query<{ id: number }>(
        'SELECT id FROM webhooks WHERE id = $1 AND owner_id = $2',
        [webhookId, request.ownerId]
      );

      if (existingResult.rows.length === 0) {
        const error: ErrorResponse = {
          code: 404,
          message: 'Webhook not found',
          requestId: request.correlationId,
        };
        return reply.status(404).send(error);
      }

      // Generate new secret
      const newSecret = crypto.randomBytes(32).toString('base64url');
      const secretPrefix = newSecret.slice(0, 8);

      await query(
        `UPDATE webhooks SET secret = $1, secret_prefix = $2, updated_at = NOW() 
         WHERE id = $3 AND owner_id = $4`,
        [newSecret, secretPrefix, webhookId, request.ownerId]
      );

      logger.info('Webhook secret rotated', {
        webhookId,
        ownerId: request.ownerId,
      });

      return reply.send({
        id: webhookId,
        secret: newSecret,
        secretPrefix,
        rotatedAt: new Date().toISOString(),
      });
    },
  });
}
