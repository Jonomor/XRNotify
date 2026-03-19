// =============================================================================
// XRNotify Platform - Redis
// =============================================================================
// Redis client with caching, pub/sub, streams, and rate limiting helpers
// =============================================================================

import Redis, { type Redis as RedisClient, type RedisOptions } from 'ioredis';
import { getConfig, redisKey } from './config';
import { createModuleLogger, logRedisOp } from './logger';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CacheOptions {
  /** TTL in seconds */
  ttl?: number;
  /** Skip cache and fetch fresh */
  skipCache?: boolean;
}

export interface StreamMessage {
  id: string;
  fields: Record<string, string>;
}

export interface StreamReadResult {
  stream: string;
  messages: StreamMessage[];
}

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = createModuleLogger('redis');

// -----------------------------------------------------------------------------
// Redis Client Singleton
// -----------------------------------------------------------------------------

let redisClient: RedisClient | null = null;
let subscriberClient: RedisClient | null = null;

/**
 * Parse Redis URL and return connection options
 */
function parseRedisUrl(url: string): RedisOptions {
  const parsed = new URL(url);
  
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6379', 10),
    password: parsed.password || undefined,
    db: parsed.pathname ? parseInt(parsed.pathname.slice(1), 10) : 0,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
    retryStrategy: (times: number) => {
      if (times > 10) {
        logger.error('Redis connection failed after 10 retries');
        return null;
      }
      const delay = Math.min(times * 100, 3000);
      logger.warn({ attempt: times, delay }, 'Retrying Redis connection');
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  };
}

/**
 * Get or create the Redis client
 */
export function getRedis(): RedisClient {
  if (!redisClient) {
    const config = getConfig();
    const options = parseRedisUrl(config.redis.url);
    
    redisClient = new Redis(options);

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('error', (err) => {
      logger.error({ err }, 'Redis client error');
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });
  }

  return redisClient;
}

/**
 * Get or create a separate Redis client for subscriptions
 */
export function getSubscriber(): RedisClient {
  if (!subscriberClient) {
    const config = getConfig();
    const options = parseRedisUrl(config.redis.url);
    
    subscriberClient = new Redis(options);

    subscriberClient.on('connect', () => {
      logger.debug('Redis subscriber connected');
    });

    subscriberClient.on('error', (err) => {
      logger.error({ err }, 'Redis subscriber error');
    });
  }

  return subscriberClient;
}

// -----------------------------------------------------------------------------
// Basic Operations
// -----------------------------------------------------------------------------

/**
 * Get a value from Redis
 */
export async function get(key: string): Promise<string | null> {
  const start = performance.now();
  const fullKey = redisKey(key);
  
  try {
    const value = await getRedis().get(fullKey);
    logRedisOp(logger, 'GET', fullKey, Math.round(performance.now() - start));
    return value;
  } catch (error) {
    logger.error({ error, key: fullKey }, 'Redis GET failed');
    throw error;
  }
}

/**
 * Set a value in Redis
 */
export async function set(
  key: string,
  value: string,
  ttlSeconds?: number
): Promise<void> {
  const start = performance.now();
  const fullKey = redisKey(key);
  
  try {
    if (ttlSeconds) {
      await getRedis().setex(fullKey, ttlSeconds, value);
    } else {
      await getRedis().set(fullKey, value);
    }
    logRedisOp(logger, 'SET', fullKey, Math.round(performance.now() - start));
  } catch (error) {
    logger.error({ error, key: fullKey }, 'Redis SET failed');
    throw error;
  }
}

/**
 * Delete a key from Redis
 */
export async function del(key: string): Promise<number> {
  const start = performance.now();
  const fullKey = redisKey(key);
  
  try {
    const result = await getRedis().del(fullKey);
    logRedisOp(logger, 'DEL', fullKey, Math.round(performance.now() - start));
    return result;
  } catch (error) {
    logger.error({ error, key: fullKey }, 'Redis DEL failed');
    throw error;
  }
}

/**
 * Check if a key exists
 */
export async function exists(key: string): Promise<boolean> {
  const fullKey = redisKey(key);
  const result = await getRedis().exists(fullKey);
  return result === 1;
}

/**
 * Get multiple values
 */
export async function mget(keys: string[]): Promise<(string | null)[]> {
  const start = performance.now();
  const fullKeys = keys.map(k => redisKey(k));
  
  try {
    const values = await getRedis().mget(...fullKeys);
    logRedisOp(logger, 'MGET', `${fullKeys.length} keys`, Math.round(performance.now() - start));
    return values;
  } catch (error) {
    logger.error({ error, keyCount: fullKeys.length }, 'Redis MGET failed');
    throw error;
  }
}

/**
 * Set multiple values
 */
