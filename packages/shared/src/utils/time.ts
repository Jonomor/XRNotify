/**
 * @fileoverview Time Utilities
 * Functions for handling timestamps, dates, and time-related operations.
 *
 * @packageDocumentation
 * @module @xrnotify/shared/utils/time
 */

// =============================================================================
// Constants
// =============================================================================

/**
 * XRPL Epoch: January 1, 2000 00:00:00 UTC
 * XRPL timestamps are seconds since this epoch
 */
export const XRPL_EPOCH_UNIX = 946684800;

/**
 * XRPL Epoch as Date
 */
export const XRPL_EPOCH_DATE = new Date('2000-01-01T00:00:00.000Z');

/**
 * Milliseconds per second
 */
export const MS_PER_SECOND = 1000;

/**
 * Seconds per minute
 */
export const SECONDS_PER_MINUTE = 60;

/**
 * Seconds per hour
 */
export const SECONDS_PER_HOUR = 3600;

/**
 * Seconds per day
 */
export const SECONDS_PER_DAY = 86400;

/**
 * Milliseconds per minute
 */
export const MS_PER_MINUTE = 60000;

/**
 * Milliseconds per hour
 */
export const MS_PER_HOUR = 3600000;

/**
 * Milliseconds per day
 */
export const MS_PER_DAY = 86400000;

// =============================================================================
// XRPL Time Conversion
// =============================================================================

/**
 * Convert XRPL timestamp (Ripple Epoch) to Unix timestamp (seconds)
 *
 * @param xrplTimestamp - Seconds since XRPL Epoch (2000-01-01)
 * @returns Unix timestamp in seconds
 *
 * @example
 * 