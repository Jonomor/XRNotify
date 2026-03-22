// =============================================================================
// XRNotify Platform - Logger
// =============================================================================
// Structured logging with Pino, correlation IDs, and request context
// =============================================================================

import pino, { type Logger as PinoLogger, type LoggerOptions } from 'pino';
import { getConfig, isProduction } from './config';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type Logger = PinoLogger;

export interface RequestLogContext {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  tenantId?: string;
  apiKeyId?: string;
}

export interface ResponseLogContext {
  statusCode: number;
  durationMs: number;
  contentLength?: number;
}

// -----------------------------------------------------------------------------
// Logger Configuration
// -----------------------------------------------------------------------------

function createLoggerOptions(): LoggerOptions {
  let logLevel = 'info';
  let env: string = process.env['NODE_ENV'] ?? 'development';

  try {
    const config = getConfig();
    logLevel = config.logLevel;
    env = config.env;
  } catch {
    // getConfig() may throw during Next.js build when env vars are absent
  }

  const baseOptions: LoggerOptions = {
    level: logLevel,
    base: {
      service: 'xrnotify-platform',
      env,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label: string) => ({ level: label }),
      bindings: (bindings) => ({
        pid: bindings['pid'],
        host: bindings['hostname'],
        service: bindings['service'],
        env: bindings['env'],
      }),
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers["x-xrnotify-key"]',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        'password',
        'secret',
        'apiKey',
        'api_key',
        'token',
        'accessToken',
        'refreshToken',
        '*.password',
        '*.secret',
        '*.apiKey',
        '*.token',
      ],
      censor: '[REDACTED]',
    },
  };

  // Pretty print in development
  if (env === 'development') {
    return {
      ...baseOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname,service,env',
          messageFormat: '{msg}',
          errorLikeObjectKeys: ['err', 'error'],
        },
      },
    };
  }

  return baseOptions;
}

// -----------------------------------------------------------------------------
// Logger Singleton
// -----------------------------------------------------------------------------

let loggerInstance: Logger | null = null;

/**
 * Get or create the root logger instance
 * 
 * @returns Pino logger instance
 */
export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = pino(createLoggerOptions());
  }
  return loggerInstance;
}

/**
 * Create a child logger with module context
 * 
 * @param module - Module name for context
 * @param bindings - Additional bindings
 * @returns Child logger instance
 * 
 * @example
 * const logger = createModuleLogger('webhook-service');
 * logger.info({ webhookId }, 'Processing webhook');
 */
export function createModuleLogger(
  module: string,
  bindings: Record<string, unknown> = {}
): Logger {
  return getLogger().child({ module, ...bindings });
}

/**
 * Create a child logger with request context
 * 
 * @param context - Request context
 * @returns Child logger instance
 */
export function createRequestLogger(context: RequestLogContext): Logger {
  return getLogger().child({
    requestId: context.requestId,
    method: context.method,
    url: context.url,
    ...(context.tenantId && { tenantId: context.tenantId }),
    ...(context.apiKeyId && { apiKeyId: context.apiKeyId }),
  });
}

// -----------------------------------------------------------------------------
// Log Helpers
// -----------------------------------------------------------------------------

/**
 * Log HTTP request start
 */
export function logHttpRequest(
  logger: Logger,
  context: RequestLogContext
): void {
  logger.info(
    {
      type: 'http_request',
      method: context.method,
      url: context.url,
      userAgent: context.userAgent,
      ip: context.ip,
    },
    `${context.method} ${context.url}`
  );
}

/**
 * Log HTTP response
 */
export function logHttpResponse(
  logger: Logger,
  context: RequestLogContext,
  response: ResponseLogContext
): void {
  const level = response.statusCode >= 500 ? 'error' 
    : response.statusCode >= 400 ? 'warn' 
    : 'info';

  logger[level](
    {
      type: 'http_response',
      method: context.method,
      url: context.url,
      statusCode: response.statusCode,
      durationMs: response.durationMs,
      contentLength: response.contentLength,
    },
    `${context.method} ${context.url} ${response.statusCode} ${response.durationMs}ms`
  );
}

/**
 * Log application lifecycle events
 */
