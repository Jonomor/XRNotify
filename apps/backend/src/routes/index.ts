/**
 * @fileoverview XRNotify Route Registration
 * Registers all API routes with the Fastify server.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/routes
 */

import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import { createModuleLogger } from '../core/logger.js';
import { metricsPlugin } from './metrics.js';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('routes');

/**
 * Route registration options
 */
export interface RouteOptions {
  /**
   * Enable API documentation routes
   */
  enableDocs?: boolean;

  /**
   * Enable billing routes
   */
  enableBilling?: boolean;

  /**
   * Enable WebSocket streaming routes
   */
  enableWebSocket?: boolean;
}

// =============================================================================
// Health Routes
// =============================================================================

/**
 * Health check routes plugin
 *
 * These are registered at the root level, not under /v1
 */
export const healthRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // Liveness probe - basic server health
  server.get('/healthz', {
    schema: {
      description: 'Kubernetes liveness probe',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async (_request, reply) => {
    reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness probe - will be enhanced with dependency checks
  server.get('/readyz', {
    schema: {
      description: 'Kubernetes readiness probe',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            services: { type: 'object' },
          },
        },
        503: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            services: { type: 'object' },
          },
        },
      },
    },
  }, async (_request, reply) => {
    // Import dynamically to avoid circular dependencies
    const { checkHealth: checkDbHealth, getPoolStats } = await import('../core/db.js');
    const { checkHealth: checkRedisHealth } = await import('../core/redis.js');

    const [dbHealth, redisHealth] = await Promise.all([
      checkDbHealth(),
      checkRedisHealth(),
    ]);

    const isReady = dbHealth.connected && redisHealth.connected;
    const poolStats = getPoolStats();

    const response = {
      status: isReady ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbHealth.connected ? 'connected' : 'disconnected',
          latency_ms: dbHealth.latencyMs,
          ...(dbHealth.error && { error: dbHealth.error }),
          pool: poolStats,
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

  // Detailed health check
  server.get('/health', {
    schema: {
      description: 'Detailed health check with system information',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            version: { type: 'string' },
            uptime_seconds: { type: 'number' },
            services: { type: 'object' },
            memory: { type: 'object' },
          },
        },
      },
    },
  }, async (_request, reply) => {
    const { checkHealth: checkDbHealth, getPoolStats } = await import('../core/db.js');
    const { checkHealth: checkRedisHealth } = await import('../core/redis.js');

    const [dbHealth, redisHealth] = await Promise.all([
      checkDbHealth(),
      checkRedisHealth(),
    ]);

    const poolStats = getPoolStats();
    const isHealthy = dbHealth.connected && redisHealth.connected;
    const memUsage = process.memoryUsage();

    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env['npm_package_version'] ?? '1.0.0',
      uptime_seconds: Math.floor(process.uptime()),
      services: {
        database: {
          status: dbHealth.connected ? 'connected' : 'disconnected',
          latency_ms: dbHealth.latencyMs,
          pool: poolStats,
          ...(dbHealth.error && { error: dbHealth.error }),
        },
        redis: {
          status: redisHealth.connected ? 'connected' : 'disconnected',
          latency_ms: redisHealth.latencyMs,
          ...(redisHealth.error && { error: redisHealth.error }),
        },
      },
      memory: {
        rss_mb: Math.round(memUsage.rss / 1024 / 1024),
        heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
        external_mb: Math.round(memUsage.external / 1024 / 1024),
      },
    };

    reply.status(isHealthy ? 200 : 503).send(response);
  });

  logger.debug('Health routes registered');
};

// =============================================================================
// API Info Routes
// =============================================================================

/**
 * API info routes plugin
 */
export const infoRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // Root endpoint
  server.get('/', {
    schema: {
      description: 'API information',
      tags: ['Info'],
      response: {
        200: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            documentation: { type: 'string' },
            endpoints: { type: 'object' },
          },
        },
      },
    },
  }, async (_request, reply) => {
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

  logger.debug('Info routes registered');
};

// =============================================================================
// API v1 Index
// =============================================================================

/**
 * API v1 index route
 */
export const v1IndexRoute: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.get('/', {
    schema: {
      description: 'API v1 endpoints index',
      tags: ['Info'],
      response: {
        200: {
          type: 'object',
          properties: {
            version: { type: 'string' },
            endpoints: { type: 'object' },
          },
        },
      },
    },
  }, async (_request, reply) => {
    reply.send({
      version: 'v1',
      endpoints: {
        webhooks: {
          list: 'GET /v1/webhooks',
          create: 'POST /v1/webhooks',
          get: 'GET /v1/webhooks/:id',
          update: 'PATCH /v1/webhooks/:id',
          delete: 'DELETE /v1/webhooks/:id',
          rotate_secret: 'POST /v1/webhooks/:id/rotate-secret',
          test: 'POST /v1/webhooks/:id/test',
        },
        deliveries: {
          list: 'GET /v1/deliveries',
          get: 'GET /v1/deliveries/:id',
          stats: 'GET /v1/deliveries/stats',
        },
        events: {
          list: 'GET /v1/events',
          get: 'GET /v1/events/:id',
        },
        replay: {
          create: 'POST /v1/replay',
          get: 'GET /v1/replay/:id',
        },
        api_keys: {
          list: 'GET /v1/api-keys',
          create: 'POST /v1/api-keys',
          get: 'GET /v1/api-keys/:id',
          revoke: 'DELETE /v1/api-keys/:id',
        },
        me: {
          get: 'GET /v1/me',
          usage: 'GET /v1/me/usage',
        },
      },
    });
  });
};

