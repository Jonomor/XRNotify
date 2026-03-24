// =============================================================================
// XRNotify Webhook Worker - Main Entry Point
// =============================================================================
// Consumes events from Redis Streams and delivers webhooks with retries
// =============================================================================

import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import pg from 'pg';
import pino from 'pino';
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { createHmac } from 'node:crypto';
import { signPayload } from '@xrnotify/shared';
import 'dotenv/config';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const config = {
  // Redis
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  
  // PostgreSQL
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://xrnotify:xrnotify@localhost:5432/xrnotify',
  
  // Worker settings
  consumerGroup: process.env.CONSUMER_GROUP ?? 'webhook-workers',
  consumerId: process.env.CONSUMER_ID ?? `worker-${randomUUID().slice(0, 8)}`,
  streamKey: process.env.STREAM_KEY ?? 'xrnotify:events',
  dlqKey: process.env.DLQ_KEY ?? 'xrnotify:dlq',
  batchSize: parseInt(process.env.BATCH_SIZE ?? '10', 10),
  blockTimeMs: parseInt(process.env.BLOCK_TIME_MS ?? '5000', 10),
  
  // Delivery settings
  deliveryTimeoutMs: parseInt(process.env.DELIVERY_TIMEOUT_MS ?? '5000', 10),
  maxRetries: parseInt(process.env.MAX_RETRIES ?? '10', 10),
  
  // Retry backoff settings (exponential with jitter)
  retryBaseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS ?? '1000', 10),
  retryMaxDelayMs: parseInt(process.env.RETRY_MAX_DELAY_MS ?? '3600000', 10), // 1 hour max
  
  // Metrics
  metricsPort: parseInt(process.env.METRICS_PORT ?? '9091', 10),
  
  // Environment
  nodeEnv: process.env.NODE_ENV ?? 'development',
};

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  // Don't use pino-pretty in production - it's a dev dependency
  ...(config.nodeEnv === 'development' && process.env.PINO_PRETTY === 'true'
    ? { transport: { target: 'pino-pretty' } }
    : {}),
});

// -----------------------------------------------------------------------------
// Metrics
// -----------------------------------------------------------------------------

const register = new Registry();
collectDefaultMetrics({ register });

const deliveriesTotal = new Counter({
  name: 'xrnotify_webhook_deliveries_total',
  help: 'Total webhook delivery attempts',
  labelNames: ['status', 'event_type'],
  registers: [register],
});

const deliveryDuration = new Histogram({
  name: 'xrnotify_webhook_delivery_duration_seconds',
  help: 'Webhook delivery duration in seconds',
  labelNames: ['status'],
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [register],
});

const queueDepth = new Gauge({
  name: 'xrnotify_webhook_queue_depth',
  help: 'Current number of pending messages in stream',
  registers: [register],
});

const activeDeliveries = new Gauge({
  name: 'xrnotify_webhook_active_deliveries',
  help: 'Number of deliveries currently in progress',
  registers: [register],
});

const streamPendingGauge = new Gauge({
  name: 'xrnotify_webhook_stream_pending',
  help: 'Number of pending (consumed but unacknowledged) messages in webhook delivery stream',
  registers: [register],
});

const dlqTotal = new Counter({
  name: 'xrnotify_webhook_dlq_total',
  help: 'Total messages sent to dead letter queue',
  labelNames: ['reason'],
  registers: [register],
});

// -----------------------------------------------------------------------------
// Database & Redis Clients
// -----------------------------------------------------------------------------

const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: false } : false,
});

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface StreamMessage {
  id: string;
  event_id: string;
  event_type: string;
  payload: string;
  accounts: string;
  timestamp: string;
}

interface Webhook {
  id: string;
  tenant_id: string;
  url: string;
  secret: string;
  event_types: string[];
  account_filters: string[];
  is_active: boolean;
}

interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  responseTimeMs: number;
  error?: string;
}

// -----------------------------------------------------------------------------
// Retry Logic
// -----------------------------------------------------------------------------

