/**
 * @fileoverview XRNotify Metrics Routes
 * Prometheus metrics endpoint and metrics server.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/routes/metrics
 */

import Fastify, { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import { getConfig } from '../core/config.js';
import { createModuleLogger, logLifecycle, logError } from '../core/logger.js';
import {
  getMetrics,
  getMetricsContentType,
  setDbPoolConnections,
  setQueueDepth,
  updateServiceUptime,
  recordHealthCheck,
} from '../core/metrics.js';
import { getPoolStats } from '../core/db.js';
import { streamLen, getRedis } from '../core/redis.js';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('metrics-route');

// =============================================================================
// Metrics Plugin
// =============================================================================

/**
 * Metrics routes plugin for main API server
 *
 * Registers /metrics endpoint on the main server
 */
export const metricsPlugin: FastifyPluginAsync = async (server: FastifyInstance) => {
  // Prometheus metrics endpoint
  server.get('/metrics', {
    schema: {
      description: 'Prometheus metrics endpoint',
      tags: ['Monitoring'],
      response: {
        200: {
          type: 'string',
          description: 'Prometheus text format metrics',
        },
      },
    },
  }, async (_request, reply) => {
    // Update dynamic metrics before serving
    await updateDynamicMetrics();

    const metrics = await getMetrics();
    reply.header('Content-Type', getMetricsContentType()).send(metrics);
  });

  logger.debug('Metrics routes registered');
};

// =============================================================================
// Standalone Metrics Server
// =============================================================================

let metricsServer: FastifyInstance | null = null;

/**
 * Create a standalone metrics server
 *
 * Used when metrics should be served on a separate port (e.g., for Kubernetes)
 *
 * @returns Fastify instance for metrics
 */
export async function createMetricsServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: false,
    disableRequestLogging: true,
  });

  // Health check for the metrics server itself
  server.get('/healthz', async (_request, reply) => {
    reply.send({ status: 'ok' });
  });

  // Prometheus metrics
  server.get('/metrics', async (_request, reply) => {
    await updateDynamicMetrics();
    const metrics = await getMetrics();
    reply.header('Content-Type', getMetricsContentType()).send(metrics);
  });

  return server;
}

/**
 * Start the standalone metrics server
 *
 * @returns Server address
 */
export async function startMetricsServer(): Promise<string> {
  const config = getConfig();

  if (!config.metrics.enabled) {
    logger.info('Metrics server disabled');
    return '';
  }

  metricsServer = await createMetricsServer();

  try {
    const address = await metricsServer.listen({
      host: '0.0.0.0',
      port: config.metrics.port,
    });

    logLifecycle(logger, 'started', {
      service: 'metrics-server',
      address,
      port: config.metrics.port,
    });

    return address;
  } catch (error) {
    logError(logger, error, 'Failed to start metrics server');
    throw error;
  }
}

/**
 * Stop the standalone metrics server
 */
export async function stopMetricsServer(): Promise<void> {
  if (metricsServer) {
    await metricsServer.close();
    metricsServer = null;
    logLifecycle(logger, 'stopped', { service: 'metrics-server' });
  }
}

// =============================================================================
// Dynamic Metrics Updates
// =============================================================================

/**
 * Update dynamic metrics before scrape
 *
 * Called before serving metrics to ensure values are current
 */
async function updateDynamicMetrics(): Promise<void> {
  try {
    // Update service uptime
    updateServiceUptime();

    // Update database pool metrics
    const poolStats = getPoolStats();
    setDbPoolConnections(
      poolStats.totalCount - poolStats.idleCount, // active
      poolStats.idleCount,
      poolStats.waitingCount
    );

    // Update queue depths
    await updateQueueMetrics();

    // Record health check timestamp
    recordHealthCheck();
  } catch (error) {
    logError(logger, error, 'Error updating dynamic metrics');
  }
}

/**
 * Update queue depth metrics
 */
