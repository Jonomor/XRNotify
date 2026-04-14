// =============================================================================
// XRNotify - Audit Trail API
// =============================================================================
// Compliance/Enterprise endpoint for programmatic audit data export.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { queryOne, queryAll } from '@/lib/db';
import { createModuleLogger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const logger = createModuleLogger('audit-trail');

const AuditQuerySchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  event_type: z.string().optional(),
  webhook_id: z.string().uuid().optional(),
  status: z.enum(['delivered', 'failed', 'retrying', 'dead_letter']).optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
});

interface DeliveryRow {
  id: string;
  webhook_id: string;
  event_id: string;
  event_type: string;
  status: string;
  response_status: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  attempt_count: number;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenant = await queryOne<{ plan: string }>(
    `SELECT plan FROM tenants WHERE id = $1`,
    [session.tenantId]
  );

  const plan = tenant?.plan || 'free';
  if (!['compliance', 'enterprise'].includes(plan)) {
    return NextResponse.json(
      { error: 'Audit trail export requires a Compliance or Enterprise plan.' },
      { status: 403 }
    );
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = AuditQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { start, end, event_type, webhook_id, status, limit, offset } = parsed.data;

  try {
    const conditions: string[] = ['d.tenant_id = $1'];
    const values: Array<string | number> = [session.tenantId];
    let paramIndex = 2;

    if (start) {
      conditions.push(`d.created_at >= $${paramIndex}`);
      values.push(start);
      paramIndex++;
    }
    if (end) {
      conditions.push(`d.created_at <= $${paramIndex}`);
      values.push(end);
      paramIndex++;
    }
    if (event_type) {
      conditions.push(`d.event_type = $${paramIndex}`);
      values.push(event_type);
      paramIndex++;
    }
    if (webhook_id) {
      conditions.push(`d.webhook_id = $${paramIndex}`);
      values.push(webhook_id);
      paramIndex++;
    }
    if (status) {
      conditions.push(`d.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM deliveries d WHERE ${whereClause}`,
      values
    );
    const totalCount = parseInt(countResult?.count || '0', 10);

    const deliveries = await queryAll<DeliveryRow>(
      `SELECT
        d.id, d.webhook_id, d.event_id, d.event_type, d.status,
        d.response_status, d.response_time_ms, d.error_message,
        d.created_at, d.updated_at, d.attempt_count
      FROM deliveries d
      WHERE ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    const summary = await queryOne<{
      total_delivered: string;
      total_failed: string;
      total_retrying: string;
      total_dead_letter: string;
      avg_latency: string | null;
      p95_latency: string | null;
      p99_latency: string | null;
    }>(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'delivered') as total_delivered,
        COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
        COUNT(*) FILTER (WHERE status = 'retrying') as total_retrying,
        COUNT(*) FILTER (WHERE status = 'dead_letter') as total_dead_letter,
        ROUND(AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL))::text as avg_latency,
        ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL))::text as p95_latency,
        ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL))::text as p99_latency
      FROM deliveries d
      WHERE ${whereClause}`,
      values
    );

    logger.info({ tenantId: session.tenantId, totalCount, limit, offset }, 'Audit trail exported');

    return NextResponse.json({
      tenant_id: session.tenantId,
      query: {
        start: start || null,
        end: end || null,
        event_type: event_type || null,
        webhook_id: webhook_id || null,
        status: status || null,
        limit,
        offset,
      },
      total_count: totalCount,
      deliveries: deliveries.map(d => ({
        delivery_id: d.id,
        webhook_id: d.webhook_id,
        event_id: d.event_id,
        event_type: d.event_type,
        status: d.status,
        status_code: d.response_status,
        latency_ms: d.response_time_ms,
        error: d.error_message,
        attempt_count: d.attempt_count,
        created_at: d.created_at,
        updated_at: d.updated_at,
      })),
      summary: {
        total_delivered: parseInt(summary?.total_delivered || '0', 10),
        total_failed: parseInt(summary?.total_failed || '0', 10),
        total_retrying: parseInt(summary?.total_retrying || '0', 10),
        total_dead_letter: parseInt(summary?.total_dead_letter || '0', 10),
        avg_latency_ms: summary?.avg_latency ? parseFloat(summary.avg_latency) : null,
        p95_latency_ms: summary?.p95_latency ? parseFloat(summary.p95_latency) : null,
        p99_latency_ms: summary?.p99_latency ? parseFloat(summary.p99_latency) : null,
      },
      exported_at: new Date().toISOString(),
    });

  } catch (err) {
    logger.error({ err }, 'Audit trail query failed');
    return NextResponse.json({ error: 'Failed to retrieve audit trail' }, { status: 500 });
  }
}
