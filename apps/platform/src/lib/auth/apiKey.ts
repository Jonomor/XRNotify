// =============================================================================
// XRNotify Platform - API Key Authentication
// =============================================================================
// API key validation, caching, tenant lookup, scope checking
// =============================================================================

import { 
  hashApiKey, 
  verifyApiKey, 
  isValidApiKeyFormat,
  generateApiKey as generateApiKeyRaw,
} from '@xrnotify/shared';
import type { ApiKey, ApiKeyScope, Tenant, TenantSettings } from '@xrnotify/shared';
import { queryOne, query } from '../db';
import { get, set, del } from '../redis';
import { createModuleLogger, logSecurityEvent } from '../logger';
import { parseJsonArray } from '../utils/db';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface AuthenticatedContext {
  tenantId: string;
  tenant: Tenant;
  apiKeyId: string;
  apiKey: ApiKey;
  scopes: ApiKeyScope[];
}

export interface ApiKeyValidationResult {
  valid: boolean;
  context?: AuthenticatedContext;
  error?: string;
  errorCode?: 'INVALID_FORMAT' | 'NOT_FOUND' | 'INACTIVE' | 'EXPIRED' | 'TENANT_INACTIVE';
}

interface CachedApiKeyData {
  apiKey: ApiKey;
  tenant: Tenant;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const API_KEY_CACHE_TTL = 300; // 5 minutes
const API_KEY_CACHE_PREFIX = 'auth:apikey:';
const HEADER_NAME = 'x-xrnotify-key';
const HEADER_NAME_ALT = 'authorization';

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = createModuleLogger('api-key-auth');

// -----------------------------------------------------------------------------
// API Key Extraction
// -----------------------------------------------------------------------------

/**
 * Extract API key from request headers
 * Supports: X-XRNotify-Key header or Authorization: Bearer <key>
 */
export function extractApiKey(headers: Record<string, string | string[] | undefined>): string | null {
  // Check X-XRNotify-Key header first
  const xrnotifyKey = headers[HEADER_NAME] || headers[HEADER_NAME.toLowerCase()];
  if (xrnotifyKey) {
    return Array.isArray(xrnotifyKey) ? xrnotifyKey[0] ?? null : xrnotifyKey;
  }

  // Check Authorization header
  const authHeader = headers[HEADER_NAME_ALT] || headers['Authorization'];
  if (authHeader) {
    const value = Array.isArray(authHeader) ? authHeader[0] : authHeader;
    if (value?.startsWith('Bearer ')) {
      return value.slice(7);
    }
  }

  return null;
}

// -----------------------------------------------------------------------------
// API Key Validation
// -----------------------------------------------------------------------------

/**
 * Validate an API key and return the authenticated context
 */
export async function validateApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
  // Check format
  if (!isValidApiKeyFormat(apiKey)) {
    logger.debug('Invalid API key format');
    return {
      valid: false,
      error: 'Invalid API key format',
      errorCode: 'INVALID_FORMAT',
    };
  }

  // Try cache first
  const cached = await getCachedApiKey(apiKey);
  if (cached) {
    return validateCachedData(cached, apiKey);
  }

  // Look up in database
  const keyHash = hashApiKey(apiKey);
  
  const row = await queryOne<{
    api_key_id: string;
    api_key_name: string;
    api_key_hash: string;
    api_key_prefix: string;
    api_key_scopes: ApiKeyScope[];
    api_key_last_used_at: Date | null;
    api_key_expires_at: Date | null;
    api_key_is_active: boolean;
    api_key_created_at: Date;
    api_key_updated_at: Date;
    tenant_id: string;
    tenant_name: string;
    tenant_email: string;
    tenant_plan: string;
    tenant_is_active: boolean;
    tenant_stripe_customer_id: string | null;
    tenant_stripe_subscription_id: string | null;
    tenant_settings: TenantSettings;
    tenant_created_at: Date;
    tenant_updated_at: Date;
  }>(`
    SELECT 
      ak.id as api_key_id,
      ak.name as api_key_name,
      ak.key_hash as api_key_hash,
      ak.key_prefix as api_key_prefix,
      ak.scopes as api_key_scopes,
      ak.last_used_at as api_key_last_used_at,
      ak.expires_at as api_key_expires_at,
      ak.is_active as api_key_is_active,
      ak.created_at as api_key_created_at,
      ak.updated_at as api_key_updated_at,
      t.id as tenant_id,
      t.name as tenant_name,
      t.email as tenant_email,
      t.plan as tenant_plan,
      t.is_active as tenant_is_active,
      t.stripe_customer_id as tenant_stripe_customer_id,
      t.stripe_subscription_id as tenant_stripe_subscription_id,
      t.settings as tenant_settings,
      t.created_at as tenant_created_at,
      t.updated_at as tenant_updated_at
    FROM api_keys ak
    JOIN tenants t ON ak.tenant_id = t.id
    WHERE ak.key_hash = $1
  `, [keyHash]);

