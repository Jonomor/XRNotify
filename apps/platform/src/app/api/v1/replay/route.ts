// =============================================================================
// XRNotify Platform - Replay API
// =============================================================================
// POST /api/v1/replay - Batch replay failed deliveries
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { replayEventsSchema } from '@xrnotify/shared';
import type { DeliveryStatus, EventType } from '@xrnotify/shared';
import { 
  extractApiKey, 
  validateApiKey, 
  hasScope,
  type AuthenticatedContext,
} from '@/lib/auth/apiKey';
import { queueBatchForReplay } from '@/lib/deliveries/service';
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

const logger = createModuleLogger('replay-api');

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
// POST /api/v1/replay - Batch Replay
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
    if (!hasScope(context, 'deliveries:write')) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'API key does not have deliveries:write scope',
          },
        },
        { status: 403 }
      );
    }

    // Check if replay is enabled for this plan
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

    // Rate limit
    const rateLimitResult = await checkApiRateLimit(context);
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
    const parseResult = replayEventsSchema.safeParse(body);

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

    // Validate date range
    if (input.start_date && input.end_date) {
      const startDate = new Date(input.start_date);
      const endDate = new Date(input.end_date);
      
      if (startDate > endDate) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'start_date must be before end_date',
            },
          },
          { status: 400 }
        );
      }

      // Check retention window (default 30 days for most plans)
      const retentionDays = context.tenant.settings['retention_days'] ?? 30;
      const oldestAllowed = new Date();
      oldestAllowed.setDate(oldestAllowed.getDate() - retentionDays);
      
      if (startDate < oldestAllowed) {
        return NextResponse.json(
          {
            error: {
              code: 'RETENTION_EXCEEDED',
              message: `Cannot replay events older than ${retentionDays} days. Your plan allows replay within the last ${retentionDays} days.`,
            },
          },
          { status: 400 }
        );
      }
    }

    // Build filter
    const filter: {
      webhookId?: string;
      eventType?: EventType;
      status?: DeliveryStatus;
      startDate?: Date;
      endDate?: Date;
    } = {};

    if (input.webhook_id) {
      filter.webhookId = input.webhook_id;
    }

    if (input.event_type) {
      filter.eventType = input.event_type as EventType;
    }

    if (input.status) {
      // Only allow replaying failed/dead_letter statuses
      const allowedStatuses: DeliveryStatus[] = ['failed', 'dead_letter'];
      if (!allowedStatuses.includes(input.status as DeliveryStatus)) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: `Can only replay deliveries with status: ${allowedStatuses.join(', ')}`,
            },
          },
          { status: 400 }
        );
      }
      filter.status = input.status as DeliveryStatus;
    } else {
      // Default to failed if no status specified
      filter.status = 'failed';
    }

    if (input.start_date) {
      filter.startDate = new Date(input.start_date);
    }

    if (input.end_date) {
      filter.endDate = new Date(input.end_date);
    }

    // Queue batch for replay
    const queuedCount = await queueBatchForReplay(context.tenantId, filter);

    logger.info({ 
      requestId, 
      tenantId: context.tenantId,
      filter,
      queuedCount,
    }, 'Batch replay queued');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'POST', route: '/api/v1/replay', status_code: '202' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        message: 'Replay request accepted',
        data: {
          queued_count: queuedCount,
          filter: {
            webhook_id: filter.webhookId ?? null,
            event_type: filter.eventType ?? null,
            status: filter.status ?? null,
            start_date: filter.startDate?.toISOString() ?? null,
            end_date: filter.endDate?.toISOString() ?? null,
          },
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
    logger.error({ error, requestId }, 'Failed to process replay request');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'POST', route: '/api/v1/replay', status_code: '500' },
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
// GET /api/v1/replay - Get Replay Info (limits, retention)
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

    const retentionDays = context.tenant.settings['retention_days'] ?? 30;
    const oldestReplayable = new Date();
    oldestReplayable.setDate(oldestReplayable.getDate() - retentionDays);

    logger.debug({ requestId, tenantId: context.tenantId }, 'Retrieved replay info');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/replay', status_code: '200' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        data: {
          enabled: context.tenant.settings['replay_enabled'] ?? false,
          retention_days: retentionDays,
          oldest_replayable: oldestReplayable.toISOString(),
          allowed_statuses: ['failed', 'dead_letter'],
          max_batch_size: 1000,
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
    logger.error({ error, requestId }, 'Failed to get replay info');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/replay', status_code: '500' },
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
