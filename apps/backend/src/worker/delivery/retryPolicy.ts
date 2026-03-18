/**
 * @fileoverview XRNotify Delivery Retry Policy
 * Exponential backoff with jitter for webhook delivery retries.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/worker/delivery/retryPolicy
 */

import { createModuleLogger } from '../../core/logger.js';
import type { DeliveryErrorCode } from './httpDeliver.js';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('retry-policy');

/**
 * Retry policy configuration
 */
export interface RetryPolicyConfig {
  /**
   * Maximum number of retry attempts (default: 5)
   */
  maxAttempts: number;

  /**
   * Base delay in milliseconds (default: 1000)
   */
  baseDelayMs: number;

  /**
   * Maximum delay in milliseconds (default: 3600000 = 1 hour)
   */
  maxDelayMs: number;

  /**
   * Backoff multiplier (default: 2)
   */
  backoffMultiplier: number;

  /**
   * Jitter factor (0-1, default: 0.25)
   */
  jitterFactor: number;

  /**
   * Use full jitter instead of decorrelated jitter (default: false)
   */
  useFullJitter: boolean;
}

/**
 * Retry schedule entry
 */
export interface RetryScheduleEntry {
  attempt: number;
  delayMs: number;
  delayHuman: string;
  scheduledAt: Date;
}

/**
 * Retry decision
 */
export interface RetryDecision {
  /**
   * Whether to retry
   */
  shouldRetry: boolean;

  /**
   * Delay before retry in milliseconds
   */
  delayMs: number;

  /**
   * When to schedule the retry
   */
  retryAt: Date;

  /**
   * Human-readable delay
   */
  delayHuman: string;

  /**
   * Reason for decision
   */
  reason: string;

  /**
   * Next attempt number
   */
  nextAttempt: number;

  /**
   * Whether this is the final attempt
   */
  isFinalAttempt: boolean;
}

/**
 * Error classification for retry decisions
 */
export interface ErrorClassification {
  /**
   * Whether error is retryable
   */
  retryable: boolean;

  /**
   * Category of error
   */
  category: 'transient' | 'permanent' | 'timeout' | 'rate_limit' | 'server_error' | 'unknown';

  /**
   * Suggested delay multiplier
   */
  delayMultiplier: number;

  /**
   * Maximum attempts for this error type
   */
  maxAttempts: number | null;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default retry policy
 */
export const DEFAULT_RETRY_POLICY: RetryPolicyConfig = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 3600000, // 1 hour
  backoffMultiplier: 2,
  jitterFactor: 0.25,
  useFullJitter: false,
};

/**
 * Aggressive retry policy (more attempts, shorter delays)
 */
export const AGGRESSIVE_RETRY_POLICY: RetryPolicyConfig = {
  maxAttempts: 10,
  baseDelayMs: 500,
  maxDelayMs: 1800000, // 30 minutes
  backoffMultiplier: 1.5,
  jitterFactor: 0.2,
  useFullJitter: false,
};

/**
 * Conservative retry policy (fewer attempts, longer delays)
 */
export const CONSERVATIVE_RETRY_POLICY: RetryPolicyConfig = {
  maxAttempts: 3,
  baseDelayMs: 5000,
  maxDelayMs: 7200000, // 2 hours
  backoffMultiplier: 3,
  jitterFactor: 0.3,
  useFullJitter: true,
};

/**
 * Predefined retry schedules (delay in seconds)
 */
export const RETRY_SCHEDULES = {
  /**
   * Standard: 1s, 5s, 30s, 2m, 10m
   */
  standard: [1, 5, 30, 120, 600],

  /**
   * Aggressive: 1s, 2s, 5s, 10s, 30s, 1m, 2m, 5m, 10m, 30m
   */
  aggressive: [1, 2, 5, 10, 30, 60, 120, 300, 600, 1800],

  /**
   * Conservative: 5s, 30s, 5m, 30m, 2h
   */
  conservative: [5, 30, 300, 1800, 7200],

  /**
   * Immediate: 0s, 1s, 2s, 5s, 10s
   */
  immediate: [0, 1, 2, 5, 10],
} as const;