  if (!row) {
    logSecurityEvent(logger, 'auth_failed', { reason: 'API key not found' });
    return {
      valid: false,
      error: 'Invalid API key',
      errorCode: 'NOT_FOUND',
    };
  }

  // Verify the key (timing-safe)
  if (!verifyApiKey(apiKey, row.api_key_hash)) {
    logSecurityEvent(logger, 'auth_failed', { reason: 'API key hash mismatch' });
    return {
      valid: false,
      error: 'Invalid API key',
      errorCode: 'NOT_FOUND',
    };
  }

  // Build objects
  const apiKeyObj: ApiKey = {
    id: row.api_key_id,
    tenant_id: row.tenant_id,
    name: row.api_key_name,
    key_hash: row.api_key_hash,
    key_prefix: row.api_key_prefix,
    scopes: parseJsonArray(row.api_key_scopes) as ApiKeyScope[],
    last_used_at: row.api_key_last_used_at?.toISOString(),
    expires_at: row.api_key_expires_at?.toISOString(),
    is_active: row.api_key_is_active,
    created_at: row.api_key_created_at.toISOString(),
    updated_at: row.api_key_updated_at.toISOString(),
  };

  const tenantObj: Tenant = {
    id: row.tenant_id,
    name: row.tenant_name,
    email: row.tenant_email,
    plan: row.tenant_plan as Tenant['plan'],
    is_active: row.tenant_is_active,
    stripe_customer_id: row.tenant_stripe_customer_id ?? undefined,
    stripe_subscription_id: row.tenant_stripe_subscription_id ?? undefined,
    settings: row.tenant_settings,
    created_at: row.tenant_created_at.toISOString(),
    updated_at: row.tenant_updated_at.toISOString(),
  };

  // Cache the result
  await cacheApiKey(apiKey, { apiKey: apiKeyObj, tenant: tenantObj });

  // Validate and return
  return validateCachedData({ apiKey: apiKeyObj, tenant: tenantObj }, apiKey);
}

/**
 * Validate cached API key data
 */
function validateCachedData(data: CachedApiKeyData, rawKey: string): ApiKeyValidationResult {
  const { apiKey, tenant } = data;

  // Check API key is active
  if (!apiKey.is_active) {
    logSecurityEvent(logger, 'auth_failed', { 
      reason: 'API key inactive',
      apiKeyId: apiKey.id,
    });
    return {
      valid: false,
      error: 'API key is inactive',
      errorCode: 'INACTIVE',
    };
  }

  // Check expiration
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    logSecurityEvent(logger, 'auth_failed', { 
      reason: 'API key expired',
      apiKeyId: apiKey.id,
    });
    return {
      valid: false,
      error: 'API key has expired',
      errorCode: 'EXPIRED',
    };
  }

  // Check tenant is active
  if (!tenant.is_active) {
    logSecurityEvent(logger, 'auth_failed', { 
      reason: 'Tenant inactive',
      tenantId: tenant.id,
    });
    return {
      valid: false,
      error: 'Account is inactive',
      errorCode: 'TENANT_INACTIVE',
    };
  }

  // Update last used (fire and forget)
  updateLastUsed(apiKey.id).catch((err) => {
    logger.error({ err, apiKeyId: apiKey.id }, 'Failed to update API key last_used_at');
  });

  logger.debug({ 
    apiKeyId: apiKey.id, 
    tenantId: tenant.id,
    scopes: apiKey.scopes,
  }, 'API key validated');

  return {
    valid: true,
    context: {
      tenantId: tenant.id,
      tenant,
      apiKeyId: apiKey.id,
      apiKey,
      scopes: apiKey.scopes,
    },
  };
}

// -----------------------------------------------------------------------------
// Scope Checking
// -----------------------------------------------------------------------------

/**
 * Check if the authenticated context has the required scope
 */
export function hasScope(context: AuthenticatedContext, scope: ApiKeyScope): boolean {
  return context.scopes.includes(scope);
}

/**
 * Check if the authenticated context has any of the required scopes
 */
export function hasAnyScope(context: AuthenticatedContext, scopes: ApiKeyScope[]): boolean {
  return scopes.some((scope) => context.scopes.includes(scope));
}

/**
 * Check if the authenticated context has all of the required scopes
 */
export function hasAllScopes(context: AuthenticatedContext, scopes: ApiKeyScope[]): boolean {
  return scopes.every((scope) => context.scopes.includes(scope));
}

