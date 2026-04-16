// =============================================================================
// XRNotify Platform - Auth Rate Limiters
// =============================================================================
// Per-IP rate limiting for login, signup, and password reset endpoints
// =============================================================================

import { SlidingWindowCounter } from './tokenBucket';

// -----------------------------------------------------------------------------
// Auth Rate Limiters
// -----------------------------------------------------------------------------

export const loginLimiter = new SlidingWindowCounter({
  keyPrefix: 'ratelimit:auth:login:',
  windowSizeSeconds: 900,   // 15 minutes
  maxRequests: 10,
});

export const signupLimiter = new SlidingWindowCounter({
  keyPrefix: 'ratelimit:auth:signup:',
  windowSizeSeconds: 3600,  // 1 hour
  maxRequests: 5,
});

export const forgotPasswordLimiter = new SlidingWindowCounter({
  keyPrefix: 'ratelimit:auth:forgot:',
  windowSizeSeconds: 3600,  // 1 hour
  maxRequests: 3,
});

// -----------------------------------------------------------------------------
// Helper
// -----------------------------------------------------------------------------

export async function checkAuthRateLimit(
  limiter: SlidingWindowCounter,
  identifier: string,
  retryAfterSeconds: number = 60
): Promise<{
  allowed: boolean;
  headers: Record<string, string>;
}> {
  const result = await limiter.increment(identifier);

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(Math.max(0, result.limit - result.count)),
  };

  if (!result.allowed) {
    headers['Retry-After'] = String(retryAfterSeconds);
  }

  return {
    allowed: result.allowed,
    headers,
  };
}
