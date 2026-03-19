// =============================================================================
// XRNotify Platform - Events API
// =============================================================================
// GET /api/v1/events - List/search XRPL events
// GET /api/v1/events/:id - Get single event by ID
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { EVENT_TYPES } from '@xrnotify/shared';
import type { EventType } from '@xrnotify/shared';
import { 
  extractApiKey, 
  validateApiKey, 
  hasScope,
  type AuthenticatedContext,
} from '@/lib/auth/apiKey';
import { queryAll, queryOne } from '@/lib/db';
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

interface EventRecord {
  id: string;
  event_type: EventType;
  ledger_index: number;
  tx_hash: string;
  timestamp: Date;
  accounts: string[];
  payload: Record<string, unknown>;
  created_at: Date;
}

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const listEventsQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
  event_type: z.enum(EVENT_TYPES as unknown as [string, ...string[]]).optional(),
  account: z.string().min(1).max(100).optional(),
  tx_hash: z.string().length(64).optional(),
  ledger_index: z.number().int().min(0).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = createModuleLogger('events-api');

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
// GET /api/v1/events - List Events
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
    if (!hasScope(context, 'events:read')) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'API key does not have events:read scope',
          },
        },
        { status: 403 }
      );
    }

    // Check if events access is enabled for this plan
    if (!context.tenant.settings['events_api_enabled']) {
      return NextResponse.json(
        {
          error: {
            code: 'FEATURE_DISABLED',
            message: 'Events API is not available on your plan. Upgrade to access raw events.',
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
      event_type: url.searchParams.get('event_type'),
      account: url.searchParams.get('account'),
      tx_hash: url.searchParams.get('tx_hash'),
      ledger_index: url.searchParams.get('ledger_index'),
      start_date: url.searchParams.get('start_date'),
      end_date: url.searchParams.get('end_date'),
    };

    // Validate query params
    const parseResult = listEventsQuerySchema.safeParse({
      limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
      offset: queryParams.offset ? parseInt(queryParams.offset, 10) : undefined,
      event_type: queryParams.event_type ?? undefined,
      account: queryParams.account ?? undefined,
      tx_hash: queryParams.tx_hash ?? undefined,
      ledger_index: queryParams.ledger_index ? parseInt(queryParams.ledger_index, 10) : undefined,
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
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    // Build dynamic query
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (query.event_type) {
      conditions.push(`event_type = $${paramIndex}`);
      values.push(query.event_type);
      paramIndex++;
    }

    if (query.account) {
      conditions.push(`$${paramIndex} = ANY(accounts)`);
      values.push(query.account);
      paramIndex++;
    }

    if (query.tx_hash) {
      conditions.push(`tx_hash = $${paramIndex}`);
      values.push(query.tx_hash);
      paramIndex++;
    }

    if (query.ledger_index) {
      conditions.push(`ledger_index = $${paramIndex}`);
      values.push(query.ledger_index);
      paramIndex++;
    }

    if (query.start_date) {
      conditions.push(`timestamp >= $${paramIndex}`);
      values.push(new Date(query.start_date));
      paramIndex++;
    }

    if (query.end_date) {
      conditions.push(`timestamp <= $${paramIndex}`);
      values.push(new Date(query.end_date));
      paramIndex++;
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(' AND ')}` 
      : '';

    // Get total count
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM events ${whereClause}`,
      values
    );
    const total = parseInt(countResult?.count ?? '0', 10);

    // Get events
    values.push(limit, offset);
    const events = await queryAll<EventRecord>(
      `SELECT id, event_type, ledger_index, tx_hash, timestamp, accounts, payload, created_at
       FROM events 
       ${whereClause}
       ORDER BY ledger_index DESC, created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      values
    );

    logger.debug({ 
      requestId, 
      tenantId: context.tenantId, 
      count: events.length,
      total,
    }, 'Listed events');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/events', status_code: '200' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        data: events.map(formatEventResponse),
        meta: {
          total,
          limit,
          offset,
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
    logger.error({ error, requestId }, 'Failed to list events');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/events', status_code: '500' },
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

function formatEventResponse(event: EventRecord): Record<string, unknown> {
  return {
    id: event.id,
    event_type: event.event_type,
    ledger_index: event.ledger_index,
    tx_hash: event.tx_hash,
    timestamp: event.timestamp.toISOString(),
    accounts: event.accounts,
    payload: event.payload,
    created_at: event.created_at.toISOString(),
  };
}
