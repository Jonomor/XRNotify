// =============================================================================
// XRNotify Platform - API Key API (Single Resource)
// =============================================================================
// GET /api/v1/api-keys/[id] - Get API key details
// PATCH /api/v1/api-keys/[id] - Update API key (name, scopes, active status)
// DELETE /api/v1/api-keys/[id] - Revoke/delete API key
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { updateApiKeySchema } from '@xrnotify/shared';
import type { ApiKeyScope } from '@xrnotify/shared';
import { getCurrentSession } from '@/lib/auth/session';
import { 
  listApiKeys,
  revokeApiKey,
} from '@/lib/auth/apiKey';
import { query, queryOne } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit/tokenBucket';
import { createModuleLogger, logSecurityEvent } from '@/lib/logger';
import { 
  recordHttpRequest, 
  incHttpRequestsInFlight, 
  decHttpRequestsInFlight,
} from '@/lib/metrics';
import { generateRequestId } from '@xrnotify/shared';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ApiKeyRecord {
  id: string;
  tenant_id: string;
  name: string;
  key_prefix: string;
  scopes: ApiKeyScope[];
  last_used_at: Date | null;
  expires_at: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = createModuleLogger('api-key-api');

// -----------------------------------------------------------------------------
// Session Authentication Helper
// -----------------------------------------------------------------------------

async function authenticateSession(): Promise<
  { tenantId: string; email: string } | { error: NextResponse<ApiErrorResponse> }
> {
  const session = await getCurrentSession();

  if (!session) {
    logSecurityEvent(logger, 'auth_failed', { reason: 'No session' });
    return {
      error: NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required. Please log in.',
          },
        },
        { status: 401 }
      ),
    };
  }

  if (!session.tenant.is_active) {
    return {
      error: NextResponse.json(
        {
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: 'Your account is inactive.',
          },
        },
        { status: 403 }
      ),
    };
  }

  return { tenantId: session.tenantId, email: session.email };
}

// -----------------------------------------------------------------------------
// Rate Limit Helper
// -----------------------------------------------------------------------------

async function checkApiRateLimit(
  tenantId: string
): Promise<{ allowed: true; headers: Record<string, string> } | { error: NextResponse<ApiErrorResponse> }> {
  const { allowed, headers, retryAfter } = await checkRateLimit(tenantId);

  if (!allowed) {
    logSecurityEvent(logger, 'rate_limited', { tenantId });
    return {
      error: NextResponse.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please slow down.',
          },
        },
        { 
          status: 429,
          headers: {
            ...headers,
            'Retry-After': String(retryAfter ?? 60),
          },
        }
      ),
    };
  }

  return { allowed: true, headers };
}

// -----------------------------------------------------------------------------
// GET /api/v1/api-keys/[id] - Get API Key
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id: apiKeyId } = await params;
  const requestId = generateRequestId();
  const startTime = performance.now();
  incHttpRequestsInFlight();

  try {
    // Authenticate via session
    const authResult = await authenticateSession();
    if ('error' in authResult) {
      return authResult.error;
    }
    const { tenantId } = authResult;

    // Rate limit
    const rateLimitResult = await checkApiRateLimit(tenantId);
    if ('error' in rateLimitResult) {
      return rateLimitResult.error;
    }

    // Get API key
    const apiKey = await queryOne<ApiKeyRecord>(`
      SELECT 
        id, tenant_id, name, key_prefix, scopes,
        last_used_at, expires_at, is_active,
        created_at, updated_at
      FROM api_keys
      WHERE id = $1 AND tenant_id = $2
    `, [apiKeyId, tenantId]);

    if (!apiKey) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'API key not found',
          },
        },
        { 
          status: 404,
          headers: { 'X-Request-Id': requestId },
        }
      );
    }

    logger.debug({ requestId, apiKeyId }, 'Retrieved API key');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/api-keys/[id]', status_code: '200' },
      durationMs / 1000
    );

    return NextResponse.json(
      { data: formatApiKeyResponse(apiKey) },
      {
        status: 200,
        headers: {
          ...rateLimitResult.headers,
          'X-Request-Id': requestId,
        },
      }
    );
  } catch (error) {
    logger.error({ error, requestId, apiKeyId }, 'Failed to get API key');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/api-keys/[id]', status_code: '500' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { 
        status: 500,
        headers: { 'X-Request-Id': requestId },
      }
    );
  } finally {
    decHttpRequestsInFlight();
  }
}

