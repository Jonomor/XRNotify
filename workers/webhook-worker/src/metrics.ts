// =============================================================================
// XRNotify Webhook Worker - Metrics Module
// =============================================================================
// Prometheus metrics for monitoring webhook delivery performance
// =============================================================================

import { 
  Registry, 
  Counter, 
  Histogram, 
  Gauge, 
  Summary,
  collectDefaultMetrics,
} from 'prom-client';
import { createServer, type Server } from 'node:http';
import type { Logger } from 'pino';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface MetricsConfig {
  /** Port for metrics HTTP server */
  port: number;
  /** Prefix for all metric names */
  prefix: string;
  /** Enable default Node.js metrics */
  collectDefaultMetrics: boolean;
  /** Default metrics collection interval (ms) */
  defaultMetricsInterval: number;
}

export interface DeliveryMetricLabels {
  webhook_id?: string;
  event_type?: string;
  status?: 'success' | 'failure' | 'retry';
  status_code?: string;
  failure_reason?: string;
}

// -----------------------------------------------------------------------------
// Metrics Registry & Definitions
// -----------------------------------------------------------------------------

export class WorkerMetrics {
  readonly registry: Registry;
  private server: Server | null = null;
  private readonly logger: Logger;
  private readonly config: MetricsConfig;

  // Counters
  readonly deliveriesTotal: Counter<'status' | 'event_type'>;
  readonly deliveryAttemptsTotal: Counter<'status' | 'status_code'>;
  readonly eventsProcessedTotal: Counter<'event_type'>;
  readonly retryScheduledTotal: Counter<'attempt'>;
  readonly dlqAddedTotal: Counter<'failure_category'>;
  readonly idempotencySkipsTotal: Counter<'reason'>;

  // Histograms
  readonly deliveryDuration: Histogram<'status'>;
  readonly processingDuration: Histogram<'stage'>;
  readonly responseSize: Histogram<'status'>;

  // Gauges
  readonly queueDepth: Gauge<'queue'>;
  readonly activeDeliveries: Gauge<string>;
  readonly retryQueueSize: Gauge<string>;
  readonly dlqSize: Gauge<string>;
  readonly consumerLag: Gauge<'consumer'>;

  // Summaries
  readonly deliveryLatencyQuantiles: Summary<'event_type'>;

