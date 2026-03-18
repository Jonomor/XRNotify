// =============================================================================
// @xrnotify/shared - Utility Functions
// =============================================================================
// Common utilities for ID generation, time handling, event IDs, and helpers
// =============================================================================

import { randomBytes, randomUUID } from 'crypto';
import type { EventType, RetryPolicy } from '../types/index.js';

// -----------------------------------------------------------------------------
// UUID Generation
// -----------------------------------------------------------------------------

/**
 * Generate a new UUID v4
 * 
 * @returns UUID string
 */
export function uuid(): string {
  return randomUUID();
}

/**
 * Generate a prefixed UUID for specific entity types
 * 
 * @param prefix - Entity prefix (e.g., 'wh', 'del', 'evt')
 * @returns Prefixed UUID string
 */
export function prefixedId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '')}`;
}

// -----------------------------------------------------------------------------
// Request / Correlation IDs
// -----------------------------------------------------------------------------

/**
 * Generate a request ID for tracing
 * 
 * @returns Request ID in format "req_<random>"
 */
export function generateRequestId(): string {
  return `req_${randomBytes(12).toString('base64url')}`;
}

/**
 * Generate a correlation ID for distributed tracing
 * 
 * @returns Correlation ID in format "cor_<random>"
 */
export function generateCorrelationId(): string {
  return `cor_${randomBytes(16).toString('base64url')}`;
}

/**
 * Generate a delivery ID
 * 
 * @returns Delivery ID in format "del_<uuid>"
 */
export function generateDeliveryId(): string {
  return `del_${randomUUID()}`;
}

// -----------------------------------------------------------------------------
// Event ID Generation
// -----------------------------------------------------------------------------

/**
 * Generate a deterministic event ID from XRPL transaction data
 * 
 * Format: xrpl:<ledger_index>:<tx_hash>:<event_type>[:<sub_index>]
 * 
 * @param ledgerIndex - Ledger index
 * @param txHash - Transaction hash
 * @param eventType - Type of event
 * @param subIndex - Optional sub-index for multiple events from same tx
 * @returns Deterministic event ID
 * 
 * @example
 * generateEventId(12345678, 'ABC123...', 'payment.xrp')
 * // Returns: "xrpl:12345678:ABC123...:payment.xrp"
 * 
 * generateEventId(12345678, 'ABC123...', 'nft.offer_accepted', 0)
 * // Returns: "xrpl:12345678:ABC123...:nft.offer_accepted:0"
 */
export function generateEventId(
  ledgerIndex: number,
  txHash: string,
  eventType: EventType,
  subIndex?: number
): string {
  const base = `xrpl:${ledgerIndex}:${txHash}:${eventType}`;
  return subIndex !== undefined ? `${base}:${subIndex}` : base;
}

/**
 * Parse an event ID into its components
 * 
 * @param eventId - Event ID string
 * @returns Parsed components or null if invalid
 */
export function parseEventId(eventId: string): {
  network: string;
  ledgerIndex: number;
  txHash: string;
  eventType: string;
  subIndex?: number;
} | null {
  const parts = eventId.split(':');
  
  if (parts.length < 4 || parts.length > 5) {
    return null;
  }
  
  const [network, ledgerIndexStr, txHash, eventType, subIndexStr] = parts;
  const ledgerIndex = parseInt(ledgerIndexStr ?? '', 10);
  
  if (!network || isNaN(ledgerIndex) || !txHash || !eventType) {
    return null;
  }
  
  const result: {
    network: string;
    ledgerIndex: number;
    txHash: string;
    eventType: string;
    subIndex?: number;
  } = {
    network,
    ledgerIndex,
    txHash,
    eventType,
  };
  
  if (subIndexStr !== undefined) {
    const subIndex = parseInt(subIndexStr, 10);
    if (!isNaN(subIndex)) {
      result.subIndex = subIndex;
    }
  }
  
  return result;
}

// -----------------------------------------------------------------------------
// Time Utilities
// -----------------------------------------------------------------------------

/**
 * Get current time as ISO 8601 UTC string
 * 
 * @returns ISO timestamp string
 */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Get current Unix timestamp in seconds
 * 
 * @returns Unix timestamp
 */
export function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Get current Unix timestamp in milliseconds
 * 
 * @returns Unix timestamp in ms
 */
export function nowMs(): number {
  return Date.now();
}

/**
 * Convert XRPL Ripple Epoch timestamp to ISO string
 * Ripple Epoch: January 1, 2000 (946684800 Unix)
 * 
 * @param rippleTime - Ripple epoch timestamp
 * @returns ISO timestamp string
 */
export function rippleTimeToISO(rippleTime: number): string {
  const RIPPLE_EPOCH = 946684800;
  const unixTime = rippleTime + RIPPLE_EPOCH;
  return new Date(unixTime * 1000).toISOString();
}

/**
 * Convert Unix timestamp to ISO string
 * 
 * @param unixTime - Unix timestamp in seconds
 * @returns ISO timestamp string
 */
export function unixToISO(unixTime: number): string {
  return new Date(unixTime * 1000).toISOString();
}

/**
 * Convert ISO string to Unix timestamp
 * 
 * @param isoString - ISO timestamp string
 * @returns Unix timestamp in seconds
 */
export function isoToUnix(isoString: string): number {
  return Math.floor(new Date(isoString).getTime() / 1000);
}

/**
 * Add duration to a date
 * 
 * @param date - Starting date (or ISO string)
 * @param ms - Milliseconds to add
 * @returns New Date object
 */
export function addMs(date: Date | string, ms: number): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Date(d.getTime() + ms);
}

/**
 * Check if a date is in the past
 * 
 * @param date - Date to check (or ISO string)
 * @returns true if date is in the past
 */
export function isPast(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getTime() < Date.now();
}

/**
 * Check if a date is in the future
 * 
 * @param date - Date to check (or ISO string)
 * @returns true if date is in the future
 */
export function isFuture(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getTime() > Date.now();
}

// -----------------------------------------------------------------------------
// Retry & Backoff Utilities
// -----------------------------------------------------------------------------

/**
 * Calculate exponential backoff delay with jitter
 * 
 * @param attempt - Current attempt number (0-based)
 * @param policy - Retry policy configuration
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(
  attempt: number,
  policy: RetryPolicy
): number {
  const { initial_delay_ms, max_delay_ms, backoff_multiplier } = policy;
  
  // Exponential backoff
  const exponentialDelay = initial_delay_ms * Math.pow(backoff_multiplier, attempt);
  
  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, max_delay_ms);
  
  // Add jitter (±25%)
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  
  return Math.floor(cappedDelay + jitter);
}

/**
 * Calculate next retry time
 * 
 * @param attempt - Current attempt number (0-based)
 * @param policy - Retry policy configuration
 * @returns ISO timestamp for next retry
 */
export function calculateNextRetryTime(
  attempt: number,
  policy: RetryPolicy
): string {
  const delayMs = calculateBackoffDelay(attempt, policy);
  return addMs(new Date(), delayMs).toISOString();
}

/**
 * Check if should retry based on attempt count
 * 
 * @param attempt - Current attempt number (1-based)
 * @param policy - Retry policy configuration
 * @returns true if should retry
 */
export function shouldRetry(attempt: number, policy: RetryPolicy): boolean {
  return attempt < policy.max_attempts;
}

/**
 * Default retry policy
 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  max_attempts: 10,
  initial_delay_ms: 1000,
  max_delay_ms: 3600000, // 1 hour
  backoff_multiplier: 2,
};

// -----------------------------------------------------------------------------
// String Utilities
// -----------------------------------------------------------------------------

/**
 * Truncate string to specified length with ellipsis
 * 
 * @param str - String to truncate
 * @param maxLength - Maximum length including ellipsis
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Mask a string, showing only first and last N characters
 * 
 * @param str - String to mask
 * @param showFirst - Number of characters to show at start
 * @param showLast - Number of characters to show at end
 * @returns Masked string
 */
export function mask(str: string, showFirst: number = 4, showLast: number = 4): string {
  if (str.length <= showFirst + showLast) {
    return str;
  }
  const first = str.substring(0, showFirst);
  const last = str.substring(str.length - showLast);
  return `${first}****${last}`;
}

/**
 * Mask a webhook URL for logging (hide path/query params)
 * 
 * @param url - URL to mask
 * @returns Masked URL showing only origin
 */
export function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}/****`;
  } catch {
    return mask(url, 10, 0);
  }
}

