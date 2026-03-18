// =============================================================================
// XRNotify Platform - Token Bucket Rate Limiter
// =============================================================================
// Redis-backed token bucket algorithm with sliding window and burst support
// =============================================================================

import { getRedis } from '../redis';
import { getConfig, redisKey } from '../config';
import { createModuleLogger, logSecurityEvent } from '../logger';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface RateLimitConfig {
  /** Maximum tokens (requests) per window */
  maxTokens: number;
  /** Window size in seconds */
  windowSizeSeconds: number;
  /** Burst allowance (extra tokens for short bursts) */
  burstSize?: number;
  /** Key prefix for Redis */
  keyPrefix?: string;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining tokens in current window */
  remaining: number;
  /** Total limit */
  limit: number;
  /** Seconds until limit resets */
  resetInSeconds: number;
  /** Retry after (seconds) - only set if rate limited */
  retryAfter?: number;
}

export interface RateLimitInfo {
  /** Current token count */
  tokens: number;
  /** Last refill timestamp */
  lastRefill: number;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const DEFAULT_KEY_PREFIX = 'ratelimit:';
const RATE_LIMIT_SCRIPT = `
  local key = KEYS[1]
  local max_tokens = tonumber(ARGV[1])
  local window_seconds = tonumber(ARGV[2])
  local burst_size = tonumber(ARGV[3])
  local now = tonumber(ARGV[4])
  local cost = tonumber(ARGV[5])
  
  -- Get current state
  local data = redis.call('HMGET', key, 'tokens', 'last_refill')
  local tokens = tonumber(data[1])
  local last_refill = tonumber(data[2])
  
  -- Initialize if first request
  if not tokens then
    tokens = max_tokens + burst_size
    last_refill = now
  end
  
  -- Calculate token refill
  local elapsed = now - last_refill
  local refill_rate = max_tokens / window_seconds
  local refill_amount = elapsed * refill_rate
  
  -- Refill tokens (capped at max + burst)
  tokens = math.min(max_tokens + burst_size, tokens + refill_amount)
  last_refill = now
  
  -- Check if request can be allowed
  local allowed = 0
  if tokens >= cost then
    tokens = tokens - cost
    allowed = 1
  end
  
  -- Calculate reset time
  local tokens_needed = cost - tokens
  local reset_seconds = 0
  if tokens_needed > 0 then
    reset_seconds = math.ceil(tokens_needed / refill_rate)
  end
  
  -- Save state
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', last_refill)
  redis.call('EXPIRE', key, window_seconds * 2)
  
  return {allowed, math.floor(tokens), reset_seconds}
`;

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = createModuleLogger('rate-limit');

// -----------------------------------------------------------------------------
// Token Bucket Rate Limiter
// -----------------------------------------------------------------------------

export class TokenBucketRateLimiter {
  private config: Required<RateLimitConfig>;
  private scriptSha: string | null = null;

  constructor(config: RateLimitConfig) {
    this.config = {
      maxTokens: config.maxTokens,
      windowSizeSeconds: config.windowSizeSeconds,
      burstSize: config.burstSize ?? Math.ceil(config.maxTokens * 0.1),
      keyPrefix: config.keyPrefix ?? DEFAULT_KEY_PREFIX,
    };
  }

  /**
   * Check if a request should be allowed
   * 
   * @param identifier - Unique identifier (e.g., tenant ID, API key ID, IP)
   * @param cost - Token cost of this request (default: 1)
   * @returns Rate limit result
   */
  async check(identifier: string, cost: number = 1): Promise<RateLimitResult> {
    const key = redisKey(`${this.config.keyPrefix}${identifier}`);
    const now = Math.floor(Date.now() / 1000);

    try {
      const result = await this.executeScript(key, now, cost);
      
      const allowed = result[0] === 1;
      const remaining = Math.max(0, result[1] ?? 0);
      const resetSeconds = result[2] ?? 0;

      if (!allowed) {
        logSecurityEvent(logger, 'rate_limited', { 
          identifier,
          remaining,
          resetSeconds,
        });
      }

      return {
        allowed,
        remaining,
        limit: this.config.maxTokens,
        resetInSeconds: resetSeconds,
        retryAfter: allowed ? undefined : resetSeconds,
      };
    } catch (error) {
      logger.error({ error, identifier }, 'Rate limit check failed');
      // Fail open - allow request if rate limiter fails
      return {
        allowed: true,
        remaining: this.config.maxTokens,
        limit: this.config.maxTokens,
        resetInSeconds: 0,
      };
    }
  }

