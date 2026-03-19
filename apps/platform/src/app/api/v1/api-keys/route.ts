// =============================================================================
// XRNotify Platform - API Keys API (Collection)
// =============================================================================
// GET /api/v1/api-keys - List API keys
// POST /api/v1/api-keys - Create API key
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createApiKeySchema } from '@xrnotify/shared';
import type { ApiKeyScope } from '@xrnotify/shared';
import { getCurrentSession } from '@/lib/auth/session';
import { 
  createApiKey, 
  listApiKeys,
} from '@/lib/auth/apiKey';
import { checkRateLimit } from '@/lib/rate-limit/tokenBucket';
import { createModuleLogger, logSecurityEvent } from '@/lib/logger';
import { 
  recordHttpRequest, 
  incHttpRequestsInFlight, 
  decHttpRequestsInFlight,
} from '@/lib/metrics';
import { generateRequestId } from '@xrnotify/shared';

export const dynamic = 'force-dynamic';

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

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = createModuleLogger('api-keys-api');

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
// GET /api/v1/api-keys - List API Keys
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
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

    // List API keys
    const apiKeys = await listApiKeys(tenantId);

    logger.debug({ 
      requestId, 
      tenantId, 
      count: apiKeys.length,
    }, 'Listed API keys');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/api-keys', status_code: '200' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        data: apiKeys.map(formatApiKeyResponse),
        meta: {
          total: apiKeys.length,
        },
      },
      {
        status: 200,
        headers: {
          ...rateLimitResult.headers,
          'X-Request-Id': requestId,
        },
      }
    );
  } catch (error) {
    logger.error({ error, requestId }, 'Failed to list API keys');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/api-keys', status_code: '500' },
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
// POST /api/v1/api-keys - Create API Key
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    // Check API key limit
    const existingKeys = await listApiKeys(tenantId);
    const maxApiKeys = 10; // Could be plan-based
    
    if (existingKeys.length >= maxApiKeys) {
      return NextResponse.json(
        {
          error: {
            code: 'LIMIT_EXCEEDED',
            message: `API key limit reached (${maxApiKeys}). Delete unused keys to create new ones.`,
          },
        },
        { status: 403 }
      );
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
    const parseResult = createApiKeySchema.safeParse(body);

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

    // Create API key
    const { apiKey, rawKey } = await createApiKey(
      tenantId,
      input.name,
      input.scopes as ApiKeyScope[],
      input.expires_at ? new Date(input.expires_at) : undefined
    );

    logger.info({ 
      requestId, 
      tenantId, 
      apiKeyId: apiKey.id,
      name: input.name,
      scopes: input.scopes,
    }, 'API key created');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'POST', route: '/api/v1/api-keys', status_code: '201' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        data: {
          ...formatApiKeyResponse(apiKey),
          key: rawKey, // Only returned on creation
        },
        message: 'API key created successfully. Copy the key now - it will not be shown again.',
      },
      {
        status: 201,
        headers: {
          ...rateLimitResult.headers,
          'X-Request-Id': requestId,
        },
      }
    );
  } catch (error) {
    logger.error({ error, requestId }, 'Failed to create API key');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'POST', route: '/api/v1/api-keys', status_code: '500' },
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

interface ApiKeyRecord {
  id: string;
  tenant_id: string;
  name: string;
  key_prefix: string;
  scopes: ApiKeyScope[];
  last_used_at?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function formatApiKeyResponse(apiKey: ApiKeyRecord): Record<string, unknown> {
  return {
    id: apiKey.id,
    name: apiKey.name,
    key_prefix: apiKey.key_prefix,
    scopes: apiKey.scopes,
    last_used_at: apiKey.last_used_at,
    expires_at: apiKey.expires_at,
    is_active: apiKey.is_active,
    created_at: apiKey.created_at,
    updated_at: apiKey.updated_at,
  };
}