// -----------------------------------------------------------------------------
// Number Utilities
// -----------------------------------------------------------------------------

/**
 * Convert drops (smallest XRP unit) to XRP
 * 
 * @param drops - Amount in drops
 * @returns Amount in XRP as string
 */
export function dropsToXrp(drops: string | number): string {
  const dropsNum = typeof drops === 'string' ? BigInt(drops) : BigInt(drops);
  const xrp = Number(dropsNum) / 1_000_000;
  return xrp.toString();
}

/**
 * Convert XRP to drops
 * 
 * @param xrp - Amount in XRP
 * @returns Amount in drops as string
 */
export function xrpToDrops(xrp: string | number): string {
  const xrpNum = typeof xrp === 'string' ? parseFloat(xrp) : xrp;
  const drops = Math.floor(xrpNum * 1_000_000);
  return drops.toString();
}

/**
 * Format number with thousands separators
 * 
 * @param num - Number to format
 * @returns Formatted string
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

// -----------------------------------------------------------------------------
// Object Utilities
// -----------------------------------------------------------------------------

/**
 * Remove undefined values from an object
 * 
 * @param obj - Object to clean
 * @returns Object without undefined values
 */
export function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

/**
 * Pick specific keys from an object
 * 
 * @param obj - Source object
 * @param keys - Keys to pick
 * @returns New object with only specified keys
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specific keys from an object
 * 
 * @param obj - Source object
 * @param keys - Keys to omit
 * @returns New object without specified keys
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

// -----------------------------------------------------------------------------
// Async Utilities
// -----------------------------------------------------------------------------

/**
 * Sleep for specified duration
 * 
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - Async function to retry
 * @param options - Retry options
 * @returns Result of function
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    shouldRetry: shouldRetryFn = () => true,
  } = options;
  
  let lastError: unknown;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts - 1 || !shouldRetryFn(error)) {
        throw error;
      }
      
      const delay = calculateBackoffDelay(attempt, {
        max_attempts: maxAttempts,
        initial_delay_ms: initialDelayMs,
        max_delay_ms: maxDelayMs,
        backoff_multiplier: backoffMultiplier,
      });
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}

// -----------------------------------------------------------------------------
// Environment Utilities
// -----------------------------------------------------------------------------

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env['NODE_ENV'] === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env['NODE_ENV'] === 'development';
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  return process.env['NODE_ENV'] === 'test';
}