  /**
   * Consume tokens without checking (for pre-authorized requests)
   */
  async consume(identifier: string, cost: number = 1): Promise<void> {
    await this.check(identifier, cost);
  }

  /**
   * Get current rate limit info without consuming
   */
  async getInfo(identifier: string): Promise<RateLimitInfo | null> {
    const key = redisKey(`${this.config.keyPrefix}${identifier}`);
    const redis = getRedis();

    const data = await redis.hmget(key, 'tokens', 'last_refill');
    
    if (!data[0] || !data[1]) {
      return null;
    }

    return {
      tokens: parseFloat(data[0]),
      lastRefill: parseInt(data[1], 10),
    };
  }

  /**
   * Reset rate limit for an identifier
   */
  async reset(identifier: string): Promise<void> {
    const key = redisKey(`${this.config.keyPrefix}${identifier}`);
    await getRedis().del(key);
    logger.debug({ identifier }, 'Rate limit reset');
  }

  /**
   * Execute the rate limit Lua script
   */
  private async executeScript(
    key: string,
    now: number,
    cost: number
  ): Promise<number[]> {
    const redis = getRedis();

    // Try to use cached script SHA
    if (this.scriptSha) {
      try {
        const result = await redis.evalsha(
          this.scriptSha,
          1,
          key,
          this.config.maxTokens,
          this.config.windowSizeSeconds,
          this.config.burstSize,
          now,
          cost
        );
        return result as number[];
      } catch (error) {
        // Script not found, will reload below
        if (!(error instanceof Error) || !error.message.includes('NOSCRIPT')) {
          throw error;
        }
        this.scriptSha = null;
      }
    }

    // Load and execute script
    this.scriptSha = await redis.script('LOAD', RATE_LIMIT_SCRIPT) as string;
    
    const result = await redis.evalsha(
      this.scriptSha,
      1,
      key,
      this.config.maxTokens,
      this.config.windowSizeSeconds,
      this.config.burstSize,
      now,
      cost
    );

    return result as number[];
  }
}

// -----------------------------------------------------------------------------
// Default Rate Limiters
// -----------------------------------------------------------------------------

let apiRateLimiter: TokenBucketRateLimiter | null = null;
let webhookRateLimiter: TokenBucketRateLimiter | null = null;

/**
 * Get the API rate limiter (per tenant/API key)
 */
export function getApiRateLimiter(): TokenBucketRateLimiter {
  if (!apiRateLimiter) {
    const config = getConfig();
    apiRateLimiter = new TokenBucketRateLimiter({
      maxTokens: config.rateLimit.requestsPerMinute,
      windowSizeSeconds: 60,
      burstSize: config.rateLimit.burst,
      keyPrefix: 'ratelimit:api:',
    });
  }
  return apiRateLimiter;
}

/**
 * Get the webhook delivery rate limiter (per webhook URL)
 */
export function getWebhookRateLimiter(): TokenBucketRateLimiter {
  if (!webhookRateLimiter) {
    webhookRateLimiter = new TokenBucketRateLimiter({
      maxTokens: 100, // 100 requests per minute per URL
      windowSizeSeconds: 60,
      burstSize: 20,
      keyPrefix: 'ratelimit:webhook:',
    });
  }
  return webhookRateLimiter;
}

// -----------------------------------------------------------------------------
// Middleware Helper
// -----------------------------------------------------------------------------

/**
 * Check rate limit and return headers
 */
export async function checkRateLimit(
  identifier: string,
  limiter?: TokenBucketRateLimiter
): Promise<{
  allowed: boolean;
  headers: Record<string, string>;
  retryAfter?: number;
}> {
  const rl = limiter ?? getApiRateLimiter();
  const result = await rl.check(identifier);

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + result.resetInSeconds),
  };

  if (!result.allowed && result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return {
    allowed: result.allowed,
    headers,
    retryAfter: result.retryAfter,
  };
}