// =============================================================================
// API v1 Routes Registration
// =============================================================================

/**
 * Register all API v1 routes
 *
 * Routes are registered in dependency order:
 * 1. Index
 * 2. Authentication (api-keys, sessions)
 * 3. User/tenant info (me)
 * 4. Core resources (webhooks, deliveries, events)
 * 5. Operations (replay)
 * 6. Optional features (billing, streaming)
 */
export const v1Routes: FastifyPluginAsync<RouteOptions> = async (
  server: FastifyInstance,
  options: RouteOptions = {}
) => {
  // Register v1 index
  await server.register(v1IndexRoute);

  // ==========================================================================
  // Authentication Routes (to be implemented)
  // ==========================================================================

  // API Keys routes - will be registered from ./v1/apiKeys.ts
  // await server.register(apiKeysRoutes, { prefix: '/api-keys' });

  // Sessions routes (dashboard login) - will be registered from ./v1/sessions.ts
  // await server.register(sessionsRoutes, { prefix: '/sessions' });

  // ==========================================================================
  // User/Tenant Routes (to be implemented)
  // ==========================================================================

  // Me routes - will be registered from ./v1/me.ts
  // await server.register(meRoutes, { prefix: '/me' });

  // ==========================================================================
  // Core Resource Routes (to be implemented)
  // ==========================================================================

  // Webhooks routes - will be registered from ./v1/webhooks.ts
  // await server.register(webhooksRoutes, { prefix: '/webhooks' });

  // Deliveries routes - will be registered from ./v1/deliveries.ts
  // await server.register(deliveriesRoutes, { prefix: '/deliveries' });

  // Events routes - will be registered from ./v1/events.ts
  // await server.register(eventsRoutes, { prefix: '/events' });

  // ==========================================================================
  // Operations Routes (to be implemented)
  // ==========================================================================

  // Replay routes - will be registered from ./v1/replay.ts
  // await server.register(replayRoutes, { prefix: '/replay' });

  // ==========================================================================
  // Optional Feature Routes
  // ==========================================================================

  // Billing routes (optional)
  if (options.enableBilling) {
    // await server.register(billingRoutes, { prefix: '/billing' });
    logger.debug('Billing routes enabled');
  }

  // WebSocket streaming info (optional)
  if (options.enableWebSocket) {
    // await server.register(streamInfoRoutes, { prefix: '/stream' });
    logger.debug('WebSocket streaming routes enabled');
  }

  logger.info('API v1 routes registered');
};

// =============================================================================
// Main Routes Registration
// =============================================================================

/**
 * Register all application routes
 *
 * @param server - Fastify instance
 * @param options - Route options
 */
export async function registerRoutes(
  server: FastifyInstance,
  options: RouteOptions = {}
): Promise<void> {
  logger.info('Registering routes...');

  // Root-level routes
  await server.register(infoRoutes);
  await server.register(healthRoutes);
  await server.register(metricsPlugin);

  // API v1 routes under /v1 prefix
  await server.register(v1Routes, {
    prefix: '/v1',
    ...options,
  });

  // Log registered routes in development
  if (process.env['NODE_ENV'] === 'development') {
    server.ready(() => {
      const routes = server.printRoutes({ commonPrefix: false });
      logger.debug({ routes }, 'Registered routes');
    });
  }

  logger.info('All routes registered');
}

// =============================================================================
// Route Utilities
// =============================================================================

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    request_id?: string;
  };
}

/**
 * Create a standard API error response
 *
 * @param code - Error code
 * @param message - Error message
 * @param requestId - Request ID
 * @param details - Additional details
 * @returns Error response object
 */
export function createErrorResponse(
  code: string,
  message: string,
  requestId?: string,
  details?: Record<string, unknown>
): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      ...(details && { details }),
      ...(requestId && { request_id: requestId }),
    },
  };
}

/**
 * Standard API success response wrapper
 */
export interface ApiSuccessResponse<T> {
  data: T;
  meta?: {
    request_id: string;
    timestamp: string;
  };
}

/**
 * Create a standard API success response
 *
 * @param data - Response data
 * @param requestId - Request ID
 * @returns Success response object
 */
export function createSuccessResponse<T>(
  data: T,
  requestId?: string
): ApiSuccessResponse<T> {
  return {
    data,
    ...(requestId && {
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
      },
    }),
  };
}

/**
 * Standard paginated response wrapper
 */
export interface PaginatedApiResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
  meta?: {
    request_id: string;
    timestamp: string;
  };
}

/**
 * Create a paginated API response
 *
 * @param data - Array of items
 * @param total - Total count
 * @param limit - Page size
 * @param offset - Page offset
 * @param requestId - Request ID
 * @returns Paginated response object
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number,
  requestId?: string
): PaginatedApiResponse<T> {
  return {
    data,
    pagination: {
      total,
      limit,
      offset,
      has_more: offset + data.length < total,
    },
    ...(requestId && {
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
      },
    }),
  };
}

// =============================================================================
// Export
// =============================================================================

export default registerRoutes;
