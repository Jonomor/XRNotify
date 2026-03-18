// =============================================================================
// @xrnotify/shared - Cryptographic Utilities
// =============================================================================
// HMAC signatures, API key hashing, secure random generation
// =============================================================================

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const SIGNATURE_ALGORITHM = 'sha256';
const HASH_ALGORITHM = 'sha256';
const API_KEY_BYTES = 32;
const WEBHOOK_SECRET_BYTES = 32;
const SIGNATURE_PREFIX = 'sha256=';

// -----------------------------------------------------------------------------
// HMAC Signature Generation & Verification
// -----------------------------------------------------------------------------

/**
 * Generate HMAC-SHA256 signature for webhook payload
 * 
 * @param payload - The payload to sign (string)
 * @param secret - The webhook secret key
 * @returns Signature in format "sha256=<hex>"
 * 
 * @example
 * const signature = generateSignature(JSON.stringify(event), webhookSecret);
 * // Returns: "sha256=a1b2c3d4..."
 */
export function generateSignature(payload: string, secret: string): string {
  const hmac = createHmac(SIGNATURE_ALGORITHM, secret);
  hmac.update(payload, 'utf8');
  const hash = hmac.digest('hex');
  return `${SIGNATURE_PREFIX}${hash}`;
}

/**
 * Generate signature with timestamp for replay protection
 * 
 * @param payload - The payload to sign
 * @param secret - The webhook secret key
 * @param timestamp - Unix timestamp in seconds
 * @returns Signature in format "sha256=<hex>"
 */
export function generateTimestampedSignature(
  payload: string,
  secret: string,
  timestamp: number
): string {
  const signedPayload = `${timestamp}.${payload}`;
  return generateSignature(signedPayload, secret);
}

/**
 * Verify HMAC-SHA256 signature using timing-safe comparison
 * 
 * @param payload - The payload that was signed
 * @param signature - The signature to verify (with or without "sha256=" prefix)
 * @param secret - The webhook secret key
 * @returns true if signature is valid
 * 
 * @example
 * const isValid = verifySignature(payload, req.headers['x-xrnotify-signature'], secret);
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = generateSignature(payload, secret);
    const providedSignature = signature.startsWith(SIGNATURE_PREFIX)
      ? signature
      : `${SIGNATURE_PREFIX}${signature}`;
    
    // Use timing-safe comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const providedBuffer = Buffer.from(providedSignature, 'utf8');
    
    if (expectedBuffer.length !== providedBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    return false;
  }
}

/**
 * Verify timestamped signature with replay protection
 * 
 * @param payload - The payload that was signed
 * @param signature - The signature to verify
 * @param secret - The webhook secret key
 * @param timestamp - The timestamp from the request
 * @param toleranceSeconds - Maximum age of signature (default: 300 = 5 minutes)
 * @returns Object with valid flag and optional error reason
 */
export function verifyTimestampedSignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: number,
  toleranceSeconds: number = 300
): { valid: boolean; reason?: string } {
  // Check timestamp is within tolerance
  const now = Math.floor(Date.now() / 1000);
  const age = now - timestamp;
  
  if (age < 0) {
    return { valid: false, reason: 'Timestamp is in the future' };
  }
  
  if (age > toleranceSeconds) {
    return { valid: false, reason: `Signature expired (${age}s old, max ${toleranceSeconds}s)` };
  }
  
  // Verify the signature
  const signedPayload = `${timestamp}.${payload}`;
  const isValid = verifySignature(signedPayload, signature, secret);
  
  if (!isValid) {
    return { valid: false, reason: 'Invalid signature' };
  }
  
  return { valid: true };
}

// -----------------------------------------------------------------------------
// API Key Generation & Hashing
// -----------------------------------------------------------------------------

/**
 * Generate a new API key
 * 
 * @returns Object with the raw key (display once) and hash (store in DB)
 * 
 * @example
 * const { key, hash, prefix } = generateApiKey();
 * // key: "xrn_a1b2c3d4..." (show to user once)
 * // hash: "sha256:..." (store in database)
 * // prefix: "xrn_a1b2" (for identification)
 */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const bytes = randomBytes(API_KEY_BYTES);
  const key = `xrn_${bytes.toString('base64url')}`;
  const hash = hashApiKey(key);
  const prefix = key.substring(0, 8);
  
  return { key, hash, prefix };
}

/**
 * Hash an API key for storage
 * 
 * @param key - The raw API key
 * @returns Hash in format "sha256:<hex>"
 */
export function hashApiKey(key: string): string {
  const hash = createHmac(HASH_ALGORITHM, 'xrnotify-api-key-salt')
    .update(key, 'utf8')
    .digest('hex');
  return `sha256:${hash}`;
}

/**
 * Verify an API key against a stored hash using timing-safe comparison
 * 
 * @param key - The raw API key to verify
 * @param storedHash - The hash stored in the database
 * @returns true if the key matches the hash
 */
