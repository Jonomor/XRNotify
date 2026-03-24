// =============================================================================
// XRNotify Platform - Webhook API (Single Resource)
// =============================================================================
// GET /api/v1/webhooks/[id] - Get webhook details
// PATCH /api/v1/webhooks/[id] - Update webhook
// DELETE /api/v1/webhooks/[id] - Delete webhook
// POST /api/v1/webhooks/[id]/rotate-secret - Rotate webhook secret
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { updateWebhookSchema } from '@xrnotify/shared';
import {
  extractApiKey,
  validateApiKey,
  hasScope,
  type AuthenticatedContext,
} from '@/lib/auth/apiKey';
import { getCurrentSession } from '@/lib/auth/session';
import {
  getWebhook,
  updateWebhook, 
  deleteWebhook,
  rotateWebhookSecret,
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

interface RouteParams {
  params: Promise<{ id: string }>;
}

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = createModuleLogger('webhook-api');

// -----------------------------------------------------------------------------
// Authentication Helper
// -----------------------------------------------------------------------------

// tenantId resolved from either session cookie or API key
type AuthResult =
  | { tenantId: string; apiContext?: AuthenticatedContext }
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
    return { tenantId: session.tenantId };
  }

  // Fall back to API key
  const headers = Object.fromEntries(request.headers.entries());
  const apiKey = extractApiKey(headers);

  if (!apiKey) {
    logSecurityEvent(logger, 'auth_failed', { reason: 'No session or API key' });
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

async function checkApiRateLimit(
  tenantId: string
): Promise<{ allowed: true; headers: Record<string, string> } | { error: NextResponse<ApiErrorResponse> }> {
  const { allowed, headers, retryAfter } = await checkRateLimit(tenantId);

  if (!allowed) {
    logSecurityEvent(logger, 'rate_limited', { tenantId: tenantId });
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
// GET /api/v1/webhooks/[id] - Get Webhook
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id: webhookId } = await params;
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

    // Check scope
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
    const rateLimitResult = await checkApiRateLimit(tenantId);
    if ('error' in rateLimitResult) {
      return rateLimitResult.error;
    }

    // Get webhook
    const webhook = await getWebhook(webhookId, tenantId);

    if (!webhook) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Webhook not found',
          },
        },
        { 
          status: 404,
          headers: { 'X-Request-Id': requestId },
        }
      );
    }

    logger.debug({ requestId, webhookId }, 'Retrieved webhook');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/webhooks/[id]', status_code: '200' },
      durationMs / 1000
    );

    return NextResponse.json(
      { data: webhook },
      {
        status: 200,
        headers: {
          ...rateLimitResult.headers,
          'X-Request-Id': requestId,
        },
      }
    );
  } catch (error) {
    logger.error({ error, requestId, webhookId }, 'Failed to get webhook');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/webhooks/[id]', status_code: '500' },
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
// PATCH /api/v1/webhooks/[id] - Update Webhook
// -----------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id: webhookId } = await params;
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

    // Check scope
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
    const parseResult = updateWebhookSchema.safeParse(body);

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

    // Update webhook
    const webhook = await updateWebhook(webhookId, tenantId, input);

    if (!webhook) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Webhook not found',
          },
        },
        { 
          status: 404,
          headers: { 'X-Request-Id': requestId },
        }
      );
    }

    logger.info({ requestId, webhookId }, 'Webhook updated');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'PATCH', route: '/api/v1/webhooks/[id]', status_code: '200' },
      durationMs / 1000
    );

    return NextResponse.json(
      { data: webhook },
      {
        status: 200,
        headers: {
          ...rateLimitResult.headers,
          'X-Request-Id': requestId,
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
        webhookId,
      }, 'Webhook update validation failed');

      recordHttpRequest(
        { method: 'PATCH', route: '/api/v1/webhooks/[id]', status_code: '400' },
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

    logger.error({ error, requestId, webhookId }, 'Failed to update webhook');

    recordHttpRequest(
      { method: 'PATCH', route: '/api/v1/webhooks/[id]', status_code: '500' },
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
// DELETE /api/v1/webhooks/[id] - Delete Webhook
// -----------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id: webhookId } = await params;
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

    // Check scope
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
    const rateLimitResult = await checkApiRateLimit(tenantId);
    if ('error' in rateLimitResult) {
      return rateLimitResult.error;
    }

    // Delete webhook
    const deleted = await deleteWebhook(webhookId, tenantId);

    if (!deleted) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Webhook not found',
          },
        },
        { 
          status: 404,
          headers: { 'X-Request-Id': requestId },
        }
      );
    }

    logger.info({ requestId, webhookId }, 'Webhook deleted');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'DELETE', route: '/api/v1/webhooks/[id]', status_code: '204' },
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
    logger.error({ error, requestId, webhookId }, 'Failed to delete webhook');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'DELETE', route: '/api/v1/webhooks/[id]', status_code: '500' },
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
// POST /api/v1/webhooks/[id] - Rotate Secret (via action query param)
// -----------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id: webhookId } = await params;
  const requestId = generateRequestId();
  const startTime = performance.now();
  incHttpRequestsInFlight();

  try {
    // Check action
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action !== 'rotate-secret') {
      return NextResponse.json(
        {
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid action. Use ?action=rotate-secret',
          },
        },
        { status: 400 }
      );
    }

    // Authenticate
    const authResult = await authenticate(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { tenantId, apiContext } = authResult;

    // Check scope
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
    const rateLimitResult = await checkApiRateLimit(tenantId);
    if ('error' in rateLimitResult) {
      return rateLimitResult.error;
    }

    // Rotate secret
    const result = await rotateWebhookSecret(webhookId, tenantId);

    if (!result) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Webhook not found',
          },
        },
        { 
          status: 404,
          headers: { 'X-Request-Id': requestId },
        }
      );
    }

    logger.info({ requestId, webhookId }, 'Webhook secret rotated');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'POST', route: '/api/v1/webhooks/[id]', status_code: '200' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        data: {
          secret: result.secret,
        },
        message: 'Secret rotated successfully. Save the new secret - it will not be shown again.',
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
    logger.error({ error, requestId, webhookId }, 'Failed to rotate webhook secret');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'POST', route: '/api/v1/webhooks/[id]', status_code: '500' },
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