async function updateQueueMetrics(): Promise<void> {
  const config = getConfig();

  try {
    const redis = getRedis();
    
    // Check if Redis is connected
    if (redis.status !== 'ready') {
      return;
    }

    // Get queue lengths
    const [eventsLen, deliveriesLen, dlqLen] = await Promise.all([
      streamLen(config.stream.eventsName).catch(() => 0),
      streamLen(config.stream.deliveriesName).catch(() => 0),
      streamLen(config.stream.dlqName).catch(() => 0),
    ]);

    setQueueDepth('events', eventsLen);
    setQueueDepth('deliveries', deliveriesLen);
    setQueueDepth('dlq', dlqLen);
  } catch (error) {
    // Silently ignore - Redis might not be connected yet
    logger.trace({ err: error }, 'Failed to update queue metrics');
  }
}

// =============================================================================
// Periodic Metrics Collection
// =============================================================================

let metricsInterval: NodeJS.Timeout | null = null;

/**
 * Start periodic metrics collection
 *
 * @param intervalMs - Collection interval in milliseconds
 */
export function startMetricsCollection(intervalMs: number = 15000): void {
  if (metricsInterval) {
    return;
  }

  metricsInterval = setInterval(async () => {
    await updateDynamicMetrics();
  }, intervalMs);

  logger.debug({ intervalMs }, 'Started periodic metrics collection');
}

/**
 * Stop periodic metrics collection
 */
export function stopMetricsCollection(): void {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
    logger.debug('Stopped periodic metrics collection');
  }
}

// =============================================================================
// Metrics Push Gateway
// =============================================================================

/**
 * Push metrics to a Prometheus Push Gateway
 *
 * Used for batch jobs or serverless environments
 */
export async function pushMetrics(): Promise<void> {
  const config = getConfig();

  if (!config.metrics.pushGatewayUrl) {
    return;
  }

  try {
    await updateDynamicMetrics();
    const metrics = await getMetrics();

    const response = await fetch(`${config.metrics.pushGatewayUrl}/metrics/job/xrnotify`, {
      method: 'POST',
      headers: {
        'Content-Type': getMetricsContentType(),
      },
      body: metrics,
    });

    if (!response.ok) {
      throw new Error(`Push gateway returned ${response.status}`);
    }

    logger.debug('Pushed metrics to gateway');
  } catch (error) {
    logError(logger, error, 'Failed to push metrics to gateway');
  }
}

let pushInterval: NodeJS.Timeout | null = null;

/**
 * Start periodic metrics push
 *
 * @param intervalMs - Push interval in milliseconds
 */
export function startMetricsPush(intervalMs?: number): void {
  const config = getConfig();

  if (!config.metrics.pushGatewayUrl) {
    logger.debug('Metrics push gateway not configured');
    return;
  }

  if (pushInterval) {
    return;
  }

  const interval = intervalMs ?? config.metrics.pushIntervalMs;

  pushInterval = setInterval(async () => {
    await pushMetrics();
  }, interval);

  // Initial push
  pushMetrics().catch(() => {});

  logger.info({ intervalMs: interval, gateway: config.metrics.pushGatewayUrl }, 'Started metrics push');
}

/**
 * Stop periodic metrics push
 */
export function stopMetricsPush(): void {
  if (pushInterval) {
    clearInterval(pushInterval);
    pushInterval = null;
    logger.debug('Stopped metrics push');
  }
}

// =============================================================================
// Custom Metrics Helpers
// =============================================================================

/**
 * Create a scoped metrics recorder for a specific component
 *
 * @param component - Component name
 * @returns Scoped metrics functions
 */
export function createScopedMetrics(component: string) {
  return {
    /**
     * Time an async operation
     */
    async timeAsync<T>(
      operation: string,
      fn: () => Promise<T>,
      onComplete?: (durationMs: number, result: T) => void
    ): Promise<T> {
      const start = performance.now();
      try {
        const result = await fn();
        const durationMs = performance.now() - start;
        if (onComplete) {
          onComplete(durationMs, result);
        }
        return result;
      } catch (error) {
        const durationMs = performance.now() - start;
        logger.debug({ component, operation, durationMs, error: true }, 'Operation failed');
        throw error;
      }
    },

    /**
     * Log a metric value
     */
    log(name: string, value: number, labels?: Record<string, string>): void {
      logger.debug({ component, metric: name, value, ...labels }, 'Metric recorded');
    },
  };
}

// =============================================================================
// Export Default Plugin
// =============================================================================

export default metricsPlugin;
