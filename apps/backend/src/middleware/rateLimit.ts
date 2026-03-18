/**
 * @fileoverview XRNotify Rate Limiting Middleware
 * Per-tenant and per-API-key rate limiting using Redis.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/middleware/rateLimit
 */

import { type FastifyRequest, type FastifyReply, type FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { createModuleLogger } from '../core/logger.js';
import { getConfig } from '../core/config.js';
import { getRedis } from '../core/redis.js';
import { recordRateLimitHit } from '../core/metrics.js';
import { createErrorResponse } from '../routes/index.js';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('rate-limit');

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /**
   * Maximum requests allowed in the window
   */
  max: number;

  /**
   * Window duration in milliseconds
   */
  windowMs: number;

  /**
   * Key prefix for Redis
   */
  keyPrefix?: string;

  /**
   * Skip rate limiting for certain conditions
   */
  skip?: (request: FastifyRequest) => boolean;

  /**
   * Custom key generator
   */
  keyGenerator?: (request: FastifyRequest) => string;

  /**
   * Handler when rate limit is exceeded
   */
  onExceeded?: (request: FastifyRequest, reply: FastifyReply) => void;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;

  /**
   * Current request count in window
   */
  current: number;

  /**
   * Maximum allowed requests
   */
  limit: number;

  /**
   * Remaining requests in window
   */
  remaining: number;

  /**
   * Time until window resets (seconds)
   */
  resetInSeconds: number;

  /**
   * Retry after (seconds, only if not allowed)
   */
  retryAfter?: number;
}

/**
 * Rate limit tier
 */
export interface RateLimitTier {
  name: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

// =============================================================================
// Constants
// =============================================================================

const RATE_LIMIT_PREFIX = 'rl:';

/**
 * Default rate limit tiers by plan
 */
export const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
  free: {
    name: 'free',
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
  },
  starter: {
    name: 'starter',
    requestsPerMinute: 120,
    requestsPerHour: 5000,
    requestsPerDay: 50000,
  },
  pro: {
    name: 'pro',
    requestsPerMinute: 300,
    requestsPerHour: 20000,
    requestsPerDay: 200000,
  },
  enterprise: {
    name: 'enterprise',
    requestsPerMinute: 1000,
    requestsPerHour: 100000,
    requestsPerDay: 1000000,
  },
};

// =============================================================================
// Sliding Window Rate Limiter
// =============================================================================

/**
 * Lua script for sliding window rate limiting
 *
 * Uses sorted sets with timestamps as scores for precise sliding window
 */
const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local max_requests = tonumber(ARGV[3])
local window_start = now - window_ms

-- Remove expired entries
redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

-- Count current requests in window
local current = redis.call('ZCARD', key)

-- Check if under limit
if current < max_requests then
  -- Add new request
  redis.call('ZADD', key, now, now .. ':' .. math.random(1000000))
  redis.call('PEXPIRE', key, window_ms)
  return {1, current + 1, max_requests, max_requests - current - 1, window_ms / 1000}
else
  -- Get oldest entry to calculate retry-after
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retry_after = 0
  if oldest and oldest[2] then
    retry_after = math.ceil((tonumber(oldest[2]) + window_ms - now) / 1000)
    if retry_after < 0 then retry_after = 0 end
  end
  return {0, current, max_requests, 0, retry_after}
