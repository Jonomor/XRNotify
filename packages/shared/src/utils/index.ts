/**
 * @fileoverview XRNotify Utilities Module Index
 * Re-exports all utility functions.
 *
 * @packageDocumentation
 * @module @xrnotify/shared/utils
 */

// =============================================================================
// Time Utilities
// =============================================================================

export {
  // Constants
  XRPL_EPOCH_UNIX,
  XRPL_EPOCH_DATE,
  MS_PER_SECOND,
  SECONDS_PER_MINUTE,
  SECONDS_PER_HOUR,
  SECONDS_PER_DAY,
  MS_PER_MINUTE,
  MS_PER_HOUR,
  MS_PER_DAY,

  // XRPL Time Conversion
  xrplToUnix,
  unixToXrpl,
  xrplToDate,
  dateToXrpl,
  xrplToISO,
  isoToXrpl,

  // Current Time
  nowUnix,
  nowMs,
  nowXrpl,
  nowISO,

  // Time Calculations
  addDuration,
  subtractDuration,
  dateDiff,
  isWithinWindow,
  isExpired,

  // Formatting
  formatDuration,
  formatDurationMs,
  formatRelativeTime,

  // Date Ranges
  startOfDay,
  endOfDay,
  startOfHour,
  DateRanges,

  // Sleep / Delay
  sleep,
  sleepSeconds,

  // Retry Timing
  exponentialBackoff,
  nextRetryTime,
} from './time.js';

// =============================================================================
// ID Utilities
// =============================================================================

export {
  // Constants
  EVENT_ID_PREFIX,
  EVENT_ID_SEPARATOR,
  DELIVERY_ID_PREFIX,
  REPLAY_ID_PREFIX,
  WEBHOOK_ID_PREFIX,
  API_KEY_PREFIX,
  WEBHOOK_SECRET_PREFIX,

  // Types
  type EventIdComponents,

  // Event ID Generation
  generateEventId,
  parseEventId,
  isValidEventId,
  getLedgerIndexFromEventId,
  getTxHashFromEventId,
  getEventTypeFromEventId,

  // UUID Generation
  uuid,
  isValidUUID,

  // Prefixed ID Generation
  generateDeliveryId,
  generateReplayId,
  generateWebhookId,
  parsePrefixedId,

  // Random ID Generation
  randomHex,
  randomBase64Url,
  randomShortId,
  nanoId,

  // Idempotency Keys
  generateIdempotencyKey,
  parseIdempotencyKey,

  // Hash-based IDs
  hashId,
  shortHashId,

  // Cursor / Pagination IDs
  encodeCursor,
  decodeCursor,

  // Request IDs
  generateRequestId,
  generateCorrelationId,

  // Slug Generation
  slugify,
  uniqueSlug,
} from './id.js';
