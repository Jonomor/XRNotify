/**
 * @fileoverview XRNotify API Key Authentication Middleware
 * Validates API keys and attaches tenant/user context to requests.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/middleware/authApiKey
 */

import { type FastifyRequest, type FastifyReply, type FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { createModuleLogger } from '../core/logger.js';
import { getConfig } from '../core/config.js';
import { queryOne, query } from '../core/db.js';
import { get, set } from '../core/redis.js';
import { recordApiKeyAuth, recordRateLimitHit } from '../core/metrics.js';
import { hashAPIKey, getAPIKeyPrefix } from '@xrnotify/shared';
import { createErrorResponse } from '../routes/index.js';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('auth');

/**
 * API key scope
 */
export type ApiKeyScope =
  | 'webhooks:read'
  | 'webhooks:write'
  | 'deliveries:read'
  | 'deliveries:replay'
  | 'api_keys:read'
  | 'api_keys:write'
  | 'billing:read'
  | 'billing:write';

/**
 * Authenticated API key info
 */
export interface AuthenticatedApiKey {
  id: string;
  tenantId: string;
  name: string;
  scopes: ApiKeyScope[];
  rateLimitMax: number | null;
  rateLimitWindowMs: number | null;
}

/**
 * Authenticated request context
 */
export interface AuthContext {
  apiKeyId: string;
  tenantId: string;
  scopes: ApiKeyScope[];
  rateLimitMax: number;
  rateLimitWindowMs: number;
}

/**
 * Extended request with auth context
 */
declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
    tenantId?: string;
    apiKeyId?: string;
  }
}

/**
 * Auth options for route handlers
 */
export interface AuthOptions {
  /**
   * Required scopes (any of these)
   */
  scopes?: ApiKeyScope[];

  /**
   * Require all scopes (default: false, any scope matches)
   */
  requireAllScopes?: boolean;

  /**
   * Skip authentication (for public routes)
   */
  skipAuth?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const API_KEY_HEADER = 'x-api-key';
const AUTH_HEADER = 'authorization';
const BEARER_PREFIX = 'Bearer ';
const API_KEY_CACHE_TTL = 300; // 5 minutes
const API_KEY_CACHE_PREFIX = 'apikey:';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Extract API key from request
 */
function extractApiKey(request: FastifyRequest): string | null {
  // Check X-API-Key header first
  const apiKeyHeader = request.headers[API_KEY_HEADER];
  if (apiKeyHeader && typeof apiKeyHeader === 'string') {
    return apiKeyHeader;
  }

  // Check Authorization header with Bearer prefix
  const authHeader = request.headers[AUTH_HEADER];
  if (authHeader && typeof authHeader === 'string') {
    if (authHeader.startsWith(BEARER_PREFIX)) {
      return authHeader.slice(BEARER_PREFIX.length);
    }
  }

  return null;
}

/**
 * Validate API key format
 */
function isValidApiKeyFormat(key: string): boolean {
  // Format: xrn_<base64url> (at least 32 chars total)
  return /^xrn_[A-Za-z0-9_-]{28,}$/.test(key);
}

/**
 * Get cached API key info
 */
async function getCachedApiKey(keyHash: string): Promise<AuthenticatedApiKey | null> {
  try {
    const cached = await get(`${API_KEY_CACHE_PREFIX}${keyHash}`);
    if (cached) {
      return JSON.parse(cached) as AuthenticatedApiKey;
    }
  } catch (error) {
    logger.warn({ err: error }, 'Failed to get cached API key');
  }
  return null;
}

/**
 * Cache API key info
 */
async function cacheApiKey(keyHash: string, apiKey: AuthenticatedApiKey): Promise<void> {
  try {
    await set(
      `${API_KEY_CACHE_PREFIX}${keyHash}`,
      JSON.stringify(apiKey),
      API_KEY_CACHE_TTL
    );
  } catch (error) {
    logger.warn({ err: error }, 'Failed to cache API key');
  }
}

/**
 * Invalidate cached API key
 */
export async function invalidateApiKeyCache(keyHash: string): Promise<void> {
  const { del } = await import('../core/redis.js');
  try {
    await del(`${API_KEY_CACHE_PREFIX}${keyHash}`);
  } catch (error) {
    logger.warn({ err: error }, 'Failed to invalidate API key cache');
  }
}

/**
 * Validate API key against database
 */
async function validateApiKeyFromDb(keyHash: string): Promise<AuthenticatedApiKey | null> {
  interface ApiKeyRow {
    id: string;
    tenant_id: string;
    name: string;
    scopes: ApiKeyScope[];
    rate_limit_max: number | null;
    rate_limit_window_ms: number | null;
    revoked: boolean;
    expires_at: Date | null;
  }

  const row = await queryOne<ApiKeyRow>(
    `SELECT 
      id, tenant_id, name, scopes,
      rate_limit_max, rate_limit_window_ms,
      revoked, expires_at
    FROM api_keys
    WHERE key_hash = $1`,
    [keyHash]
  );

  if (!row) {
    return null;
  }

  // Check if revoked
  if (row.revoked) {
    logger.debug({ apiKeyId: row.id }, 'API key is revoked');
    return null;
  }

  // Check if expired
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    logger.debug({ apiKeyId: row.id }, 'API key is expired');
    return null;
  }

  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    scopes: row.scopes,
    rateLimitMax: row.rate_limit_max,
    rateLimitWindowMs: row.rate_limit_window_ms,
  };
}

