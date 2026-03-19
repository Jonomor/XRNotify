// =============================================================================
// XRNotify Platform - Metrics
// =============================================================================
// Prometheus metrics for monitoring webhooks, deliveries, XRPL events, and system health
// =============================================================================

import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';
import { createModuleLogger } from './logger';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface HttpRequestLabels {
  method: string;
  route: string;
  status_code: string;
}

export interface WebhookDeliveryLabels {
  status: 'success' | 'failed' | 'retrying';
  event_type: string;
}

export interface XrplEventLabels {
  event_type: string;
}

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = createModuleLogger('metrics');

// -----------------------------------------------------------------------------
// Registry
// -----------------------------------------------------------------------------

const registry = new Registry();

// Set default labels
registry.setDefaultLabels({
  service: 'xrnotify-platform',
  env: process.env['NODE_ENV'] ?? 'development',
});

// Collect default Node.js metrics
collectDefaultMetrics({ register: registry, prefix: 'xrnotify_' });

// -----------------------------------------------------------------------------
// HTTP Metrics
// -----------------------------------------------------------------------------

const httpRequestsTotal = new Counter({
  name: 'xrnotify_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

const httpRequestDuration = new Histogram({
  name: 'xrnotify_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const httpRequestsInFlight = new Gauge({
  name: 'xrnotify_http_requests_in_flight',
  help: 'Number of HTTP requests currently being processed',
  registers: [registry],
});

// -----------------------------------------------------------------------------
// Webhook Delivery Metrics
// -----------------------------------------------------------------------------

const webhookDeliveriesTotal = new Counter({
  name: 'xrnotify_webhook_deliveries_total',
  help: 'Total number of webhook delivery attempts',
  labelNames: ['status', 'event_type'],
  registers: [registry],
});

const webhookDeliveryDuration = new Histogram({
  name: 'xrnotify_webhook_delivery_duration_seconds',
  help: 'Webhook delivery duration in seconds',
  labelNames: ['status', 'event_type'],
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 15, 30],
  registers: [registry],
});

const webhookRetriesTotal = new Counter({
  name: 'xrnotify_webhook_retries_total',
  help: 'Total number of webhook delivery retries',
  labelNames: ['event_type'],
  registers: [registry],
});

const webhookDlqTotal = new Counter({
  name: 'xrnotify_webhook_dlq_total',
  help: 'Total number of webhooks moved to dead letter queue',
  labelNames: ['event_type'],
  registers: [registry],
});

const activeWebhooks = new Gauge({
  name: 'xrnotify_active_webhooks',
  help: 'Number of active webhook subscriptions',
  registers: [registry],
});

// -----------------------------------------------------------------------------
// XRPL Event Metrics
// -----------------------------------------------------------------------------

const xrplEventsTotal = new Counter({
  name: 'xrnotify_xrpl_events_total',
  help: 'Total number of XRPL events processed',
  labelNames: ['event_type'],
  registers: [registry],
});

const xrplLedgerIndex = new Gauge({
  name: 'xrnotify_xrpl_ledger_index',
  help: 'Current XRPL ledger index',
  registers: [registry],
});

const xrplProcessedLedgerIndex = new Gauge({
  name: 'xrnotify_xrpl_processed_ledger_index',
  help: 'Last processed XRPL ledger index',
  registers: [registry],
});

const xrplConnectionStatus = new Gauge({
  name: 'xrnotify_xrpl_connection_status',
  help: 'XRPL WebSocket connection status (1=connected, 0=disconnected)',
  registers: [registry],
});

const xrplReconnectsTotal = new Counter({
  name: 'xrnotify_xrpl_reconnects_total',
  help: 'Total number of XRPL reconnection attempts',
  registers: [registry],
});

// -----------------------------------------------------------------------------
// Queue Metrics
// -----------------------------------------------------------------------------

const queueDepth = new Gauge({
  name: 'xrnotify_queue_depth',
  help: 'Current depth of the event queue',
  labelNames: ['queue'],
  registers: [registry],
});

const dlqDepth = new Gauge({
  name: 'xrnotify_dlq_depth',
  help: 'Current depth of the dead letter queue',
  registers: [registry],
});

const queueProcessingDuration = new Histogram({
  name: 'xrnotify_queue_processing_duration_seconds',
  help: 'Time to process a batch from the queue',
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

// -----------------------------------------------------------------------------
// Database Metrics
// -----------------------------------------------------------------------------

const dbPoolTotal = new Gauge({
  name: 'xrnotify_db_pool_total',
  help: 'Total number of database pool connections',
  registers: [registry],
});

const dbPoolIdle = new Gauge({
  name: 'xrnotify_db_pool_idle',
  help: 'Number of idle database pool connections',
  registers: [registry],
});

const dbPoolWaiting = new Gauge({
  name: 'xrnotify_db_pool_waiting',
  help: 'Number of clients waiting for database connection',
  registers: [registry],
});

const dbQueryDuration = new Histogram({
  name: 'xrnotify_db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [registry],
});

// -----------------------------------------------------------------------------
// Redis Metrics
// -----------------------------------------------------------------------------

const redisOperationDuration = new Histogram({
  name: 'xrnotify_redis_operation_duration_seconds',
  help: 'Redis operation duration in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25],
  registers: [registry],
});

// -----------------------------------------------------------------------------
// Business Metrics
// -----------------------------------------------------------------------------

const tenantsTotal = new Gauge({
  name: 'xrnotify_tenants_total',
  help: 'Total number of tenants',
  labelNames: ['plan'],
  registers: [registry],
});

const apiKeysTotal = new Gauge({
  name: 'xrnotify_api_keys_total',
  help: 'Total number of active API keys',
  registers: [registry],
});

const eventsProcessedTotal = new Counter({
  name: 'xrnotify_events_processed_total',
  help: 'Total events processed (for billing)',
  labelNames: ['tenant_id'],
  registers: [registry],
});

// -----------------------------------------------------------------------------
// Recording Functions
// -----------------------------------------------------------------------------

// HTTP

export function recordHttpRequest(labels: HttpRequestLabels, durationSeconds: number): void {
  httpRequestsTotal.inc(labels);
  httpRequestDuration.observe(labels, durationSeconds);
}

export function incHttpRequestsInFlight(): void {
  httpRequestsInFlight.inc();
}

export function decHttpRequestsInFlight(): void {
  httpRequestsInFlight.dec();
}

// Webhook Delivery

export function recordWebhookDelivery(labels: WebhookDeliveryLabels, durationSeconds: number): void {
  webhookDeliveriesTotal.inc(labels);
  webhookDeliveryDuration.observe(labels, durationSeconds);
}

export function recordWebhookRetry(eventType: string): void {
  webhookRetriesTotal.inc({ event_type: eventType });
}

export function recordWebhookDlq(eventType: string): void {
  webhookDlqTotal.inc({ event_type: eventType });
}

export function setActiveWebhooks(count: number): void {
  activeWebhooks.set(count);
}

// XRPL Events

export function recordXrplEvent(eventType: string): void {
  xrplEventsTotal.inc({ event_type: eventType });
}

export function setXrplLedgerIndex(index: number): void {
  xrplLedgerIndex.set(index);
}

export function setXrplProcessedLedgerIndex(index: number): void {
  xrplProcessedLedgerIndex.set(index);
}

export function setXrplConnectionStatus(connected: boolean): void {
  xrplConnectionStatus.set(connected ? 1 : 0);
}

export function recordXrplReconnect(): void {
  xrplReconnectsTotal.inc();
}

// Queue

export function setQueueDepth(queue: string, depth: number): void {
  queueDepth.set({ queue }, depth);
}

export function setDlqDepth(depth: number): void {
  dlqDepth.set(depth);
}

export function recordQueueProcessingDuration(durationSeconds: number): void {
  queueProcessingDuration.observe(durationSeconds);
}

// Database

export function setDbPoolStats(total: number, idle: number, waiting: number): void {
  dbPoolTotal.set(total);
  dbPoolIdle.set(idle);
  dbPoolWaiting.set(waiting);
}

export function recordDbQueryDuration(operation: string, durationSeconds: number): void {
  dbQueryDuration.observe({ operation }, durationSeconds);
}

// Redis

export function recordRedisOperationDuration(operation: string, durationSeconds: number): void {
  redisOperationDuration.observe({ operation }, durationSeconds);
}

// Business

export function setTenantsTotal(plan: string, count: number): void {
  tenantsTotal.set({ plan }, count);
}

export function setApiKeysTotal(count: number): void {
  apiKeysTotal.set(count);
}

export function recordEventsProcessed(tenantId: string, count: number = 1): void {
  eventsProcessedTotal.inc({ tenant_id: tenantId }, count);
}

// -----------------------------------------------------------------------------
// Metrics Endpoint
// -----------------------------------------------------------------------------

/**
 * Get all metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return await registry.metrics();
}

/**
 * Get metrics content type
 */
export function getMetricsContentType(): string {
  return registry.contentType;
}

/**
 * Get the registry (for custom metrics)
 */
export function getRegistry(): Registry {
  return registry;
}

// -----------------------------------------------------------------------------
// Periodic Updates
// -----------------------------------------------------------------------------

let updateInterval: NodeJS.Timeout | null = null;

/**
 * Start periodic metrics updates (pool stats, queue depth, etc.)
 * 
 * @param updateFn - Function to call periodically
 * @param intervalMs - Update interval in milliseconds
 */
export function startMetricsUpdates(
  updateFn: () => Promise<void>,
  intervalMs: number = 15000
): void {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
  
  updateInterval = setInterval(async () => {
    try {
      await updateFn();
    } catch (error) {
      logger.error({ error }, 'Failed to update metrics');
    }
  }, intervalMs);
  
  // Run immediately
  updateFn().catch((error) => {
    logger.error({ error }, 'Failed to run initial metrics update');
  });
  
  logger.info({ intervalMs }, 'Started periodic metrics updates');
}

/**
 * Stop periodic metrics updates
 */
export function stopMetricsUpdates(): void {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
    logger.info('Stopped periodic metrics updates');
  }
}

// -----------------------------------------------------------------------------
// Clear metrics (for testing)
// -----------------------------------------------------------------------------

export function clearMetrics(): void {
  registry.clear();
  collectDefaultMetrics({ register: registry, prefix: 'xrnotify_' });
}