  constructor(config: MetricsConfig, logger: Logger) {
    this.config = config;
    this.logger = logger.child({ component: 'metrics' });
    this.registry = new Registry();

    // Set default labels
    this.registry.setDefaultLabels({
      service: 'webhook-worker',
    });

    // Collect default Node.js metrics
    if (config.collectDefaultMetrics) {
      collectDefaultMetrics({
        register: this.registry,
        prefix: config.prefix,
        gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
      });
    }

    // -------------------------------------------------------------------------
    // Counter Definitions
    // -------------------------------------------------------------------------

    this.deliveriesTotal = new Counter({
      name: `${config.prefix}deliveries_total`,
      help: 'Total webhook deliveries by final status',
      labelNames: ['status', 'event_type'],
      registers: [this.registry],
    });

    this.deliveryAttemptsTotal = new Counter({
      name: `${config.prefix}delivery_attempts_total`,
      help: 'Total delivery attempts including retries',
      labelNames: ['status', 'status_code'],
      registers: [this.registry],
    });

    this.eventsProcessedTotal = new Counter({
      name: `${config.prefix}events_processed_total`,
      help: 'Total events consumed from stream',
      labelNames: ['event_type'],
      registers: [this.registry],
    });

    this.retryScheduledTotal = new Counter({
      name: `${config.prefix}retry_scheduled_total`,
      help: 'Total retries scheduled by attempt number',
      labelNames: ['attempt'],
      registers: [this.registry],
    });

    this.dlqAddedTotal = new Counter({
      name: `${config.prefix}dlq_added_total`,
      help: 'Total entries added to dead letter queue',
      labelNames: ['failure_category'],
      registers: [this.registry],
    });

    this.idempotencySkipsTotal = new Counter({
      name: `${config.prefix}idempotency_skips_total`,
      help: 'Total deliveries skipped due to idempotency',
      labelNames: ['reason'],
      registers: [this.registry],
    });

    // -------------------------------------------------------------------------
    // Histogram Definitions
    // -------------------------------------------------------------------------

    this.deliveryDuration = new Histogram({
      name: `${config.prefix}delivery_duration_seconds`,
      help: 'Webhook delivery HTTP request duration',
      labelNames: ['status'],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
      registers: [this.registry],
    });

    this.processingDuration = new Histogram({
      name: `${config.prefix}processing_duration_seconds`,
      help: 'Event processing duration by stage',
      labelNames: ['stage'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
      registers: [this.registry],
    });

    this.responseSize = new Histogram({
      name: `${config.prefix}response_size_bytes`,
      help: 'Webhook endpoint response body size',
      labelNames: ['status'],
      buckets: [100, 500, 1000, 5000, 10000, 50000],
      registers: [this.registry],
    });

    // -------------------------------------------------------------------------
    // Gauge Definitions
    // -------------------------------------------------------------------------

    this.queueDepth = new Gauge({
      name: `${config.prefix}queue_depth`,
      help: 'Current depth of processing queues',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.activeDeliveries = new Gauge({
      name: `${config.prefix}active_deliveries`,
      help: 'Number of deliveries currently in progress',
      registers: [this.registry],
    });

    this.retryQueueSize = new Gauge({
      name: `${config.prefix}retry_queue_size`,
      help: 'Number of deliveries pending retry',
      registers: [this.registry],
    });

    this.dlqSize = new Gauge({
      name: `${config.prefix}dlq_size`,
      help: 'Number of entries in dead letter queue',
      registers: [this.registry],
    });

    this.consumerLag = new Gauge({
      name: `${config.prefix}consumer_lag`,
      help: 'Consumer lag (pending messages) by consumer',
      labelNames: ['consumer'],
      registers: [this.registry],
    });

    // -------------------------------------------------------------------------
    // Summary Definitions
    // -------------------------------------------------------------------------

    this.deliveryLatencyQuantiles = new Summary({
      name: `${config.prefix}delivery_latency_quantiles`,
      help: 'Delivery latency quantiles by event type',
      labelNames: ['event_type'],
      percentiles: [0.5, 0.9, 0.95, 0.99],
      maxAgeSeconds: 600,
      ageBuckets: 5,
      registers: [this.registry],
    });
  }

  // ---------------------------------------------------------------------------
  // Recording Helpers
  // ---------------------------------------------------------------------------

  recordDeliverySuccess(eventType: string, durationMs: number, responseBytes: number): void {
    this.deliveriesTotal.inc({ status: 'success', event_type: eventType });
    this.deliveryAttemptsTotal.inc({ status: 'success', status_code: '2xx' });
    this.deliveryDuration.observe({ status: 'success' }, durationMs / 1000);
    this.responseSize.observe({ status: 'success' }, responseBytes);
    this.deliveryLatencyQuantiles.observe({ event_type: eventType }, durationMs / 1000);
  }

  recordDeliveryFailure(
    eventType: string, 
    durationMs: number, 
    statusCode: number,
    willRetry: boolean
  ): void {
    const status = willRetry ? 'retry' : 'failure';
    const statusCodeBucket = this.getStatusCodeBucket(statusCode);

    this.deliveryAttemptsTotal.inc({ status, status_code: statusCodeBucket });
    this.deliveryDuration.observe({ status }, durationMs / 1000);

    if (!willRetry) {
      this.deliveriesTotal.inc({ status: 'failure', event_type: eventType });
    }
  }

  recordRetryScheduled(attempt: number): void {
    this.retryScheduledTotal.inc({ attempt: attempt.toString() });
  }

  recordDlqEntry(failureCategory: string): void {
    this.dlqAddedTotal.inc({ failure_category: failureCategory });
  }

  recordIdempotencySkip(reason: string): void {
    this.idempotencySkipsTotal.inc({ reason });
  }

  recordEventProcessed(eventType: string): void {
    this.eventsProcessedTotal.inc({ event_type: eventType });
  }

  recordProcessingStage(stage: string, durationMs: number): void {
    this.processingDuration.observe({ stage }, durationMs / 1000);
  }

  // ---------------------------------------------------------------------------
  // Gauge Updates
  // ---------------------------------------------------------------------------

  setQueueDepth(queue: string, depth: number): void {
    this.queueDepth.set({ queue }, depth);
  }

  setActiveDeliveries(count: number): void {
    this.activeDeliveries.set(count);
  }

  incActiveDeliveries(): void {
    this.activeDeliveries.inc();
  }

  decActiveDeliveries(): void {
    this.activeDeliveries.dec();
  }

  setRetryQueueSize(size: number): void {
    this.retryQueueSize.set(size);
  }

  setDlqSize(size: number): void {
    this.dlqSize.set(size);
  }

  setConsumerLag(consumer: string, lag: number): void {
    this.consumerLag.set({ consumer }, lag);
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  private getStatusCodeBucket(statusCode: number): string {
    if (statusCode === 0) return 'network_error';
    if (statusCode >= 200 && statusCode < 300) return '2xx';
    if (statusCode >= 400 && statusCode < 500) return '4xx';
    if (statusCode >= 500) return '5xx';
    return 'other';
  }

  // ---------------------------------------------------------------------------
  // HTTP Server
  // ---------------------------------------------------------------------------

  async startServer(): Promise<void> {
    if (this.server) {
      this.logger.warn('Metrics server already running');
      return;
    }

    this.server = createServer(async (req, res) => {
      if (req.url === '/metrics') {
        try {
          const metrics = await this.registry.metrics();
          res.setHeader('Content-Type', this.registry.contentType);
          res.end(metrics);
        } catch (error) {
          res.statusCode = 500;
          res.end('Error collecting metrics');
          this.logger.error({ error }, 'Error collecting metrics');
        }
      } else if (req.url === '/health') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'healthy' }));
      } else {
        res.statusCode = 404;
        res.end('Not found');
      }
    });

    return new Promise((resolve, reject) => {
      this.server!.on('error', reject);
      this.server!.listen(this.config.port, () => {
        this.logger.info({ port: this.config.port }, 'Metrics server started');
        resolve();
      });
    });
  }