/**
 * Record API key usage (async, non-blocking)
 */
function recordUsage(apiKeyId: string, ip: string): void {
  // Fire and forget
  query(
    `UPDATE api_keys SET
      last_used_at = NOW(),
      last_used_ip = $1,
      use_count = use_count + 1,
      updated_at = NOW()
    WHERE id = $2`,
    [ip, apiKeyId]
  ).catch((error) => {
    logger.warn({ err: error, apiKeyId }, 'Failed to record API key usage');
  });
}

// =============================================================================
// Middleware
// =============================================================================

/**
 * API key authentication middleware
 */
export async function authenticateApiKey(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const config = getConfig();

  // Extract API key
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    recordApiKeyAuth(false);
    reply.status(401).send(
      createErrorResponse(
        'unauthorized',
        'API key required. Provide via X-API-Key header or Authorization: Bearer <key>',
        request.requestId
      )
    );
    return;
  }

  // Validate format
  if (!isValidApiKeyFormat(apiKey)) {
    recordApiKeyAuth(false);
    reply.status(401).send(
      createErrorResponse(
        'invalid_api_key',
        'Invalid API key format',
        request.requestId
      )
    );
    return;
  }

  // Hash the key
  const keyHash = hashAPIKey(apiKey);

  // Try cache first
  let apiKeyInfo = await getCachedApiKey(keyHash);

  // Validate against database if not cached
  if (!apiKeyInfo) {
    apiKeyInfo = await validateApiKeyFromDb(keyHash);

    if (!apiKeyInfo) {
      recordApiKeyAuth(false);
      reply.status(401).send(
        createErrorResponse(
          'invalid_api_key',
          'Invalid or expired API key',
          request.requestId
        )
      );
      return;
    }

    // Cache for future requests
    await cacheApiKey(keyHash, apiKeyInfo);
  }

  // Check if tenant is active
  const tenantActive = await queryOne<{ active: boolean }>(
    'SELECT active FROM tenants WHERE id = $1',
    [apiKeyInfo.tenantId]
  );

  if (!tenantActive?.active) {
    recordApiKeyAuth(false);
    reply.status(403).send(
      createErrorResponse(
        'tenant_suspended',
        'Your account has been suspended',
        request.requestId
      )
    );
    return;
  }

  // Set auth context on request
  request.auth = {
    apiKeyId: apiKeyInfo.id,
    tenantId: apiKeyInfo.tenantId,
    scopes: apiKeyInfo.scopes,
    rateLimitMax: apiKeyInfo.rateLimitMax ?? config.rateLimit.apiKeyMax,
    rateLimitWindowMs: apiKeyInfo.rateLimitWindowMs ?? config.rateLimit.apiKeyWindowMs,
  };

  // Set convenience properties
  request.tenantId = apiKeyInfo.tenantId;
  request.apiKeyId = apiKeyInfo.id;

  // Record usage (non-blocking)
  recordUsage(apiKeyInfo.id, request.ip);

  // Record successful auth
  recordApiKeyAuth(true);

  logger.debug(
    {
      apiKeyId: apiKeyInfo.id,
      tenantId: apiKeyInfo.tenantId,
      scopes: apiKeyInfo.scopes,
    },
    'API key authenticated'
  );
}

/**
 * Create scope checking middleware
 */
export function requireScopes(
  scopes: ApiKeyScope[],
  requireAll: boolean = false
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.auth) {
      reply.status(401).send(
        createErrorResponse(
          'unauthorized',
          'Authentication required',
          request.requestId
        )
      );
      return;
    }

    const hasScope = requireAll
      ? scopes.every((s) => request.auth!.scopes.includes(s))
      : scopes.some((s) => request.auth!.scopes.includes(s));

    if (!hasScope) {
      reply.status(403).send(
        createErrorResponse(
          'forbidden',
          `Insufficient permissions. Required scope(s): ${scopes.join(', ')}`,
          request.requestId,
          {
            required_scopes: scopes,
            has_scopes: request.auth.scopes,
            require_all: requireAll,
          }
        )
      );
      return;
    }
  };
}

/**
 * Require specific scopes decorator
 */
