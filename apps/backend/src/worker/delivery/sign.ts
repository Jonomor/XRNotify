/**
 * @fileoverview XRNotify Webhook Signature Builder
 * HMAC-SHA256 signature generation for webhook deliveries.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/worker/delivery/sign
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { createModuleLogger } from '../../core/logger.js';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('webhook-sign');

/**
 * Signature headers
 */
export interface SignatureHeaders {
  /**
   * X-XRNotify-Signature header value
   * Format: sha256=<hex>
   */
  signature: string;

  /**
   * X-XRNotify-Timestamp header value
   * Unix timestamp in seconds
   */
  timestamp: string;

  /**
   * X-XRNotify-Delivery-Id header value
   */
  deliveryId: string;

  /**
   * X-XRNotify-Event-Type header value
   */
  eventType: string;

  /**
   * X-XRNotify-Webhook-Id header value
   */
  webhookId: string;
}

/**
 * Signature verification result
 */
export interface VerificationResult {
  valid: boolean;
  error?: string;
  timestampAge?: number;
}

/**
 * Signing options
 */
export interface SigningOptions {
  /**
   * Custom timestamp (for testing)
   */
  timestamp?: number;

  /**
   * Include delivery ID in signed payload
   */
  includeDeliveryId?: boolean;

  /**
   * Algorithm to use
   */
  algorithm?: 'sha256' | 'sha512';
}

/**
 * Verification options
 */
export interface VerificationOptions {
  /**
   * Maximum allowed timestamp age in seconds (default: 300 = 5 minutes)
   */
  maxTimestampAge?: number;

  /**
   * Allow future timestamps (for clock skew)
   */
  allowFutureTimestamp?: boolean;

  /**
   * Maximum future timestamp allowed in seconds (default: 60)
   */
  maxFutureTimestamp?: number;

