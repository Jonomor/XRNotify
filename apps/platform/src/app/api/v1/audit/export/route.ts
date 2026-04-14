// =============================================================================
// XRNotify - Audit Export API (CSV/JSON)
// =============================================================================
// Compliance/Enterprise endpoint for bulk audit data export.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';
import { queryOne, queryAll } from '@/lib/db';
import { createModuleLogger } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const logger = createModuleLogger('audit-export');

const ExportQuerySchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  format: z.enum(['csv', 'json']).default('csv'),
});

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
      { error: 'Audit export requires a Compliance or Enterprise plan.' },
      { status: 403 }
    );
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = ExportQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters. Required: start (ISO datetime), end (ISO datetime)' },
      { status: 400 }
    );
  }

  const { start, end, format } = parsed.data;

  try {
    const rows = await queryAll<{
      id: string;
      webhook_id: string;
      event_id: string;
      event_type: string;
      status: string;
      response_status: number | null;
      response_time_ms: number | null;
      error_message: string | null;
      attempt_count: number;
      created_at: string;
    }>(
      `SELECT id, webhook_id, event_id, event_type, status, response_status,
              response_time_ms, error_message, attempt_count, created_at
       FROM deliveries
       WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
       ORDER BY created_at DESC
       LIMIT 10000`,
      [session.tenantId, start, end]
    );

    if (format === 'csv') {
      const header = 'delivery_id,webhook_id,event_id,event_type,status,status_code,latency_ms,error,attempt_count,created_at';
      const csvRows = rows.map(d =>
        `${d.id},${d.webhook_id},${d.event_id},${d.event_type},${d.status},${d.response_status || ''},${d.response_time_ms || ''},${(d.error_message || '').replace(/,/g, ';').replace(/\n/g, ' ')},${d.attempt_count},${d.created_at}`
      );
      const csv = [header, ...csvRows].join('\n');

      logger.info({ tenantId: session.tenantId, rows: rows.length, format }, 'Audit CSV exported');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="xrnotify-audit-${start.slice(0, 10)}-to-${end.slice(0, 10)}.csv"`,
        },
      });
    }

    logger.info({ tenantId: session.tenantId, rows: rows.length, format }, 'Audit JSON exported');

    return NextResponse.json({
      tenant_id: session.tenantId,
      period: { start, end },
      total_records: rows.length,
      deliveries: rows.map(d => ({
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
      })),
      exported_at: new Date().toISOString(),
    });

  } catch (err) {
    logger.error({ err }, 'Audit export failed');
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
