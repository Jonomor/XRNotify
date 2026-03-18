/**
 * XRNotify Logger Module
 * Production-grade structured logging with Winston
 */

import winston from 'winston';
import { config } from './config.js';

// Custom log format for structured JSON logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Pretty format for development
const prettyFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, service, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
  })
);

// Create the logger instance
export const logger = winston.createLogger({
  level: config.logLevel,
  format: config.logFormat === 'json' ? structuredFormat : prettyFormat,
  defaultMeta: {
    service: config.serviceName,
    role: config.serviceRole,
    env: config.nodeEnv,
  },
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

// Child logger factory for module-specific logging
export function createChildLogger(module: string) {
  return logger.child({ module });
}

// Request logging helper
export function logRequest(req: { method: string; url: string; id?: string }, statusCode: number, latencyMs: number) {
  logger.http('request', {
    method: req.method,
    url: req.url,
    requestId: req.id,
    statusCode,
    latencyMs,
  });
}

// Error logging helper with correlation
export function logError(error: Error, context?: Record<string, unknown>) {
  logger.error(error.message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...context,
  });
}

// Metric event logging
export function logMetricEvent(event: string, value: number, tags?: Record<string, string>) {
  logger.debug('metric', { event, value, tags });
}