/**
 * Error code classifications
 */
const ERROR_CLASSIFICATIONS: Record<DeliveryErrorCode, ErrorClassification> = {
  TIMEOUT: {
    retryable: true,
    category: 'timeout',
    delayMultiplier: 1.5,
    maxAttempts: null,
  },
  CONNECTION_REFUSED: {
    retryable: true,
    category: 'transient',
    delayMultiplier: 2,
    maxAttempts: null,
  },
  CONNECTION_RESET: {
    retryable: true,
    category: 'transient',
    delayMultiplier: 1.5,
    maxAttempts: null,
  },
  DNS_FAILURE: {
    retryable: true,
    category: 'transient',
    delayMultiplier: 3,
    maxAttempts: 3,
  },
  SSL_ERROR: {
    retryable: false,
    category: 'permanent',
    delayMultiplier: 1,
    maxAttempts: 1,
  },
  INVALID_URL: {
    retryable: false,
    category: 'permanent',
    delayMultiplier: 1,
    maxAttempts: 1,
  },
  SSRF_BLOCKED: {
    retryable: false,
    category: 'permanent',
    delayMultiplier: 1,
    maxAttempts: 1,
  },
  HTTP_4XX: {
    retryable: false,
    category: 'permanent',
    delayMultiplier: 1,
    maxAttempts: 1,
  },
  HTTP_5XX: {
    retryable: true,
    category: 'server_error',
    delayMultiplier: 2,
    maxAttempts: null,
  },
  INVALID_RESPONSE: {
    retryable: true,
    category: 'transient',
    delayMultiplier: 1.5,
    maxAttempts: 3,
  },
  BODY_TOO_LARGE: {
    retryable: false,
    category: 'permanent',
    delayMultiplier: 1,
    maxAttempts: 1,
  },
  UNKNOWN_ERROR: {
    retryable: true,
    category: 'unknown',
    delayMultiplier: 2,
    maxAttempts: 3,
  },
};

// =============================================================================
// Delay Calculation
// =============================================================================

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(
  attempt: number,
  config: Partial<RetryPolicyConfig> = {}
): number {
  const {
    baseDelayMs = DEFAULT_RETRY_POLICY.baseDelayMs,
    maxDelayMs = DEFAULT_RETRY_POLICY.maxDelayMs,
    backoffMultiplier = DEFAULT_RETRY_POLICY.backoffMultiplier,
  } = config;

  // Exponential backoff: base * multiplier^(attempt-1)
  const exponentialDelay = baseDelayMs * Math.pow(backoffMultiplier, attempt - 1);

  // Cap at maximum
  return Math.min(exponentialDelay, maxDelayMs);
}

/**
 * Add jitter to delay
 */
export function addJitter(
  delayMs: number,
  config: Partial<RetryPolicyConfig> = {}
): number {
  const {
    jitterFactor = DEFAULT_RETRY_POLICY.jitterFactor,
    useFullJitter = DEFAULT_RETRY_POLICY.useFullJitter,
  } = config;

  if (jitterFactor === 0) {
    return delayMs;
  }

  if (useFullJitter) {
    // Full jitter: random value between 0 and delay
    return Math.floor(Math.random() * delayMs);
  }

  // Decorrelated jitter: delay +/- jitterFactor%
  const jitterRange = delayMs * jitterFactor;
  const jitter = (Math.random() * 2 - 1) * jitterRange;

  return Math.max(0, Math.floor(delayMs + jitter));
}

/**
 * Calculate retry delay with backoff and jitter
 */
export function calculateRetryDelay(
  attempt: number,
  config: Partial<RetryPolicyConfig> = {}
): number {
  const backoffDelay = calculateBackoffDelay(attempt, config);
  return addJitter(backoffDelay, config);
}