  /**
   * Algorithm used for signature
   */
  algorithm?: 'sha256' | 'sha512';
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Header names
 */
export const Headers = {
  SIGNATURE: 'X-XRNotify-Signature',
  TIMESTAMP: 'X-XRNotify-Timestamp',
  DELIVERY_ID: 'X-XRNotify-Delivery-Id',
  EVENT_TYPE: 'X-XRNotify-Event-Type',
  WEBHOOK_ID: 'X-XRNotify-Webhook-Id',
  REQUEST_ID: 'X-XRNotify-Request-Id',
  RETRY_COUNT: 'X-XRNotify-Retry-Count',
} as const;

/**
 * Default max timestamp age (5 minutes)
 */
const DEFAULT_MAX_TIMESTAMP_AGE = 300;

/**
 * Default max future timestamp (1 minute)
 */
const DEFAULT_MAX_FUTURE_TIMESTAMP = 60;

/**
 * Signature prefix
 */
const SIGNATURE_PREFIX = 'sha256=';
const SIGNATURE_PREFIX_512 = 'sha512=';

// =============================================================================
// Signature Generation
// =============================================================================

/**
 * Generate HMAC signature for webhook payload
 *
 * The signed payload format is:
 * `{timestamp}.{payload}`
 *
 * This prevents replay attacks by binding the signature to a specific time.
 */
export function generateSignature(
  payload: string,
  secret: string,
  options: SigningOptions = {}
): { signature: string; timestamp: number } {
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
  const algorithm = options.algorithm ?? 'sha256';

  // Create signed payload: timestamp.payload
  const signedPayload = `${timestamp}.${payload}`;

  // Generate HMAC
  const hmac = createHmac(algorithm, secret);
  hmac.update(signedPayload, 'utf8');
  const signature = hmac.digest('hex');

  const prefix = algorithm === 'sha512' ? SIGNATURE_PREFIX_512 : SIGNATURE_PREFIX;

  return {
    signature: `${prefix}${signature}`,
    timestamp,
  };
}

/**
 * Build all signature headers for webhook delivery
 */
export function buildSignatureHeaders(params: {
  payload: string;
  secret: string;
  deliveryId: string;
  eventType: string;
  webhookId: string;
  retryCount?: number;
  requestId?: string;
  options?: SigningOptions;
}): Record<string, string> {
  const { signature, timestamp } = generateSignature(
    params.payload,
    params.secret,
    params.options
  );

  const headers: Record<string, string> = {
    [Headers.SIGNATURE]: signature,
    [Headers.TIMESTAMP]: timestamp.toString(),
    [Headers.DELIVERY_ID]: params.deliveryId,
    [Headers.EVENT_TYPE]: params.eventType,
    [Headers.WEBHOOK_ID]: params.webhookId,
  };

  if (params.retryCount !== undefined && params.retryCount > 0) {
    headers[Headers.RETRY_COUNT] = params.retryCount.toString();
  }

  if (params.requestId) {
    headers[Headers.REQUEST_ID] = params.requestId;
  }

  return headers;
}

/**
 * Build complete webhook request headers
 */
export function buildWebhookHeaders(params: {
  payload: string;
  secret: string;
  deliveryId: string;
  eventType: string;
  webhookId: string;
  retryCount?: number;
  requestId?: string;
  contentType?: string;
  userAgent?: string;
  options?: SigningOptions;
}): Record<string, string> {
  const signatureHeaders = buildSignatureHeaders(params);

  return {
    'Content-Type': params.contentType ?? 'application/json',
    'User-Agent': params.userAgent ?? 'XRNotify-Webhook/1.0',
    'Accept': 'application/json, text/plain, */*',
    ...signatureHeaders,
  };
}

// =============================================================================
// Signature Verification
// =============================================================================

/**
 * Verify webhook signature
 *
 * This function should be used by webhook consumers to verify
 * that the request came from XRNotify.
 */
export function verifySignature(
  payload: string,
  signature: string,
  timestamp: string | number,
  secret: string,
  options: VerificationOptions = {}
): VerificationResult {
  const maxTimestampAge = options.maxTimestampAge ?? DEFAULT_MAX_TIMESTAMP_AGE;
  const allowFuture = options.allowFutureTimestamp ?? true;
  const maxFuture = options.maxFutureTimestamp ?? DEFAULT_MAX_FUTURE_TIMESTAMP;
  const algorithm = options.algorithm ?? 'sha256';

  // Parse timestamp
  const timestampNum = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;

  if (isNaN(timestampNum)) {
    return { valid: false, error: 'Invalid timestamp' };
  }

  // Check timestamp freshness
  const now = Math.floor(Date.now() / 1000);
  const age = now - timestampNum;

  if (age > maxTimestampAge) {
    return {
      valid: false,
      error: `Timestamp too old (${age}s > ${maxTimestampAge}s)`,
      timestampAge: age,
    };
  }

  if (!allowFuture && age < 0) {
    return {
      valid: false,
      error: 'Future timestamp not allowed',
      timestampAge: age,
    };
  }

  if (age < -maxFuture) {
    return {
      valid: false,
      error: `Timestamp too far in future (${-age}s > ${maxFuture}s)`,
      timestampAge: age,
    };
  }

  // Parse signature
  const prefix = algorithm === 'sha512' ? SIGNATURE_PREFIX_512 : SIGNATURE_PREFIX;

  if (!signature.startsWith(prefix)) {
    return { valid: false, error: `Invalid signature format (expected ${prefix} prefix)` };
  }

  const providedSig = signature.slice(prefix.length);

  // Validate hex format
  if (!/^[a-f0-9]+$/i.test(providedSig)) {
    return { valid: false, error: 'Invalid signature format (not hex)' };
  }

  // Generate expected signature
  const signedPayload = `${timestampNum}.${payload}`;
  const hmac = createHmac(algorithm, secret);
  hmac.update(signedPayload, 'utf8');
  const expectedSig = hmac.digest('hex');

  // Timing-safe comparison
  try {
    const providedBuffer = Buffer.from(providedSig, 'hex');
    const expectedBuffer = Buffer.from(expectedSig, 'hex');

    if (providedBuffer.length !== expectedBuffer.length) {
      return { valid: false, error: 'Signature length mismatch', timestampAge: age };
    }

    const valid = timingSafeEqual(providedBuffer, expectedBuffer);

    if (!valid) {
      return { valid: false, error: 'Signature mismatch', timestampAge: age };
    }

    return { valid: true, timestampAge: age };
  } catch (error) {
    return { valid: false, error: 'Signature comparison failed', timestampAge: age };
  }
}

/**
 * Verify webhook request headers
 */
export function verifyWebhookRequest(
  payload: string,
  headers: Record<string, string | string[] | undefined>,
  secret: string,
  options: VerificationOptions = {}
): VerificationResult {
  // Normalize header access (case-insensitive)
  const getHeader = (name: string): string | undefined => {
    const lowerName = name.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === lowerName) {
        return Array.isArray(value) ? value[0] : value;
      }
    }
    return undefined;
  };

  const signature = getHeader(Headers.SIGNATURE);
  const timestamp = getHeader(Headers.TIMESTAMP);

  if (!signature) {
    return { valid: false, error: `Missing ${Headers.SIGNATURE} header` };
  }

  if (!timestamp) {
    return { valid: false, error: `Missing ${Headers.TIMESTAMP} header` };
  }

  return verifySignature(payload, signature, timestamp, secret, options);
}

