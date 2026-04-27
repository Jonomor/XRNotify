// =============================================================================
// XRNotify Platform - Webhooks API (Collection)
// =============================================================================
// GET /api/v1/webhooks - List webhooks
// POST /api/v1/webhooks - Create webhook
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createWebhookSchema, listWebhooksQuerySchema } from '@xrnotify/shared';
import {
  extractApiKey,
  validateApiKey,
  hasScope,
  type AuthenticatedContext,
} from '@/lib/auth/apiKey';
import { getCurrentSession } from '@/lib/auth/session';
import {
  createWebhook,
  listWebhooks,
  WebhookValidationError,
} from '@/lib/webhooks/service';
import { checkRateLimit } from '@/lib/rate-limit/tokenBucket';
import { createModuleLogger, logSecurityEvent } from '@/lib/logger';
import { 
  recordHttpRequest, 
  incHttpRequestsInFlight, 
  decHttpRequestsInFlight,
} from '@/lib/metrics';
import { generateRequestId } from '@xrnotify/shared';
import { withNemoClawGovernance } from '@/lib/hunie';

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

const logger = createModuleLogger('webhooks-api');

// -----------------------------------------------------------------------------
// Authentication Helper
// -----------------------------------------------------------------------------

// tenantId resolved from either session cookie or API key
type AuthResult =
  | { tenantId: string; tenantSettings?: Record<string, unknown>; apiContext?: AuthenticatedContext }
  | { error: NextResponse<ApiErrorResponse> };

async function authenticate(request: NextRequest): Promise<AuthResult> {
  // Try session first (dashboard users)
  const session = await getCurrentSession();
  if (session) {
    if (!session.tenant.is_active) {
      return {
        error: NextResponse.json(
          { error: { code: 'ACCOUNT_INACTIVE', message: 'Your account is inactive.' } },
          { status: 403 }
        ),
      };
    }
    return { tenantId: session.tenantId, tenantSettings: session.tenant.settings as unknown as Record<string, unknown> };
  }

  // Fall back to API key
  const headers = Object.fromEntries(request.headers.entries());
  const apiKey = extractApiKey(headers);

  if (!apiKey) {
    logSecurityEvent(logger, 'auth_failed', { reason: 'Missing API key' });
    return {
      error: NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required. Log in or provide X-XRNotify-Key header.',
          },
        },
        { status: 401 }
      ),
    };
  }

  const result = await validateApiKey(apiKey);

  if (!result.valid || !result.context) {
    return {
      error: NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: result.error ?? 'Invalid API key' } },
        { status: 401 }
      ),
    };
  }

  return { tenantId: result.context.tenantId, apiContext: result.context };
}

// -----------------------------------------------------------------------------
// Rate Limit Helper
// -----------------------------------------------------------------------------