export function withScopes(
  scopes: ApiKeyScope[],
  requireAll: boolean = false
) {
  return {
    preHandler: [authenticateApiKey, requireScopes(scopes, requireAll)],
  };
}

// =============================================================================
// Fastify Plugin
// =============================================================================

/**
 * Auth plugin options
 */
export interface AuthPluginOptions {
  /**
   * Routes to skip authentication
   */
  skipRoutes?: string[];

  /**
   * Route prefixes to skip authentication
   */
  skipPrefixes?: string[];
}

/**
 * Auth plugin
 */
const authPluginImpl: FastifyPluginAsync<AuthPluginOptions> = async (
  server,
  options
) => {
  const skipRoutes = new Set(options.skipRoutes ?? []);
  const skipPrefixes = options.skipPrefixes ?? [];

  // Add auth hook to all routes
  server.addHook('preHandler', async (request, reply) => {
    // Skip health/metrics routes
    if (
      request.url === '/healthz' ||
      request.url === '/readyz' ||
      request.url === '/health' ||
      request.url === '/metrics' ||
      request.url === '/'
    ) {
      return;
    }

    // Skip configured routes
    if (skipRoutes.has(request.url)) {
      return;
    }

    // Skip configured prefixes
    for (const prefix of skipPrefixes) {
      if (request.url.startsWith(prefix)) {
        return;
      }
    }

    // Skip if route explicitly opts out
    const routeOptions = request.routeOptions;
    if (routeOptions?.config?.skipAuth) {
      return;
    }

    // Authenticate
    await authenticateApiKey(request, reply);
  });

  logger.info('Auth plugin registered');
};

export const authPlugin = fp(authPluginImpl, {
  name: 'auth',
  fastify: '4.x',
});

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if request has any of the specified scopes
 */
export function hasAnyScope(request: FastifyRequest, scopes: ApiKeyScope[]): boolean {
  if (!request.auth) {
    return false;
  }
  return scopes.some((s) => request.auth!.scopes.includes(s));
}

/**
 * Check if request has all specified scopes
 */
export function hasAllScopes(request: FastifyRequest, scopes: ApiKeyScope[]): boolean {
  if (!request.auth) {
    return false;
  }
  return scopes.every((s) => request.auth!.scopes.includes(s));
}

/**
 * Get tenant ID from request (throws if not authenticated)
 */
export function getTenantId(request: FastifyRequest): string {
  if (!request.tenantId) {
    throw new Error('Request not authenticated');
  }
  return request.tenantId;
}

/**
 * Get API key ID from request (throws if not authenticated)
 */
export function getApiKeyId(request: FastifyRequest): string {
  if (!request.apiKeyId) {
    throw new Error('Request not authenticated');
  }
  return request.apiKeyId;
}

/**
 * Assert tenant matches (for multi-tenant resource access)
 */
export function assertTenantAccess(
  request: FastifyRequest,
  resourceTenantId: string
): void {
  const tenantId = getTenantId(request);
  if (tenantId !== resourceTenantId) {
    throw Object.assign(new Error('Resource not found'), {
      statusCode: 404,
      code: 'not_found',
    });
  }
}

// =============================================================================
// Pre-built Scope Combinations
// =============================================================================

export const Scopes = {
  // Webhook management
  WEBHOOKS_READ: ['webhooks:read'] as ApiKeyScope[],
  WEBHOOKS_WRITE: ['webhooks:write'] as ApiKeyScope[],
  WEBHOOKS_MANAGE: ['webhooks:read', 'webhooks:write'] as ApiKeyScope[],

  // Delivery management
  DELIVERIES_READ: ['deliveries:read'] as ApiKeyScope[],
  DELIVERIES_REPLAY: ['deliveries:replay'] as ApiKeyScope[],
  DELIVERIES_MANAGE: ['deliveries:read', 'deliveries:replay'] as ApiKeyScope[],

  // API key management
  API_KEYS_READ: ['api_keys:read'] as ApiKeyScope[],
  API_KEYS_WRITE: ['api_keys:write'] as ApiKeyScope[],
  API_KEYS_MANAGE: ['api_keys:read', 'api_keys:write'] as ApiKeyScope[],

  // Billing
  BILLING_READ: ['billing:read'] as ApiKeyScope[],
  BILLING_WRITE: ['billing:write'] as ApiKeyScope[],
  BILLING_MANAGE: ['billing:read', 'billing:write'] as ApiKeyScope[],

  // Full access
  FULL_ACCESS: [
    'webhooks:read',
    'webhooks:write',
    'deliveries:read',
    'deliveries:replay',
    'api_keys:read',
    'api_keys:write',
    'billing:read',
    'billing:write',
  ] as ApiKeyScope[],
} as const;

// =============================================================================
// Export
// =============================================================================

export default authPlugin;
