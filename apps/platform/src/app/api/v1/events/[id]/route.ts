// =============================================================================
// XRNotify Platform - Event API (Single Resource)
// =============================================================================
// GET /api/v1/events/[id] - Get single event by ID
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  extractApiKey,
  validateApiKey,
  hasScope,
  type AuthenticatedContext,
} from '@/lib/auth/apiKey';
import { queryOne } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit/tokenBucket';
import { createModuleLogger, logSecurityEvent } from '@/lib/logger';
import {
  recordHttpRequest,
  incHttpRequestsInFlight,
  decHttpRequestsInFlight,
} from '@/lib/metrics';
import { generateRequestId } from '@xrnotify/shared';
import type { EventType } from '@xrnotify/shared';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
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

const logger = createModuleLogger('events-api');

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id: eventId } = await params;
  const requestId = generateRequestId();
  const startTime = performance.now();
  incHttpRequestsInFlight();

  try {
    // Authenticate
    const headers = Object.fromEntries(request.headers.entries());
    const apiKey = extractApiKey(headers);

    if (!apiKey) {
      logSecurityEvent(logger, 'auth_failed', { reason: 'Missing API key' });
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing API key. Provide X-XRNotify-Key header.' } },
        { status: 401 }
      );
    }

    const result = await validateApiKey(apiKey);
    if (!result.valid || !result.context) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: result.error ?? 'Invalid API key' } },
        { status: 401 }
      );
    }

    const context: AuthenticatedContext = result.context;

    if (!hasScope(context, 'events:read')) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'API key does not have events:read scope' } },
        { status: 403 }
      );
    }

    const { allowed, headers: rateLimitHeaders } = await checkRateLimit(context.tenantId);
    if (!allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many requests.' } },
        { status: 429 }
      );
    }

    const event = await queryOne<EventRecord>(`
      SELECT id, event_type, ledger_index, tx_hash, timestamp, accounts, payload, created_at
      FROM events WHERE id = $1
    `, [eventId]);

    if (!event) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Event not found' } },
        { status: 404, headers: { 'X-Request-Id': requestId } }
      );
    }

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/events/[id]', status_code: '200' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        data: {
          id: event.id,
          event_type: event.event_type,
          ledger_index: event.ledger_index,
          tx_hash: event.tx_hash,
          timestamp: event.timestamp.toISOString(),
          accounts: event.accounts,
          payload: event.payload,
          created_at: event.created_at.toISOString(),
        },
      },
      { status: 200, headers: { ...rateLimitHeaders, 'X-Request-Id': requestId } }
    );
  } catch (error) {
    logger.error({ error, requestId, eventId }, 'Failed to get event');
    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/events/[id]', status_code: '500' },
      durationMs / 1000
    );
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500, headers: { 'X-Request-Id': requestId } }
    );
  } finally {
    decHttpRequestsInFlight();
  }
}
