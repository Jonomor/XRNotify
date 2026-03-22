// =============================================================================
// XRNotify Platform - Readiness Probe
// =============================================================================
// GET /api/ready - Returns 200 if all dependencies are healthy, 503 otherwise
// =============================================================================

import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { get } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const checks: Record<string, { status: string; latency_ms?: number }> = {};
  let healthy = true;

  // Database check
  try {
    const start = performance.now();
    await queryOne<{ ok: number }>('SELECT 1 as ok');
    checks['database'] = { status: 'healthy', latency_ms: Math.round(performance.now() - start) };
  } catch {
    checks['database'] = { status: 'unhealthy' };
    healthy = false;
  }

  // Redis check
  try {
    const start = performance.now();
    await get('readiness:ping');
    checks['redis'] = { status: 'healthy', latency_ms: Math.round(performance.now() - start) };
  } catch {
    checks['redis'] = { status: 'unhealthy' };
    healthy = false;
  }

  return NextResponse.json(
    {
      status: healthy ? 'ready' : 'not_ready',
      checks,
    },
    { status: healthy ? 200 : 503 }
  );
}

export async function HEAD(): Promise<NextResponse> {
  try {
    await queryOne<{ ok: number }>('SELECT 1 as ok');
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