/**
 * Calculate delay from predefined schedule
 */
export function calculateScheduledDelay(
  attempt: number,
  schedule: readonly number[] = RETRY_SCHEDULES.standard
): number {
  // Use last value if attempt exceeds schedule length
  const index = Math.min(attempt - 1, schedule.length - 1);
  const delaySeconds = schedule[index] ?? schedule[schedule.length - 1]!;

  return delaySeconds * 1000;
}

// =============================================================================
// Retry Decision
// =============================================================================

/**
 * Classify error for retry decisions
 */
export function classifyError(
  errorCode: DeliveryErrorCode | null,
  statusCode: number | null
): ErrorClassification {
  // Check HTTP status first
  if (statusCode !== null) {
    if (statusCode === 429) {
      // Rate limited
      return {
        retryable: true,
        category: 'rate_limit',
        delayMultiplier: 5,
        maxAttempts: null,
      };
    }

    if (statusCode >= 500 && statusCode < 600) {
      return ERROR_CLASSIFICATIONS.HTTP_5XX;
    }

    if (statusCode >= 400 && statusCode < 500) {
      // Special cases
      if (statusCode === 408) {
        // Request timeout
        return ERROR_CLASSIFICATIONS.TIMEOUT;
      }
      if (statusCode === 502 || statusCode === 503 || statusCode === 504) {
        // Gateway errors are retryable
        return ERROR_CLASSIFICATIONS.HTTP_5XX;
      }
      return ERROR_CLASSIFICATIONS.HTTP_4XX;
    }
  }

  // Use error code classification
  if (errorCode && errorCode in ERROR_CLASSIFICATIONS) {
    return ERROR_CLASSIFICATIONS[errorCode];
  }

  return ERROR_CLASSIFICATIONS.UNKNOWN_ERROR;
}

/**
 * Make retry decision
 */
export function makeRetryDecision(params: {
  currentAttempt: number;
  maxAttempts: number;
  errorCode: DeliveryErrorCode | null;
  statusCode: number | null;
  config?: Partial<RetryPolicyConfig>;
}): RetryDecision {
  const {
    currentAttempt,
    maxAttempts,
    errorCode,
    statusCode,
    config = {},
  } = params;

  const nextAttempt = currentAttempt + 1;

  // Classify the error
  const classification = classifyError(errorCode, statusCode);

  // Check if error is retryable
  if (!classification.retryable) {
    return {
      shouldRetry: false,
      delayMs: 0,
      retryAt: new Date(),
      delayHuman: 'N/A',
      reason: `Non-retryable error: ${errorCode ?? `HTTP ${statusCode}`}`,
      nextAttempt,
      isFinalAttempt: true,
    };
  }

  // Check if max attempts reached
  const effectiveMaxAttempts = Math.min(
    maxAttempts,
    classification.maxAttempts ?? maxAttempts
  );

  if (currentAttempt >= effectiveMaxAttempts) {
    return {
      shouldRetry: false,
      delayMs: 0,
      retryAt: new Date(),
      delayHuman: 'N/A',
      reason: `Max attempts reached (${currentAttempt}/${effectiveMaxAttempts})`,
      nextAttempt,
      isFinalAttempt: true,
    };
  }

  // Calculate delay
  let delayMs = calculateRetryDelay(currentAttempt, config);

  // Apply error-specific multiplier
  delayMs = Math.floor(delayMs * classification.delayMultiplier);

  // Cap at max delay
  const maxDelayMs = config.maxDelayMs ?? DEFAULT_RETRY_POLICY.maxDelayMs;
  delayMs = Math.min(delayMs, maxDelayMs);

  // Special handling for rate limits (use Retry-After if available)
  if (classification.category === 'rate_limit') {
    delayMs = Math.max(delayMs, 60000); // At least 1 minute for rate limits
  }

  const retryAt = new Date(Date.now() + delayMs);
  const isFinalAttempt = nextAttempt >= effectiveMaxAttempts;

  return {
    shouldRetry: true,
    delayMs,
    retryAt,
    delayHuman: formatDuration(delayMs),
    reason: `Retry scheduled for ${classification.category} error`,
    nextAttempt,
    isFinalAttempt,
  };
}

