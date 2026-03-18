// =============================================================================
// XRNotify Platform - Webhooks API (Collection)
// =============================================================================
// GET /api/v1/webhooks - List webhooks
// POST /api/v1/webhooks - Create webhook
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createWebhookSchema, listWebhooksQuerySchema, validate } from '@xrnotify/shared';
import { 
  extractApiKey, 
  validateApiKey, 
  hasScope,
  type AuthenticatedContext,
} from '@/lib/auth/apiKey';
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

async function authenticate(
  request: NextRequest
): Promise<{ context: AuthenticatedContext } | { error: NextResponse<ApiErrorResponse> }> {
  const headers = Object.fromEntries(request.headers.entries());
  const apiKey = extractApiKey(headers);

  if (!apiKey) {
    logSecurityEvent(logger, 'auth_failed', { reason: 'Missing API key' });
    return {
      error: NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing API key. Provide X-XRNotify-Key header.',
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
        {
          error: {
            code: 'UNAUTHORIZED',
            message: result.error ?? 'Invalid API key',
          },
        },
        { status: 401 }
      ),
    };
  }

  return { context: result.context };
}

// -----------------------------------------------------------------------------
// Rate Limit Helper
// -----------------------------------------------------------------------------

async function checkApiRateLimit(
  context: AuthenticatedContext
): Promise<{ allowed: true; headers: Record<string, string> } | { error: NextResponse<ApiErrorResponse> }> {
  const { allowed, headers, retryAfter } = await checkRateLimit(context.tenantId);

  if (!allowed) {
    logSecurityEvent(logger, 'rate_limited', { tenantId: context.tenantId });
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
    const { context } = authResult;

    // Check scope
    if (!hasScope(context, 'webhooks:read')) {
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
    const rateLimitResult = await checkApiRateLimit(context);
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
      tenantId: context.tenantId,
      isActive: query.is_active,
      eventTypes: query.event_types,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });

    logger.info({ 
      requestId, 
      tenantId: context.tenantId, 
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
          limit: query.limit ?? 50,
          offset: query.offset ?? 0,
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
    const { context } = authResult;

    // Check scope
    if (!hasScope(context, 'webhooks:write')) {
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
    const rateLimitResult = await checkApiRateLimit(context);
    if ('error' in rateLimitResult) {
      return rateLimitResult.error;
    }

    // Check webhook limit based on plan
    const maxWebhooks = context.tenant.settings.max_webhooks;
    const { total: currentWebhooks } = await listWebhooks({
      tenantId: context.tenantId,
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

    // Create webhook
    const webhook = await createWebhook(context.tenantId, input);

    logger.info({ 
      requestId, 
      tenantId: context.tenantId, 
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
