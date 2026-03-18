// =============================================================================
// XRNotify Webhook Worker - Delivery Module
// =============================================================================
// Handles HTTP delivery of webhook payloads with signatures and timeouts
// =============================================================================

import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
import type { XrplEvent } from '@xrnotify/shared';
import { signPayload } from './sign.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface DeliveryConfig {
  /** Request timeout in milliseconds */
  timeoutMs: number;
  /** Maximum response body size to capture (bytes) */
  maxResponseBodySize: number;
  /** User-Agent header value */
  userAgent: string;
}

export interface Webhook {
  id: string;
  url: string;
  secret: string;
  tenant_id: string;
  event_types: string[];
  account_filters: string[];
  is_active: boolean;
}

export interface DeliveryPayload {
  event_id: string;
  event_type: string;
  timestamp: string;
  ledger_index: number;
  tx_hash: string;
  accounts: string[];
  payload: Record<string, unknown>;
  webhook_id: string;
  delivery_id: string;
}

export interface DeliveryResult {
  success: boolean;
  statusCode: number | null;
  responseBody: string | null;
  latencyMs: number;
  error: string | null;
  deliveryId: string;
}

export interface DeliveryAttempt {
  webhook: Webhook;
  event: XrplEvent;
  deliveryId: string;
  attemptNumber: number;
  correlationId: string;
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

const DEFAULT_CONFIG: DeliveryConfig = {
  timeoutMs: 30000, // 30 seconds
  maxResponseBodySize: 4096, // 4KB
  userAgent: 'XRNotify-Webhook/1.0',
};

// -----------------------------------------------------------------------------
// Delivery Function
// -----------------------------------------------------------------------------

export async function deliverWebhook(
  attempt: DeliveryAttempt,
  config: Partial<DeliveryConfig> = {},
  logger: Logger
): Promise<DeliveryResult> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const { webhook, event, deliveryId, attemptNumber, correlationId } = attempt;

  const log = logger.child({
    correlationId,
    deliveryId,
    webhookId: webhook.id,
    eventId: event.event_id,
    attemptNumber,
  });

  const startTime = Date.now();

  // Build payload
  const payload: DeliveryPayload = {
    event_id: event.event_id,
    event_type: event.event_type,
    timestamp: event.timestamp,
    ledger_index: event.ledger_index,
    tx_hash: event.tx_hash,
    accounts: event.accounts,
    payload: event.payload,
    webhook_id: webhook.id,
    delivery_id: deliveryId,
  };

  const body = JSON.stringify(payload);

  // Generate signature
  const signature = signPayload(body, webhook.secret);

  log.debug({ url: webhook.url, bodyLength: body.length }, 'Delivering webhook');

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), fullConfig.timeoutMs);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': fullConfig.userAgent,
          'X-XRNotify-Signature': signature,
          'X-XRNotify-Delivery-Id': deliveryId,
          'X-XRNotify-Event-Id': event.event_id,
          'X-XRNotify-Event-Type': event.event_type,
          'X-XRNotify-Webhook-Id': webhook.id,
          'X-XRNotify-Timestamp': new Date().toISOString(),
          'X-XRNotify-Attempt': attemptNumber.toString(),
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;

      // Read response body (truncated)
      let responseBody: string | null = null;
      try {
        const text = await response.text();
        responseBody = text.slice(0, fullConfig.maxResponseBodySize);
        if (text.length > fullConfig.maxResponseBodySize) {
          responseBody += '... [truncated]';
        }
      } catch {
        responseBody = '[failed to read response body]';
      }

      const success = response.ok; // 2xx status codes

      if (success) {
        log.info(
          { statusCode: response.status, latencyMs },
          'Webhook delivered successfully'
        );
      } else {
        log.warn(
          { statusCode: response.status, latencyMs, responseBody },
          'Webhook delivery failed with non-2xx status'
        );
      }

      return {
        success,
        statusCode: response.status,
        responseBody,
        latencyMs,
        error: success ? null : `HTTP ${response.status}: ${response.statusText}`,
        deliveryId,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        log.warn({ latencyMs, timeoutMs: fullConfig.timeoutMs }, 'Webhook delivery timed out');
        return {
          success: false,
          statusCode: null,
          responseBody: null,
          latencyMs,
          error: `Timeout after ${fullConfig.timeoutMs}ms`,
          deliveryId,
        };
      }

      // Network errors
      if ('cause' in error && error.cause instanceof Error) {
        const cause = error.cause;
        
        if (cause.message.includes('ECONNREFUSED')) {
          log.warn({ latencyMs, error: cause.message }, 'Connection refused');
          return {
            success: false,
            statusCode: null,
            responseBody: null,
            latencyMs,
            error: 'Connection refused',
            deliveryId,
          };
        }

        if (cause.message.includes('ENOTFOUND')) {
          log.warn({ latencyMs, error: cause.message }, 'DNS lookup failed');
          return {
            success: false,
            statusCode: null,
            responseBody: null,
            latencyMs,
            error: 'DNS lookup failed',
            deliveryId,
          };
        }

        if (cause.message.includes('ETIMEDOUT')) {
          log.warn({ latencyMs, error: cause.message }, 'Connection timed out');
          return {
            success: false,
            statusCode: null,
            responseBody: null,
            latencyMs,
            error: 'Connection timed out',
            deliveryId,
          };
        }

        if (cause.message.includes('ECONNRESET')) {
          log.warn({ latencyMs, error: cause.message }, 'Connection reset');
          return {
            success: false,
            statusCode: null,
            responseBody: null,
            latencyMs,
            error: 'Connection reset by peer',
            deliveryId,
          };
        }
      }

      // TLS/SSL errors
      if (error.message.includes('certificate') || error.message.includes('SSL')) {
        log.warn({ latencyMs, error: error.message }, 'TLS/SSL error');
        return {
          success: false,
          statusCode: null,
          responseBody: null,
          latencyMs,
          error: `TLS error: ${error.message}`,
          deliveryId,
        };
      }

      log.error({ latencyMs, error }, 'Webhook delivery failed with error');
      return {
        success: false,
        statusCode: null,
        responseBody: null,
        latencyMs,
        error: error.message,
        deliveryId,
      };
    }

    // Unknown error
    log.error({ latencyMs, error }, 'Webhook delivery failed with unknown error');
    return {
      success: false,
      statusCode: null,
      responseBody: null,
      latencyMs,
      error: 'Unknown error',
      deliveryId,
    };
  }
}

