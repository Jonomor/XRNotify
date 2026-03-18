/**
 * @fileoverview XRNotify HTTP Webhook Delivery
 * Executes webhook HTTP requests with timeouts and error handling.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/worker/delivery/httpDeliver
 */

import { createModuleLogger } from '../../core/logger.js';
import { recordDeliveryLatency, recordWebhookDelivery } from '../../core/metrics.js';
import { buildWebhookHeaders } from './sign.js';
import { validateUrlAtDelivery } from '../../services/webhooks/urlPolicy.js';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('http-deliver');

/**
 * Delivery request parameters
 */
export interface DeliveryRequest {
  /**
   * Webhook URL to deliver to
   */
  url: string;

  /**
   * JSON payload to deliver
   */
  payload: string;

  /**
   * Webhook secret for signing
   */
  secret: string;

  /**
   * Delivery ID
   */
  deliveryId: string;

  /**
   * Event type
   */
  eventType: string;

  /**
   * Webhook ID
   */
  webhookId: string;

  /**
   * Tenant ID
   */
  tenantId: string;

  /**
   * Request timeout in milliseconds
   */
  timeoutMs: number;

  /**
   * Current attempt number (1-based)
   */
  attempt: number;

  /**
   * Request ID for tracing
   */
  requestId?: string;
}

/**
 * Delivery response
 */
export interface DeliveryResponse {
  /**
   * Whether delivery was successful
   */
  success: boolean;

  /**
   * HTTP status code (if received)
   */
  statusCode: number | null;

  /**
   * Response body (truncated)
   */
  responseBody: string | null;

  /**
   * Response headers
   */
  responseHeaders: Record<string, string>;

  /**
   * Total duration in milliseconds
   */
  durationMs: number;

  /**
   * Error message (if failed)
   */
  error: string | null;

  /**
   * Error code for categorization
   */
  errorCode: DeliveryErrorCode | null;

  /**
   * Whether this error is retryable
   */
  retryable: boolean;

  /**
   * Resolved IP address
   */
  resolvedIp: string | null;
}

/**
 * Delivery error codes
 */
export type DeliveryErrorCode =
  | 'TIMEOUT'
  | 'CONNECTION_REFUSED'
  | 'CONNECTION_RESET'
  | 'DNS_FAILURE'
  | 'SSL_ERROR'
  | 'INVALID_URL'
  | 'SSRF_BLOCKED'
  | 'HTTP_4XX'
  | 'HTTP_5XX'
  | 'INVALID_RESPONSE'
  | 'BODY_TOO_LARGE'
  | 'UNKNOWN_ERROR';

/**
 * Delivery options
 */
export interface DeliveryOptions {
  /**
   * Maximum response body size in bytes (default: 64KB)
   */
  maxResponseSize?: number;

  /**
   * Follow redirects (default: false)
   */
  followRedirects?: boolean;

  /**
   * Maximum redirects to follow (default: 0)
   */
  maxRedirects?: number;

  /**
   * User agent string
   */
  userAgent?: string;

  /**
   * Skip SSRF validation (for testing)
   */
  skipSsrfCheck?: boolean;

