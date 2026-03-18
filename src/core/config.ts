/**
 * XRNotify Configuration Module
 * Centralized environment-based configuration with validation
 */

import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Configuration schema with validation
const configSchema = z.object({
  // Service
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().min(1).max(65535).default(8080),
  serviceName: z.string().default('xrnotify'),
  serviceRole: z.enum(['api', 'listener', 'worker']).default('api'),

  // Database
  dbUrl: z.string().url().or(z.string().startsWith('postgresql://')),
  dbPoolMin: z.coerce.number().min(1).default(2),
  dbPoolMax: z.coerce.number().min(1).default(10),
  dbIdleTimeout: z.coerce.number().min(0).default(30000),

  // Redis
  redisUrl: z.string(),
  redisMaxRetries: z.coerce.number().min(0).default(3),

  // XRPL
  xrplWs: z.string().url().default('wss://xrplcluster.com'),
  xrplWsFallback: z.string().url().default('wss://s1.ripple.com'),
  xrplReconnectDelay: z.coerce.number().min(1000).default(5000),

  // Logging
  logLevel: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  logFormat: z.enum(['json', 'pretty']).default('json'),

  // Metrics
  metricsEnabled: z.coerce.boolean().default(true),

  // Security
  jwtSecret: z.string().min(32),
  apiKeyRotationDays: z.coerce.number().min(1).default(180),
  webhookSignatureAlgorithm: z.enum(['sha256', 'sha512']).default('sha256'),
  rateLimitMax: z.coerce.number().min(1).default(60),
  rateLimitWindowMs: z.coerce.number().min(1000).default(60000),

  // Worker
  workerConcurrency: z.coerce.number().min(1).default(10),
  webhookTimeoutMs: z.coerce.number().min(1000).default(3000),
  webhookMaxRetries: z.coerce.number().min(0).default(3),
  retryDelaysMs: z.string().transform(s => s.split(',').map(Number)).default('1000,10000,60000'),

  // Stream
  streamName: z.string().default('xrpl_events'),
  streamMaxLength: z.coerce.number().min(1000).default(1000000),
  consumerGroup: z.string().default('workers'),
});

// Parse and validate configuration
function loadConfig() {
  const result = configSchema.safeParse({
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    serviceName: process.env.SERVICE_NAME,
    serviceRole: process.env.SERVICE_ROLE,
    dbUrl: process.env.DATABASE_URL,
    dbPoolMin: process.env.DB_POOL_MIN,
    dbPoolMax: process.env.DB_POOL_MAX,
    dbIdleTimeout: process.env.DB_IDLE_TIMEOUT,
    redisUrl: process.env.REDIS_URL,
    redisMaxRetries: process.env.REDIS_MAX_RETRIES,
    xrplWs: process.env.XRPL_WS,
    xrplWsFallback: process.env.XRPL_WS_FALLBACK,
    xrplReconnectDelay: process.env.XRPL_RECONNECT_DELAY,
    logLevel: process.env.LOG_LEVEL,
    logFormat: process.env.LOG_FORMAT,
    metricsEnabled: process.env.METRICS_ENABLED,
    jwtSecret: process.env.JWT_SECRET || 'development-secret-change-in-production-min-32-chars',
    apiKeyRotationDays: process.env.API_KEY_ROTATION_DAYS,
    webhookSignatureAlgorithm: process.env.WEBHOOK_SIGNATURE_ALGORITHM,
    rateLimitMax: process.env.RATE_LIMIT_MAX,
    rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
    workerConcurrency: process.env.WORKER_CONCURRENCY,
    webhookTimeoutMs: process.env.WEBHOOK_TIMEOUT_MS,
    webhookMaxRetries: process.env.WEBHOOK_MAX_RETRIES,
    retryDelaysMs: process.env.RETRY_DELAYS_MS,
    streamName: process.env.STREAM_NAME,
    streamMaxLength: process.env.STREAM_MAX_LENGTH,
    consumerGroup: process.env.CONSUMER_GROUP,
  });

  if (!result.success) {
    console.error('Configuration validation failed:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();

// Type export for external use
export type Config = typeof config;
