/**
 * @fileoverview XRNotify Crypto Module Index
 * Re-exports all cryptographic utilities.
 *
 * @packageDocumentation
 * @module @xrnotify/shared/crypto
 */

export {
  // Constants
  HMAC_ALGORITHM,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  DEFAULT_TIMESTAMP_TOLERANCE_SECONDS,
  SIGNATURE_PREFIX,

  // Types
  type SignatureOptions,
  type VerificationOptions,
  type SignatureResult,
  type VerificationResult,

  // Signature Functions
  generateSignature,
  verifySignature,

  // Key Generation Functions
  generateWebhookSecret,
  generateAPIKey,
  hashAPIKey,
  getAPIKeyPrefix,
  verifyAPIKey,

  // Middleware Helpers
  extractSignatureFromHeaders,
  createVerifier,

  // Code Examples
  NODE_JS_EXAMPLE,
  PYTHON_EXAMPLE,
  GO_EXAMPLE,
} from './hmac.js';