// -----------------------------------------------------------------------------
// Sliding Window Counter (Alternative Implementation)
// -----------------------------------------------------------------------------

/**
 * Simple sliding window counter for less granular rate limiting
 */
export class SlidingWindowCounter {
  private keyPrefix: string;
  private windowSizeSeconds: number;
  private maxRequests: number;

  constructor(config: {
    keyPrefix: string;
    windowSizeSeconds: number;
    maxRequests: number;
  }) {
    this.keyPrefix = config.keyPrefix;
    this.windowSizeSeconds = config.windowSizeSeconds;
    this.maxRequests = config.maxRequests;
  }

  /**
   * Increment counter and check if limit exceeded
   */
  async increment(identifier: string): Promise<{
    allowed: boolean;
    count: number;
    limit: number;
  }> {
    const redis = getRedis();
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % this.windowSizeSeconds);
    const key = redisKey(`${this.keyPrefix}${identifier}:${windowStart}`);

    const count = await redis.incr(key);
    
    // Set expiry on first increment
    if (count === 1) {
      await redis.expire(key, this.windowSizeSeconds * 2);
    }

    return {
      allowed: count <= this.maxRequests,
      count,
      limit: this.maxRequests,
    };
  }

  /**
   * Get current count without incrementing
   */
  async getCount(identifier: string): Promise<number> {
    const redis = getRedis();
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - (now % this.windowSizeSeconds);
    const key = redisKey(`${this.keyPrefix}${identifier}:${windowStart}`);

    const count = await redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }
}

// -----------------------------------------------------------------------------
// Usage Tracking (For Billing)
// -----------------------------------------------------------------------------

/**
 * Track usage for billing purposes
 */
export class UsageTracker {
  private keyPrefix: string;

  constructor(keyPrefix: string = 'usage:') {
    this.keyPrefix = keyPrefix;
  }

  /**
   * Increment usage counter
   */
  async increment(
    tenantId: string,
    metric: string,
    amount: number = 1
  ): Promise<number> {
    const redis = getRedis();
    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const key = redisKey(`${this.keyPrefix}${tenantId}:${metric}:${month}`);

    const newValue = await redis.incrby(key, amount);
    
    // Ensure key expires after the month (plus buffer)
    await redis.expire(key, 45 * 24 * 60 * 60); // 45 days

    return newValue;
  }

  /**
   * Get current usage
   */
  async getUsage(
    tenantId: string,
    metric: string,
    month?: string
  ): Promise<number> {
    const redis = getRedis();
    const targetMonth = month ?? this.getCurrentMonth();
    const key = redisKey(`${this.keyPrefix}${tenantId}:${metric}:${targetMonth}`);

    const value = await redis.get(key);
    return value ? parseInt(value, 10) : 0;
  }

  /**
   * Get usage for multiple months
   */
  async getUsageHistory(
    tenantId: string,
    metric: string,
    months: number = 6
  ): Promise<Array<{ month: string; usage: number }>> {
    const redis = getRedis();
    const results: Array<{ month: string; usage: number }> = [];

    for (let i = 0; i < months; i++) {
      const date = new Date();
      date.setUTCMonth(date.getUTCMonth() - i);
      const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      const key = redisKey(`${this.keyPrefix}${tenantId}:${metric}:${month}`);

      const value = await redis.get(key);
      results.push({
        month,
        usage: value ? parseInt(value, 10) : 0,
      });
    }

    return results.reverse();
  }

  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  }
}

// -----------------------------------------------------------------------------
// Singleton Usage Tracker
// -----------------------------------------------------------------------------

let usageTracker: UsageTracker | null = null;

export function getUsageTracker(): UsageTracker {
  if (!usageTracker) {
    usageTracker = new UsageTracker('usage:events:');
  }
  return usageTracker;
}