// =============================================================================
// Retry Schedule Generation
// =============================================================================

/**
 * Generate full retry schedule
 */
export function generateRetrySchedule(
  config: Partial<RetryPolicyConfig> = {}
): RetryScheduleEntry[] {
  const maxAttempts = config.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts;
  const schedule: RetryScheduleEntry[] = [];
  let cumulativeDelayMs = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const delayMs = calculateRetryDelay(attempt, config);
    cumulativeDelayMs += delayMs;

    schedule.push({
      attempt,
      delayMs,
      delayHuman: formatDuration(delayMs),
      scheduledAt: new Date(Date.now() + cumulativeDelayMs),
    });
  }

  return schedule;
}

/**
 * Generate schedule from predefined delays
 */
export function generateScheduleFromDelays(
  delays: readonly number[]
): RetryScheduleEntry[] {
  const schedule: RetryScheduleEntry[] = [];
  let cumulativeDelayMs = 0;

  for (let i = 0; i < delays.length; i++) {
    const delayMs = delays[i]! * 1000;
    cumulativeDelayMs += delayMs;

    schedule.push({
      attempt: i + 1,
      delayMs,
      delayHuman: formatDuration(delayMs),
      scheduledAt: new Date(Date.now() + cumulativeDelayMs),
    });
  }

  return schedule;
}

/**
 * Calculate total retry duration
 */
export function calculateTotalRetryDuration(
  config: Partial<RetryPolicyConfig> = {}
): number {
  const maxAttempts = config.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts;
  let totalMs = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    totalMs += calculateBackoffDelay(attempt, config);
  }

  return totalMs;
}

// =============================================================================
// Rate Limit Handling
// =============================================================================

/**
 * Parse Retry-After header
 */
export function parseRetryAfter(header: string | null): number | null {
  if (!header) {
    return null;
  }

  // Try parsing as seconds
  const seconds = parseInt(header, 10);
  if (!isNaN(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  // Try parsing as HTTP date
  try {
    const date = new Date(header);
    if (!isNaN(date.getTime())) {
      const delayMs = date.getTime() - Date.now();
      return delayMs > 0 ? delayMs : 0;
    }
  } catch {
    // Invalid date
  }

  return null;
}

/**
 * Calculate rate limit backoff
 */
export function calculateRateLimitBackoff(params: {
  retryAfterMs: number | null;
  attempt: number;
  minDelayMs?: number;
  maxDelayMs?: number;
}): number {
  const {
    retryAfterMs,
    attempt,
    minDelayMs = 60000, // 1 minute minimum
    maxDelayMs = 3600000, // 1 hour maximum
  } = params;

  if (retryAfterMs !== null) {
    // Use server-provided value, capped
    return Math.min(Math.max(retryAfterMs, minDelayMs), maxDelayMs);
  }

  // Exponential backoff for rate limits
  const backoff = minDelayMs * Math.pow(2, attempt - 1);
  return Math.min(backoff, maxDelayMs);
}

// =============================================================================
// Circuit Breaker Support
// =============================================================================

/**
 * Circuit breaker state
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /**
   * Failure threshold to open circuit
   */
  failureThreshold: number;

  /**
   * Success threshold to close circuit from half-open
   */
  successThreshold: number;

  /**
   * Time to wait before half-opening circuit (ms)
   */
  resetTimeoutMs: number;
}

/**
 * Default circuit breaker config
 */
export const DEFAULT_CIRCUIT_BREAKER: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  resetTimeoutMs: 60000,
};

/**
 * Calculate circuit breaker state
 */
