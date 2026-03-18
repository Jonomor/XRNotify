/**
 * @fileoverview XRNotify Shared Package
 * Exports all shared types, utilities, validation schemas, and crypto functions.
 *
 * @packageDocumentation
 * @module @xrnotify/shared
 */

// =============================================================================
// Types
// =============================================================================

export * from './types/index.js';
export * from './types/event.js';
export * from './types/api.js';

// =============================================================================
// Crypto
// =============================================================================

export * from './crypto/index.js';
export * from './crypto/hmac.js';

// =============================================================================
// Validation
// =============================================================================

export * from './validation/index.js';
export * from './validation/schemas.js';

// =============================================================================
// Utilities
// =============================================================================

export * from './utils/index.js';
export * from './utils/time.js';
export * from './utils/id.js';

// =============================================================================
// Package Info
// =============================================================================

/**
 * Package version
 */
export const VERSION = '1.0.0';

/**
 * Package name
 */
export const PACKAGE_NAME = '@xrnotify/shared';