export function logLifecycle(
  event: 'starting' | 'started' | 'stopping' | 'stopped' | 'ready' | 'error',
  details?: Record<string, unknown>
): void {
  const logger = getLogger();
  const message = `Application ${event}`;

  if (event === 'error') {
    logger.error({ type: 'lifecycle', event, ...details }, message);
  } else {
    logger.info({ type: 'lifecycle', event, ...details }, message);
  }
}

/**
 * Log database query
 */
export function logDbQuery(
  logger: Logger,
  query: string,
  durationMs: number,
  rowCount?: number
): void {
  if (!isProduction()) {
    // Only log query text in non-production
    logger.debug(
      {
        type: 'db_query',
        query: query.substring(0, 200),
        durationMs,
        rowCount,
      },
      `DB query ${durationMs}ms`
    );
  } else {
    logger.debug(
      {
        type: 'db_query',
        durationMs,
        rowCount,
      },
      `DB query ${durationMs}ms`
    );
  }
}

/**
 * Log Redis operation
 */
export function logRedisOp(
  logger: Logger,
  operation: string,
  key: string,
  durationMs: number
): void {
  logger.debug(
    {
      type: 'redis_op',
      operation,
      key: key.substring(0, 100),
      durationMs,
    },
    `Redis ${operation} ${durationMs}ms`
  );
}

/**
 * Log webhook delivery attempt
 */
export function logWebhookDelivery(
  logger: Logger,
  context: {
    deliveryId: string;
    webhookId: string;
    eventId: string;
    attempt: number;
    url: string;
    statusCode?: number;
    durationMs: number;
    success: boolean;
    error?: string;
  }
): void {
  const level = context.success ? 'info' : 'warn';
  
  logger[level](
    {
      type: 'webhook_delivery',
      deliveryId: context.deliveryId,
      webhookId: context.webhookId,
      eventId: context.eventId,
      attempt: context.attempt,
      url: maskUrl(context.url),
      statusCode: context.statusCode,
      durationMs: context.durationMs,
      success: context.success,
      error: context.error,
    },
    `Webhook delivery ${context.success ? 'succeeded' : 'failed'} (attempt ${context.attempt})`
  );
}

/**
 * Log XRPL event
 */
export function logXrplEvent(
  logger: Logger,
  context: {
    eventId: string;
    eventType: string;
    ledgerIndex: number;
    txHash: string;
  }
): void {
  logger.debug(
    {
      type: 'xrpl_event',
      eventId: context.eventId,
      eventType: context.eventType,
      ledgerIndex: context.ledgerIndex,
      txHash: context.txHash,
    },
    `XRPL event: ${context.eventType}`
  );
}

/**
 * Log error with stack trace
 */
export function logError(
  logger: Logger,
  error: Error | unknown,
  context?: Record<string, unknown>
): void {
  if (error instanceof Error) {
    logger.error(
      {
        type: 'error',
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        ...context,
      },
      error.message
    );
  } else {
    logger.error(
      {
        type: 'error',
        error: String(error),
        ...context,
      },
      'Unknown error'
    );
  }
}

/**
 * Log security event
 */
export function logSecurityEvent(
  logger: Logger,
  event: 'auth_failed' | 'rate_limited' | 'invalid_signature' | 'blocked_request' | 'login_failed' | 'login_success' | 'logout' | 'password_change_failed' | 'password_changed' | 'password_reset_requested' | 'password_reset_invalid_token' | 'password_reset_completed',
  context: Record<string, unknown>
): void {
  logger.warn(
    {
      type: 'security',
      event,
      ...context,
    },
    `Security event: ${event}`
  );
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

/**
 * Mask URL for logging (hide path details)
 */
function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}/***`;
  } catch {
    return '***';
  }
}

/**
 * Create a logger that includes timing
 */
export function withTiming(logger: Logger): {
  start: () => void;
  end: (message: string, context?: Record<string, unknown>) => void;
} {
  let startTime: number;
  
  return {
    start: () => {
      startTime = performance.now();
    },
    end: (message: string, context?: Record<string, unknown>) => {
      const durationMs = Math.round(performance.now() - startTime);
      logger.info({ durationMs, ...context }, `${message} (${durationMs}ms)`);
    },
  };
}

/**
 * Flush logger (for graceful shutdown)
 */
export async function flushLogger(): Promise<void> {
  return new Promise((resolve) => {
    if (loggerInstance) {
      loggerInstance.flush();
    }
    // Give it a moment to flush
    setTimeout(resolve, 100);
  });
}
