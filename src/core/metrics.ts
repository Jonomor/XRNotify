/**
 * XRNotify Metrics Module
 * Prometheus metrics for observability
 */

import client from 'prom-client';
import { config } from './config.js';

// Initialize default metrics (memory, CPU, etc.)
if (config.metricsEnabled) {
  client.collectDefaultMetrics({
    prefix: 'xrnotify_',
    labels: { service: config.serviceName, role: config.serviceRole },
  });
}

// ============================================
// XRPL Listener Metrics
// ============================================

export const xrplLedgersSeen = new client.Counter({
  name: 'xrnotify_xrpl_ledgers_seen_total',
  help: 'Total number of XRPL ledgers seen',
});

export const xrplEventsPublished = new client.Counter({
  name: 'xrnotify_xrpl_events_published_total',
  help: 'Total number of events published to queue',
  labelNames: ['event_type'],
});

export const xrplConnectionState = new client.Gauge({
  name: 'xrnotify_xrpl_connection_state',
  help: 'XRPL WebSocket connection state (1=connected, 0=disconnected)',
});

export const xrplReconnects = new client.Counter({
  name: 'xrnotify_xrpl_reconnects_total',
  help: 'Total number of XRPL reconnection attempts',
});

// ============================================
// Queue Metrics
// ============================================

export const queueDepth = new client.Gauge({
  name: 'xrnotify_queue_depth',
  help: 'Current number of events in the queue',
  labelNames: ['stream'],
});

export const queueWriteLatency = new client.Histogram({
  name: 'xrnotify_queue_write_latency_ms',
  help: 'Queue write latency in milliseconds',
  buckets: [1, 5, 10, 25, 50, 100, 250, 500],
});

// ============================================
// Webhook Delivery Metrics
// ============================================

export const webhookDeliveryTotal = new client.Counter({
  name: 'xrnotify_webhook_delivery_total',
  help: 'Total webhook delivery attempts',
  labelNames: ['status'], // success, retry, failed
});

export const webhookDeliveryLatency = new client.Histogram({
  name: 'xrnotify_webhook_delivery_latency_ms',
  help: 'Webhook delivery latency in milliseconds',
  buckets: [50, 100, 250, 500, 1000, 2000, 3000, 5000],
});

export const activeWebhooks = new client.Gauge({
  name: 'xrnotify_active_webhooks',
  help: 'Number of active webhook subscriptions',
});

// ============================================
// API Metrics
// ============================================

export const httpRequestsTotal = new client.Counter({
  name: 'xrnotify_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

export const httpRequestLatency = new client.Histogram({
  name: 'xrnotify_http_request_latency_ms',
  help: 'HTTP request latency in milliseconds',
  labelNames: ['method', 'route'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500],
});

export const activeConnections = new client.Gauge({
  name: 'xrnotify_active_connections',
  help: 'Number of active HTTP connections',
});

// ============================================
// Database Metrics
// ============================================

export const dbQueryTotal = new client.Counter({
  name: 'xrnotify_db_queries_total',
  help: 'Total database queries',
  labelNames: ['operation'], // select, insert, update, delete
});

export const dbQueryLatency = new client.Histogram({
  name: 'xrnotify_db_query_latency_ms',
  help: 'Database query latency in milliseconds',
  buckets: [1, 5, 10, 25, 50, 100, 250, 500],
});

export const dbPoolStats = new client.Gauge({
  name: 'xrnotify_db_pool_connections',
  help: 'Database connection pool statistics',
  labelNames: ['state'], // total, idle, waiting
});

// ============================================
// Export metrics endpoint handler
// ============================================

export async function getMetrics(): Promise<string> {
  return client.register.metrics();
}

export function getContentType(): string {
  return client.register.contentType;
}

// Reset all metrics (useful for testing)
export function resetMetrics(): void {
  client.register.resetMetrics();
}