export function verifyApiKey(key: string, storedHash: string): boolean {
  try {
    const computedHash = hashApiKey(key);
    
    const computedBuffer = Buffer.from(computedHash, 'utf8');
    const storedBuffer = Buffer.from(storedHash, 'utf8');
    
    if (computedBuffer.length !== storedBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(computedBuffer, storedBuffer);
  } catch {
    return false;
  }
}

/**
 * Extract prefix from an API key for identification
 * 
 * @param key - The raw API key
 * @returns The prefix (first 8 characters)
 */
export function getApiKeyPrefix(key: string): string {
  return key.substring(0, 8);
}

/**
 * Validate API key format
 * 
 * @param key - The API key to validate
 * @returns true if the key has valid format
 */
export function isValidApiKeyFormat(key: string): boolean {
  // Format: xrn_<base64url>
  // Total length should be 4 (prefix) + 43 (32 bytes in base64url) = 47 chars
  if (!key.startsWith('xrn_')) {
    return false;
  }
  
  if (key.length < 40 || key.length > 60) {
    return false;
  }
  
  // Check base64url characters after prefix
  const base64Part = key.substring(4);
  const base64urlRegex = /^[A-Za-z0-9_-]+$/;
  
  return base64urlRegex.test(base64Part);
}

// -----------------------------------------------------------------------------
// Webhook Secret Generation
// -----------------------------------------------------------------------------

/**
 * Generate a new webhook signing secret
 * 
 * @returns Object with the raw secret (display once) and for storage
 * 
 * @example
 * const { secret, prefix } = generateWebhookSecret();
 * // secret: "whsec_a1b2c3d4..." (store encrypted, show to user)
 * // prefix: "whsec_a1" (for identification in logs)
 */
export function generateWebhookSecret(): { secret: string; prefix: string } {
  const bytes = randomBytes(WEBHOOK_SECRET_BYTES);
  const secret = `whsec_${bytes.toString('base64url')}`;
  const prefix = secret.substring(0, 9);
  
  return { secret, prefix };
}

/**
 * Validate webhook secret format
 * 
 * @param secret - The secret to validate
 * @returns true if the secret has valid format
 */
export function isValidWebhookSecretFormat(secret: string): boolean {
  if (!secret.startsWith('whsec_')) {
    return false;
  }
  
  if (secret.length < 40 || secret.length > 60) {
    return false;
  }
  
  const base64Part = secret.substring(6);
  const base64urlRegex = /^[A-Za-z0-9_-]+$/;
  
  return base64urlRegex.test(base64Part);
}

// -----------------------------------------------------------------------------
// General Secure Random
// -----------------------------------------------------------------------------

/**
 * Generate cryptographically secure random bytes
 * 
 * @param length - Number of bytes to generate
 * @returns Random bytes as hex string
 */
export function generateRandomHex(length: number = 16): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate cryptographically secure random bytes as base64url
 * 
 * @param length - Number of bytes to generate
 * @returns Random bytes as base64url string
 */
export function generateRandomBase64(length: number = 16): string {
  return randomBytes(length).toString('base64url');
}

/**
 * Generate a secure random token for various purposes
 * 
 * @param prefix - Optional prefix for the token
 * @param bytes - Number of random bytes (default: 24)
 * @returns Token string
 */
export function generateToken(prefix?: string, bytes: number = 24): string {
  const random = randomBytes(bytes).toString('base64url');
  return prefix ? `${prefix}_${random}` : random;
}

// -----------------------------------------------------------------------------
// Signature Verification Code Snippets (for docs)
// -----------------------------------------------------------------------------

/**
 * Get code snippet for verifying signatures in different languages
 */
export function getVerificationSnippet(language: 'node' | 'python' | 'go' | 'ruby' | 'php'): string {
  const snippets: Record<string, string> = {
    node: `
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Usage in Express:
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-xrnotify-signature'];
  const payload = req.body.toString();
  
  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  const event = JSON.parse(payload);
  // Process event...
  res.status(200).send('OK');
});
`.trim(),

    python: `
import hmac
import hashlib

def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    expected = 'sha256=' + hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected)

# Usage in Flask:
@app.route('/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-XRNotify-Signature')
    payload = request.get_data()
    
    if not verify_webhook_signature(payload, signature, WEBHOOK_SECRET):
        return 'Invalid signature', 401
    
    event = request.get_json()
    # Process event...
    return 'OK', 200
`.trim(),

    go: `
package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "strings"
)

func verifyWebhookSignature(payload []byte, signature, secret string) bool {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(payload)
    expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))
    
    return hmac.Equal([]byte(signature), []byte(expected))
}

// Usage in net/http:
func webhookHandler(w http.ResponseWriter, r *http.Request) {
    signature := r.Header.Get("X-XRNotify-Signature")
    payload, _ := io.ReadAll(r.Body)
    
    if !verifyWebhookSignature(payload, signature, webhookSecret) {
        http.Error(w, "Invalid signature", http.StatusUnauthorized)
        return
    }
    
    var event map[string]interface{}
    json.Unmarshal(payload, &event)
    // Process event...
    w.WriteHeader(http.StatusOK)
}
`.trim(),

    ruby: `
require 'openssl'

def verify_webhook_signature(payload, signature, secret)
  expected = 'sha256=' + OpenSSL::HMAC.hexdigest('sha256', secret, payload)
  Rack::Utils.secure_compare(signature, expected)
end

# Usage in Sinatra/Rails:
post '/webhook' do
  signature = request.env['HTTP_X_XRNOTIFY_SIGNATURE']
  payload = request.body.read
  
  unless verify_webhook_signature(payload, signature, ENV['WEBHOOK_SECRET'])
    halt 401, 'Invalid signature'
  end
  
  event = JSON.parse(payload)
  # Process event...
  status 200
end
`.trim(),

    php: `
<?php

function verifyWebhookSignature(string $payload, string $signature, string $secret): bool {
    $expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);
    return hash_equals($signature, $expected);
}

// Usage:
$signature = $_SERVER['HTTP_X_XRNOTIFY_SIGNATURE'] ?? '';
$payload = file_get_contents('php://input');

if (!verifyWebhookSignature($payload, $signature, WEBHOOK_SECRET)) {
    http_response_code(401);
    exit('Invalid signature');
}

$event = json_decode($payload, true);
// Process event...
http_response_code(200);
echo 'OK';
`.trim(),
  };

  return snippets[language] ?? snippets['node']!;
}