// =============================================================================
// Secret Management
// =============================================================================

/**
 * Generate webhook secret
 *
 * Format: whsec_<base64url>
 */
export function generateWebhookSecret(bytes: number = 32): string {
  const buffer = require('node:crypto').randomBytes(bytes);
  const base64 = buffer.toString('base64url');
  return `whsec_${base64}`;
}

/**
 * Validate webhook secret format
 */
export function isValidWebhookSecret(secret: string): boolean {
  if (!secret.startsWith('whsec_')) {
    return false;
  }

  const base64Part = secret.slice(6);

  // Check base64url format
  if (!/^[A-Za-z0-9_-]+$/.test(base64Part)) {
    return false;
  }

  // Minimum length (24 chars = 18 bytes)
  if (base64Part.length < 24) {
    return false;
  }

  return true;
}

/**
 * Extract raw secret from webhook secret string
 */
export function extractRawSecret(secret: string): string {
  if (secret.startsWith('whsec_')) {
    return secret.slice(6);
  }
  return secret;
}

/**
 * Hash secret for storage
 */
export function hashSecret(secret: string): string {
  const hash = createHmac('sha256', 'xrnotify-secret-hash');
  hash.update(secret);
  return hash.digest('hex');
}

/**
 * Verify secret against hash
 */
export function verifySecretHash(secret: string, hash: string): boolean {
  const computedHash = hashSecret(secret);
  
  try {
    return timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(hash, 'hex')
    );
  } catch {
    return false;
  }
}

// =============================================================================
// Dual Secret Support (for rotation)
// =============================================================================

/**
 * Verify signature with primary and fallback secrets
 *
 * Used during secret rotation to support both old and new secrets.
 */