export async function mset(
  keyValues: Record<string, string>,
  ttlSeconds?: number
): Promise<void> {
  const start = performance.now();
  const client = getRedis();
  const pipeline = client.pipeline();
  
  for (const [key, value] of Object.entries(keyValues)) {
    const fullKey = redisKey(key);
    if (ttlSeconds) {
      pipeline.setex(fullKey, ttlSeconds, value);
    } else {
      pipeline.set(fullKey, value);
    }
  }
  
  await pipeline.exec();
  logRedisOp(logger, 'MSET', `${Object.keys(keyValues).length} keys`, Math.round(performance.now() - start));
}

/**
 * Delete keys matching a pattern
 */
export async function invalidatePattern(pattern: string): Promise<number> {
  const start = performance.now();
  const fullPattern = redisKey(pattern);
  const client = getRedis();
  
  let cursor = '0';
  let deletedCount = 0;
  
  do {
    const [nextCursor, keys] = await client.scan(cursor, 'MATCH', fullPattern, 'COUNT', 100);
    cursor = nextCursor;
    
    if (keys.length > 0) {
      await client.del(...keys);
      deletedCount += keys.length;
    }
  } while (cursor !== '0');
  
  logRedisOp(logger, 'INVALIDATE', fullPattern, Math.round(performance.now() - start));
  logger.debug({ pattern: fullPattern, deletedCount }, 'Pattern invalidation complete');
  
  return deletedCount;
}

// -----------------------------------------------------------------------------
// JSON Helpers
// -----------------------------------------------------------------------------

/**
 * Get and parse JSON from Redis
 */
export async function getJson<T>(key: string): Promise<T | null> {
  const value = await get(key);
  if (!value) return null;
  
  try {
    return JSON.parse(value) as T;
  } catch {
    logger.warn({ key }, 'Failed to parse JSON from Redis');
    return null;
  }
}

/**
 * Stringify and set JSON in Redis
 */
export async function setJson<T>(
  key: string,
  value: T,
  ttlSeconds?: number
): Promise<void> {
  await set(key, JSON.stringify(value), ttlSeconds);
}

// -----------------------------------------------------------------------------
// Cache-Aside Pattern
// -----------------------------------------------------------------------------

/**
 * Get from cache or fetch and cache
 * 
 * @example
 * const user = await cached(
 *   `user:${userId}`,
 *   async () => await db.queryOne('SELECT * FROM users WHERE id = $1', [userId]),
 *   { ttl: 300 }
 * );
 */
export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = 300, skipCache = false } = options;
  
  // Try cache first
  if (!skipCache) {
    const cachedValue = await getJson<T>(key);
    if (cachedValue !== null) {
      logger.trace({ key }, 'Cache hit');
      return cachedValue;
    }
  }
  
  // Fetch and cache
  logger.trace({ key }, 'Cache miss');
  const value = await fetcher();
  
  if (value !== null && value !== undefined) {
    await setJson(key, value, ttl);
  }
  
  return value;
}

// -----------------------------------------------------------------------------
// Pub/Sub
// -----------------------------------------------------------------------------

/**
 * Publish a message to a channel
 */
export async function publishMessage(
  channel: string,
  message: string | Record<string, unknown>
): Promise<number> {
  const fullChannel = redisKey(channel);
  const payload = typeof message === 'string' ? message : JSON.stringify(message);
  
  const subscribers = await getRedis().publish(fullChannel, payload);
  logger.debug({ channel: fullChannel, subscribers }, 'Message published');
  
  return subscribers;
}

/**
 * Subscribe to a channel
 */
export async function subscribe(
  channel: string,
  handler: (message: string, channel: string) => void
): Promise<void> {
  const subscriber = getSubscriber();
  const fullChannel = redisKey(channel);
  
  await subscriber.subscribe(fullChannel);
  
  subscriber.on('message', (ch, message) => {
    if (ch === fullChannel) {
      handler(message, ch);
    }
  });
  
  logger.info({ channel: fullChannel }, 'Subscribed to channel');
}

/**
 * Unsubscribe from a channel
 */
export async function unsubscribe(channel: string): Promise<void> {
  const fullChannel = redisKey(channel);
  await getSubscriber().unsubscribe(fullChannel);
  logger.info({ channel: fullChannel }, 'Unsubscribed from channel');
}

// -----------------------------------------------------------------------------
// Streams
// -----------------------------------------------------------------------------

/**
 * Add entry to a stream
 */
export async function streamAdd(
  stream: string,
  fields: Record<string, string>,
  maxLen?: number
): Promise<string> {
  const fullStream = redisKey(stream);
  const client = getRedis();
  
  const args: (string | number)[] = [fullStream];
  
  if (maxLen) {
    args.push('MAXLEN', '~', maxLen);
  }
  
  args.push('*');
  
  for (const [key, value] of Object.entries(fields)) {
    args.push(key, value);
  }
  
  const id = await client.xadd(...(args as [string, ...string[]]));
  return id as string;
}

