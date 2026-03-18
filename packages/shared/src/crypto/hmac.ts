/**
 * @fileoverview HMAC Signature Utilities
 * Provides functions for generating and verifying webhook signatures.
 *
 * Signature Format: sha256=<hex-encoded-hmac>
 * Signed Payload: <timestamp>.<body>
 *
 * @packageDocumentation
 * @module @xrnotify/shared/crypto/hmac
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

// =============================================================================
// Constants
// =============================================================================

/**
 * Default HMAC algorithm
 */
export const HMAC_ALGORITHM = 'sha256';

/**
 * Signature header name
 */
export const SIGNATURE_HEADER = 'X-XRNotify-Signature';

/**
 * Timestamp header name
 */
export const TIMESTAMP_HEADER = 'X-XRNotify-Timestamp';

/**
 * Default timestamp tolerance in seconds (5 minutes)
 */
export const DEFAULT_TIMESTAMP_TOLERANCE_SECONDS = 300;

/**
 * Signature prefix
 */
export const SIGNATURE_PREFIX = 'sha256=';

// =============================================================================
// Types
// =============================================================================

/**
 * Signature generation options
 */
export interface SignatureOptions {
  /**
   * Secret key for HMAC
   */
  secret: string;

  /**
   * Request body (raw string)
   */
  payload: string;

  /**
   * Unix timestamp in seconds (defaults to current time)
   */
  timestamp?: number;

  /**
   * HMAC algorithm (defaults to sha256)
   */
  algorithm?: string;
}

/**
 * Signature verification options
 */
export interface VerificationOptions {
  /**
   * Secret key for HMAC
   */
  secret: string;

  /**
   * Request body (raw string)
   */
  payload: string;

  /**
   * Signature from header (e.g., "sha256=abc123...")
   */
  signature: string;

  /**
   * Timestamp from header (Unix seconds as string)
   */
  timestamp: string;

  /**
   * Timestamp tolerance in seconds (default: 300)
   */
  toleranceSeconds?: number;

  /**
   * Current time for testing (Unix seconds)
   */
  currentTime?: number;
}

/**
 * Signature generation result
 */
export interface SignatureResult {
  /**
   * Full signature string (e.g., "sha256=abc123...")
   */
  signature: string;

  /**
   * Unix timestamp used
   */
  timestamp: number;

  /**
   * Headers to include in request
   */
  headers: {
    [SIGNATURE_HEADER]: string;
    [TIMESTAMP_HEADER]: string;
  };
}

/**
 * Verification result
 */
export interface VerificationResult {
  /**
   * Whether the signature is valid
   */
  valid: boolean;

  /**
   * Error message if invalid
   */
  error?: string;

  /**
   * Error code if invalid
   */
  code?: 'invalid_signature' | 'timestamp_expired' | 'invalid_timestamp' | 'invalid_format';
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Generate HMAC signature for a payload
 *
 * @example
 * 