async function applyRateLimit(
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
// GET /api/v1/webhooks - List Webhooks
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = performance.now();
  incHttpRequestsInFlight();

  try {
    // Authenticate
    const authResult = await authenticate(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { tenantId, apiContext } = authResult;

    // Check scope (API key only)
    if (apiContext && !hasScope(apiContext, 'webhooks:read')) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'API key does not have webhooks:read scope',
          },
        },
        { status: 403 }
      );
    }

    // Rate limit
    const rateLimitResult = await applyRateLimit(tenantId);
    if ('error' in rateLimitResult) {
      return rateLimitResult.error;
    }

    // Parse query params
    const url = new URL(request.url);
    const queryParams = {
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset'),
      is_active: url.searchParams.get('is_active'),
      event_types: url.searchParams.getAll('event_types'),
    };

    // Validate query params
    const parseResult = listWebhooksQuerySchema.safeParse({
      limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
      offset: queryParams.offset ? parseInt(queryParams.offset, 10) : undefined,
      is_active: queryParams.is_active === 'true' ? true : queryParams.is_active === 'false' ? false : undefined,
      event_types: queryParams.event_types.length > 0 ? queryParams.event_types : undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: parseResult.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const query = parseResult.data;

    // List webhooks
    const { webhooks, total } = await listWebhooks({
      tenantId,
      isActive: query.is_active,
      eventTypes: query.event_type ? [query.event_type] : undefined,
      limit: query.per_page,
      offset: (query.page - 1) * query.per_page,
    });

    logger.info({
      requestId,
      tenantId,
      count: webhooks.length,
      total,
    }, 'Listed webhooks');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/webhooks', status_code: '200' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        data: webhooks,
        meta: {
          total,
          page: query.page,
          per_page: query.per_page,
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
    logger.error({ error, requestId }, 'Failed to list webhooks');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/webhooks', status_code: '500' },
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
// POST /api/v1/webhooks - Create Webhook
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = performance.now();
  incHttpRequestsInFlight();

  try {
    // Authenticate
    const authResult = await authenticate(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { tenantId, tenantSettings, apiContext } = authResult;

    // Check scope (API key only)
    if (apiContext && !hasScope(apiContext, 'webhooks:write')) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'API key does not have webhooks:write scope',
          },
        },
        { status: 403 }
      );
    }

    // Rate limit
    const rateLimitResult = await applyRateLimit(tenantId);
    if ('error' in rateLimitResult) {
      return rateLimitResult.error;
    }

    // Check webhook limit based on plan
    const settings = apiContext?.tenant.settings ?? tenantSettings ?? {};
    const maxWebhooks = (settings['max_webhooks'] as number | undefined) ?? 1;
    const { total: currentWebhooks } = await listWebhooks({
      tenantId,
      limit: 1,
    });

    if (currentWebhooks >= maxWebhooks) {
      return NextResponse.json(
        {
          error: {
            code: 'LIMIT_EXCEEDED',
            message: `Webhook limit reached (${maxWebhooks}). Upgrade your plan for more webhooks.`,
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
    const parseResult = createWebhookSchema.safeParse(body);

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

    // ────────────────────────────────────────────────
    // NVIDIA NemoClaw governance — fires once per webhook subscription
    // ────────────────────────────────────────────────
    const nemoclawResult = await withNemoClawGovernance({
      agentId: process.env['HUNIE_AGENT_NETWORK'],
      operation: 'create webhook subscription',
      payload: {
        tenantId,
        eventCount: input.event_types.length,
        hasAccountFilter: Array.isArray(input.account_filters) && input.account_filters.length > 0,
      },
    });

    // Create webhook
    const webhook = await createWebhook(tenantId, input);

    logger.info({
      requestId,
      tenantId,
      webhookId: webhook.id,
      url: maskUrl(webhook.url),
    }, 'Webhook created');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'POST', route: '/api/v1/webhooks', status_code: '201' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        data: webhook,
        message: 'Webhook created successfully. Save the secret - it will not be shown again.',
        powered_by: nemoclawResult
          ? {
              governance: 'NVIDIA NemoClaw',
              mode: nemoclawResult.mode,
              session_id: nemoclawResult.sessionId,
              verified_at: new Date().toISOString(),
            }
          : null,
      },
      {
        status: 201,
        headers: {
          ...rateLimitResult.headers,
          'X-Request-Id': requestId,
          'Location': `/api/v1/webhooks/${webhook.id}`,
        },
      }
    );
  } catch (error) {
    const durationMs = Math.round(performance.now() - startTime);

    if (error instanceof WebhookValidationError) {
      logger.warn({ 
        error: error.message, 
        code: error.code,
        requestId,
      }, 'Webhook validation failed');

      recordHttpRequest(
        { method: 'POST', route: '/api/v1/webhooks', status_code: '400' },
        durationMs / 1000
      );

      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { 
          status: 400,
          headers: { 'X-Request-Id': requestId },
        }
      );
    }

    logger.error({ error, requestId }, 'Failed to create webhook');

    recordHttpRequest(
      { method: 'POST', route: '/api/v1/webhooks', status_code: '500' },
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

function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}/***`;
  } catch {
    return '[invalid-url]';
  }
}