/**
 * Read from stream with consumer group
 */
export async function streamReadGroup(
  stream: string,
  group: string,
  consumer: string,
  count: number = 10,
  blockMs: number = 5000
): Promise<StreamReadResult[]> {
  const fullStream = redisKey(stream);
  const client = getRedis();
  
  try {
    const result = await client.xreadgroup(
      'GROUP', group, consumer,
      'COUNT', count,
      'BLOCK', blockMs,
      'STREAMS', fullStream, '>'
    );
    
    if (!result) return [];
    
    return (result as [string, [string, string[]][]][]).map(([streamName, messages]) => ({
      stream: streamName,
      messages: messages.map(([id, fields]: [string, string[]]) => ({
        id,
        fields: parseStreamFields(fields),
      })),
    }));
  } catch (error) {
    // Handle NOGROUP error - group doesn't exist
    if (error instanceof Error && error.message.includes('NOGROUP')) {
      logger.warn({ stream: fullStream, group }, 'Consumer group does not exist');
      return [];
    }
    throw error;
  }
}

/**
 * Acknowledge stream message
 */
export async function streamAck(
  stream: string,
  group: string,
  ...ids: string[]
): Promise<number> {
  const fullStream = redisKey(stream);
  return await getRedis().xack(fullStream, group, ...ids);
}

/**
 * Create consumer group for stream
 */
export async function streamCreateGroup(
  stream: string,
  group: string,
  startId: string = '0'
): Promise<void> {
  const fullStream = redisKey(stream);
  
  try {
    await getRedis().xgroup('CREATE', fullStream, group, startId, 'MKSTREAM');
    logger.info({ stream: fullStream, group }, 'Consumer group created');
  } catch (error) {
    // Ignore if group already exists
    if (error instanceof Error && error.message.includes('BUSYGROUP')) {
      logger.debug({ stream: fullStream, group }, 'Consumer group already exists');
      return;
    }
    throw error;
  }
}

/**
 * Get stream length
 */
export async function streamLen(stream: string): Promise<number> {
  const fullStream = redisKey(stream);
  return await getRedis().xlen(fullStream);
}

/**
 * Parse stream fields from array to object
 */
function parseStreamFields(fields: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    const key = fields[i];
    const value = fields[i + 1];
    if (key && value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// -----------------------------------------------------------------------------
// Atomic Operations
// -----------------------------------------------------------------------------

/**
 * Increment a counter
 */
export async function incr(key: string): Promise<number> {
  const fullKey = redisKey(key);
  return await getRedis().incr(fullKey);
}

/**
 * Increment by amount
 */
export async function incrBy(key: string, amount: number): Promise<number> {
  const fullKey = redisKey(key);
  return await getRedis().incrby(fullKey, amount);
}

/**
 * Decrement a counter
 */
export async function decr(key: string): Promise<number> {
  const fullKey = redisKey(key);
  return await getRedis().decr(fullKey);
}

/**
 * Set expiry on a key
 */
export async function expire(key: string, seconds: number): Promise<boolean> {
  const fullKey = redisKey(key);
  const result = await getRedis().expire(fullKey, seconds);
  return result === 1;
}

/**
 * Get TTL of a key
 */
export async function ttl(key: string): Promise<number> {
  const fullKey = redisKey(key);
  return await getRedis().ttl(fullKey);
}

// -----------------------------------------------------------------------------
// Health Check
// -----------------------------------------------------------------------------

/**
 * Check Redis health
 */
export async function checkHealth(): Promise<{
  healthy: boolean;
  latencyMs: number;
  message?: string;
}> {
  const start = performance.now();
  
  try {
    await getRedis().ping();
    const latencyMs = Math.round(performance.now() - start);
    
    return {
      healthy: true,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - start);
    
    return {
      healthy: false,
      latencyMs,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// -----------------------------------------------------------------------------
// Graceful Shutdown
// -----------------------------------------------------------------------------

/**
 * Close Redis connections gracefully
 */
export async function closeRedis(): Promise<void> {
  const promises: Promise<void>[] = [];
  
  if (redisClient) {
    logger.info('Closing Redis client...');
    promises.push(
      redisClient.quit().then(() => {
        redisClient = null;
      })
    );
  }
  
  if (subscriberClient) {
    logger.info('Closing Redis subscriber...');
    promises.push(
      subscriberClient.quit().then(() => {
        subscriberClient = null;
      })
    );
  }
  
  await Promise.all(promises);
  logger.info('Redis connections closed');
}
