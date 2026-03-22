// =============================================================================
// XRNotify Platform - Test Webhook API
// =============================================================================
// POST /api/v1/webhooks/[id]/test - Send a sample event to the webhook
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  extractApiKey,
  validateApiKey,
  hasScope,
} from '@/lib/auth/apiKey';
import { getCurrentSession } from '@/lib/auth/session';
import { getWebhook } from '@/lib/webhooks/service';
import { checkRateLimit } from '@/lib/rate-limit/tokenBucket';
import { createModuleLogger } from '@/lib/logger';
import {
  recordHttpRequest,
  incHttpRequestsInFlight,
  decHttpRequestsInFlight,
} from '@/lib/metrics';
import { generateRequestId } from '@xrnotify/shared';
import { signPayload } from '@xrnotify/shared';
import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const logger = createModuleLogger('webhook-test-api');

const SAMPLE_EVENT = {
  id: 'evt_test_sample_000000000000',
  event_type: 'payment.xrp',
  ledger_index: 12345678,
  tx_hash: '0000000000000000000000000000000000000000000000000000000000000000',
  timestamp: new Date().toISOString(),
  accounts: ['rTestSender111111111111111', 'rTestReceiver22222222222222'],
  payload: {
    type: 'Payment',
    account: 'rTestSender111111111111111',
    destination: 'rTestReceiver22222222222222',
    amount: '1000000',
    fee: '12',
    sequence: 1,
    _test: true,
    _note: 'This is a test event sent from the XRNotify dashboard. It does not represent a real XRPL transaction.',
  },
};

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const { id: webhookId } = await params;
  const requestId = generateRequestId();
  const startTime = performance.now();
  incHttpRequestsInFlight();

  try {
    // Try session auth first (dashboard), then API key
    let tenantId: string;

    const session = await getCurrentSession();
    if (session) {
      tenantId = session.tenantId;
    } else {
      const headers = Object.fromEntries(request.headers.entries());
      const apiKey = extractApiKey(headers);
      if (!apiKey) {
        return NextResponse.json(
          { error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
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
      if (!hasScope(result.context, 'webhooks:write')) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'API key does not have webhooks:write scope' } },
          { status: 403 }
        );
      }
      tenantId = result.context.tenantId;
    }

    // Rate limit
    const { allowed } = await checkRateLimit(tenantId);
    if (!allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many requests.' } },
        { status: 429 }
      );
    }

    // Get webhook
    const webhook = await getWebhook(webhookId, tenantId);
    if (!webhook) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Webhook not found' } },
        { status: 404, headers: { 'X-Request-Id': requestId } }
      );
    }

    // Get the webhook secret from DB
    const secretRow = await queryOne<{ secret: string }>(`
      SELECT secret FROM webhooks WHERE id = $1 AND tenant_id = $2
    `, [webhookId, tenantId]);

    const secret = secretRow?.secret ?? '';

    // Build test payload
    const testPayload = JSON.stringify(SAMPLE_EVENT);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = secret ? signPayload(testPayload, secret) : 'unsigned';

    // Send test delivery
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let statusCode = 0;
    let responseBody = '';
    let error: string | null = null;
    const deliveryStart = performance.now();

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XRNotify-Signature': signature,
          'X-XRNotify-Event-Type': 'payment.xrp',
          'X-XRNotify-Event-Id': SAMPLE_EVENT.id,
          'X-XRNotify-Webhook-Id': webhookId,
          'X-XRNotify-Timestamp': String(timestamp),
          'X-XRNotify-Delivery-Id': `dlv_test_${requestId}`,
          'X-XRNotify-Attempt': '1',
          'User-Agent': 'XRNotify-Webhook/1.0 (test)',
        },
        body: testPayload,
        signal: controller.signal,
      });

      statusCode = response.status;
      responseBody = await response.text().catch(() => '');
      if (responseBody.length > 2048) {
        responseBody = responseBody.slice(0, 2048) + '... (truncated)';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      clearTimeout(timeout);
    }

    const durationMs = Math.round(performance.now() - deliveryStart);

    logger.info({ requestId, webhookId, statusCode, durationMs }, 'Test webhook delivered');

    const durationTotal = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'POST', route: '/api/v1/webhooks/[id]/test', status_code: '200' },
      durationTotal / 1000
    );

    return NextResponse.json(
      {
        data: {
          success: statusCode >= 200 && statusCode < 300 && !error,
          status_code: statusCode || null,
          duration_ms: durationMs,
          response_body: responseBody || null,
          error: error,
        },
        message: statusCode >= 200 && statusCode < 300 && !error
          ? 'Test event delivered successfully'
          : 'Test event delivery failed',
      },
      { status: 200, headers: { 'X-Request-Id': requestId } }
    );
  } catch (err) {
    logger.error({ error: err, requestId, webhookId }, 'Failed to test webhook');
    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'POST', route: '/api/v1/webhooks/[id]/test', status_code: '500' },
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