export function verifySignatureWithFallback(
  payload: string,
  signature: string,
  timestamp: string | number,
  primarySecret: string,
  fallbackSecret?: string,
  options: VerificationOptions = {}
): VerificationResult & { usedFallback?: boolean } {
  // Try primary secret first
  const primaryResult = verifySignature(payload, signature, timestamp, primarySecret, options);

  if (primaryResult.valid) {
    return { ...primaryResult, usedFallback: false };
  }

  // Try fallback secret if available
  if (fallbackSecret) {
    const fallbackResult = verifySignature(payload, signature, timestamp, fallbackSecret, options);

    if (fallbackResult.valid) {
      logger.debug('Signature verified with fallback secret');
      return { ...fallbackResult, usedFallback: true };
    }
  }

  // Return primary result if both failed
  return { ...primaryResult, usedFallback: false };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Parse signature header value
 */
export function parseSignatureHeader(header: string): {
  algorithm: string;
  signature: string;
} | null {
  if (header.startsWith(SIGNATURE_PREFIX)) {
    return {
      algorithm: 'sha256',
      signature: header.slice(SIGNATURE_PREFIX.length),
    };
  }

  if (header.startsWith(SIGNATURE_PREFIX_512)) {
    return {
      algorithm: 'sha512',
      signature: header.slice(SIGNATURE_PREFIX_512.length),
    };
  }

  // Try format: v1=signature
  const match = header.match(/^(v\d+|sha\d+)=([a-f0-9]+)$/i);
  if (match) {
    return {
      algorithm: match[1]!.toLowerCase(),
      signature: match[2]!,
    };
  }

  return null;
}

/**
 * Generate test payload for webhook testing
 */
export function generateTestPayload(webhookId: string): {
  payload: string;
  event: Record<string, unknown>;
} {
  const event = {
    id: `evt_test_${Date.now()}`,
    event_type: 'test.ping',
    ledger_index: 0,
    tx_hash: '0'.repeat(64),
    network: 'testnet',
    timestamp: new Date().toISOString(),
    account_context: [],
    payload: {
      message: 'This is a test webhook delivery',
      webhook_id: webhookId,
      test: true,
    },
  };

  return {
    payload: JSON.stringify(event),
    event,
  };
}

/**
 * Create verification code snippet for documentation
 */
export function getVerificationCodeSnippet(language: 'node' | 'python' | 'go' | 'ruby'): string {
  const snippets: Record<string, string> = {
    node: `
const crypto = require('crypto');

function verifyWebhook(payload, signature, timestamp, secret) {
  const signedPayload = \`\${timestamp}.\${payload}\`;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  const providedSig = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSig, 'hex'),
    Buffer.from(providedSig, 'hex')
  );
}
`.trim(),

    python: `
import hmac
import hashlib

def verify_webhook(payload, signature, timestamp, secret):
    signed_payload = f"{timestamp}.{payload}"
    expected_sig = hmac.new(
        secret.encode(),
        signed_payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    provided_sig = signature.replace('sha256=', '')
    
    return hmac.compare_digest(expected_sig, provided_sig)
`.trim(),

    go: `
import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "strings"
)

func VerifyWebhook(payload, signature, timestamp, secret string) bool {
    signedPayload := fmt.Sprintf("%s.%s", timestamp, payload)
    
    h := hmac.New(sha256.New, []byte(secret))
    h.Write([]byte(signedPayload))
    expectedSig := hex.EncodeToString(h.Sum(nil))
    
    providedSig := strings.TrimPrefix(signature, "sha256=")
    
    return hmac.Equal([]byte(expectedSig), []byte(providedSig))
}
`.trim(),

    ruby: `
require 'openssl'

def verify_webhook(payload, signature, timestamp, secret)
  signed_payload = "#{timestamp}.#{payload}"
  expected_sig = OpenSSL::HMAC.hexdigest(
    'sha256',
    secret,
    signed_payload
  )
  
  provided_sig = signature.sub('sha256=', '')
  
  ActiveSupport::SecurityUtils.secure_compare(expected_sig, provided_sig)
end
`.trim(),
  };

  return snippets[language] ?? snippets.node!;
}

// =============================================================================
// Export
// =============================================================================

export default {
  // Headers
  Headers,

  // Generation
  generateSignature,
  buildSignatureHeaders,
  buildWebhookHeaders,

  // Verification
  verifySignature,
  verifyWebhookRequest,
  verifySignatureWithFallback,

  // Secret management
  generateWebhookSecret,
  isValidWebhookSecret,
  extractRawSecret,
  hashSecret,
  verifySecretHash,

  // Utilities
  parseSignatureHeader,
  generateTestPayload,
  getVerificationCodeSnippet,
};