  /**
   * Custom headers to add
   */
  customHeaders?: Record<string, string>;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MAX_RESPONSE_SIZE = 64 * 1024; // 64KB
const DEFAULT_USER_AGENT = 'XRNotify-Webhook/1.0';
const RESPONSE_TRUNCATE_LENGTH = 4096;

/**
 * HTTP status codes that indicate success
 */
const SUCCESS_STATUS_CODES = [200, 201, 202, 204];

/**
 * HTTP status codes that should not be retried
 */
const NON_RETRYABLE_STATUS_CODES = [400, 401, 403, 404, 405, 410, 422];

/**
 * Error patterns for categorization
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  code: DeliveryErrorCode;
  retryable: boolean;
}> = [
  { pattern: /ETIMEDOUT|ESOCKETTIMEDOUT|timeout/i, code: 'TIMEOUT', retryable: true },
  { pattern: /ECONNREFUSED/i, code: 'CONNECTION_REFUSED', retryable: true },
  { pattern: /ECONNRESET|EPIPE/i, code: 'CONNECTION_RESET', retryable: true },
  { pattern: /ENOTFOUND|EAI_AGAIN|EDNS/i, code: 'DNS_FAILURE', retryable: true },
  { pattern: /SSL|TLS|CERT|certificate/i, code: 'SSL_ERROR', retryable: false },
  { pattern: /invalid url|malformed/i, code: 'INVALID_URL', retryable: false },
  { pattern: /SSRF|private.*ip|blocked/i, code: 'SSRF_BLOCKED', retryable: false },
];

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Categorize error
 */
function categorizeError(error: Error): {
  code: DeliveryErrorCode;
  message: string;
  retryable: boolean;
} {
  const errorMessage = error.message || String(error);

  for (const { pattern, code, retryable } of ERROR_PATTERNS) {
    if (pattern.test(errorMessage)) {
      return { code, message: errorMessage, retryable };
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: errorMessage,
    retryable: true, // Unknown errors are generally retryable
  };
}

/**
 * Determine if HTTP status is successful
 */
function isSuccessStatus(statusCode: number): boolean {
  return SUCCESS_STATUS_CODES.includes(statusCode);
}

/**
 * Determine if HTTP status is retryable
 */
function isRetryableStatus(statusCode: number): boolean {
  // 4xx errors (except specific ones) are not retryable
  if (statusCode >= 400 && statusCode < 500) {
    return !NON_RETRYABLE_STATUS_CODES.includes(statusCode);
  }

  // 5xx errors are generally retryable
  if (statusCode >= 500) {
    return true;
  }

  return false;
}

/**
 * Get error code from HTTP status
 */
function getStatusErrorCode(statusCode: number): DeliveryErrorCode {
  if (statusCode >= 400 && statusCode < 500) {
    return 'HTTP_4XX';
  }
  if (statusCode >= 500) {
    return 'HTTP_5XX';
  }
  return 'UNKNOWN_ERROR';
}

// =============================================================================
// HTTP Delivery
// =============================================================================

/**
 * Execute webhook delivery
 */
export async function executeDelivery(
  request: DeliveryRequest,
  options: DeliveryOptions = {}
): Promise<DeliveryResponse> {
  const startTime = Date.now();
  const maxResponseSize = options.maxResponseSize ?? DEFAULT_MAX_RESPONSE_SIZE;
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;

  let resolvedIp: string | null = null;

  try {
    // Validate URL at delivery time (SSRF protection)
    if (!options.skipSsrfCheck) {
      const urlValidation = await validateUrlAtDelivery(request.url);

      if (!urlValidation.allowed) {
        return {
          success: false,
          statusCode: null,
          responseBody: null,
          responseHeaders: {},
          durationMs: Date.now() - startTime,
          error: urlValidation.error ?? 'URL validation failed',
          errorCode: 'SSRF_BLOCKED',
          retryable: false,
          resolvedIp: null,
        };
      }

      resolvedIp = urlValidation.targetIp ?? null;
    }

    // Build request headers
    const headers = buildWebhookHeaders({
      payload: request.payload,
      secret: request.secret,
      deliveryId: request.deliveryId,
      eventType: request.eventType,
      webhookId: request.webhookId,
      retryCount: request.attempt - 1,
      requestId: request.requestId,
      userAgent,
    });

    // Add custom headers
    if (options.customHeaders) {
      Object.assign(headers, options.customHeaders);
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), request.timeoutMs);

    try {
      // Execute HTTP request
      const response = await fetch(request.url, {
        method: 'POST',
        headers,
        body: request.payload,
        signal: controller.signal,
        redirect: options.followRedirects ? 'follow' : 'manual',
      });

      clearTimeout(timeoutId);

      const durationMs = Date.now() - startTime;

      // Extract response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // Read response body with size limit
      let responseBody: string | null = null;
      try {
        const contentLength = parseInt(response.headers.get('content-length') ?? '0', 10);

        if (contentLength > maxResponseSize) {
          responseBody = `[Response too large: ${contentLength} bytes]`;
        } else {
          const buffer = await response.arrayBuffer();

          if (buffer.byteLength > maxResponseSize) {
            responseBody = `[Response too large: ${buffer.byteLength} bytes]`;
          } else {
            responseBody = new TextDecoder().decode(buffer);

            // Truncate for storage
            if (responseBody.length > RESPONSE_TRUNCATE_LENGTH) {
              responseBody = responseBody.substring(0, RESPONSE_TRUNCATE_LENGTH) + '...[truncated]';
            }
          }
        }
      } catch (bodyError) {
        responseBody = `[Error reading body: ${(bodyError as Error).message}]`;
      }

      // Determine success
      const success = isSuccessStatus(response.status);
      const retryable = !success && isRetryableStatus(response.status);

      // Record metrics
      recordWebhookDelivery(success, request.eventType);
      recordDeliveryLatency(durationMs, request.eventType);

      logger.debug(
        {
          deliveryId: request.deliveryId,
          webhookId: request.webhookId,
          url: request.url,
          status: response.status,
          success,
          durationMs,
          attempt: request.attempt,
        },
        'Delivery completed'
      );

      return {
        success,
        statusCode: response.status,
        responseBody,
        responseHeaders,
        durationMs,
        error: success ? null : `HTTP ${response.status}: ${response.statusText}`,
        errorCode: success ? null : getStatusErrorCode(response.status),
        retryable,
        resolvedIp,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    const err = error as Error;
    const durationMs = Date.now() - startTime;

    // Handle abort (timeout)
    if (err.name === 'AbortError') {
      recordWebhookDelivery(false, request.eventType);

      logger.warn(
        {
          deliveryId: request.deliveryId,
          webhookId: request.webhookId,
          url: request.url,
          timeoutMs: request.timeoutMs,
          attempt: request.attempt,
        },
        'Delivery timeout'
      );

      return {
        success: false,
        statusCode: null,
        responseBody: null,
        responseHeaders: {},
        durationMs,
        error: `Request timeout after ${request.timeoutMs}ms`,
        errorCode: 'TIMEOUT',
        retryable: true,
        resolvedIp,
      };
    }

    // Categorize error
    const { code, message, retryable } = categorizeError(err);

    recordWebhookDelivery(false, request.eventType);

    logger.error(
      {
        err,
        deliveryId: request.deliveryId,
        webhookId: request.webhookId,
        url: request.url,
        errorCode: code,
        retryable,
        attempt: request.attempt,
      },
      'Delivery failed'
    );

    return {
      success: false,
      statusCode: null,
      responseBody: null,
      responseHeaders: {},
      durationMs,
      error: message,
      errorCode: code,
      retryable,
      resolvedIp,
    };
  }
}

/**
 * Execute delivery with simple retry (internal use)
 */
export async function executeDeliveryWithRetry(
  request: DeliveryRequest,
  options: DeliveryOptions & {
    maxInternalRetries?: number;
    internalRetryDelayMs?: number;
  } = {}
): Promise<DeliveryResponse> {
  const maxRetries = options.maxInternalRetries ?? 1;
  const retryDelayMs = options.internalRetryDelayMs ?? 1000;

  let lastResponse: DeliveryResponse | null = null;

  for (let i = 0; i <= maxRetries; i++) {
    lastResponse = await executeDelivery(request, options);

    if (lastResponse.success) {
      return lastResponse;
    }

    // Only retry on specific transient errors
    if (!lastResponse.retryable) {
      return lastResponse;
    }

    // Only retry on connection errors, not HTTP errors
    if (lastResponse.statusCode !== null) {
      return lastResponse;
    }

    // Don't retry on last attempt
    if (i < maxRetries) {
      logger.debug(
        { deliveryId: request.deliveryId, retryIn: retryDelayMs },
        'Internal retry'
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  return lastResponse!;
}

// =============================================================================
// Batch Delivery
// =============================================================================

/**
 * Execute multiple deliveries in parallel
 */
export async function executeDeliveriesBatch(
  requests: DeliveryRequest[],
  options: DeliveryOptions & {
    concurrency?: number;
  } = {}
): Promise<Map<string, DeliveryResponse>> {
  const concurrency = options.concurrency ?? 10;
  const results = new Map<string, DeliveryResponse>();

  // Process in batches
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(async (request) => {
        const response = await executeDelivery(request, options);
        return { deliveryId: request.deliveryId, response };
      })
    );

    for (const { deliveryId, response } of batchResults) {
      results.set(deliveryId, response);
    }
  }

  return results;
}

// =============================================================================
// Health Check
// =============================================================================

/**
 * Health check delivery to test webhook endpoint
 */
export async function healthCheckDelivery(
  url: string,
  options: {
    timeoutMs?: number;
    skipSsrfCheck?: boolean;
  } = {}
): Promise<{
  reachable: boolean;
  statusCode: number | null;
  latencyMs: number;
  error: string | null;
}> {
  const startTime = Date.now();
  const timeoutMs = options.timeoutMs ?? 5000;

  try {
    // Validate URL
    if (!options.skipSsrfCheck) {
      const urlValidation = await validateUrlAtDelivery(url);
      if (!urlValidation.allowed) {
        return {
          reachable: false,
          statusCode: null,
          latencyMs: Date.now() - startTime,
          error: urlValidation.error ?? 'URL validation failed',
        };
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Use HEAD request for health check
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'XRNotify-HealthCheck/1.0',
        },
      });

      clearTimeout(timeoutId);

      return {
        reachable: true,
        statusCode: response.status,
        latencyMs: Date.now() - startTime,
        error: null,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    const err = error as Error;

    return {
      reachable: false,
      statusCode: null,
      latencyMs: Date.now() - startTime,
      error: err.name === 'AbortError' ? 'Timeout' : err.message,
    };
  }
}

// =============================================================================
// Test Delivery
// =============================================================================

/**
 * Send test delivery to webhook
 */
export async function sendTestDelivery(params: {
  url: string;
  secret: string;
  webhookId: string;
  tenantId: string;
  timeoutMs?: number;
}): Promise<DeliveryResponse> {
  const testPayload = JSON.stringify({
    id: `evt_test_${Date.now()}`,
    event_type: 'test.ping',
    ledger_index: 0,
    tx_hash: '0'.repeat(64),
    network: 'testnet',
    timestamp: new Date().toISOString(),
    account_context: [],
    payload: {
      message: 'This is a test webhook delivery from XRNotify',
      webhook_id: params.webhookId,
      test: true,
    },
  });

  const request: DeliveryRequest = {
    url: params.url,
    payload: testPayload,
    secret: params.secret,
    deliveryId: `del_test_${Date.now()}`,
    eventType: 'test.ping',
    webhookId: params.webhookId,
    tenantId: params.tenantId,
    timeoutMs: params.timeoutMs ?? 10000,
    attempt: 1,
    requestId: `req_test_${Date.now()}`,
  };

  return executeDelivery(request);
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Format delivery response for logging
 */
export function formatDeliveryResponse(response: DeliveryResponse): string {
  if (response.success) {
    return `Success (${response.statusCode}) in ${response.durationMs}ms`;
  }

  return `Failed: ${response.error} (${response.errorCode}) in ${response.durationMs}ms`;
}

/**
 * Check if delivery should be retried
 */
export function shouldRetry(
  response: DeliveryResponse,
  currentAttempt: number,
  maxAttempts: number
): boolean {
  // Already at max attempts
  if (currentAttempt >= maxAttempts) {
    return false;
  }

  // Successful delivery
  if (response.success) {
    return false;
  }

  // Check if error is retryable
  return response.retryable;
}

/**
 * Get suggested retry delay based on error type
 */
export function getSuggestedRetryDelay(
  errorCode: DeliveryErrorCode | null,
  baseDelayMs: number = 1000
): number {
  switch (errorCode) {
    case 'TIMEOUT':
      // Longer delay for timeouts
      return baseDelayMs * 2;

    case 'CONNECTION_REFUSED':
    case 'CONNECTION_RESET':
      // Standard delay for connection issues
      return baseDelayMs;

    case 'DNS_FAILURE':
      // Longer delay for DNS issues
      return baseDelayMs * 3;

    case 'HTTP_5XX':
      // Standard delay for server errors
      return baseDelayMs;

    case 'HTTP_4XX':
      // Shorter delay for client errors (likely permanent)
      return baseDelayMs / 2;

    default:
      return baseDelayMs;
  }
}

// =============================================================================
// Export
// =============================================================================

export default {
  executeDelivery,
  executeDeliveryWithRetry,
  executeDeliveriesBatch,
  healthCheckDelivery,
  sendTestDelivery,
  formatDeliveryResponse,
  shouldRetry,
  getSuggestedRetryDelay,
  isSuccessStatus,
  isRetryableStatus,
};
