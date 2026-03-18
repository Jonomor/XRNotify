/**
 * @fileoverview XRNotify Fastify Server
 * Main HTTP server with plugins, routes, and middleware.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/server
 */

import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { getConfig, isProduction, isDevelopment } from './core/config.js';
import {
  createModuleLogger,
  createRequestLogger,
  logHttpRequest,
  logLifecycle,
  logError,
  type Logger,
} from './core/logger.js';
import {
  initializeMetrics,
  getMetrics,
  getMetricsContentType,
  recordHttpRequest,
  httpRequestsActive,
  startMetricsUpdates,
  stopMetricsUpdates,
  recordHealthCheck,
  setServiceInfo,
} from './core/metrics.js';
import { checkHealth as checkDbHealth, getPoolStats } from './core/db.js';
import { checkHealth as checkRedisHealth } from './core/redis.js';
import { generateRequestId, generateCorrelationId } from '@xrnotify/shared';

// =============================================================================
// Types
// =============================================================================

/**
 * Extended FastifyRequest with custom properties
 */
declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
    correlationId: string;
    startTime: number;
    log: Logger;
    tenantId?: string;
    userId?: string;
    apiKeyId?: string;
  }
}

/**
 * Server options
 */
export interface ServerOptions {
  /**
   * Skip database connection check on startup
   */
  skipDbCheck?: boolean;

  /**
   * Skip Redis connection check on startup
   */
  skipRedisCheck?: boolean;

  /**
   * Custom logger
   */
  logger?: Logger;
}

// =============================================================================
// Server Factory
// =============================================================================

const moduleLogger = createModuleLogger('server');

/**
 * Create and configure the Fastify server
 *
 * @param options - Server options
 * @returns Configured Fastify instance
 */