// -----------------------------------------------------------------------------
// PATCH /api/v1/api-keys/[id] - Update API Key
// -----------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id: apiKeyId } = await params;
  const requestId = generateRequestId();
  const startTime = performance.now();
  incHttpRequestsInFlight();

  try {
    // Authenticate via session
    const authResult = await authenticateSession();
    if ('error' in authResult) {
      return authResult.error;
    }
    const { tenantId } = authResult;

    // Rate limit
    const rateLimitResult = await checkApiRateLimit(tenantId);
    if ('error' in rateLimitResult) {
      return rateLimitResult.error;
    }

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_JSON',
            message: 'Request body must be valid JSON',
          },
        },
        { status: 400 }
      );
    }

    // Validate body
    const parseResult = updateApiKeySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parseResult.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const input = parseResult.data;

    // Check if there's anything to update
    if (Object.keys(input).length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No fields to update',
          },
        },
        { status: 400 }
      );
    }

    // Build update query
    const updates: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(input.name);
      paramIndex++;
    }

    if (input.scopes !== undefined) {
      updates.push(`scopes = $${paramIndex}`);
      values.push(input.scopes);
      paramIndex++;
    }

    if (input.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(input.is_active);
      paramIndex++;
    }

    // Add WHERE conditions
    values.push(apiKeyId, tenantId);

    const apiKey = await queryOne<ApiKeyRecord>(`
      UPDATE api_keys
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
      RETURNING 
        id, tenant_id, name, key_prefix, scopes,
        last_used_at, expires_at, is_active,
        created_at, updated_at
    `, values);

    if (!apiKey) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'API key not found',
          },
        },
        { 
          status: 404,
          headers: { 'X-Request-Id': requestId },
        }
      );
    }

    logger.info({ requestId, apiKeyId, updates: Object.keys(input) }, 'API key updated');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'PATCH', route: '/api/v1/api-keys/[id]', status_code: '200' },
      durationMs / 1000
    );

    return NextResponse.json(
      { data: formatApiKeyResponse(apiKey) },
      {
        status: 200,
        headers: {
          ...rateLimitResult.headers,
          'X-Request-Id': requestId,
        },
      }
    );
  } catch (error) {
    logger.error({ error, requestId, apiKeyId }, 'Failed to update API key');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'PATCH', route: '/api/v1/api-keys/[id]', status_code: '500' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { 
        status: 500,
        headers: { 'X-Request-Id': requestId },
      }
    );
  } finally {
    decHttpRequestsInFlight();
  }
}

// -----------------------------------------------------------------------------
// DELETE /api/v1/api-keys/[id] - Delete/Revoke API Key
// -----------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id: apiKeyId } = await params;
  const requestId = generateRequestId();
  const startTime = performance.now();
  incHttpRequestsInFlight();

  try {
    // Authenticate via session
    const authResult = await authenticateSession();
    if ('error' in authResult) {
      return authResult.error;
    }
    const { tenantId } = authResult;

    // Rate limit
    const rateLimitResult = await checkApiRateLimit(tenantId);
    if ('error' in rateLimitResult) {
      return rateLimitResult.error;
    }

    // Check minimum API key requirement - need at least one active key
    const allKeys = await listApiKeys(tenantId);
    const activeKeys = allKeys.filter(k => k.is_active && k.id !== apiKeyId);
    
    if (activeKeys.length === 0) {
      // Check if we're deleting the last active key
      const keyToDelete = allKeys.find(k => k.id === apiKeyId);
      if (keyToDelete?.is_active) {
        return NextResponse.json(
          {
            error: {
              code: 'LAST_KEY',
              message: 'Cannot delete the last active API key. Create a new key first.',
            },
          },
          { status: 400 }
        );
      }
    }

    // Revoke the API key
    const revoked = await revokeApiKey(apiKeyId, tenantId);

    if (!revoked) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'API key not found',
          },
        },
        { 
          status: 404,
          headers: { 'X-Request-Id': requestId },
        }
      );
    }

    logger.info({ requestId, apiKeyId }, 'API key revoked');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'DELETE', route: '/api/v1/api-keys/[id]', status_code: '204' },
      durationMs / 1000
    );

    return new NextResponse(null, {
      status: 204,
      headers: {
        ...rateLimitResult.headers,
        'X-Request-Id': requestId,
      },
    });
  } catch (error) {
    logger.error({ error, requestId, apiKeyId }, 'Failed to delete API key');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'DELETE', route: '/api/v1/api-keys/[id]', status_code: '500' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { 
        status: 500,
        headers: { 'X-Request-Id': requestId },
      }
    );
  } finally {
    decHttpRequestsInFlight();
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatApiKeyResponse(apiKey: ApiKeyRecord): Record<string, unknown> {
  return {
    id: apiKey.id,
    name: apiKey.name,
    key_prefix: apiKey.key_prefix,
    scopes: apiKey.scopes,
    last_used_at: apiKey.last_used_at?.toISOString() ?? null,
    expires_at: apiKey.expires_at?.toISOString() ?? null,
    is_active: apiKey.is_active,
    created_at: apiKey.created_at.toISOString(),
    updated_at: apiKey.updated_at.toISOString(),
  };
}
