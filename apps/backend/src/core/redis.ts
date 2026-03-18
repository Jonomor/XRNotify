/**
 * @fileoverview XRNotify Redis Module
 * Redis client with Streams support using ioredis.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/core/redis
 */

import Redis, { type RedisOptions } from 'ioredis';
import { getConfig } from './config.js';
import { createModuleLogger, logError, type Logger } from './logger.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Redis health status
 */
export interface RedisHealthStatus {
  connected: boolean;
  latencyMs: number;
  error?: string;
}

/**
 * Stream message
 */
export interface StreamMessage {
  id: string;
  fields: Record<string, string>;
}

/**
 * Stream read result
 */
export interface StreamReadResult {
  stream: string;
  messages: StreamMessage[];
}

/**
 * Consumer group info
 */
export interface ConsumerGroupInfo {
  name: string;
  consumers: number;
  pending: number;
  lastDeliveredId: string;
}

/**
 * Stream info
 */
export interface StreamInfo {
  length: number;
  firstEntry: StreamMessage | null;
  lastEntry: StreamMessage | null;
  groups: ConsumerGroupInfo[];
}

// =============================================================================
// Redis Client
// =============================================================================

let redisClient: Redis | null = null;
let subscriberClient: Redis | null = null;
const logger = createModuleLogger('redis');

/**
 * Get Redis client options from config
 */
function getRedisOptions(): RedisOptions {
  const config = getConfig();

  return {
    maxRetriesPerRequest: config.redis.maxRetries,
    retryStrategy: (times: number) => {
      if (times > config.redis.maxRetries) {
        logger.error({ attempts: times }, 'Redis max retries exceeded');
        return null; // Stop retrying
      }
      const delay = Math.min(times * config.redis.retryDelayMs, 30000);
      logger.warn({ attempt: times, delayMs: delay }, 'Redis connection retry');
      return delay;
    },
    reconnectOnError: (err) => {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      return targetErrors.some((e) => err.message.includes(e));
    },
    enableReadyCheck: true,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    keyPrefix: config.redis.keyPrefix,
    lazyConnect: false,
  };
}

/**
 * Initialize the Redis client
 *
 * @returns Redis client instance
 */
export function initializeRedis(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const config = getConfig();
  const options = getRedisOptions();

  redisClient = new Redis(config.redis.url, options);

  // Event handlers
  redisClient.on('connect', () => {
    logger.info('Redis connecting...');
  });

  redisClient.on('ready', () => {
    logger.info('Redis connection ready');
  });

  redisClient.on('error', (err) => {
    logError(logger, err, 'Redis error');
  });

  redisClient.on('close', () => {
    logger.warn('Redis connection closed');
  });

  redisClient.on('reconnecting', (delay: number) => {
    logger.info({ delayMs: delay }, 'Redis reconnecting...');
  });

  redisClient.on('end', () => {
    logger.info('Redis connection ended');
  });

  return redisClient;
}

/**
 * Get the Redis client instance
 *
 * @returns Redis client
 */
export function getRedis(): Redis {
  if (!redisClient) {
    return initializeRedis();
  }
  return redisClient;
}

/**
 * Get a separate Redis client for subscriptions
 *
 * @returns Subscriber Redis client
 */
export function getSubscriber(): Redis {
  if (!subscriberClient) {
    const config = getConfig();
    const options = getRedisOptions();
    subscriberClient = new Redis(config.redis.url, options);

    subscriberClient.on('error', (err) => {
      logError(logger, err, 'Redis subscriber error');
    });
  }
  return subscriberClient;
}

/**
 * Close Redis connections
 */
export async function closeRedis(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  if (redisClient) {
    logger.info('Closing Redis client...');
    closePromises.push(
      redisClient.quit().then(() => {
        redisClient = null;
      })
    );
  }

  if (subscriberClient) {
    logger.info('Closing Redis subscriber...');
    closePromises.push(
      subscriberClient.quit().then(() => {
        subscriberClient = null;
      })
    );
  }

  await Promise.all(closePromises);
  logger.info('Redis connections closed');
}

// =============================================================================
// Health Check
// =============================================================================

/**
 * Check Redis health
 *
 * @returns Health status
 */
export async function checkHealth(): Promise<RedisHealthStatus> {
  const redis = getRedis();
  const start = performance.now();

  try {
    await redis.ping();
    const latencyMs = Math.round(performance.now() - start);

    return {
      connected: true,
      latencyMs,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const latencyMs = Math.round(performance.now() - start);

    return {
      connected: false,
      latencyMs,
      error: err.message,
    };
  }
}

/**
 * Wait for Redis to be ready
 *
 * @param maxAttempts - Maximum connection attempts
 * @param delayMs - Delay between attempts
 */
export async function waitForConnection(
  maxAttempts: number = 30,
  delayMs: number = 1000
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const health = await checkHealth();
      if (health.connected) {
        logger.info({ attempt, latencyMs: health.latencyMs }, 'Redis connection established');
        return;
      }
    } catch {
      // Ignore and retry
    }

    if (attempt < maxAttempts) {
      logger.debug({ attempt, maxAttempts }, 'Waiting for Redis connection...');
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`Failed to connect to Redis after ${maxAttempts} attempts`);
}

// =============================================================================
// Redis Streams
// =============================================================================

/**
 * Add a message to a stream
 *
 * @param stream - Stream name (without prefix)
 * @param fields - Message fields
 * @param options - Options
 * @returns Message ID
 *
 * @example
 * 