export async function createServer(options: ServerOptions = {}): Promise<FastifyInstance> {
  const config = getConfig();
  const logger = options.logger ?? moduleLogger;

  logLifecycle(logger, 'starting', { service: 'api' });

  // Initialize metrics
  initializeMetrics();
  setServiceInfo(process.env['npm_package_version'] ?? '1.0.0');

  // Create Fastify instance
  const server = Fastify({
    logger: false, // We use our own logger
    trustProxy: config.api.trustProxy,
    bodyLimit: config.api.bodyLimit,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    genReqId: () => generateRequestId(),
    disableRequestLogging: true, // We handle this ourselves
  });

  // =============================================================================
  // Plugins
  // =============================================================================

  // Sensible defaults (httpErrors, etc.)
  await server.register(sensible);

  // Security headers
  await server.register(helmet, {
    contentSecurityPolicy: isProduction() ? undefined : false,
    crossOriginEmbedderPolicy: false,
  });

  // CORS
  await server.register(cors, {
    origin: config.api.corsOrigins.length > 0 ? config.api.corsOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'X-Request-ID',
      'X-Correlation-ID',
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    maxAge: 86400,
  });

  // Rate limiting
  if (config.rateLimit.enabled) {
    await server.register(rateLimit, {
      global: true,
      max: config.rateLimit.globalMax,
      timeWindow: config.rateLimit.globalWindowMs,
      errorResponseBuilder: (request, context) => {
        return {
          error: {
            code: 'rate_limited',
            message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
            details: {
              limit: context.max,
              remaining: 0,
              reset: new Date(Date.now() + context.ttl).toISOString(),
            },
            request_id: request.requestId,
          },
        };
      },
      keyGenerator: (request) => {
        // Use API key if present, otherwise use IP
        return request.apiKeyId ?? request.ip;
      },
      onExceeded: (request) => {
        logger.warn(
          { requestId: request.requestId, ip: request.ip, apiKeyId: request.apiKeyId },
          'Rate limit exceeded'
        );
      },
    });
  }

  // =============================================================================
  // Request Hooks
  // =============================================================================

  // Pre-request hook: Setup request context
  server.addHook('onRequest', async (request: FastifyRequest) => {
    request.startTime = performance.now();
    request.requestId = (request.headers['x-request-id'] as string) ?? generateRequestId();
    request.correlationId =
      (request.headers['x-correlation-id'] as string) ?? generateCorrelationId();
    request.log = createRequestLogger(request.requestId, request.correlationId);

    httpRequestsActive.inc();
  });

  // Post-request hook: Log and record metrics
  server.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    httpRequestsActive.dec();

    const durationMs = Math.round(performance.now() - request.startTime);
    const durationSeconds = durationMs / 1000;

    // Normalize route for metrics (replace params with placeholders)
    const route = request.routeOptions?.url ?? request.url.split('?')[0] ?? 'unknown';

    // Record metrics
    recordHttpRequest(
      {
        method: request.method,
        route,
        statusCode: reply.statusCode,
      },
      durationSeconds
    );

    // Log request
    logHttpRequest(request.log, {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      durationMs,
      requestId: request.requestId,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      contentLength: Number(reply.getHeader('content-length')) || undefined,
    });
  });

  // Add request ID to response headers
  server.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('X-Request-ID', request.requestId);
  });

  // =============================================================================
  // Error Handler
  // =============================================================================

  server.setErrorHandler(async (error, request, reply) => {
    const statusCode = error.statusCode ?? 500;
    const isServerError = statusCode >= 500;

    // Log error
    if (isServerError) {
      logError(request.log, error, 'Request error', {
        method: request.method,
        url: request.url,
        statusCode,
      });
    } else {
      request.log.warn(
        {
          err: {
            message: error.message,
            code: (error as NodeJS.ErrnoException).code,
          },
          statusCode,
        },
        'Request error'
      );
    }

    // Build error response
    const response = {
      error: {
        code: (error as NodeJS.ErrnoException).code ?? 'internal_error',
        message: isServerError && isProduction() ? 'Internal server error' : error.message,
        ...(isDevelopment() && isServerError && { stack: error.stack }),
        request_id: request.requestId,
      },
    };

    reply.status(statusCode).send(response);
  });

  // =============================================================================
  // Not Found Handler
  // =============================================================================

  server.setNotFoundHandler(async (request, reply) => {
    reply.status(404).send({
      error: {
        code: 'not_found',
        message: `Route ${request.method} ${request.url} not found`,
        request_id: request.requestId,
      },
    });
  });

  // =============================================================================
  // Health & Metrics Routes
  // =============================================================================

  // Liveness probe - basic server health
  server.get('/healthz', async (_request, reply) => {
    reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Readiness probe - full dependency check
  server.get('/readyz', async (request, reply) => {
    const [dbHealth, redisHealth] = await Promise.all([
      checkDbHealth(),
      checkRedisHealth(),
    ]);

    const isReady = dbHealth.connected && redisHealth.connected;
    const status = isReady ? 'healthy' : 'unhealthy';

    recordHealthCheck();

    const response = {
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbHealth.connected ? 'connected' : 'disconnected',
          latency_ms: dbHealth.latencyMs,
          ...(dbHealth.error && { error: dbHealth.error }),
          pool: {
            total: dbHealth.poolSize,
            idle: dbHealth.idleCount,
            waiting: dbHealth.waitingCount,
          },
        },
        redis: {
          status: redisHealth.connected ? 'connected' : 'disconnected',
          latency_ms: redisHealth.latencyMs,
          ...(redisHealth.error && { error: redisHealth.error }),
        },
      },
    };

    reply.status(isReady ? 200 : 503).send(response);
  });

  // Detailed health check with more info
  server.get('/health', async (request, reply) => {
    const [dbHealth, redisHealth] = await Promise.all([
      checkDbHealth(),
      checkRedisHealth(),
    ]);

    const poolStats = getPoolStats();
    const isHealthy = dbHealth.connected && redisHealth.connected;

    recordHealthCheck();

    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] ?? '1.0.0',
      uptime_seconds: Math.floor(process.uptime()),
      services: {
        database: {
          status: dbHealth.connected ? 'connected' : 'disconnected',
          latency_ms: dbHealth.latencyMs,
          pool: {
            total: poolStats.totalCount,
            idle: poolStats.idleCount,
            waiting: poolStats.waitingCount,
          },
          ...(dbHealth.error && { error: dbHealth.error }),
        },
        redis: {
          status: redisHealth.connected ? 'connected' : 'disconnected',
          latency_ms: redisHealth.latencyMs,
          ...(redisHealth.error && { error: redisHealth.error }),
        },
      },
      memory: {
        rss_mb: Math.round(process.memoryUsage.rss() / 1024 / 1024),
        heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    };

    reply.status(isHealthy ? 200 : 503).send(response);
  });

  // Prometheus metrics endpoint
  server.get('/metrics', async (_request, reply) => {
    const metrics = await getMetrics();
    reply.header('Content-Type', getMetricsContentType()).send(metrics);
  });

  // =============================================================================
  // API Info Route
  // =============================================================================

  server.get('/', async (_request, reply) => {
    reply.send({
      name: 'XRNotify API',
      version: process.env['npm_package_version'] ?? '1.0.0',
      documentation: 'https://xrnotify.dev',
      endpoints: {
        health: '/health',
        readiness: '/readyz',
        liveness: '/healthz',
        metrics: '/metrics',
        api: '/v1',
      },
    });
  });

  // =============================================================================
  // API v1 Routes Placeholder
  // =============================================================================

  // Register API routes (will be added in subsequent files)
  server.register(
    async (api) => {
      // Placeholder - routes will be registered here
      api.get('/', async (_request, reply) => {
        reply.send({
          version: 'v1',
          endpoints: {
            webhooks: '/v1/webhooks',
            deliveries: '/v1/deliveries',
            events: '/v1/events',
            api_keys: '/v1/api-keys',
            replay: '/v1/replay',
            me: '/v1/me',
          },
        });
      });
    },
    { prefix: '/v1' }
  );

  // =============================================================================
  // Startup
  // =============================================================================

  // Start metrics updates
  startMetricsUpdates();

  logLifecycle(logger, 'ready', {
    host: config.api.host,
    port: config.api.port,
  });

  return server;
}

