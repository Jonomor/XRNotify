/**
 * @fileoverview XRNotify Structured Logger
 * Pino-based logging with correlation IDs and structured output.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/core/logger
 */

import pino, { type Logger as PinoLogger, type LoggerOptions } from 'pino';
import { getConfig, getServiceName, isProduction } from './config.js';
import { generateCorrelationId, generateRequestId } from '@xrnotify/shared';

// =============================================================================
// Types
// =============================================================================

/**
 * Log context with common fields
 */
export interface LogContext {
  requestId?: string;
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  webhookId?: string;
  eventId?: string;
  deliveryId?: string;
  ledgerIndex?: number;
  txHash?: string;
  [key: string]: unknown;
}

/**
 * Logger interface extending Pino
 */
export interface Logger extends PinoLogger {
  /**
   * Create a child logger with additional context
   */
  child(bindings: LogContext): Logger;
}

/**
 * HTTP request log data
 */
export interface HttpRequestLog {
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  requestId: string;
  userAgent?: string;
  ip?: string;
  contentLength?: number;
  error?: string;
}

/**
 * Webhook delivery log data
 */
export interface WebhookDeliveryLog {
  webhookId: string;
  eventId: string;
  deliveryId: string;
  url: string;
  attempt: number;
  maxAttempts: number;
  statusCode?: number;
  durationMs: number;
  success: boolean;
  error?: string;
}

/**
 * XRPL event log data
 */
export interface XrplEventLog {
  eventId: string;
  eventType: string;
  ledgerIndex: number;
  txHash: string;
  accounts: string[];
}

/**
 * Database query log data
 */
export interface DbQueryLog {
  query: string;
  durationMs: number;
  rowCount?: number;
  error?: string;
}

// =============================================================================
// Logger Configuration
// =============================================================================

/**
 * Create Pino logger options based on configuration
 */
function createLoggerOptions(): LoggerOptions {
  const config = getConfig();
  const serviceName = getServiceName();

  const baseOptions: LoggerOptions = {
    name: serviceName,
    level: config.log.level,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({
        service: bindings['name'],
        pid: bindings['pid'],
        hostname: bindings['hostname'],
      }),
    },
    base: {
      service: serviceName,
      version: process.env['npm_package_version'] ?? '1.0.0',
      env: config.nodeEnv,
    },
    redact: {
      paths: [
        'password',
        'secret',
        'token',
        'apiKey',
        'api_key',
        'authorization',
        'cookie',
        'credit_card',
        'ssn',
        '*.password',
        '*.secret',
        '*.token',
        '*.apiKey',
        '*.api_key',
        'headers.authorization',
        'headers.cookie',
        'headers["x-xrnotify-key"]',
        'headers["x-xrnotify-signature"]',
      ],
      censor: '[REDACTED]',
    },
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: {
          host: req.headers?.['host'],
          'user-agent': req.headers?.['user-agent'],
          'content-type': req.headers?.['content-type'],
          'content-length': req.headers?.['content-length'],
        },
        remoteAddress: req.socket?.remoteAddress,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        headers: {
          'content-type': res.getHeader?.('content-type'),
          'content-length': res.getHeader?.('content-length'),
        },
      }),
    },
  };

  // Pretty printing for development
  if (config.log.format === 'pretty' && !isProduction()) {
    return {
      ...baseOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          singleLine: false,
          errorLikeObjectKeys: ['err', 'error'],
        },
      },
    };
  }

  return baseOptions;
}

// =============================================================================
// Logger Instance
// =============================================================================

let loggerInstance: Logger | null = null;

/**
 * Get or create the root logger instance
 */
export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = pino(createLoggerOptions()) as Logger;
  }
  return loggerInstance;
}

/**
 * Create a child logger with context
 *
 * @param context - Additional context to include in logs
 * @returns Child logger instance
 *
 * @example
 * 