/**
 * Require a specific scope, throwing if not present
 */
export function requireScope(context: AuthenticatedContext, scope: ApiKeyScope): void {
  if (!hasScope(context, scope)) {
    throw new ApiKeyScopeError(`Missing required scope: ${scope}`, scope);
  }
}

/**
 * Custom error for scope failures
 */
export class ApiKeyScopeError extends Error {
  public readonly scope: ApiKeyScope;
  
  constructor(message: string, scope: ApiKeyScope) {
    super(message);
    this.name = 'ApiKeyScopeError';
    this.scope = scope;
  }
}

// -----------------------------------------------------------------------------
// Caching
// -----------------------------------------------------------------------------

/**
 * Get cached API key data
 */
async function getCachedApiKey(apiKey: string): Promise<CachedApiKeyData | null> {
  const cacheKey = `${API_KEY_CACHE_PREFIX}${hashApiKey(apiKey)}`;
  const cached = await get(cacheKey);
  
  if (!cached) return null;
  
  try {
    return JSON.parse(cached) as CachedApiKeyData;
  } catch {
    return null;
  }
}

/**
 * Cache API key data
 */
async function cacheApiKey(apiKey: string, data: CachedApiKeyData): Promise<void> {
  const cacheKey = `${API_KEY_CACHE_PREFIX}${hashApiKey(apiKey)}`;
  await set(cacheKey, JSON.stringify(data), API_KEY_CACHE_TTL);
}

/**
 * Invalidate cached API key
 */
export async function invalidateApiKeyCache(apiKeyId: string, keyHash: string): Promise<void> {
  const cacheKey = `${API_KEY_CACHE_PREFIX}${keyHash}`;
  await del(cacheKey);
  logger.debug({ apiKeyId }, 'API key cache invalidated');
}

// -----------------------------------------------------------------------------
// Usage Tracking
// -----------------------------------------------------------------------------

/**
 * Update last_used_at timestamp (non-blocking)
 */
async function updateLastUsed(apiKeyId: string): Promise<void> {
  await query(
    'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
    [apiKeyId],
    { log: false }
  );
}

// -----------------------------------------------------------------------------
// API Key Management
// -----------------------------------------------------------------------------

/**
 * Generate a new API key
 */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  return generateApiKeyRaw();
}

/**
 * Create an API key in the database
 */
export async function createApiKey(
  tenantId: string,
  name: string,
  scopes: ApiKeyScope[],
  expiresAt?: Date
): Promise<{ apiKey: ApiKey; rawKey: string }> {
  const { key, hash, prefix } = generateApiKeyRaw();
  
  const row = await queryOne<ApiKey>(`
    INSERT INTO api_keys (tenant_id, name, key_hash, key_prefix, scopes, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING 
      id,
      tenant_id,
      name,
      key_hash,
      key_prefix,
      scopes,
      last_used_at,
      expires_at,
      is_active,
      created_at,
      updated_at
  `, [tenantId, name, hash, prefix, scopes, expiresAt ?? null]);

  if (!row) {
    throw new Error('Failed to create API key');
  }

  logger.info({ apiKeyId: row.id, tenantId, name }, 'API key created');

  return {
    apiKey: {
      ...row,
      scopes: parseJsonArray(row.scopes) as ApiKeyScope[],
      last_used_at: row.last_used_at ?? undefined,
      expires_at: row.expires_at ?? undefined,
    },
    rawKey: key,
  };
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(apiKeyId: string, tenantId: string): Promise<boolean> {
  const result = await query(`
    UPDATE api_keys 
    SET is_active = false, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2
    RETURNING key_hash
  `, [apiKeyId, tenantId]);

  if (result.rowCount === 0) {
    return false;
  }

  const keyHash = result.rows[0]?.['key_hash'];
  if (keyHash) {
    await invalidateApiKeyCache(apiKeyId, keyHash);
  }

  logger.info({ apiKeyId, tenantId }, 'API key revoked');
  return true;
}

/**
 * List API keys for a tenant
 */
export async function listApiKeys(tenantId: string): Promise<ApiKey[]> {
  const result = await query<ApiKey>(`
    SELECT 
      id,
      tenant_id,
      name,
      key_prefix,
      scopes,
      last_used_at,
      expires_at,
      is_active,
      created_at,
      updated_at
    FROM api_keys
    WHERE tenant_id = $1
    ORDER BY created_at DESC
  `, [tenantId]);

  return result.rows.map((row) => ({
    ...row,
    key_hash: '[REDACTED]',
    scopes: parseJsonArray(row.scopes) as ApiKeyScope[],
    last_used_at: row.last_used_at ?? undefined,
    expires_at: row.expires_at ?? undefined,
  }));
}