end
`;

/**
 * Check rate limit using sliding window algorithm
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redis = getRedis();
  const now = Date.now();
  const fullKey = `${RATE_LIMIT_PREFIX}${key}`;

  try {
    const result = await redis.eval(
      SLIDING_WINDOW_SCRIPT,
      1,
      fullKey,
      now.toString(),
      windowMs.toString(),
      max.toString()
    ) as [number, number, number, number, number];

    const [allowed, current, limit, remaining, resetOrRetry] = result;

    return {
      allowed: allowed === 1,
      current,
      limit,
      remaining: Math.max(0, remaining),
      resetInSeconds: allowed === 1 ? Math.ceil(windowMs / 1000) : 0,
      retryAfter: allowed === 0 ? resetOrRetry : undefined,
    };
  } catch (error) {
    logger.error({ err: error, key }, 'Rate limit check failed');
    // Fail open - allow request if rate limiting fails
    return {
      allowed: true,
      current: 0,
      limit: max,
      remaining: max,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }
}

/**
 * Simple fixed window rate limiter (faster, less precise)
 */
export async function checkRateLimitFixed(
  key: string,
  max: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redis = getRedis();
  const fullKey = `${RATE_LIMIT_PREFIX}${key}`;
  const windowSeconds = Math.ceil(windowMs / 1000);

  try {
    // Increment counter
    const current = await redis.incr(fullKey);

    // Set expiry on first request in window
    if (current === 1) {
      await redis.expire(fullKey, windowSeconds);
    }

    // Get TTL for reset time
    const ttl = await redis.ttl(fullKey);
    const resetInSeconds = ttl > 0 ? ttl : windowSeconds;

    const allowed = current <= max;
    const remaining = Math.max(0, max - current);

    return {
      allowed,
      current,
      limit: max,
      remaining,
      resetInSeconds,
      retryAfter: allowed ? undefined : resetInSeconds,
    };
  } catch (error) {
    logger.error({ err: error, key }, 'Fixed rate limit check failed');
    // Fail open
    return {
      allowed: true,
      current: 0,
      limit: max,
      remaining: max,
      resetInSeconds: windowSeconds,
    };
  }
}

// =============================================================================
// Rate Limit Key Generators
// =============================================================================

/**
 * Generate rate limit key for API key
 */
export function apiKeyRateLimitKey(apiKeyId: string, window: string = 'min'): string {
  return `apikey:${apiKeyId}:${window}`;
}

/**
 * Generate rate limit key for tenant
 */
export function tenantRateLimitKey(tenantId: string, window: string = 'min'): string {
  return `tenant:${tenantId}:${window}`;
}

/**
 * Generate rate limit key for IP
 */
export function ipRateLimitKey(ip: string, window: string = 'min'): string {
  return `ip:${ip}:${window}`;
}

/**
 * Generate rate limit key for endpoint
 */
export function endpointRateLimitKey(
  identifier: string,
  endpoint: string,
  window: string = 'min'
): string {
  // Normalize endpoint
  const normalizedEndpoint = endpoint.replace(/[^a-zA-Z0-9]/g, '_');
  return `endpoint:${identifier}:${normalizedEndpoint}:${window}`;
}

// =============================================================================
// Middleware Factory
// =============================================================================

/**
 * Create rate limit middleware with custom configuration
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    max,
    windowMs,
    keyPrefix = '',
    skip,
    keyGenerator,
    onExceeded,
  } = config;

  return async function rateLimitMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    // Check skip condition
    if (skip && skip(request)) {
      return;
    }

    // Generate key
    const baseKey = keyGenerator
      ? keyGenerator(request)
      : request.apiKeyId ?? request.ip;

    const key = `${keyPrefix}${baseKey}`;

    // Check rate limit
    const result = await checkRateLimit(key, max, windowMs);

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', result.limit);
    reply.header('X-RateLimit-Remaining', result.remaining);
    reply.header('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + result.resetInSeconds);

    if (!result.allowed) {
      // Record metric
      recordRateLimitHit(keyPrefix || 'default');

      // Log
      logger.warn(
        {
          key,
          current: result.current,
          limit: result.limit,
          retryAfter: result.retryAfter,
        },
        'Rate limit exceeded'
      );

      // Set Retry-After header
      if (result.retryAfter) {
        reply.header('Retry-After', result.retryAfter);
      }

      // Custom handler or default response
      if (onExceeded) {
        onExceeded(request, reply);
      } else {
        reply.status(429).send(
          createErrorResponse(
            'rate_limited',
            `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
            request.requestId,
            {
              limit: result.limit,
              remaining: 0,
              reset: new Date(Date.now() + (result.retryAfter ?? 60) * 1000).toISOString(),
              retry_after: result.retryAfter,
            }
          )
        );
      }
    }
  };
}

// =============================================================================
// Pre-configured Rate Limiters
// =============================================================================

/**
 * Global rate limiter (for unauthenticated requests)
 */
export const globalRateLimiter = createRateLimiter({
  max: 1000,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: 'global:',
  keyGenerator: (request) => request.ip,
});

