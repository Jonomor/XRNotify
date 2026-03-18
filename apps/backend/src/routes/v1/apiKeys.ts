/**
 * @fileoverview XRNotify API Keys Routes
 * CRUD operations for API key management.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/routes/v1/apiKeys
 */

import { type FastifyPluginAsync, type FastifyRequest, type FastifyReply } from 'fastify';
import { createModuleLogger } from '../../core/logger.js';
import { query, queryOne, queryAll, withTransaction } from '../../core/db.js';
import {
  authenticateApiKey,
  requireScopes,
  getTenantId,
  getApiKeyId,
  invalidateApiKeyCache,
  Scopes,
  type ApiKeyScope,
} from '../../middleware/authApiKey.js';
import { apiKeyCreateRateLimiter } from '../../middleware/rateLimit.js';
import {
  createSuccessResponse,
  createPaginatedResponse,
  createErrorResponse,
} from '../index.js';
import {
  generateAPIKey,
  hashAPIKey,
  getAPIKeyPrefix,
  uuid,
  nowISO,
} from '@xrnotify/shared';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('api-keys-routes');

/**
 * API key response (safe, no secret)
 */
interface ApiKeyResponse {
  id: string;
  name: string;
  description: string | null;
  key_prefix: string;
  scopes: ApiKeyScope[];
  expires_at: string | null;
  last_used_at: string | null;
  use_count: number;
  created_at: string;
}

/**
 * API key creation response (includes secret once)
 */
interface ApiKeyCreatedResponse extends ApiKeyResponse {
  key: string;
}

/**
 * Database row
 */
interface ApiKeyRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  key_prefix: string;
  key_hash: string;
  scopes: ApiKeyScope[];
  expires_at: Date | null;
  revoked: boolean;
  revoked_at: Date | null;
  last_used_at: Date | null;
  use_count: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Create API key request body
 */
interface CreateApiKeyBody {
  name: string;
  description?: string;
  scopes?: ApiKeyScope[];
  expires_in_days?: number;
}

/**
 * List API keys query params
 */
interface ListApiKeysQuery {
  limit?: number;
  offset?: number;
  include_revoked?: boolean;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Transform database row to API response
 */
function toApiKeyResponse(row: ApiKeyRow): ApiKeyResponse {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    key_prefix: row.key_prefix,
    scopes: row.scopes,
    expires_at: row.expires_at?.toISOString() ?? null,
    last_used_at: row.last_used_at?.toISOString() ?? null,
    use_count: parseInt(row.use_count, 10),
    created_at: row.created_at.toISOString(),
  };
}

/**
 * Validate scopes
 */
const VALID_SCOPES: ApiKeyScope[] = [
  'webhooks:read',
  'webhooks:write',
  'deliveries:read',
  'deliveries:replay',
  'api_keys:read',
  'api_keys:write',
  'billing:read',
  'billing:write',
];

function validateScopes(scopes: unknown): ApiKeyScope[] | null {
  if (!Array.isArray(scopes)) {
    return null;
  }

  for (const scope of scopes) {
    if (!VALID_SCOPES.includes(scope as ApiKeyScope)) {
      return null;
    }
  }

  // Remove duplicates
  return [...new Set(scopes)] as ApiKeyScope[];
}

/**
 * Check API key limit for tenant
 */
async function checkApiKeyLimit(tenantId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const result = await queryOne<{ current_count: number; limit_count: number; allowed: boolean }>(
    'SELECT * FROM check_tenant_limit($1, $2)',
    [tenantId, 'api_keys']
  );

  return {
    allowed: result?.allowed ?? false,
    current: result?.current_count ?? 0,
    limit: result?.limit_count ?? 0,
  };
}

// =============================================================================
// Route Handlers
// =============================================================================

/**
 * List API keys
 */