/**
 * Start the server
 *
 * @param server - Fastify instance
 * @returns Server address
 */
export async function startServer(server: FastifyInstance): Promise<string> {
  const config = getConfig();

  try {
    const address = await server.listen({
      host: config.api.host,
      port: config.api.port,
    });

    logLifecycle(moduleLogger, 'started', { address });
    return address;
  } catch (error) {
    logError(moduleLogger, error, 'Failed to start server');
    throw error;
  }
}

/**
 * Stop the server gracefully
 *
 * @param server - Fastify instance
 */
export async function stopServer(server: FastifyInstance): Promise<void> {
  logLifecycle(moduleLogger, 'stopping');

  try {
    // Stop metrics updates
    stopMetricsUpdates();

    // Close server
    await server.close();

    logLifecycle(moduleLogger, 'stopped');
  } catch (error) {
    logError(moduleLogger, error, 'Error stopping server');
    throw error;
  }
}

// =============================================================================
// Graceful Shutdown
// =============================================================================

/**
 * Setup graceful shutdown handlers
 *
 * @param server - Fastify instance
 * @param cleanup - Additional cleanup function
 */
export function setupGracefulShutdown(
  server: FastifyInstance,
  cleanup?: () => Promise<void>
): void {
  const config = getConfig();
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      moduleLogger.warn({ signal }, 'Shutdown already in progress');
      return;
    }

    isShuttingDown = true;
    moduleLogger.info({ signal }, 'Received shutdown signal');

    // Set a timeout for graceful shutdown
    const forceExitTimeout = setTimeout(() => {
      moduleLogger.error('Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, config.worker.gracefulShutdownMs);

    try {
      // Stop accepting new requests
      await stopServer(server);

      // Run additional cleanup
      if (cleanup) {
        await cleanup();
      }

      clearTimeout(forceExitTimeout);
      moduleLogger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      logError(moduleLogger, error, 'Error during shutdown');
      clearTimeout(forceExitTimeout);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// =============================================================================
// Exports
// =============================================================================

export { type FastifyInstance, type FastifyRequest, type FastifyReply };