/**
 * API key rate limiter
 */
export function apiKeyRateLimiter(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const config = getConfig();

  // Use custom limits from API key if set
  const max = request.auth?.rateLimitMax ?? config.rateLimit.apiKeyMax;
  const windowMs = request.auth?.rateLimitWindowMs ?? config.rateLimit.apiKeyWindowMs;

  const limiter = createRateLimiter({
    max,
    windowMs,
    keyPrefix: 'apikey:',
    keyGenerator: (req) => req.apiKeyId ?? req.ip,
    skip: (req) => !req.apiKeyId,
  });

  return limiter(request, reply);
}

/**
 * Webhook creation rate limiter (stricter)
 */
export const webhookCreateRateLimiter = createRateLimiter({
  max: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: 'webhook_create:',
  keyGenerator: (request) => request.tenantId ?? request.ip,
});

/**
 * API key creation rate limiter (stricter)
 */
export const apiKeyCreateRateLimiter = createRateLimiter({
  max: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: 'apikey_create:',
  keyGenerator: (request) => request.tenantId ?? request.ip,
});

/**
 * Replay rate limiter (very strict)
 */
export const replayRateLimiter = createRateLimiter({
  max: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: 'replay:',
  keyGenerator: (request) => request.tenantId ?? request.ip,
});

/**
 * Login rate limiter (prevent brute force)
 */
export const loginRateLimiter = createRateLimiter({
  max: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes
  keyPrefix: 'login:',
  keyGenerator: (request) => request.ip,
});

/**
 * Password reset rate limiter
 */
export const passwordResetRateLimiter = createRateLimiter({
  max: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyPrefix: 'password_reset:',
  keyGenerator: (request) => request.ip,
});

// =============================================================================
// Multi-Tier Rate Limiting
// =============================================================================

/**
 * Check multiple rate limit tiers
 *
 * Useful for implementing per-minute, per-hour, per-day limits
 */
export async function checkMultiTierRateLimit(
  identifier: string,
  tier: RateLimitTier
): Promise<{
  allowed: boolean;
  limitedBy: string | null;
  results: Record<string, RateLimitResult>;
}> {
  const results: Record<string, RateLimitResult> = {};
  let limitedBy: string | null = null;

  // Check per-minute limit
  const minuteResult = await checkRateLimitFixed(
    `${identifier}:min`,
    tier.requestsPerMinute,
    60 * 1000
  );
  results['minute'] = minuteResult;
  if (!minuteResult.allowed) {
    limitedBy = 'minute';
  }

  // Check per-hour limit (only if minute passed)
  if (!limitedBy) {
    const hourResult = await checkRateLimitFixed(
      `${identifier}:hour`,
      tier.requestsPerHour,
      60 * 60 * 1000
    );
    results['hour'] = hourResult;
    if (!hourResult.allowed) {
      limitedBy = 'hour';
    }
  }

  // Check per-day limit (only if hour passed)
  if (!limitedBy) {
    const dayResult = await checkRateLimitFixed(
      `${identifier}:day`,
      tier.requestsPerDay,
      24 * 60 * 60 * 1000
    );
    results['day'] = dayResult;
    if (!dayResult.allowed) {
      limitedBy = 'day';
    }
  }

  return {
    allowed: limitedBy === null,
    limitedBy,
    results,
  };
}

/**
 * Multi-tier rate limit middleware
 */
