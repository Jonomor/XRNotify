/**
 * XRNotify API Server
 * Production-grade Fastify server with all routes, middleware, and monitoring
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import {
  config,
  logger,
  createChildLogger,
  checkDbHealth,
  checkRedisHealth,
  closeDb,
  closeRedis,
  getMetrics,
  getContentType,
  httpRequestsTotal,
  httpRequestLatency,
} from './core/index.js';

import {
  webhookRoutes,
  authRoutes,
  deliveryRoutes,
  authenticateApiKey,
} from './api/index.js';

const log = createChildLogger('server');

// ============================================
// Server Configuration
// ============================================

const startTime = Date.now();

async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // We use Winston
    trustProxy: true,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    genReqId: () => `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  });

  // ============================================
  // Plugins
  // ============================================

  // CORS
  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-XRNotify-Key', 'X-Request-ID'],
  });

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
    keyGenerator: (request) => {
      return request.headers['x-xrnotify-key'] as string || request.ip;
    },
    errorResponseBuilder: () => ({
      code: 429,
      message: 'Rate limit exceeded',
      hint: 'Slow down your requests or upgrade your plan',
    }),
  });

  // Swagger documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'XRNotify API',
        description: 'Real-time XRPL event infrastructure API',
        version: '1.0.0',
        contact: {
          name: 'XRNotify Support',
          url: 'https://xrnotify.io/support',
        },
      },
      servers: [
        { url: 'https://api.xrnotify.io', description: 'Production' },
        { url: 'http://localhost:8080', description: 'Development' },
      ],
      tags: [
        { name: 'Webhooks', description: 'Webhook subscription management' },
        { name: 'API Keys', description: 'API key management' },
        { name: 'Deliveries', description: 'Delivery history and replay' },
        { name: 'Health', description: 'Health and metrics endpoints' },
      ],
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            name: 'X-XRNotify-Key',
            in: 'header',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // ============================================
  // Request Hooks
  // ============================================

  // Request logging and metrics
  app.addHook('onRequest', async (request) => {
    request.startTime = Date.now();
  });

  app.addHook('onResponse', async (request, reply) => {
    const latency = Date.now() - (request.startTime || Date.now());
    const route = request.routeOptions?.url || request.url;
    
    httpRequestsTotal.inc({
      method: request.method,
      route,
      status: String(reply.statusCode),
    });
    
    httpRequestLatency.observe(
      { method: request.method, route },
      latency
    );
    
    log.info('request', {
      method: request.method,
      url: request.url,
      status: reply.statusCode,
      latency,
      requestId: request.id,
    });
  });

  // ============================================
  // Public Routes (no auth required)
  // ============================================

  // Health check
  app.get('/healthz', async (request, reply) => {
    const [dbHealth, redisHealth] = await Promise.all([
      checkDbHealth(),
      checkRedisHealth(),
    ]);

    const allHealthy = dbHealth.healthy && redisHealth.healthy;
    const status = allHealthy ? 'healthy' : 'degraded';

    reply.status(allHealthy ? 200 : 503).send({
      status,
      version: '1.0.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      services: {
        database: {
          healthy: dbHealth.healthy,
          latency_ms: dbHealth.latencyMs,
        },
        redis: {
          healthy: redisHealth.healthy,
          latency_ms: redisHealth.latencyMs,
        },
      },
    });
  });

  // Liveness probe
  app.get('/livez', async () => ({ status: 'alive' }));

  // Readiness probe
  app.get('/readyz', async (request, reply) => {
    const [dbHealth, redisHealth] = await Promise.all([
      checkDbHealth(),
      checkRedisHealth(),
    ]);

    if (dbHealth.healthy && redisHealth.healthy) {
      return { status: 'ready' };
    }

    reply.status(503).send({ status: 'not ready' });
  });

  // Metrics endpoint
  app.get('/metrics', async (request, reply) => {
    const metrics = await getMetrics();
    reply.header('Content-Type', getContentType()).send(metrics);
  });

  // ============================================
  // Protected Routes (auth required)
  // ============================================

  // Apply authentication to v1 routes
  app.addHook('preHandler', async (request, reply) => {
    // Skip auth for public routes
    const publicPaths = ['/healthz', '/livez', '/readyz', '/metrics', '/docs'];
    if (publicPaths.some(p => request.url.startsWith(p))) {
      return;
    }

    // Skip auth for OPTIONS requests
    if (request.method === 'OPTIONS') {
      return;
    }

    // Apply API key auth for v1 routes
    if (request.url.startsWith('/v1/')) {
      await authenticateApiKey(request, reply);
    }
  });

  // Register API routes
  await app.register(webhookRoutes);
  await app.register(authRoutes);
  await app.register(deliveryRoutes);

  // ============================================
  // Error Handling
  // ============================================

  app.setErrorHandler((error, request, reply) => {
    log.error('Request error', {
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
    });

    // Handle validation errors
    if (error.validation) {
      return reply.status(400).send({
        code: 400,
        message: 'Validation error',
        details: error.validation,
      });
    }

    // Handle rate limit errors
    if (error.statusCode === 429) {
      return reply.status(429).send({
        code: 429,
        message: 'Rate limit exceeded',
      });
    }

    // Default error response
    return reply.status(error.statusCode || 500).send({
      code: error.statusCode || 500,
      message: config.nodeEnv === 'production' 
        ? 'Internal server error' 
        : error.message,
    });
  });

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      code: 404,
      message: 'Route not found',
      hint: 'Check the API documentation at /docs',
    });
  });

  return app;
}

// ============================================
// Server Startup
// ============================================

async function start(): Promise<void> {
  let server: FastifyInstance | null = null;

  try {
    server = await buildServer();

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      log.info('Shutting down server', { signal });
      
      if (server) {
        await server.close();
      }
      
      await closeDb();
      await closeRedis();
      
      log.info('Server shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Start listening
    await server.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    log.info('XRNotify API server started', {
      port: config.port,
      env: config.nodeEnv,
      docs: `http://localhost:${config.port}/docs`,
    });

  } catch (error) {
    log.error('Server startup failed', { error: (error as Error).message });
    process.exit(1);
  }
}

// Type augmentation
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

// Start server
start();

export { buildServer };