function calculateNextRetryDelay(attemptCount: number): number {
  // Exponential backoff: base * 2^attempt with jitter
  const exponentialDelay = config.retryBaseDelayMs * Math.pow(2, attemptCount);
  const cappedDelay = Math.min(exponentialDelay, config.retryMaxDelayMs);
  
  // Add jitter (±25%)
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(cappedDelay + jitter);
}

function shouldRetry(attemptCount: number, statusCode?: number): boolean {
  if (attemptCount >= config.maxRetries) return false;
  
  // Don't retry client errors (4xx) except specific ones
  if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
    // Retry rate limits and specific server-side issues
    return statusCode === 429 || statusCode === 408;
  }
  
  return true;
}

// -----------------------------------------------------------------------------
// Webhook Matching
// -----------------------------------------------------------------------------

async function getMatchingWebhooks(
  eventType: string,
  accounts: string[]
): Promise<Webhook[]> {
  const result = await pool.query<Webhook>(
    `SELECT id, tenant_id, url, secret_encrypted as secret, event_types, account_filters, is_active
     FROM webhooks
     WHERE is_active = true
       AND (cardinality(event_types) = 0 OR $1::event_type = ANY(event_types))
       AND (cardinality(account_filters) = 0 OR account_filters && $2::varchar[])`,
    [eventType, accounts]
  );
  
  return result.rows;
}

// -----------------------------------------------------------------------------
// Delivery Execution
// -----------------------------------------------------------------------------

async function deliverWebhook(
  webhook: Webhook,
  eventId: string,
  eventType: string,
  payload: Record<string, unknown>,
  timestamp: string
): Promise<DeliveryResult> {
  const startTime = Date.now();
  
  // Build the delivery payload
  const deliveryPayload = {
    event_id: eventId,
    event_type: eventType,
    timestamp,
    payload,
  };
  
  const body = JSON.stringify(deliveryPayload);
  
  // Sign the payload
  const signature = signPayload(body, webhook.secret);
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.deliveryTimeoutMs);
  
  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'XRNotify-Webhook/1.0',
        'X-XRNotify-Signature': signature,
        'X-XRNotify-Event-Id': eventId,
        'X-XRNotify-Event-Type': eventType,
        'X-XRNotify-Timestamp': timestamp,
      },
      body,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const responseTimeMs = Date.now() - startTime;
    let responseBody: string | undefined;
    
    try {
      responseBody = await response.text();
      // Truncate response body
      if (responseBody.length > 10000) {
        responseBody = responseBody.slice(0, 10000) + '...[truncated]';
      }
    } catch {
      responseBody = undefined;
    }
    
    return {
      success: response.ok,
      statusCode: response.status,
      responseBody,
      responseTimeMs,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    
    const responseTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      responseTimeMs,
      error: errorMessage.includes('abort') ? 'Request timeout' : errorMessage,
    };
  }
}

// -----------------------------------------------------------------------------
// Delivery Recording
// -----------------------------------------------------------------------------

