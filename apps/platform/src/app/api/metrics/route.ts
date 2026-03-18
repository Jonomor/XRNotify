// =============================================================================
// XRNotify Platform - Metrics API
// =============================================================================
// Prometheus metrics endpoint for monitoring and observability
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getMetrics, getMetricsContentType, setDbPoolStats } from '@/lib/metrics';
import { getPoolStats } from '@/lib/db';
import { getConfig } from '@/lib/config';
import { createModuleLogger } from '@/lib/logger';

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = createModuleLogger('metrics-api');

// -----------------------------------------------------------------------------
// GET /api/metrics - Prometheus Metrics
// -----------------------------------------------------------------------------

/**
 * Expose Prometheus-compatible metrics
 * 
 * This endpoint is scraped by Prometheus at regular intervals.
 * It returns all registered metrics in the Prometheus text format.
 * 
 * Security: In production, this endpoint should be protected or only
 * accessible from internal networks. Consider using a bearer token
 * or IP allowlist.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const config = getConfig();

  // Optional: Check for metrics authentication in production
  if (config.env === 'production') {
    const authHeader = request.headers.get('authorization');
    const metricsToken = process.env['METRICS_AUTH_TOKEN'];

    if (metricsToken && authHeader !== `Bearer ${metricsToken}`) {
      // If a token is configured but not provided/matched, reject
      // If no token is configured, allow (assumes network-level protection)
      if (metricsToken) {
        logger.warn('Unauthorized metrics access attempt');
        return new NextResponse('Unauthorized', { status: 401 });
      }
    }
  }

  try {
    // Update pool stats before scrape
    const poolStats = getPoolStats();
    setDbPoolStats(poolStats.totalCount, poolStats.idleCount, poolStats.waitingCount);

    // Get all metrics
    const metrics = await getMetrics();

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': getMetricsContentType(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to collect metrics');

    return new NextResponse('# Error collecting metrics\n', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

// -----------------------------------------------------------------------------
// HEAD /api/metrics - Quick Check
// -----------------------------------------------------------------------------

/**
 * HEAD request to verify metrics endpoint is available
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': getMetricsContentType(),
    },
  });
}
