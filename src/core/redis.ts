/**
 * XRNotify Redis Module
 * Redis connection with Streams support for event queuing
 */

import Redis from 'ioredis';
import { config } from './config.js';
import { createChildLogger } from './logger.js';

const log = createChildLogger('redis');

// Create Redis client
export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: config.redisMaxRetries,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    log.warn(`Redis connection retry #${times}`, { delay });
    return delay;
  },
  reconnectOnError(err) {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
    return targetErrors.some(e => err.message.includes(e));
  },
  enableReadyCheck: true,
  lazyConnect: false,
});

// Connection event handlers
redis.on('connect', () => {
  log.info('Redis connecting...');
});

redis.on('ready', () => {
  log.info('Redis connection ready');
});

redis.on('error', (err) => {
  log.error('Redis error', { error: err.message });
});

redis.on('close', () => {
  log.warn('Redis connection closed');
});

redis.on('reconnecting', () => {
  log.info('Redis reconnecting...');
});

// Health check
export async function checkRedisHealth(): Promise<{
  healthy: boolean;
  latencyMs: number;
  info?: Record<string, string>;
}> {
  const start = Date.now();
  try {
    await redis.ping();
    const infoRaw = await redis.info('server');
    const info: Record<string, string> = {};
    infoRaw.split('\n').forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) info[key.trim()] = value.trim();
    });
    return {
      healthy: true,
      latencyMs: Date.now() - start,
      info: {
        redis_version: info.redis_version,
        uptime_in_seconds: info.uptime_in_seconds,
      },
    };
  } catch (error) {
    log.error('Redis health check failed', { error });
    return {
      healthy: false,
      latencyMs: Date.now() - start,
    };
  }
}

// Graceful shutdown
export async function closeRedis(): Promise<void> {
  log.info('Closing Redis connection...');
  await redis.quit();
  log.info('Redis connection closed');
}

// Stream helpers
export async function addToStream(
  streamName: string,
  data: Record<string, string>,
  maxLen?: number
): Promise<string> {
  const args: (string | number)[] = [streamName];
  
  if (maxLen) {
    args.push('MAXLEN', '~', maxLen);
  }
  
  args.push('*');
  
  for (const [key, value] of Object.entries(data)) {
    args.push(key, value);
  }
  
  return redis.xadd(...(args as [string, ...string[]]));
}

export async function ensureConsumerGroup(
  streamName: string,
  groupName: string
): Promise<void> {
  try {
    await redis.xgroup('CREATE', streamName, groupName, '$', 'MKSTREAM');
    log.info('Consumer group created', { streamName, groupName });
  } catch (error) {
    // Group already exists
    if (!(error as Error).message.includes('BUSYGROUP')) {
      throw error;
    }
    log.debug('Consumer group already exists', { streamName, groupName });
  }
}

export async function readFromStream(
  streamName: string,
  groupName: string,
  consumerName: string,
  count: number = 10,
  blockMs: number = 5000
): Promise<Array<[string, string[]]> | null> {
  const result = await redis.xreadgroup(
    'GROUP', groupName, consumerName,
    'BLOCK', blockMs,
    'COUNT', count,
    'STREAMS', streamName, '>'
  );
  
  if (!result) return null;
  
  // Parse stream entries
  const entries: Array<[string, string[]]> = [];
  for (const [, messages] of result) {
    for (const [id, fields] of messages) {
      entries.push([id, fields]);
    }
  }
  
  return entries;
}

export async function ackMessage(
  streamName: string,
  groupName: string,
  messageId: string
): Promise<void> {
  await redis.xack(streamName, groupName, messageId);
}

export async function getStreamInfo(streamName: string): Promise<{
  length: number;
  firstEntry: string | null;
  lastEntry: string | null;
}> {
  const info = await redis.xinfo('STREAM', streamName);
  const infoObj: Record<string, unknown> = {};
  
  for (let i = 0; i < info.length; i += 2) {
    infoObj[info[i] as string] = info[i + 1];
  }
  
  return {
    length: infoObj.length as number,
    firstEntry: infoObj['first-entry'] ? (infoObj['first-entry'] as string[])[0] : null,
    lastEntry: infoObj['last-entry'] ? (infoObj['last-entry'] as string[])[0] : null,
  };
}