async function createDelivery(
  tenantId: string,
  webhookId: string,
  webhookUrl: string,
  eventId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<string> {
  const deliveryId = `del_${randomUUID().replace(/-/g, '')}`;

  await pool.query(
    `INSERT INTO deliveries (
      id, tenant_id, webhook_id, event_id, event_type, payload, url,
      status, attempt_count, max_attempts, created_at
    ) VALUES ($1, $2, $3, $4, $5::event_type, $6::jsonb, $7, 'pending', 0, $8, NOW())
    ON CONFLICT (idempotency_key) DO NOTHING`,
    [deliveryId, tenantId, webhookId, eventId, eventType, JSON.stringify(payload), webhookUrl, config.maxRetries]
  );
  
  return deliveryId;
}

async function recordDeliveryAttempt(
  deliveryId: string,
  result: DeliveryResult,
  attemptNumber: number
): Promise<void> {
  // Record the attempt (id is bigserial, auto-generated)
  await pool.query(
    `INSERT INTO delivery_attempts (
      delivery_id, attempt_number, status_code, response_body,
      duration_ms, error_message, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [
      deliveryId,
      attemptNumber,
      result.statusCode ?? null,
      result.responseBody?.slice(0, 10000) ?? null,
      result.responseTimeMs,
      result.error ?? null,
    ]
  );
}

async function updateDeliveryStatus(
  deliveryId: string,
  status: 'delivered' | 'failed' | 'retrying' | 'dead_letter',
  result: DeliveryResult,
  nextRetryAt?: Date
): Promise<void> {
  await pool.query(
    `UPDATE deliveries SET
      status = $2::delivery_status,
      attempt_count = attempt_count + 1,
      response_status = $3,
      response_time_ms = $4,
      error_message = $5,
      delivered_at = CASE WHEN $2::delivery_status = 'delivered' THEN NOW() ELSE delivered_at END,
      next_retry_at = $6,
      updated_at = NOW()
    WHERE id = $1`,
    [
      deliveryId,
      status,
      result.statusCode ?? null,
      result.responseTimeMs,
      result.error ?? null,
      nextRetryAt ?? null,
    ]
  );
}

async function updateWebhookHealth(
  webhookId: string,
  success: boolean
): Promise<void> {
  if (success) {
    await pool.query(
      `UPDATE webhooks SET
        consecutive_failures = 0,
        last_success_at = NOW(),
        updated_at = NOW()
      WHERE id = $1`,
      [webhookId]
    );
  } else {
    await pool.query(
      `UPDATE webhooks SET
        consecutive_failures = consecutive_failures + 1,
        last_failure_at = NOW(),
        updated_at = NOW()
      WHERE id = $1`,
      [webhookId]
    );
  }
}

// -----------------------------------------------------------------------------
// Message Processing
// -----------------------------------------------------------------------------

async function processMessage(message: StreamMessage): Promise<void> {
  const { id: streamId, event_id, event_type, payload: payloadStr, accounts: accountsStr, timestamp } = message;
  
  const correlationId = randomUUID();
  const log = logger.child({ correlationId, eventId: event_id, eventType: event_type });
  
  log.info('Processing event');
  
  let payload: Record<string, unknown>;
  let accounts: string[];
  
  try {
    payload = JSON.parse(payloadStr);
    accounts = JSON.parse(accountsStr);
  } catch (error) {
    log.error({ error }, 'Failed to parse message payload');
    dlqTotal.inc({ reason: 'parse_error' });
    return;
  }
  
  // Persist event to PostgreSQL (idempotent upsert)
  try {
    // Parse tx_hash and ledger_index from event_id format: xrpl:<ledger>:<hash>:<type>[:<sub>]
    const eventIdParts = event_id.split(':');
    const ledgerIndex = parseInt(eventIdParts[1] ?? '0', 10) || 0;
    const txHash = eventIdParts[2] ?? '';
    await pool.query(`
      INSERT INTO events (id, event_type, ledger_index, tx_hash, timestamp, accounts, payload)
      VALUES ($1, $2::event_type, $3, $4, $5, $6::varchar[], $7)
      ON CONFLICT (id) DO NOTHING
    `, [event_id, event_type, ledgerIndex, txHash, timestamp || new Date().toISOString(), accounts, JSON.stringify(payload)]);
  } catch (err) {
    log.warn({ error: err }, 'Failed to persist event (non-fatal)');
  }

  // Find matching webhooks
  const webhooks = await getMatchingWebhooks(event_type, accounts);
  
  if (webhooks.length === 0) {
    log.debug('No matching webhooks');
    return;
  }
  
  log.info({ webhookCount: webhooks.length }, 'Found matching webhooks');
  
  // Deliver to each webhook
  for (const webhook of webhooks) {
    const webhookLog = log.child({ webhookId: webhook.id });
    
    activeDeliveries.inc();
    const endTimer = deliveryDuration.startTimer();
    
    try {
      // Create delivery record
      const deliveryId = await createDelivery(webhook.tenant_id, webhook.id, webhook.url, event_id, event_type, payload);
      
      // Get current attempt count
      const deliveryRow = await pool.query<{ attempt_count: number }>(
        'SELECT attempt_count FROM deliveries WHERE id = $1',
        [deliveryId]
      );
      const attemptCount = deliveryRow.rows[0]?.attempt_count ?? 0;
      
      // Execute delivery
      const result = await deliverWebhook(webhook, event_id, event_type, payload, timestamp);

      // Warn on slow deliveries
      if (result.responseTimeMs > 2000) {
        webhookLog.warn({
          url: webhook.url,
          duration_ms: result.responseTimeMs,
          status: result.statusCode,
        }, 'Slow webhook delivery');
      }

      // Record attempt
      await recordDeliveryAttempt(deliveryId, result, attemptCount + 1);

      if (result.success) {
        webhookLog.info({ statusCode: result.statusCode, responseTimeMs: result.responseTimeMs }, 'Delivery successful');
        
        await updateDeliveryStatus(deliveryId, 'delivered', result);
        await updateWebhookHealth(webhook.id, true);

        // Increment usage counters (event processed, delivery succeeded)
        try {
          await pool.query(`SELECT increment_usage($1, 0, 1, 1, 0, 0)`, [webhook.tenant_id]);
        } catch { /* non-fatal */ }

        deliveriesTotal.inc({ status: 'success', event_type });
        endTimer({ status: 'success' });
      } else {
        webhookLog.warn({ 
          statusCode: result.statusCode, 
          error: result.error,
          attemptCount: attemptCount + 1,
        }, 'Delivery failed');
        
        await updateWebhookHealth(webhook.id, false);
        
        if (shouldRetry(attemptCount + 1, result.statusCode)) {
          const delayMs = calculateNextRetryDelay(attemptCount + 1);
          const nextRetryAt = new Date(Date.now() + delayMs);
          
          webhookLog.info({ nextRetryAt, delayMs }, 'Scheduling retry');
          
          await updateDeliveryStatus(deliveryId, 'retrying', result, nextRetryAt);
          
          // Schedule retry by adding to delayed queue
          await redis.zadd(
            'xrnotify:retry_queue',
            nextRetryAt.getTime(),
            JSON.stringify({ deliveryId, webhookId: webhook.id, eventId: event_id, eventType: event_type, payload, timestamp })
          );
          
          deliveriesTotal.inc({ status: 'retry', event_type });
        } else {
          webhookLog.error('Max retries exceeded, moving to DLQ');

          await updateDeliveryStatus(deliveryId, 'dead_letter', result);

          // Increment usage counters (delivery failed)
          try {
            await pool.query(`SELECT increment_usage($1, 0, 1, 0, 1, 0)`, [webhook.tenant_id]);
          } catch { /* non-fatal */ }
          
          // Add to dead letter queue
          await redis.xadd(
            config.dlqKey,
            '*',
            'delivery_id', deliveryId,
            'webhook_id', webhook.id,
            'event_id', event_id,
            'event_type', event_type,
            'error', result.error ?? `HTTP ${result.statusCode}`,
            'timestamp', new Date().toISOString()
          );
          
          deliveriesTotal.inc({ status: 'dlq', event_type });
          dlqTotal.inc({ reason: 'max_retries' });
        }
        
        endTimer({ status: 'failure' });
      }
    } catch (error) {
      webhookLog.error({ error }, 'Unexpected error during delivery');
      deliveriesTotal.inc({ status: 'error', event_type });
      endTimer({ status: 'error' });
    } finally {
      activeDeliveries.dec();
    }
  }
}

// -----------------------------------------------------------------------------
// Retry Queue Processor
// -----------------------------------------------------------------------------

async function processRetryQueue(): Promise<void> {
  const now = Date.now();
  
  // Get due retries
  const dueRetries = await redis.zrangebyscore('xrnotify:retry_queue', 0, now, 'LIMIT', 0, 10);
  
  for (const retryJson of dueRetries) {
    try {
      const retry = JSON.parse(retryJson) as {
        deliveryId: string;
        webhookId: string;
        eventId: string;
        eventType: string;
        payload: Record<string, unknown>;
        timestamp: string;
      };
      
      // Remove from retry queue
      await redis.zrem('xrnotify:retry_queue', retryJson);
      
      // Get webhook
      const webhookResult = await pool.query<Webhook>(
        `SELECT id, tenant_id, url, secret_encrypted as secret, event_types, account_filters, is_active
         FROM webhooks WHERE id = $1`,
        [retry.webhookId]
      );
      
      const webhook = webhookResult.rows[0];
      if (!webhook || !webhook.is_active) {
        logger.info({ webhookId: retry.webhookId }, 'Webhook no longer active, skipping retry');
        continue;
      }
      
      // Get current attempt count
      const deliveryRow = await pool.query<{ attempt_count: number }>(
        'SELECT attempt_count FROM deliveries WHERE id = $1',
        [retry.deliveryId]
      );
      const attemptCount = deliveryRow.rows[0]?.attempt_count ?? 0;
      
      // Execute delivery
      const result = await deliverWebhook(webhook, retry.eventId, retry.eventType, retry.payload, retry.timestamp);

      // Warn on slow deliveries
      if (result.responseTimeMs > 2000) {
        logger.warn({
          deliveryId: retry.deliveryId,
          url: webhook.url,
          duration_ms: result.responseTimeMs,
          status: result.statusCode,
        }, 'Slow webhook delivery (retry)');
      }

      // Record attempt
      await recordDeliveryAttempt(retry.deliveryId, result, attemptCount + 1);
      
      if (result.success) {
        logger.info({ deliveryId: retry.deliveryId }, 'Retry successful');
        await updateDeliveryStatus(retry.deliveryId, 'delivered', result);
        await updateWebhookHealth(webhook.id, true);
        deliveriesTotal.inc({ status: 'success', event_type: retry.eventType });
      } else {
        await updateWebhookHealth(webhook.id, false);
        
        if (shouldRetry(attemptCount + 1, result.statusCode)) {
          const delayMs = calculateNextRetryDelay(attemptCount + 1);
          const nextRetryAt = new Date(Date.now() + delayMs);
          
          await updateDeliveryStatus(retry.deliveryId, 'retrying', result, nextRetryAt);
          await redis.zadd('xrnotify:retry_queue', nextRetryAt.getTime(), retryJson);
          
          deliveriesTotal.inc({ status: 'retry', event_type: retry.eventType });
        } else {
          logger.error({ deliveryId: retry.deliveryId }, 'Retry max exceeded, moving to DLQ');
          await updateDeliveryStatus(retry.deliveryId, 'dead_letter', result);
          
          await redis.xadd(
            config.dlqKey,
            '*',
            'delivery_id', retry.deliveryId,
            'webhook_id', webhook.id,
            'event_id', retry.eventId,
            'event_type', retry.eventType,
            'error', result.error ?? `HTTP ${result.statusCode}`,
            'timestamp', new Date().toISOString()
          );
          
          deliveriesTotal.inc({ status: 'dlq', event_type: retry.eventType });
          dlqTotal.inc({ reason: 'max_retries' });
        }
      }
    } catch (error) {
      logger.error({ error }, 'Error processing retry');
    }
  }
}

// -----------------------------------------------------------------------------
// Consumer Lag Metrics
// -----------------------------------------------------------------------------

async function updatePendingMetrics(): Promise<void> {
  try {
    // xpending returns [count, minId, maxId, [[consumer, count], ...]]
    const pendingInfo = await redis.xpending(config.streamKey, config.consumerGroup) as [number, string | null, string | null, Array<[string, string]> | null];
    const pendingCount = typeof pendingInfo[0] === 'number' ? pendingInfo[0] : 0;
    streamPendingGauge.set(pendingCount);
  } catch (err) {
    logger.error({ err }, 'Failed to get XPENDING metrics');
  }
}

// -----------------------------------------------------------------------------
// Consumer Group Setup
// -----------------------------------------------------------------------------

async function ensureConsumerGroup(): Promise<void> {
  try {
    await redis.xgroup('CREATE', config.streamKey, config.consumerGroup, '0', 'MKSTREAM');
    logger.info({ group: config.consumerGroup, stream: config.streamKey }, 'Consumer group created');
  } catch (error) {
    // BUSYGROUP means group already exists, which is fine
    if (!(error instanceof Error) || !error.message.includes('BUSYGROUP')) {
      throw error;
    }
    logger.debug({ group: config.consumerGroup }, 'Consumer group already exists');
  }
}

// -----------------------------------------------------------------------------
// Main Consumer Loop
// -----------------------------------------------------------------------------

async function consumeMessages(): Promise<void> {
  while (true) {
    try {
      // Read from stream
      const results = await redis.xreadgroup(
        'GROUP', config.consumerGroup, config.consumerId,
        'COUNT', config.batchSize,
        'BLOCK', config.blockTimeMs,
        'STREAMS', config.streamKey, '>'
      ) as [string, [string, string[]][]][] | null;
      
      if (!results || results.length === 0) {
        // Process retry queue during idle time
        await processRetryQueue();
        continue;
      }
      
      for (const [, messages] of results) {
        for (const [messageId, fields] of messages) {
          // Parse fields array into object
          const message: Record<string, string> = {};
          for (let i = 0; i < fields.length; i += 2) {
            const key = fields[i];
            const value = fields[i + 1];
            if (key !== undefined && value !== undefined) {
              message[key] = value;
            }
          }
          
          try {
            await processMessage({
              id: messageId,
              event_id: message.event_id ?? '',
              event_type: message.event_type ?? '',
              payload: message.payload ?? '{}',
              accounts: message.accounts ?? '[]',
              timestamp: message.timestamp ?? new Date().toISOString(),
            });
            
            // Acknowledge message
            await redis.xack(config.streamKey, config.consumerGroup, messageId);
          } catch (error) {
            logger.error({ messageId, error }, 'Error processing message');
          }
        }
      }
      
      // Update queue depth metric
      const streamInfo = await redis.xlen(config.streamKey);
      queueDepth.set(streamInfo);
      
    } catch (error) {
      logger.error({ error }, 'Error in consumer loop');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// -----------------------------------------------------------------------------
// Metrics Server
// -----------------------------------------------------------------------------

async function startMetricsServer(): Promise<void> {
  const { createServer } = await import('node:http');
  
  const server = createServer(async (req, res) => {
    if (req.url === '/metrics') {
      res.setHeader('Content-Type', register.contentType);
      res.end(await register.metrics());
    } else if (req.url === '/health') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'healthy' }));
    } else {
      res.statusCode = 404;
      res.end('Not found');
    }
  });
  
  server.listen(config.metricsPort, () => {
    logger.info({ port: config.metricsPort }, 'Metrics server started');
  });
}

// -----------------------------------------------------------------------------
// Graceful Shutdown
// -----------------------------------------------------------------------------

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info({ signal }, 'Shutting down gracefully');
  
  // Wait for active deliveries to complete (max 30 seconds)
  const deadline = Date.now() + 30000;
  while (activeDeliveries.hashMap.size > 0 && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  await redis.quit();
  await pool.end();
  
  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// -----------------------------------------------------------------------------
// Main Entry Point
// -----------------------------------------------------------------------------

async function main(): Promise<void> {
  logger.info({
    consumerId: config.consumerId,
    consumerGroup: config.consumerGroup,
    streamKey: config.streamKey,
  }, 'Starting webhook worker');
  
  // Test database connection
  try {
    await pool.query('SELECT 1');
    logger.info('Database connection established');
  } catch (error) {
    logger.fatal({ error }, 'Failed to connect to database');
    process.exit(1);
  }
  
  // Test Redis connection
  try {
    await redis.ping();
    logger.info('Redis connection established');
  } catch (error) {
    logger.fatal({ error }, 'Failed to connect to Redis');
    process.exit(1);
  }
  
  // Setup consumer group
  await ensureConsumerGroup();

  // Start consumer lag polling
  await updatePendingMetrics();
  setInterval(updatePendingMetrics, 15000);

  // Start metrics server
  await startMetricsServer();
  
  // Start consuming
  logger.info('Worker ready, starting consumer loop');
  await consumeMessages();
}

main().catch((error) => {
  logger.fatal({ error }, 'Fatal error in worker');
  process.exit(1);
});