  async stopServer(): Promise<void> {
    if (!this.server) return;

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.logger.info('Metrics server stopped');
        this.server = null;
        resolve();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  async getMetricsJson(): Promise<object[]> {
    return this.registry.getMetricsAsJSON();
  }
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

export const DEFAULT_METRICS_CONFIG: MetricsConfig = {
  port: 9091,
  prefix: 'xrnotify_worker_',
  collectDefaultMetrics: true,
  defaultMetricsInterval: 10000,
};

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

export function createWorkerMetrics(
  config: Partial<MetricsConfig> = {},
  logger: Logger
): WorkerMetrics {
  const fullConfig: MetricsConfig = {
    ...DEFAULT_METRICS_CONFIG,
    ...config,
  };

  return new WorkerMetrics(fullConfig, logger);
}

// -----------------------------------------------------------------------------
// Timer Utility
// -----------------------------------------------------------------------------

export class Timer {
  private readonly startTime: number;
  private endTime: number | null = null;

  constructor() {
    this.startTime = performance.now();
  }

  stop(): number {
    this.endTime = performance.now();
    return this.durationMs();
  }

  durationMs(): number {
    const end = this.endTime ?? performance.now();
    return end - this.startTime;
  }

  durationSeconds(): number {
    return this.durationMs() / 1000;
  }
}

export function startTimer(): Timer {
  return new Timer();
}
