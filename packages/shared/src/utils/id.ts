/**
 * @fileoverview ID Generation Utilities
 * Functions for generating and parsing deterministic event IDs and other identifiers.
 *
 * @packageDocumentation
 * @module @xrnotify/shared/utils/id
 */

import { randomBytes, randomUUID } from 'node:crypto';
import type { EventType } from '../types/event.js';

// =============================================================================
// Constants
// =============================================================================

/**
 * Event ID prefix
 */
export const EVENT_ID_PREFIX = 'xrpl';

/**
 * Event ID separator
 */
export const EVENT_ID_SEPARATOR = ':';

/**
 * Delivery ID prefix
 */
export const DELIVERY_ID_PREFIX = 'del';

/**
 * Replay ID prefix
 */
export const REPLAY_ID_PREFIX = 'rpl';

/**
 * Webhook ID prefix
 */
export const WEBHOOK_ID_PREFIX = 'whk';

/**
 * API Key prefix
 */
export const API_KEY_PREFIX = 'xrn_';

/**
 * Webhook secret prefix
 */
export const WEBHOOK_SECRET_PREFIX = 'whsec_';

// =============================================================================
// Event ID Generation
// =============================================================================

/**
 * Event ID components
 */
export interface EventIdComponents {
  prefix: string;
  ledgerIndex: number;
  txHash: string;
  eventType: EventType;
  subIndex?: number;
}

/**
 * Generate a deterministic event ID
 *
 * Format: xrpl:<ledger_index>:<tx_hash>:<event_type>[:<sub_index>]
 *
 * The event ID is deterministic based on the transaction and event type,
 * allowing for idempotent processing and deduplication.
 *
 * @param ledgerIndex - Ledger index where the transaction was validated
 * @param txHash - Transaction hash
 * @param eventType - Type of event
 * @param subIndex - Optional sub-index for multiple events from same tx
 * @returns Deterministic event ID
 *
 * @example
 * 