async function listApiKeys(
  request: FastifyRequest<{ Querystring: ListApiKeysQuery }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = getTenantId(request);
  const { limit = 20, offset = 0, include_revoked = false } = request.query;

  // Validate pagination
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const safeOffset = Math.max(0, offset);

  // Build query
  let whereClause = 'tenant_id = $1';
  const params: unknown[] = [tenantId];

  if (!include_revoked) {
    whereClause += ' AND revoked = FALSE AND (expires_at IS NULL OR expires_at > NOW())';
  }

  // Get total count
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM api_keys WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult?.count ?? '0', 10);

  // Get API keys
  const rows = await queryAll<ApiKeyRow>(
    `SELECT * FROM api_keys 
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, safeLimit, safeOffset]
  );

  const apiKeys = rows.map(toApiKeyResponse);

  reply.send(createPaginatedResponse(apiKeys, total, safeLimit, safeOffset, request.requestId));
}

/**
 * Get single API key
 */
async function getApiKey(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = getTenantId(request);
  const { id } = request.params;

  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    reply.status(404).send(
      createErrorResponse('not_found', 'API key not found', request.requestId)
    );
    return;
  }

  const row = await queryOne<ApiKeyRow>(
    'SELECT * FROM api_keys WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );

  if (!row) {
    reply.status(404).send(
      createErrorResponse('not_found', 'API key not found', request.requestId)
    );
    return;
  }

  reply.send(createSuccessResponse(toApiKeyResponse(row), request.requestId));
}

/**
 * Create new API key
 */
async function createApiKey(
  request: FastifyRequest<{ Body: CreateApiKeyBody }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = getTenantId(request);
  const { name, description, scopes: requestedScopes, expires_in_days } = request.body;

  // Validate name
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    reply.status(400).send(
      createErrorResponse('validation_error', 'Name is required', request.requestId)
    );
    return;
  }

  if (name.length > 255) {
    reply.status(400).send(
      createErrorResponse('validation_error', 'Name must be 255 characters or less', request.requestId)
    );
    return;
  }

  // Validate and set scopes
  let scopes: ApiKeyScope[];
  if (requestedScopes) {
    const validatedScopes = validateScopes(requestedScopes);
    if (!validatedScopes) {
      reply.status(400).send(
        createErrorResponse(
          'validation_error',
          `Invalid scopes. Valid scopes: ${VALID_SCOPES.join(', ')}`,
          request.requestId
        )
      );
      return;
    }
    scopes = validatedScopes;
  } else {
    // Default scopes
    scopes = ['webhooks:read', 'webhooks:write', 'deliveries:read', 'api_keys:read'];
  }

  // Validate expires_in_days
  let expiresAt: Date | null = null;
  if (expires_in_days !== undefined) {
    if (typeof expires_in_days !== 'number' || expires_in_days < 1 || expires_in_days > 365) {
      reply.status(400).send(
        createErrorResponse(
          'validation_error',
          'expires_in_days must be between 1 and 365',
          request.requestId
        )
      );
      return;
    }
    expiresAt = new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000);
  }

  // Check tenant limit
  const limitCheck = await checkApiKeyLimit(tenantId);
  if (!limitCheck.allowed) {
    reply.status(403).send(
      createErrorResponse(
        'limit_exceeded',
        `API key limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan for more.`,
        request.requestId,
        { current: limitCheck.current, limit: limitCheck.limit }
      )
    );
    return;
  }

  // Generate API key
  const apiKey = generateAPIKey();
  const keyHash = hashAPIKey(apiKey);
  const keyPrefix = getAPIKeyPrefix(apiKey);
  const id = uuid();

  // Insert into database
  const row = await queryOne<ApiKeyRow>(
    `INSERT INTO api_keys (
      id, tenant_id, name, description,
      key_hash, key_prefix, scopes, expires_at,
      created_by_user_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      id,
      tenantId,
      name.trim(),
      description?.trim() || null,
      keyHash,
      keyPrefix,
      scopes,
      expiresAt,
      null, // created_by_user_id - would be set if using session auth
    ]
  );

  if (!row) {
    reply.status(500).send(
      createErrorResponse('internal_error', 'Failed to create API key', request.requestId)
    );
    return;
  }

  logger.info(
    { apiKeyId: id, tenantId, name, scopes },
    'API key created'
  );

  // Return response with key (only time it's shown)
  const response: ApiKeyCreatedResponse = {
    ...toApiKeyResponse(row),
    key: apiKey,
  };

  reply.status(201).send({
    data: response,
    meta: {
      request_id: request.requestId,
      timestamp: nowISO(),
      warning: 'Store this API key securely. It will not be shown again.',
    },
  });
}

