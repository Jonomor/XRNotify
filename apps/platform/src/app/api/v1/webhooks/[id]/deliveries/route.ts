// =============================================================================
// XRNotify Platform - Webhook Deliveries API
// =============================================================================
// GET /api/v1/webhooks/[id]/deliveries - List deliveries for a specific webhook
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { listDeliveriesQuerySchema } from '@xrnotify/shared';
import type { Delivery, DeliveryStatus, EventType } from '@xrnotify/shared';
import { 
  extractApiKey, 
  validateApiKey, 
  hasScope,
  type AuthenticatedContext,
} from '@/lib/auth/apiKey';
import { getWebhook } from '@/lib/webhooks/service';
import { listDeliveries } from '@/lib/deliveries/service';
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

const logger = createModuleLogger('webhook-deliveries-api');

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
// GET /api/v1/webhooks/[id]/deliveries - List Deliveries for Webhook
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
    const { context } = authResult;

    // Check scope - need both webhooks:read and deliveries:read
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

    // Verify webhook exists and belongs to tenant
    const webhook = await getWebhook(webhookId, context.tenantId);

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

    // Parse query params
    const url = new URL(request.url);
    const queryParams = {
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset'),
      event_type: url.searchParams.get('event_type'),
      status: url.searchParams.get('status'),
      start_date: url.searchParams.get('start_date'),
      end_date: url.searchParams.get('end_date'),
    };

    // Validate query params
    const parseResult = listDeliveriesQuerySchema.safeParse({
      limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
      offset: queryParams.offset ? parseInt(queryParams.offset, 10) : undefined,
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

    // List deliveries for this webhook
    const { deliveries, total } = await listDeliveries({
      tenantId: context.tenantId,
      webhookId: webhookId, // Filter by this specific webhook
      eventType: query.event_type as EventType | undefined,
      status: query.status as DeliveryStatus | undefined,
      startDate: query.from ? new Date(query.from) : undefined,
      endDate: query.to ? new Date(query.to) : undefined,
      limit: query.per_page,
      offset: (query.page - 1) * query.per_page,
    });

    logger.debug({ 
      requestId, 
      webhookId,
      tenantId: context.tenantId, 
      count: deliveries.length,
      total,
    }, 'Listed webhook deliveries');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/webhooks/[id]/deliveries', status_code: '200' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        data: deliveries.map(formatDeliveryResponse),
        meta: {
          total,
          page: query.page,
          per_page: query.per_page,
          webhook_id: webhookId,
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
    logger.error({ error, requestId, webhookId }, 'Failed to list webhook deliveries');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/webhooks/[id]/deliveries', status_code: '500' },
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

function formatDeliveryResponse(delivery: Delivery): Record<string, unknown> {
  return {
    id: delivery.id,
    webhook_id: delivery.webhook_id,
    event_id: delivery.event_id,
    event_type: delivery.event_type,
    status: delivery.status,
    attempt_count: delivery.attempt_count,
    max_attempts: delivery.max_attempts,
    last_error_code: delivery.last_error_code,
    last_error: delivery.last_error,
    next_attempt_at: delivery.next_attempt_at,
    delivered_at: delivery.delivered_at,
    created_at: delivery.created_at,
    updated_at: delivery.updated_at,
  };
}
