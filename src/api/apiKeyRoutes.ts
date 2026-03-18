import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { query, logger } from '../core/index.js';
import { authenticate, requirePermission, generateApiKey } from '../middleware/auth.js';
import { CreateApiKeySchema, PaginationSchema, ErrorResponse } from '../schemas/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface ApiKeyRow {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  key_prefix: string;
  permissions: string[];
  rate_limit_max: number;
  rate_limit_window_ms: number;
  ip_allowlist: string[] | null;
  created_at: Date;
  expires_at: Date | null;
  last_used_at: Date | null;
  revoked: boolean;
  revoked_at: Date | null;
}

function formatApiKey(row: ApiKeyRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    keyPrefix: row.key_prefix,
    permissions: row.permissions,
    rateLimit: {
      maxRequests: row.rate_limit_max,
      windowMs: row.rate_limit_window_ms,
    },
    ipAllowlist: row.ip_allowlist,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at?.toISOString(),
    lastUsedAt: row.last_used_at?.toISOString(),
    revoked: row.revoked,
    revokedAt: row.revoked_at?.toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Routes
// ═══════════════════════════════════════════════════════════════════════════════

export async function apiKeyRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  // ─────────────────────────────────────────────────────────────────────────────
  // List API Keys
  // ─────────────────────────────────────────────────────────────────────────────
  app.get('/', {
    preHandler: requirePermission('api_keys:read'),
    handler: async (
      request: FastifyRequest<{ Querystring: z.infer<typeof PaginationSchema> }>,
      reply: FastifyReply
    ) => {
      const pagination = PaginationSchema.parse(request.query);
      const offset = (pagination.page - 1) * pagination.limit;

      const countResult = await query<{ count: string }>(
        'SELECT COUNT(*) FROM api_keys WHERE owner_id = $1',
        [request.ownerId]
      );
      const total = parseInt(countResult.rows[0].count, 10);

      const result = await query<ApiKeyRow>(`
        SELECT 
          id, owner_id, name, description, key_prefix, permissions,
          rate_limit_max, rate_limit_window_ms, ip_allowlist,
          created_at, expires_at, last_used_at, revoked, revoked_at
        FROM api_keys
        WHERE owner_id = $1
        ORDER BY created_at ${pagination.sortOrder}
        LIMIT $2 OFFSET $3
      `, [request.ownerId, pagination.limit, offset]);

      return reply.send({
        items: result.rows.map(formatApiKey),
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
  // Get Single API Key
  // ─────────────────────────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/:id', {
    preHandler: requirePermission('api_keys:read'),
    handler: async (request, reply) => {
      const result = await query<ApiKeyRow>(`
        SELECT 
          id, owner_id, name, description, key_prefix, permissions,
          rate_limit_max, rate_limit_window_ms, ip_allowlist,
          created_at, expires_at, last_used_at, revoked, revoked_at
        FROM api_keys
        WHERE id = $1 AND owner_id = $2
      `, [request.params.id, request.ownerId]);

      if (result.rows.length === 0) {
        const error: ErrorResponse = {
          code: 404,
          message: 'API key not found',
          requestId: request.correlationId,
        };
        return reply.status(404).send(error);
      }

      return reply.send(formatApiKey(result.rows[0]));
    },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Create API Key
  // ─────────────────────────────────────────────────────────────────────────────
  app.post('/', {
    preHandler: requirePermission('api_keys:write'),
    handler: async (
      request: FastifyRequest<{ Body: z.infer<typeof CreateApiKeySchema> }>,
      reply: FastifyReply
    ) => {
      const parseResult = CreateApiKeySchema.safeParse(request.body);
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

      // Check API key limit (max 5 per account)
      const countResult = await query<{ count: string }>(
        'SELECT COUNT(*) FROM api_keys WHERE owner_id = $1 AND revoked = false',
        [request.ownerId]
      );

      if (parseInt(countResult.rows[0].count, 10) >= 5) {
        const error: ErrorResponse = {
          code: 400,
          message: 'Maximum API key limit reached',
          hint: 'Revoke unused keys before creating new ones',
          requestId: request.correlationId,
        };
        return reply.status(400).send(error);
      }

      // Generate API key
      const { key, prefix, hash } = generateApiKey();

      // Default permissions if not provided
      const permissions = data.permissions || [
        'webhooks:read',
        'webhooks:write',
        'events:read',
      ];

      const result = await query<ApiKeyRow>(`
        INSERT INTO api_keys (
          owner_id, name, description, key_prefix, key_hash, permissions,
          rate_limit_max, rate_limit_window_ms, ip_allowlist, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING 
          id, owner_id, name, description, key_prefix, permissions,
          rate_limit_max, rate_limit_window_ms, ip_allowlist,
          created_at, expires_at, last_used_at, revoked, revoked_at
      `, [
        request.ownerId,
        data.name,
        data.description || null,
        prefix,
        hash,
        permissions,
        data.rateLimit?.maxRequests ?? 60,
        data.rateLimit?.windowMs ?? 60000,
        data.ipAllowlist || null,
        data.expiresAt || null,
      ]);

      logger.info('API key created', {
        keyId: result.rows[0].id,
        name: data.name,
        ownerId: request.ownerId,
      });

      // Return with full key (only shown once)
      return reply.status(201).send({
        ...formatApiKey(result.rows[0]),
        key, // Full key returned only on creation
      });
    },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Revoke API Key
  // ─────────────────────────────────────────────────────────────────────────────
  app.delete<{ Params: { id: string } }>('/:id', {
    preHandler: requirePermission('api_keys:write'),
    handler: async (request, reply) => {
      // Check ownership
      const existingResult = await query<{ id: string; revoked: boolean }>(
        'SELECT id, revoked FROM api_keys WHERE id = $1 AND owner_id = $2',
        [request.params.id, request.ownerId]
      );

      if (existingResult.rows.length === 0) {
        const error: ErrorResponse = {
          code: 404,
          message: 'API key not found',
          requestId: request.correlationId,
        };
        return reply.status(404).send(error);
      }

      if (existingResult.rows[0].revoked) {
        const error: ErrorResponse = {
          code: 400,
          message: 'API key already revoked',
          requestId: request.correlationId,
        };
        return reply.status(400).send(error);
      }

      // Prevent revoking the key being used for this request
      if (request.apiKey?.id === request.params.id) {
        const error: ErrorResponse = {
          code: 400,
          message: 'Cannot revoke the API key currently in use',
          hint: 'Use a different API key to revoke this one',
          requestId: request.correlationId,
        };
        return reply.status(400).send(error);
      }

      await query(
        'UPDATE api_keys SET revoked = true, revoked_at = NOW() WHERE id = $1 AND owner_id = $2',
        [request.params.id, request.ownerId]
      );

      logger.info('API key revoked', {
        keyId: request.params.id,
        ownerId: request.ownerId,
      });

      return reply.status(204).send();
    },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Update API Key (name, description, permissions, rate limit, IP allowlist)
  // ─────────────────────────────────────────────────────────────────────────────
  app.patch<{ Params: { id: string }; Body: Partial<z.infer<typeof CreateApiKeySchema>> }>('/:id', {
    preHandler: requirePermission('api_keys:write'),
    handler: async (request, reply) => {
      // Check ownership
      const existingResult = await query<{ id: string }>(
        'SELECT id FROM api_keys WHERE id = $1 AND owner_id = $2 AND revoked = false',
        [request.params.id, request.ownerId]
      );

      if (existingResult.rows.length === 0) {
        const error: ErrorResponse = {
          code: 404,
          message: 'API key not found or revoked',
          requestId: request.correlationId,
        };
        return reply.status(404).send(error);
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (request.body.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(request.body.name);
      }
      if (request.body.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(request.body.description);
      }
      if (request.body.permissions !== undefined) {
        updates.push(`permissions = $${paramIndex++}`);
        values.push(request.body.permissions);
      }
      if (request.body.rateLimit?.maxRequests !== undefined) {
        updates.push(`rate_limit_max = $${paramIndex++}`);
        values.push(request.body.rateLimit.maxRequests);
      }
      if (request.body.rateLimit?.windowMs !== undefined) {
        updates.push(`rate_limit_window_ms = $${paramIndex++}`);
        values.push(request.body.rateLimit.windowMs);
      }
      if (request.body.ipAllowlist !== undefined) {
        updates.push(`ip_allowlist = $${paramIndex++}`);
        values.push(request.body.ipAllowlist);
      }
      if (request.body.expiresAt !== undefined) {
        updates.push(`expires_at = $${paramIndex++}`);
        values.push(request.body.expiresAt);
      }

      if (updates.length === 0) {
        const error: ErrorResponse = {
          code: 400,
          message: 'No updates provided',
          requestId: request.correlationId,
        };
        return reply.status(400).send(error);
      }

      values.push(request.params.id, request.ownerId);

      const result = await query<ApiKeyRow>(`
        UPDATE api_keys 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++} AND owner_id = $${paramIndex}
        RETURNING 
          id, owner_id, name, description, key_prefix, permissions,
          rate_limit_max, rate_limit_window_ms, ip_allowlist,
          created_at, expires_at, last_used_at, revoked, revoked_at
      `, values);

      logger.info('API key updated', {
        keyId: request.params.id,
        ownerId: request.ownerId,
      });

      return reply.send(formatApiKey(result.rows[0]));
    },
  });
}