/**
 * Revoke (delete) API key
 */
async function revokeApiKey(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = getTenantId(request);
  const currentApiKeyId = getApiKeyId(request);
  const { id } = request.params;

  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    reply.status(404).send(
      createErrorResponse('not_found', 'API key not found', request.requestId)
    );
    return;
  }

  // Prevent revoking the current API key
  if (id === currentApiKeyId) {
    reply.status(400).send(
      createErrorResponse(
        'invalid_operation',
        'Cannot revoke the API key currently in use',
        request.requestId
      )
    );
    return;
  }

  // Get API key to verify ownership and get hash for cache invalidation
  const existing = await queryOne<{ key_hash: string; revoked: boolean }>(
    'SELECT key_hash, revoked FROM api_keys WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );

  if (!existing) {
    reply.status(404).send(
      createErrorResponse('not_found', 'API key not found', request.requestId)
    );
    return;
  }

  if (existing.revoked) {
    reply.status(400).send(
      createErrorResponse('already_revoked', 'API key is already revoked', request.requestId)
    );
    return;
  }

  // Revoke the key
  await query(
    `UPDATE api_keys SET
      revoked = TRUE,
      revoked_at = NOW(),
      updated_at = NOW()
    WHERE id = $1`,
    [id]
  );

  // Invalidate cache
  await invalidateApiKeyCache(existing.key_hash);

  logger.info({ apiKeyId: id, tenantId }, 'API key revoked');

  reply.status(204).send();
}

/**
 * Update API key (name, description only)
 */
async function updateApiKey(
  request: FastifyRequest<{ Params: { id: string }; Body: { name?: string; description?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = getTenantId(request);
  const { id } = request.params;
  const { name, description } = request.body;

  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    reply.status(404).send(
      createErrorResponse('not_found', 'API key not found', request.requestId)
    );
    return;
  }

  // Check if at least one field to update
  if (name === undefined && description === undefined) {
    reply.status(400).send(
      createErrorResponse('validation_error', 'At least one field (name or description) is required', request.requestId)
    );
    return;
  }

  // Validate name if provided
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      reply.status(400).send(
        createErrorResponse('validation_error', 'Name cannot be empty', request.requestId)
      );
      return;
    }
    if (name.length > 255) {
      reply.status(400).send(
        createErrorResponse('validation_error', 'Name must be 255 characters or less', request.requestId)
      );
      return;
    }
  }

  // Build update query
  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(name.trim());
  }

  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(description?.trim() || null);
  }

  updates.push('updated_at = NOW()');

  // Execute update
  const row = await queryOne<ApiKeyRow>(
    `UPDATE api_keys SET ${updates.join(', ')}
     WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} AND revoked = FALSE
     RETURNING *`,
    [...params, id, tenantId]
  );

  if (!row) {
    reply.status(404).send(
      createErrorResponse('not_found', 'API key not found or already revoked', request.requestId)
    );
    return;
  }

  logger.info({ apiKeyId: id, tenantId }, 'API key updated');

  reply.send(createSuccessResponse(toApiKeyResponse(row), request.requestId));
}

/**
 * Get API key usage statistics
 */
