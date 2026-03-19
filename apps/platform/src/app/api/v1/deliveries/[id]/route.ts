// =============================================================================
// XRNotify Platform - Delivery API (Single Resource)
// =============================================================================
// GET /api/v1/deliveries/[id] - Get delivery details with attempts
// POST /api/v1/deliveries/[id]?action=replay - Replay delivery
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  extractApiKey, 
  validateApiKey, 
  hasScope,
  type AuthenticatedContext,
} from '@/lib/auth/apiKey';
import { 
  getDeliveryWithAttempts,
  queueForReplay,
  getDeliveryById,
  type DeliveryWithAttempts,
} from '@/lib/deliveries/service';
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

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = createModuleLogger('delivery-api');

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
// GET /api/v1/deliveries/[id] - Get Delivery Details
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id: deliveryId } = await params;
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
    if (!hasScope(context, 'deliveries:read')) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'API key does not have deliveries:read scope',
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

    // Get delivery with attempts
    const delivery = await getDeliveryWithAttempts(deliveryId, context.tenantId);

    if (!delivery) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Delivery not found',
          },
        },
        { 
          status: 404,
          headers: { 'X-Request-Id': requestId },
        }
      );
    }

    logger.debug({ requestId, deliveryId }, 'Retrieved delivery details');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/deliveries/[id]', status_code: '200' },
      durationMs / 1000
    );

    return NextResponse.json(
      { 
        data: formatDeliveryDetailResponse(delivery),
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
    logger.error({ error, requestId, deliveryId }, 'Failed to get delivery');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/deliveries/[id]', status_code: '500' },
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
// POST /api/v1/deliveries/[id]?action=replay - Replay Delivery
// -----------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id: deliveryId } = await params;
  const requestId = generateRequestId();
  const startTime = performance.now();
  incHttpRequestsInFlight();

  try {
    // Check action
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action !== 'replay') {
      return NextResponse.json(
        {
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid action. Use ?action=replay',
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
    const { context } = authResult;

    // Check scope - replay requires write access
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

    // Check if delivery exists and belongs to tenant
    const delivery = await getDeliveryById(deliveryId);
    
    if (!delivery || delivery.tenant_id !== context.tenantId) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Delivery not found',
          },
        },
        { 
          status: 404,
          headers: { 'X-Request-Id': requestId },
        }
      );
    }

    // Check if replay is allowed based on plan
    if (!context.tenant.settings['replay_enabled']) {
      return NextResponse.json(
        {
          error: {
            code: 'FEATURE_DISABLED',
            message: 'Event replay is not available on your plan. Upgrade to enable replay.',
          },
        },
        { status: 403 }
      );
    }

    // Check delivery status - only allow replay for failed or dead_letter
    const replayableStatuses = ['failed', 'dead_letter'];
    if (!replayableStatuses.includes(delivery.status)) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_STATE',
            message: `Cannot replay delivery with status '${delivery.status}'. Only failed or dead_letter deliveries can be replayed.`,
          },
        },
        { status: 400 }
      );
    }

    // Queue for replay
    const success = await queueForReplay(deliveryId);

    if (!success) {
      return NextResponse.json(
        {
          error: {
            code: 'REPLAY_FAILED',
            message: 'Failed to queue delivery for replay',
          },
        },
        { 
          status: 500,
          headers: { 'X-Request-Id': requestId },
        }
      );
    }

    logger.info({ requestId, deliveryId }, 'Delivery queued for replay');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'POST', route: '/api/v1/deliveries/[id]', status_code: '202' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        message: 'Delivery queued for replay',
        data: {
          delivery_id: deliveryId,
          status: 'queued',
        },
      },
      {
        status: 202,
        headers: {
          ...rateLimitResult.headers,
          'X-Request-Id': requestId,
        },
      }
    );
  } catch (error) {
    logger.error({ error, requestId, deliveryId }, 'Failed to replay delivery');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'POST', route: '/api/v1/deliveries/[id]', status_code: '500' },
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

function formatDeliveryDetailResponse(delivery: DeliveryWithAttempts): Record<string, unknown> {
  return {
    id: delivery.id,
    webhook_id: delivery.webhook_id,
    event_id: delivery.event_id,
    event_type: delivery.event_type,
    status: delivery.status,
    attempt_count: delivery.attempt_count,
    max_attempts: delivery.max_attempts,
    error_code: delivery.last_error_code,
    error_message: delivery.last_error,
    next_retry_at: delivery.next_attempt_at,
    delivered_at: delivery.delivered_at,
    created_at: delivery.created_at,
    updated_at: delivery.updated_at,
    // Include payload in detail view
    payload: delivery.payload,
    // Include attempt history
    attempts: delivery.attempts.map((attempt) => ({
      attempt_number: attempt.attempt_number,
      status_code: attempt.status_code,
      response_body: attempt.response_body,
      error_message: attempt.error_message,
      duration_ms: attempt.duration_ms,
      attempted_at: attempt.attempted_at,
    })),
  };
}
