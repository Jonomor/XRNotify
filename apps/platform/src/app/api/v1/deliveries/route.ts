// =============================================================================
// XRNotify Platform - Deliveries API (Collection)
// =============================================================================
// GET /api/v1/deliveries - List deliveries with filtering
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { listDeliveriesQuerySchema } from '@xrnotify/shared';
import type { DeliveryStatus, EventType } from '@xrnotify/shared';
import { 
  extractApiKey, 
  validateApiKey, 
  hasScope,
  type AuthenticatedContext,
} from '@/lib/auth/apiKey';
import { 
  listDeliveries,
  getDeliveryStats,
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

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = createModuleLogger('deliveries-api');

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
// GET /api/v1/deliveries - List Deliveries
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

    // Check if this is a stats request
    const url = new URL(request.url);
    const isStatsRequest = url.searchParams.get('stats') === 'true';

    if (isStatsRequest) {
      return handleStatsRequest(context, rateLimitResult.headers, requestId, startTime);
    }

    // Parse query params
    const queryParams = {
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset'),
      webhook_id: url.searchParams.get('webhook_id'),
      event_type: url.searchParams.get('event_type'),
      status: url.searchParams.get('status'),
      start_date: url.searchParams.get('start_date'),
      end_date: url.searchParams.get('end_date'),
    };

    // Validate query params
    const parseResult = listDeliveriesQuerySchema.safeParse({
      limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
      offset: queryParams.offset ? parseInt(queryParams.offset, 10) : undefined,
      webhook_id: queryParams.webhook_id ?? undefined,
      event_type: queryParams.event_type ?? undefined,
      status: queryParams.status ?? undefined,
      start_date: queryParams.start_date ?? undefined,
      end_date: queryParams.end_date ?? undefined,
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

    // List deliveries
    const { deliveries, total } = await listDeliveries({
      tenantId: context.tenantId,
      webhookId: query.webhook_id,
      eventType: query.event_type as EventType | undefined,
      status: query.status as DeliveryStatus | undefined,
      startDate: query.start_date ? new Date(query.start_date) : undefined,
      endDate: query.end_date ? new Date(query.end_date) : undefined,
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
    });

    logger.debug({ 
      requestId, 
      tenantId: context.tenantId, 
      count: deliveries.length,
      total,
    }, 'Listed deliveries');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/deliveries', status_code: '200' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        data: deliveries.map(formatDeliveryResponse),
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
    logger.error({ error, requestId }, 'Failed to list deliveries');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/deliveries', status_code: '500' },
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
// Stats Request Handler
// -----------------------------------------------------------------------------

async function handleStatsRequest(
  context: AuthenticatedContext,
  rateLimitHeaders: Record<string, string>,
  requestId: string,
  startTime: number
): Promise<NextResponse> {
  try {
    const stats = await getDeliveryStats(context.tenantId);

    logger.debug({ requestId, tenantId: context.tenantId }, 'Retrieved delivery stats');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/deliveries?stats', status_code: '200' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        data: {
          total: stats.total,
          delivered: stats.delivered,
          failed: stats.failed,
          pending: stats.pending,
          retrying: stats.retrying,
          success_rate: Math.round(stats.successRate * 100) / 100,
        },
      },
      {
        status: 200,
        headers: {
          ...rateLimitHeaders,
          'X-Request-Id': requestId,
        },
      }
    );
  } catch (error) {
    logger.error({ error, requestId }, 'Failed to get delivery stats');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/deliveries?stats', status_code: '500' },
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
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatDeliveryResponse(delivery: Record<string, unknown>): Record<string, unknown> {
  // Remove internal fields, format dates
  return {
    id: delivery.id,
    webhook_id: delivery.webhook_id,
    event_id: delivery.event_id,
    event_type: delivery.event_type,
    status: delivery.status,
    attempt_count: delivery.attempt_count,
    max_attempts: delivery.max_attempts,
    error_code: delivery.error_code,
    error_message: delivery.error_message,
    next_retry_at: delivery.next_retry_at,
    delivered_at: delivery.delivered_at,
    created_at: delivery.created_at,
    updated_at: delivery.updated_at,
    // Don't expose full payload in list view - use detail endpoint
    // Don't expose tenant_id or url
  };
}
