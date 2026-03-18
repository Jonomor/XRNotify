/**
 * @fileoverview XRNotify Prometheus Metrics
 * Exposes application metrics for monitoring and alerting.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/core/metrics
 */

import {
  Registry,
  Counter,
  Gauge,
  Histogram,
  Summary,
  collectDefaultMetrics,
  type CounterConfiguration,
  type GaugeConfiguration,
  type HistogramConfiguration,
  type SummaryConfiguration,
} from 'prom-client';
import { getConfig, getServiceName } from './config.js';
import { createModuleLogger } from './logger.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Metric labels
 */
export type Labels = Record<string, string | number>;

/**
 * HTTP request labels
 */
export interface HttpRequestLabels {
  method: string;
  route: string;
  statusCode: number;
}

/**
 * Webhook delivery labels
 */
export interface WebhookDeliveryLabels {
  status: 'success' | 'failed' | 'retrying';
  eventType?: string;
}

/**
 * XRPL event labels
 */
export interface XrplEventLabels {
  eventType: string;
  network: string;
}

/**
 * Queue labels
 */
export interface QueueLabels {
  queue: string;
}

/**
 * Database labels
 */
export interface DbLabels {
  operation: string;
}

// =============================================================================
// Registry
// =============================================================================

const logger = createModuleLogger('metrics');

/**
 * Custom Prometheus registry
 */
export const registry = new Registry();

/**
 * Initialize default Node.js metrics
 */
export function initializeMetrics(): void {
  const config = getConfig();

  if (!config.metrics.enabled) {
    logger.info('Metrics disabled');
    return;
  }

  // Set default labels
  registry.setDefaultLabels({
    service: getServiceName(),
    env: config.nodeEnv,
  });

  // Collect default Node.js metrics
  collectDefaultMetrics({
    register: registry,
    prefix: 'xrnotify_',
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  });

  logger.info('Metrics initialized');
}

/**
 * Get metrics as Prometheus text format
 *
 * @returns Prometheus-formatted metrics string
 */
export async function getMetrics(): Promise<string> {
  return registry.metrics();
}

/**
 * Get metrics content type
 *
 * @returns Content-Type header value
 */
export function getMetricsContentType(): string {
  return registry.contentType;
}

// =============================================================================
// HTTP Metrics
// =============================================================================

/**
 * Total HTTP requests counter
 */
export const httpRequestsTotal = new Counter({
  name: 'xrnotify_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
} as CounterConfiguration<string>);

/**
 * HTTP request duration histogram
 */
export const httpRequestDuration = new Histogram({
  name: 'xrnotify_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
} as HistogramConfiguration<string>);

/**
 * Active HTTP requests gauge
 */
export const httpRequestsActive = new Gauge({
  name: 'xrnotify_http_requests_active',
  help: 'Number of active HTTP requests',
  registers: [registry],
} as GaugeConfiguration<string>);

/**
 * Record an HTTP request
 *
 * @param labels - Request labels
 * @param durationSeconds - Request duration
 */
export function recordHttpRequest(
  labels: HttpRequestLabels,
  durationSeconds: number
): void {
  const labelValues = {
    method: labels.method,
    route: labels.route,
    status_code: String(labels.statusCode),
  };

  httpRequestsTotal.inc(labelValues);
  httpRequestDuration.observe(labelValues, durationSeconds);
}

// =============================================================================
// XRPL Metrics
// =============================================================================

/**
 * Total XRPL events received counter
 */
export const xrplEventsTotal = new Counter({
  name: 'xrnotify_xrpl_events_total',
  help: 'Total number of XRPL events received',
  labelNames: ['event_type', 'network'],
  registers: [registry],
} as CounterConfiguration<string>);

/**
 * Current XRPL ledger index gauge
 */
export const xrplLedgerIndex = new Gauge({
  name: 'xrnotify_xrpl_ledger_index',
  help: 'Current XRPL ledger index',
  registers: [registry],
} as GaugeConfiguration<string>);

/**
 * XRPL cursor ledger index gauge
 */