export function createMultiTierRateLimiter(
  getTier: (request: FastifyRequest) => RateLimitTier
) {
  return async function multiTierRateLimitMiddleware(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const identifier = request.tenantId ?? request.ip;
    const tier = getTier(request);

    const result = await checkMultiTierRateLimit(identifier, tier);

    // Set headers from most restrictive applicable limit
    const activeResult = result.limitedBy
      ? result.results[result.limitedBy]
      : result.results['minute'];

    if (activeResult) {
      reply.header('X-RateLimit-Limit', activeResult.limit);
      reply.header('X-RateLimit-Remaining', activeResult.remaining);
      reply.header('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + activeResult.resetInSeconds);
    }

    if (!result.allowed && activeResult) {
      recordRateLimitHit(`tier:${result.limitedBy}`);

      logger.warn(
        {
          identifier,
          tier: tier.name,
          limitedBy: result.limitedBy,
          retryAfter: activeResult.retryAfter,
        },
        'Multi-tier rate limit exceeded'
      );

      if (activeResult.retryAfter) {
        reply.header('Retry-After', activeResult.retryAfter);
      }

      reply.status(429).send(
        createErrorResponse(
          'rate_limited',
          `Rate limit exceeded (${result.limitedBy} limit). Try again in ${activeResult.retryAfter} seconds.`,
          request.requestId,
          {
            tier: tier.name,
            limited_by: result.limitedBy,
            retry_after: activeResult.retryAfter,
          }
        )
      );
    }
  };
}

// =============================================================================
// Fastify Plugin
// =============================================================================

/**
 * Rate limit plugin options
 */
export interface RateLimitPluginOptions {
  /**
   * Enable global rate limiting
   */
  global?: boolean;

  /**
   * Global rate limit max requests
   */
  globalMax?: number;

  /**
   * Global rate limit window (ms)
   */
  globalWindowMs?: number;

  /**
   * Routes to skip rate limiting
   */
  skipRoutes?: string[];
}

/**
 * Rate limit plugin
 */
const rateLimitPluginImpl: FastifyPluginAsync<RateLimitPluginOptions> = async (
  server,
  options
) => {
  const config = getConfig();
  const skipRoutes = new Set(options.skipRoutes ?? []);

  // Skip if rate limiting is disabled
  if (!config.rateLimit.enabled) {
    logger.info('Rate limiting disabled');
    return;
  }

  const globalMax = options.globalMax ?? config.rateLimit.globalMax;
  const globalWindowMs = options.globalWindowMs ?? config.rateLimit.globalWindowMs;

  // Add global rate limit hook
  if (options.global !== false) {
    server.addHook('preHandler', async (request, reply) => {
      // Skip health/metrics routes
      if (
        request.url === '/healthz' ||
        request.url === '/readyz' ||
        request.url === '/health' ||
        request.url === '/metrics'
      ) {
        return;
      }

      // Skip configured routes
      if (skipRoutes.has(request.url)) {
        return;
      }

      // Apply rate limiting based on authentication
      if (request.apiKeyId) {
        // Authenticated: use API key limits
        await apiKeyRateLimiter(request, reply);
      } else {
        // Unauthenticated: use global IP-based limits
        const limiter = createRateLimiter({
          max: globalMax,
          windowMs: globalWindowMs,
          keyPrefix: 'global:',
          keyGenerator: (req) => req.ip,
        });
        await limiter(request, reply);
      }
    });
  }

  logger.info(
    {
      globalMax,
      globalWindowMs,
    },
    'Rate limit plugin registered'
  );
};

export const rateLimitPlugin = fp(rateLimitPluginImpl, {
  name: 'rate-limit',
  fastify: '4.x',
});

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get current rate limit status for a key
 */
export async function getRateLimitStatus(key: string): Promise<{
  current: number;
  ttl: number;
} | null> {
  const redis = getRedis();
  const fullKey = `${RATE_LIMIT_PREFIX}${key}`;

  try {
    const [current, ttl] = await Promise.all([
      redis.zcard(fullKey),
      redis.ttl(fullKey),
    ]);

    if (ttl < 0) {
      return null;
    }

    return { current, ttl };
  } catch {
    return null;
  }
}

/**
 * Reset rate limit for a key
 */
export async function resetRateLimit(key: string): Promise<void> {
  const redis = getRedis();
  const fullKey = `${RATE_LIMIT_PREFIX}${key}`;
  await redis.del(fullKey);
}

/**
 * Reset all rate limits for an API key
 */
export async function resetApiKeyRateLimits(apiKeyId: string): Promise<void> {
  const redis = getRedis();
  const pattern = `${RATE_LIMIT_PREFIX}apikey:${apiKeyId}:*`;

  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
}

/**
 * Reset all rate limits for a tenant
 */
export async function resetTenantRateLimits(tenantId: string): Promise<void> {
  const redis = getRedis();
  const pattern = `${RATE_LIMIT_PREFIX}tenant:${tenantId}:*`;

  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
}

// =============================================================================
// Export
// =============================================================================

export default rateLimitPlugin;
