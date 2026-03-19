// =============================================================================
// XRNotify Platform - Health Check API
// =============================================================================
// Liveness (/api/health) and readiness checks with component status
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkHealth as checkDbHealth, getPoolStats } from '@/lib/db';
import { checkHealth as checkRedisHealth } from '@/lib/redis';
import { createModuleLogger } from '@/lib/logger';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type HealthStatusValue = 'healthy' | 'degraded' | 'unhealthy';

interface LocalComponentHealth {
  status: 'healthy' | 'unhealthy';
  latency_ms?: number;
  message?: string;
  details?: Record<string, unknown>;
}

interface HealthResponse {
  status: HealthStatusValue;
  timestamp: string;
  version: string;
  uptime: number;
  components?: Record<string, LocalComponentHealth>;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const startTime = Date.now();
const VERSION = process.env['npm_package_version'] ?? '1.0.0';

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = createModuleLogger('health-api');

// -----------------------------------------------------------------------------
// GET /api/health - Liveness Check
// -----------------------------------------------------------------------------

/**
 * Liveness check - returns 200 if the process is running
 * Used by load balancers and orchestrators to determine if the process is alive
 * Should NOT check dependencies - just that the process can respond
 */
export async function GET(request: NextRequest): Promise<NextResponse<HealthResponse>> {
  const url = new URL(request.url);
  const includeComponents = url.searchParams.get('components') === 'true';
  const checkReady = url.searchParams.get('ready') === 'true';

  const uptime = Math.floor((Date.now() - startTime) / 1000);

  // Basic liveness response
  if (!includeComponents && !checkReady) {
    return NextResponse.json<HealthResponse>(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: VERSION,
        uptime,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }

  // Full health check with components
  const components: Record<string, LocalComponentHealth> = {};
  let overallHealthy = true;

  // Check database
  try {
    const dbHealth = await checkDbHealth();
    const poolStats = getPoolStats();
    
    components['database'] = {
      status: dbHealth.healthy ? 'healthy' : 'unhealthy',
      latency_ms: dbHealth.latencyMs,
      message: dbHealth.message,
      details: {
        pool_total: poolStats.totalCount,
        pool_idle: poolStats.idleCount,
        pool_waiting: poolStats.waitingCount,
      },
    };

    if (!dbHealth.healthy) {
      overallHealthy = false;
    }
  } catch (error) {
    components['database'] = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
    overallHealthy = false;
  }

  // Check Redis
  try {
    const redisHealth = await checkRedisHealth();
    
    components['redis'] = {
      status: redisHealth.healthy ? 'healthy' : 'unhealthy',
      latency_ms: redisHealth.latencyMs,
      message: redisHealth.message,
    };

    if (!redisHealth.healthy) {
      overallHealthy = false;
    }
  } catch (error) {
    components['redis'] = {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
    overallHealthy = false;
  }

  const status: HealthStatusValue = overallHealthy ? 'healthy' : 'degraded';
  const httpStatus = checkReady && !overallHealthy ? 503 : 200;

  const response: HealthResponse = {
    status,
    timestamp: new Date().toISOString(),
    version: VERSION,
    uptime,
    components,
  };

  if (!overallHealthy) {
    logger.warn({ components }, 'Health check detected unhealthy components');
  }

  return NextResponse.json(response, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

// -----------------------------------------------------------------------------
// HEAD /api/health - Quick Liveness Check
// -----------------------------------------------------------------------------

/**
 * HEAD request for quick liveness check without body
 */
export async function HEAD(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