export const xrplCursorLedgerIndex = new Gauge({
  name: 'xrnotify_xrpl_cursor_ledger_index',
  help: 'Last processed XRPL ledger index (cursor position)',
  registers: [registry],
} as GaugeConfiguration<string>);

/**
 * XRPL connection status gauge (1 = connected, 0 = disconnected)
 */
export const xrplConnectionStatus = new Gauge({
  name: 'xrnotify_xrpl_connection_status',
  help: 'XRPL WebSocket connection status (1 = connected, 0 = disconnected)',
  registers: [registry],
} as GaugeConfiguration<string>);

/**
 * Total XRPL reconnections counter
 */
export const xrplReconnectsTotal = new Counter({
  name: 'xrnotify_xrpl_reconnects_total',
  help: 'Total number of XRPL WebSocket reconnections',
  registers: [registry],
} as CounterConfiguration<string>);

/**
 * XRPL event processing duration histogram
 */
export const xrplEventProcessingDuration = new Histogram({
  name: 'xrnotify_xrpl_event_processing_duration_seconds',
  help: 'Duration of XRPL event processing in seconds',
  labelNames: ['event_type'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [registry],
} as HistogramConfiguration<string>);

/**
 * Record an XRPL event
 *
 * @param labels - Event labels
 */
export function recordXrplEvent(labels: XrplEventLabels): void {
  xrplEventsTotal.inc({
    event_type: labels.eventType,
    network: labels.network,
  });
}

/**
 * Set XRPL connection status
 *
 * @param connected - Whether connected
 */
export function setXrplConnectionStatus(connected: boolean): void {
  xrplConnectionStatus.set(connected ? 1 : 0);
}

/**
 * Set current ledger index
 *
 * @param index - Ledger index
 */
export function setXrplLedgerIndex(index: number): void {
  xrplLedgerIndex.set(index);
}

/**
 * Set cursor ledger index
 *
 * @param index - Ledger index
 */
export function setXrplCursorIndex(index: number): void {
  xrplCursorLedgerIndex.set(index);
}

/**
 * Increment reconnection counter
 */
export function recordXrplReconnect(): void {
  xrplReconnectsTotal.inc();
}

// =============================================================================
// Webhook Delivery Metrics
// =============================================================================

/**
 * Total webhook deliveries counter
 */
export const webhookDeliveriesTotal = new Counter({
  name: 'xrnotify_webhook_deliveries_total',
  help: 'Total number of webhook delivery attempts',
  labelNames: ['status', 'event_type'],
  registers: [registry],
} as CounterConfiguration<string>);

/**
 * Webhook delivery duration histogram
 */
export const webhookDeliveryDuration = new Histogram({
  name: 'xrnotify_webhook_delivery_duration_seconds',
  help: 'Webhook delivery duration in seconds',
  labelNames: ['status'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [registry],
} as HistogramConfiguration<string>);

/**
 * Active webhook deliveries gauge
 */
export const webhookDeliveriesActive = new Gauge({
  name: 'xrnotify_webhook_deliveries_active',
  help: 'Number of webhook deliveries currently in progress',
  registers: [registry],
} as GaugeConfiguration<string>);

/**
 * Webhook retry attempts counter
 */
export const webhookRetriesTotal = new Counter({
  name: 'xrnotify_webhook_retries_total',
  help: 'Total number of webhook retry attempts',
  labelNames: ['attempt'],
  registers: [registry],
} as CounterConfiguration<string>);

/**
 * Record a webhook delivery
 *
 * @param labels - Delivery labels
 * @param durationSeconds - Delivery duration
 */
export function recordWebhookDelivery(
  labels: WebhookDeliveryLabels,
  durationSeconds: number
): void {
  webhookDeliveriesTotal.inc({
    status: labels.status,
    event_type: labels.eventType ?? 'unknown',
  });
  webhookDeliveryDuration.observe({ status: labels.status }, durationSeconds);
}

/**
 * Record a webhook retry attempt
 *
 * @param attempt - Attempt number
 */
export function recordWebhookRetry(attempt: number): void {
  webhookRetriesTotal.inc({ attempt: String(attempt) });
}

// =============================================================================
// Queue Metrics
// =============================================================================

/**
 * Queue depth gauge
 */
export const queueDepth = new Gauge({
  name: 'xrnotify_queue_depth',
  help: 'Number of messages in queue',
  labelNames: ['queue'],
  registers: [registry],
} as GaugeConfiguration<string>);

/**
 * Queue processing duration histogram
 */
export const queueProcessingDuration = new Histogram({
  name: 'xrnotify_queue_processing_duration_seconds',
  help: 'Queue message processing duration in seconds',
  labelNames: ['queue'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
} as HistogramConfiguration<string>);

/**
 * Queue messages processed counter
 */
export const queueMessagesProcessed = new Counter({
  name: 'xrnotify_queue_messages_processed_total',
  help: 'Total number of queue messages processed',
  labelNames: ['queue', 'status'],
  registers: [registry],
} as CounterConfiguration<string>);

/**
 * Set queue depth
 *
 * @param queue - Queue name
 * @param depth - Number of messages
 */
export function setQueueDepth(queue: string, depth: number): void {
  queueDepth.set({ queue }, depth);
}

/**
 * Record queue message processing
 *
 * @param queue - Queue name
 * @param status - Processing status
 * @param durationSeconds - Processing duration
 */
export function recordQueueProcessing(
  queue: string,
  status: 'success' | 'failed',
  durationSeconds: number
): void {
  queueMessagesProcessed.inc({ queue, status });
  queueProcessingDuration.observe({ queue }, durationSeconds);
}

// =============================================================================
// Database Metrics
// =============================================================================

/**
 * Database query duration histogram
 */
export const dbQueryDuration = new Histogram({
  name: 'xrnotify_db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [registry],
} as HistogramConfiguration<string>);

/**
 * Database queries total counter
 */
export const dbQueriesTotal = new Counter({
  name: 'xrnotify_db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'status'],
  registers: [registry],
} as CounterConfiguration<string>);

/**
 * Database connection pool gauge
 */
export const dbPoolConnections = new Gauge({
  name: 'xrnotify_db_pool_connections',
  help: 'Number of database pool connections',
  labelNames: ['state'],
  registers: [registry],
} as GaugeConfiguration<string>);

/**
 * Record a database query
 *
 * @param operation - Query operation type
 * @param durationSeconds - Query duration
 * @param success - Whether query succeeded
 */
export function recordDbQuery(
  operation: string,
  durationSeconds: number,
  success: boolean = true
): void {
  dbQueriesTotal.inc({ operation, status: success ? 'success' : 'failed' });
  dbQueryDuration.observe({ operation }, durationSeconds);
}

/**
 * Set database pool connections
 *
 * @param active - Active connections
 * @param idle - Idle connections
 * @param waiting - Waiting for connection
 */
export function setDbPoolConnections(
  active: number,
  idle: number,
  waiting: number
): void {
  dbPoolConnections.set({ state: 'active' }, active);
  dbPoolConnections.set({ state: 'idle' }, idle);
  dbPoolConnections.set({ state: 'waiting' }, waiting);
}

// =============================================================================
// API Key & Auth Metrics
// =============================================================================

/**
 * API key authentication counter
 */
export const apiKeyAuthTotal = new Counter({
  name: 'xrnotify_api_key_auth_total',
  help: 'Total number of API key authentication attempts',
  labelNames: ['status'],
  registers: [registry],
} as CounterConfiguration<string>);

/**
 * Rate limit hits counter
 */
export const rateLimitHitsTotal = new Counter({
  name: 'xrnotify_rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['type'],
  registers: [registry],
} as CounterConfiguration<string>);

/**
 * Record API key authentication
 *
 * @param success - Whether authentication succeeded
 */
export function recordApiKeyAuth(success: boolean): void {
  apiKeyAuthTotal.inc({ status: success ? 'success' : 'failed' });
}

/**
 * Record rate limit hit
 *
 * @param type - Rate limit type
 */
export function recordRateLimitHit(type: string): void {
  rateLimitHitsTotal.inc({ type });
}

// =============================================================================
// Webhook Management Metrics
// =============================================================================

/**
 * Active webhooks gauge
 */
export const activeWebhooks = new Gauge({
  name: 'xrnotify_active_webhooks',
  help: 'Number of active webhooks',
  registers: [registry],
} as GaugeConfiguration<string>);

/**
 * Webhook operations counter
 */
export const webhookOperationsTotal = new Counter({
  name: 'xrnotify_webhook_operations_total',
  help: 'Total number of webhook operations',
  labelNames: ['operation'],
  registers: [registry],
} as CounterConfiguration<string>);

/**
 * Set active webhooks count
 *
 * @param count - Number of active webhooks
 */
export function setActiveWebhooks(count: number): void {
  activeWebhooks.set(count);
}

/**
 * Record webhook operation
 *
 * @param operation - Operation type
 */
export function recordWebhookOperation(
  operation: 'create' | 'update' | 'delete' | 'rotate_secret' | 'test'
): void {
  webhookOperationsTotal.inc({ operation });
}

// =============================================================================
// Replay Metrics
// =============================================================================

/**
 * Replay events counter
 */
export const replayEventsTotal = new Counter({
  name: 'xrnotify_replay_events_total',
  help: 'Total number of events replayed',
  labelNames: ['status'],
  registers: [registry],
} as CounterConfiguration<string>);

/**
 * Active replays gauge
 */
export const activeReplays = new Gauge({
  name: 'xrnotify_active_replays',
  help: 'Number of active replay operations',
  registers: [registry],
} as GaugeConfiguration<string>);

/**
 * Record replay events
 *
 * @param count - Number of events replayed
 * @param success - Whether replay succeeded
 */
export function recordReplayEvents(count: number, success: boolean): void {
  replayEventsTotal.inc({ status: success ? 'success' : 'failed' }, count);
}

// =============================================================================
// Business Metrics
// =============================================================================

/**
 * Events processed total (per tenant)
 */
export const eventsProcessedTotal = new Counter({
  name: 'xrnotify_events_processed_total',
  help: 'Total number of events processed',
  labelNames: ['event_type'],
  registers: [registry],
} as CounterConfiguration<string>);

/**
 * Delivery success rate summary
 */
export const deliverySuccessRate = new Summary({
  name: 'xrnotify_delivery_success_rate',
  help: 'Webhook delivery success rate',
  percentiles: [0.5, 0.9, 0.95, 0.99],
  registers: [registry],
} as SummaryConfiguration<string>);

/**
 * Record processed event
 *
 * @param eventType - Event type
 */
export function recordProcessedEvent(eventType: string): void {
  eventsProcessedTotal.inc({ event_type: eventType });
}

// =============================================================================
// Service Health Metrics
// =============================================================================

/**
 * Service info gauge
 */
export const serviceInfo = new Gauge({
  name: 'xrnotify_service_info',
  help: 'Service information',
  labelNames: ['version', 'node_version'],
  registers: [registry],
} as GaugeConfiguration<string>);

/**
 * Service uptime gauge
 */
export const serviceUptime = new Gauge({
  name: 'xrnotify_service_uptime_seconds',
  help: 'Service uptime in seconds',
  registers: [registry],
} as GaugeConfiguration<string>);

/**
 * Last successful health check timestamp
 */
export const lastHealthCheck = new Gauge({
  name: 'xrnotify_last_health_check_timestamp',
  help: 'Timestamp of last successful health check',
  registers: [registry],
} as GaugeConfiguration<string>);

const startTime = Date.now();

/**
 * Set service info
 *
 * @param version - Service version
 */
export function setServiceInfo(version: string): void {
  serviceInfo.set(
    {
      version,
      node_version: process.version,
    },
    1
  );
}

/**
 * Update service uptime
 */
export function updateServiceUptime(): void {
  const uptimeSeconds = (Date.now() - startTime) / 1000;
  serviceUptime.set(uptimeSeconds);
}

/**
 * Record health check
 */
export function recordHealthCheck(): void {
  lastHealthCheck.set(Date.now() / 1000);
}

// =============================================================================
// Timer Utility
// =============================================================================

/**
 * Create a timer for measuring operation duration
 *
 * @returns Timer with end() method that returns duration
 *
 * @example
 * 