// =============================================================================
// XRNotify Webhook Worker - Signing Module
// =============================================================================
// HMAC-SHA256 signature generation for webhook payloads
// Wraps shared crypto with worker-specific utilities
// =============================================================================

import { createHmac, timingSafeEqual } from 'node:crypto';
import { signPayload, verifySignature } from '@xrnotify/shared';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface SignedPayload {
  /** The JSON payload body */
  body: string;
  /** The signature header value */
  signature: string;
  /** Timestamp when signed */
  timestamp: string;
}

export interface SignatureHeaders {
  /** X-XRNotify-Signature header */
  'X-XRNotify-Signature': string;
  /** X-XRNotify-Timestamp header */
  'X-XRNotify-Timestamp': string;
}

export interface VerificationResult {
  /** Whether signature is valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Age of signature in seconds */
  ageSeconds?: number;
}

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

export interface SigningConfig {
  /** Maximum age of signature in seconds (for replay protection) */
  maxAgeSeconds: number;
  /** Signature algorithm identifier */
  algorithm: string;
}

export const DEFAULT_SIGNING_CONFIG: SigningConfig = {
  maxAgeSeconds: 300, // 5 minutes
  algorithm: 'sha256',
};

// -----------------------------------------------------------------------------
// Signing Functions
// -----------------------------------------------------------------------------

/**
 * Sign a webhook payload and return headers
 */
export function signWebhookPayload(
  payload: unknown,
  secret: string,
  timestamp?: string
): SignedPayload {
  const ts = timestamp ?? new Date().toISOString();
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  
  // Create signature using shared utility
  const signature = signPayload(body, secret);
  
  return {
    body,
    signature,
    timestamp: ts,
  };
}

/**
 * Get signature headers for a webhook request
 */
export function getSignatureHeaders(
  payload: unknown,
  secret: string,
  timestamp?: string
): SignatureHeaders {
  const signed = signWebhookPayload(payload, secret, timestamp);
  
  return {
    'X-XRNotify-Signature': signed.signature,
    'X-XRNotify-Timestamp': signed.timestamp,
  };
}

// -----------------------------------------------------------------------------
// Verification Functions (for testing/documentation)
// -----------------------------------------------------------------------------

/**
 * Verify a webhook signature with timestamp check
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  timestamp: string,
  secret: string,
  config: SigningConfig = DEFAULT_SIGNING_CONFIG
): VerificationResult {
  // 1. Parse and validate timestamp
  const signedAt = new Date(timestamp);
  if (isNaN(signedAt.getTime())) {
    return { valid: false, error: 'Invalid timestamp format' };
  }
  
  const now = Date.now();
  const ageMs = now - signedAt.getTime();
  const ageSeconds = Math.floor(ageMs / 1000);
  
  // 2. Check signature age (replay protection)
  if (ageSeconds > config.maxAgeSeconds) {
    return { 
      valid: false, 
      error: `Signature too old: ${ageSeconds}s (max ${config.maxAgeSeconds}s)`,
      ageSeconds,
    };
  }
  
  // 3. Handle future timestamps (clock skew tolerance: 60s)
  if (ageSeconds < -60) {
    return { 
      valid: false, 
      error: 'Signature timestamp is in the future',
      ageSeconds,
    };
  }
  
  // 4. Verify signature using shared utility
  const valid = verifySignature(body, signature, secret);
  
  if (!valid) {
    return { valid: false, error: 'Signature mismatch', ageSeconds };
  }
  
  return { valid: true, ageSeconds };
}

// -----------------------------------------------------------------------------
// Signature Parsing
// -----------------------------------------------------------------------------

export interface ParsedSignature {
  algorithm: string;
  hash: string;
}

/**
 * Parse a signature header value
 * Format: "sha256=<hex>"
 */
export function parseSignature(signature: string): ParsedSignature | null {
  const match = signature.match(/^(\w+)=([a-f0-9]+)$/i);
  
  if (!match || !match[1] || !match[2]) {
    return null;
  }
  
  return {
    algorithm: match[1].toLowerCase(),
    hash: match[2].toLowerCase(),
  };
}

/**
 * Format a signature for the header
 */
export function formatSignature(algorithm: string, hash: string): string {
  return `${algorithm}=${hash}`;
}

// -----------------------------------------------------------------------------
// Raw HMAC Functions (for custom implementations)
// -----------------------------------------------------------------------------

/**
 * Generate raw HMAC-SHA256 hash
 */
export function hmacSha256(data: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(data, 'utf8')
    .digest('hex');
}

/**
 * Timing-safe comparison of two strings
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// Signature Schemes (for documentation/SDK generation)
// -----------------------------------------------------------------------------

export interface SignatureScheme {
  name: string;
  version: string;
  algorithm: string;
  headerName: string;
  format: string;
  example: string;
}

export const XRNOTIFY_SIGNATURE_SCHEME: SignatureScheme = {
  name: 'XRNotify Webhook Signature',
  version: '1.0',
  algorithm: 'HMAC-SHA256',
  headerName: 'X-XRNotify-Signature',
  format: 'sha256=<hex_digest>',
  example: 'sha256=a1b2c3d4e5f6...',
};

// -----------------------------------------------------------------------------
// Code Examples for SDK Documentation
// -----------------------------------------------------------------------------

export const VERIFICATION_EXAMPLES = {
  node: `
const crypto = require('crypto');

function verifyXRNotifySignature(body, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Express middleware
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-xrnotify-signature'];
  const isValid = verifyXRNotifySignature(
    JSON.stringify(req.body),
    signature,
    process.env.WEBHOOK_SECRET
  );
  
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook...
});
`,

  python: `
import hmac
import hashlib

def verify_xrnotify_signature(body: bytes, signature: str, secret: str) -> bool:
    expected = 'sha256=' + hmac.new(
        secret.encode('utf-8'),
        body,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected)

# Flask example
@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-XRNotify-Signature')
    is_valid = verify_xrnotify_signature(
        request.data,
        signature,
        os.environ['WEBHOOK_SECRET']
    )
    
    if not is_valid:
        return 'Invalid signature', 401
    
    # Process webhook...
`,

  go: `
package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
)

func VerifyXRNotifySignature(body []byte, signature, secret string) bool {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(body)
    expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))
    return hmac.Equal([]byte(signature), []byte(expected))
}

// HTTP handler
func webhookHandler(w http.ResponseWriter, r *http.Request) {
    body, _ := io.ReadAll(r.Body)
    signature := r.Header.Get("X-XRNotify-Signature")
    
    if !VerifyXRNotifySignature(body, signature, os.Getenv("WEBHOOK_SECRET")) {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }
    
    // Process webhook...
}
`,
};

// -----------------------------------------------------------------------------
// Test Utilities
// -----------------------------------------------------------------------------

/**
 * Generate a test webhook with valid signature
 */
export function createTestWebhook(
  payload: unknown,
  secret: string
): {
  body: string;
  headers: Record<string, string>;
} {
  const signed = signWebhookPayload(payload, secret);
  
  return {
    body: signed.body,
    headers: {
      'Content-Type': 'application/json',
      'X-XRNotify-Signature': signed.signature,
      'X-XRNotify-Timestamp': signed.timestamp,
    },
  };
}

/**
 * Generate an invalid signature for testing rejection
 */
export function createInvalidSignature(): string {
  return 'sha256=' + '0'.repeat(64);
}