export function calculateCircuitState(params: {
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureAt: Date | null;
  config?: Partial<CircuitBreakerConfig>;
}): CircuitState {
  const {
    consecutiveFailures,
    consecutiveSuccesses,
    lastFailureAt,
    config = {},
  } = params;

  const {
    failureThreshold = DEFAULT_CIRCUIT_BREAKER.failureThreshold,
    successThreshold = DEFAULT_CIRCUIT_BREAKER.successThreshold,
    resetTimeoutMs = DEFAULT_CIRCUIT_BREAKER.resetTimeoutMs,
  } = config;

  // Check if circuit should be open
  if (consecutiveFailures >= failureThreshold) {
    // Check if enough time has passed to half-open
    if (lastFailureAt) {
      const timeSinceFailure = Date.now() - lastFailureAt.getTime();
      if (timeSinceFailure >= resetTimeoutMs) {
        return 'half-open';
      }
    }
    return 'open';
  }

  // Check if circuit can be closed from half-open
  if (consecutiveSuccesses >= successThreshold) {
    return 'closed';
  }

  return 'closed';
}

/**
 * Should allow request based on circuit state
 */
export function shouldAllowRequest(state: CircuitState): boolean {
  switch (state) {
    case 'closed':
      return true;
    case 'half-open':
      return true; // Allow probe request
    case 'open':
      return false;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Format duration as human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Parse duration string to milliseconds
 */
export function parseDuration(duration: string): number | null {
  const match = duration.match(/^(\d+)(ms|s|m|h)$/);

  if (!match) {
    return null;
  }

  const value = parseInt(match[1]!, 10);
  const unit = match[2];

  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    default:
      return null;
  }
}

/**
 * Create retry policy from options
 */
export function createRetryPolicy(
  options: Partial<RetryPolicyConfig>
): RetryPolicyConfig {
  return {
    ...DEFAULT_RETRY_POLICY,
    ...options,
  };
}

/**
 * Get retry policy for webhook
 */
export function getRetryPolicyForWebhook(params: {
  retryMaxAttempts: number;
  tier?: 'free' | 'starter' | 'pro' | 'enterprise';
}): RetryPolicyConfig {
  const { retryMaxAttempts, tier = 'starter' } = params;

  // Adjust policy based on tier
  switch (tier) {
    case 'enterprise':
      return {
        ...DEFAULT_RETRY_POLICY,
        maxAttempts: Math.min(retryMaxAttempts, 10),
        maxDelayMs: 7200000, // 2 hours
      };

    case 'pro':
      return {
        ...DEFAULT_RETRY_POLICY,
        maxAttempts: Math.min(retryMaxAttempts, 7),
        maxDelayMs: 3600000, // 1 hour
      };

    case 'starter':
      return {
        ...DEFAULT_RETRY_POLICY,
        maxAttempts: Math.min(retryMaxAttempts, 5),
      };

    case 'free':
    default:
      return {
        ...CONSERVATIVE_RETRY_POLICY,
        maxAttempts: Math.min(retryMaxAttempts, 3),
      };
  }
}

// =============================================================================
// Export
// =============================================================================

export default {
  // Policies
  DEFAULT_RETRY_POLICY,
  AGGRESSIVE_RETRY_POLICY,
  CONSERVATIVE_RETRY_POLICY,
  RETRY_SCHEDULES,

  // Delay calculation
  calculateBackoffDelay,
  addJitter,
  calculateRetryDelay,
  calculateScheduledDelay,

  // Retry decisions
  classifyError,
  makeRetryDecision,

  // Schedule generation
  generateRetrySchedule,
  generateScheduleFromDelays,
  calculateTotalRetryDuration,

  // Rate limits
  parseRetryAfter,
  calculateRateLimitBackoff,

  // Circuit breaker
  calculateCircuitState,
  shouldAllowRequest,
  DEFAULT_CIRCUIT_BREAKER,

  // Utilities
  formatDuration,
  parseDuration,
  createRetryPolicy,
  getRetryPolicyForWebhook,
};