async function getApiKeyStats(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = getTenantId(request);
  const { id } = request.params;

  // Validate UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    reply.status(404).send(
      createErrorResponse('not_found', 'API key not found', request.requestId)
    );
    return;
  }

  // Get API key
  const apiKey = await queryOne<ApiKeyRow>(
    'SELECT * FROM api_keys WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );

  if (!apiKey) {
    reply.status(404).send(
      createErrorResponse('not_found', 'API key not found', request.requestId)
    );
    return;
  }

  // Get recent usage from api_key_usage table
  const recentUsage = await queryAll<{
    endpoint: string;
    method: string;
    count: string;
  }>(
    `SELECT endpoint, method, COUNT(*) as count
     FROM api_key_usage
     WHERE api_key_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
     GROUP BY endpoint, method
     ORDER BY count DESC
     LIMIT 10`,
    [id]
  );

  // Get hourly usage for last 24 hours
  const hourlyUsage = await queryAll<{
    hour: Date;
    count: string;
  }>(
    `SELECT date_trunc('hour', created_at) as hour, COUNT(*) as count
     FROM api_key_usage
     WHERE api_key_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
     GROUP BY date_trunc('hour', created_at)
     ORDER BY hour`,
    [id]
  );

  reply.send(createSuccessResponse({
    api_key: toApiKeyResponse(apiKey),
    stats: {
      total_requests: parseInt(apiKey.use_count, 10),
      last_used_at: apiKey.last_used_at?.toISOString() ?? null,
      recent_endpoints: recentUsage.map(r => ({
        endpoint: r.endpoint,
        method: r.method,
        count: parseInt(r.count, 10),
      })),
      hourly_usage: hourlyUsage.map(h => ({
        hour: h.hour.toISOString(),
        count: parseInt(h.count, 10),
      })),
    },
  }, request.requestId));
}

// =============================================================================
// Route Registration
// =============================================================================

/**
 * API keys routes plugin
 */
export const apiKeysRoutes: FastifyPluginAsync = async (server) => {
  // List API keys
  server.get<{ Querystring: ListApiKeysQuery }>(
    '/',
    {
      preHandler: [authenticateApiKey, requireScopes(Scopes.API_KEYS_READ)],
      schema: {
        description: 'List API keys for the authenticated tenant',
        tags: ['API Keys'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'integer', minimum: 0, default: 0 },
            include_revoked: { type: 'boolean', default: false },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'array' },
              pagination: { type: 'object' },
            },
          },
        },
      },
    },
    listApiKeys
  );

  // Get single API key
  server.get<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: [authenticateApiKey, requireScopes(Scopes.API_KEYS_READ)],
      schema: {
        description: 'Get API key details',
        tags: ['API Keys'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    getApiKey
  );

  // Get API key stats
  server.get<{ Params: { id: string } }>(
    '/:id/stats',
    {
      preHandler: [authenticateApiKey, requireScopes(Scopes.API_KEYS_READ)],
      schema: {
        description: 'Get API key usage statistics',
        tags: ['API Keys'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    getApiKeyStats
  );

  // Create API key
  server.post<{ Body: CreateApiKeyBody }>(
    '/',
    {
      preHandler: [
        authenticateApiKey,
        requireScopes(Scopes.API_KEYS_WRITE),
        apiKeyCreateRateLimiter,
      ],
      schema: {
        description: 'Create a new API key',
        tags: ['API Keys'],
        body: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string', maxLength: 500 },
            scopes: {
              type: 'array',
              items: { type: 'string', enum: VALID_SCOPES },
              minItems: 1,
            },
            expires_in_days: { type: 'integer', minimum: 1, maximum: 365 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              data: { type: 'object' },
              meta: { type: 'object' },
            },
          },
        },
      },
    },
    createApiKey
  );

  // Update API key
  server.patch<{ Params: { id: string }; Body: { name?: string; description?: string } }>(
    '/:id',
    {
      preHandler: [authenticateApiKey, requireScopes(Scopes.API_KEYS_WRITE)],
      schema: {
        description: 'Update API key name or description',
        tags: ['API Keys'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string', maxLength: 500 },
          },
        },
      },
    },
    updateApiKey
  );

  // Revoke API key
  server.delete<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: [authenticateApiKey, requireScopes(Scopes.API_KEYS_WRITE)],
      schema: {
        description: 'Revoke (delete) an API key',
        tags: ['API Keys'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: { type: 'null' },
        },
      },
    },
    revokeApiKey
  );

  logger.info('API keys routes registered');
};

// =============================================================================
// Export
// =============================================================================

export default apiKeysRoutes;