// -----------------------------------------------------------------------------
// Webhook Matching
// -----------------------------------------------------------------------------

export function matchesWebhook(webhook: Webhook, event: XrplEvent): boolean {
  // Check if webhook is active
  if (!webhook.is_active) {
    return false;
  }

  // Check event type filter
  if (webhook.event_types.length > 0) {
    if (!webhook.event_types.includes(event.event_type)) {
      return false;
    }
  }

  // Check account filter
  if (webhook.account_filters.length > 0) {
    const hasMatchingAccount = webhook.account_filters.some(
      account => event.accounts.includes(account)
    );
    if (!hasMatchingAccount) {
      return false;
    }
  }

  return true;
}

// -----------------------------------------------------------------------------
// Delivery ID Generation
// -----------------------------------------------------------------------------

export function generateDeliveryId(): string {
  return `dlv_${randomUUID().replace(/-/g, '')}`;
}

// -----------------------------------------------------------------------------
// Status Classification
// -----------------------------------------------------------------------------

export type DeliveryStatus = 'delivered' | 'failed' | 'pending';

export function classifyDeliveryResult(result: DeliveryResult): DeliveryStatus {
  if (result.success) {
    return 'delivered';
  }
  return 'failed';
}

export function isRetryableError(result: DeliveryResult): boolean {
  // Don't retry on success
  if (result.success) {
    return false;
  }

  // Retry on timeout
  if (result.error?.includes('Timeout')) {
    return true;
  }

  // Retry on connection errors
  if (result.error?.includes('Connection')) {
    return true;
  }

  // Retry on DNS errors (might be transient)
  if (result.error?.includes('DNS')) {
    return true;
  }

  // Retry on 5xx server errors
  if (result.statusCode !== null && result.statusCode >= 500) {
    return true;
  }

  // Retry on 429 Too Many Requests
  if (result.statusCode === 429) {
    return true;
  }

  // Don't retry on 4xx client errors (except 429)
  if (result.statusCode !== null && result.statusCode >= 400 && result.statusCode < 500) {
    return false;
  }

  // Default: retry on unknown errors
  return true;
}

// -----------------------------------------------------------------------------
// Headers for Verification
// -----------------------------------------------------------------------------

export interface WebhookHeaders {
  'X-XRNotify-Signature': string;
  'X-XRNotify-Delivery-Id': string;
  'X-XRNotify-Event-Id': string;
  'X-XRNotify-Event-Type': string;
  'X-XRNotify-Webhook-Id': string;
  'X-XRNotify-Timestamp': string;
  'X-XRNotify-Attempt': string;
}

export function buildWebhookHeaders(
  signature: string,
  deliveryId: string,
  event: XrplEvent,
  webhookId: string,
  attemptNumber: number
): WebhookHeaders {
  return {
    'X-XRNotify-Signature': signature,
    'X-XRNotify-Delivery-Id': deliveryId,
    'X-XRNotify-Event-Id': event.event_id,
    'X-XRNotify-Event-Type': event.event_type,
    'X-XRNotify-Webhook-Id': webhookId,
    'X-XRNotify-Timestamp': new Date().toISOString(),
    'X-XRNotify-Attempt': attemptNumber.toString(),
  };
}
