/**
 * XRNotify Worker Service
 * Consumes events from Redis Stream and delivers webhooks
 */

import crypto from 'crypto';
import axios, { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  config,
  createChildLogger,
  db,
  redis,
  ensureConsumerGroup,
  readFromStream,
  ackMessage,
  closeRedis,
  closeDb,
} from '../core/index.js';
import {
  webhookDeliveryTotal,
  webhookDeliveryLatency,
  activeWebhooks,
} from '../core/metrics.js';
import type { XRNotifyEvent } from '../listener/eventParser.js';

const log = createChildLogger('worker');

// ============================================
// Types
// ============================================

interface Webhook {
  id: number;
  owner_id: string;
  url: string;
  secret: string;
  event_filter: string[];
  active: boolean;
}

interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  latencyMs: number;
  error?: string;
}

// ============================================
// Worker State
// ============================================

interface WorkerState {
  consumerId: string;
  isRunning: boolean;
  webhookCache: Map<string, Webhook[]>;
  cacheLastUpdated: number;
  shouldShutdown: boolean;
}

const state: WorkerState = {
  consumerId: `worker-${uuidv4().slice(0, 8)}`,
  isRunning: false,
  webhookCache: new Map(),
  cacheLastUpdated: 0,
  shouldShutdown: false,
};

// ============================================
// Signature Generation
// ============================================

function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac(config.webhookSignatureAlgorithm, secret)
    .update(payload)
    .digest('hex');
}

// ============================================
// Webhook Matching
// ============================================

async function getMatchingWebhooks(eventType: string): Promise<Webhook[]> {
  const cacheKey = eventType;
  const cacheAge = Date.now() - state.cacheLastUpdated;
  
  // Refresh cache every 30 seconds
  if (cacheAge > 30000 || !state.webhookCache.has(cacheKey)) {
    try {
      const result = await db.query<Webhook>(
        `SELECT id, owner_id, url, secret, event_filter, active
         FROM webhooks
         WHERE active = true
         AND $1 = ANY(event_filter)`,
        [eventType]
      );
      
      state.webhookCache.set(cacheKey, result.rows);
      state.cacheLastUpdated = Date.now();
      
      // Update active webhooks metric
      const totalActive = await db.query('SELECT COUNT(*) FROM webhooks WHERE active = true');
      activeWebhooks.set(parseInt(totalActive.rows[0].count, 10));
      
    } catch (error) {
      log.error('Failed to fetch webhooks', { error: (error as Error).message });
      return state.webhookCache.get(cacheKey) || [];
    }
  }
  
  return state.webhookCache.get(cacheKey) || [];
}

// ============================================
// Webhook Delivery
// ============================================

async function deliverWebhook(
  webhook: Webhook,
  event: XRNotifyEvent,
  attempt: number = 1
): Promise<DeliveryResult> {
  const startTime = Date.now();
  const payload = JSON.stringify(event);
  const signature = generateSignature(payload, webhook.secret);
  
  const headers = {
    'Content-Type': 'application/json',
    'X-XRNotify-Signature': signature,
    'X-XRNotify-Event': event.event_type,
    'X-XRNotify-Timestamp': new Date().toISOString(),
    'X-XRNotify-Delivery-ID': uuidv4(),
    'X-XRNotify-Attempt': String(attempt),
    'User-Agent': 'XRNotify/1.0',
  };
  
  try {
    const response = await axios.post(webhook.url, payload, {
      headers,
      timeout: config.webhookTimeoutMs,
      validateStatus: (status) => status >= 200 && status < 300,
    });
    
    const latencyMs = Date.now() - startTime;
    
    webhookDeliveryTotal.inc({ status: 'success' });
    webhookDeliveryLatency.observe(latencyMs);
    
    log.info('Webhook delivered', {
      webhook_id: webhook.id,
      url: webhook.url,
      status: response.status,
      latency: latencyMs,
      event_type: event.event_type,
      tx_hash: event.tx_hash,
    });
    
    return {
      success: true,
      statusCode: response.status,
      latencyMs,
    };
    
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const axiosError = error as AxiosError;
    
    const result: DeliveryResult = {
      success: false,
      latencyMs,
      statusCode: axiosError.response?.status,
      error: axiosError.message,
    };
    
    log.warn('Webhook delivery failed', {
      webhook_id: webhook.id,
      url: webhook.url,
      attempt,
      error: axiosError.message,
      status: axiosError.response?.status,
    });
    
    return result;
  }
}

async function deliverWithRetry(
  webhook: Webhook,
  event: XRNotifyEvent
): Promise<void> {
  const maxRetries = config.webhookMaxRetries;
  const retryDelays = config.retryDelaysMs;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const result = await deliverWebhook(webhook, event, attempt);
    
    if (result.success) {
      // Record successful delivery
      await recordDelivery(webhook.id, event.tx_hash, 'success', attempt, result.latencyMs);
      return;
    }
    
    // Check if we should retry
    if (attempt > maxRetries) {
      webhookDeliveryTotal.inc({ status: 'failed' });
      await recordDelivery(webhook.id, event.tx_hash, 'failed', attempt, result.latencyMs);
      
      log.error('Webhook delivery failed after all retries', {
        webhook_id: webhook.id,
        url: webhook.url,
        attempts: attempt,
        event_type: event.event_type,
      });
      return;
    }
    
    // Wait before retry
    webhookDeliveryTotal.inc({ status: 'retry' });
    const delay = retryDelays[attempt - 1] || retryDelays[retryDelays.length - 1];
    
    log.debug('Scheduling webhook retry', {
      webhook_id: webhook.id,
      attempt: attempt + 1,
      delay,
    });
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

async function recordDelivery(
  webhookId: number,
  eventHash: string,
  status: string,
  attempts: number,
  latencyMs: number
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO deliveries (webhook_id, event_hash, status, attempts, latency_ms, last_attempt)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (webhook_id, event_hash)
       DO UPDATE SET status = $3, attempts = $4, latency_ms = $5, last_attempt = NOW()`,
      [webhookId, eventHash, status, attempts, latencyMs]
    );
  } catch (error) {
    log.warn('Failed to record delivery', { error: (error as Error).message });
  }
}

// ============================================
// Event Processing
// ============================================

async function processEvent(event: XRNotifyEvent): Promise<void> {
  const webhooks = await getMatchingWebhooks(event.event_type);
  
  if (webhooks.length === 0) {
    log.debug('No webhooks matched event', { event_type: event.event_type });
    return;
  }
  
  log.debug('Processing event', {
    event_type: event.event_type,
    tx_hash: event.tx_hash,
    webhook_count: webhooks.length,
  });
  
  // Deliver to all matching webhooks concurrently
  const deliveryPromises = webhooks.map(webhook => 
    deliverWithRetry(webhook, event).catch(error => {
      log.error('Delivery error', {
        webhook_id: webhook.id,
        error: (error as Error).message,
      });
    })
  );
  
  await Promise.all(deliveryPromises);
}

// ============================================
// Main Consumer Loop
// ============================================

async function consumeEvents(): Promise<void> {
  log.info('Starting event consumer', {
    consumerId: state.consumerId,
    streamName: config.streamName,
    groupName: config.consumerGroup,
  });
  
  // Ensure consumer group exists
  await ensureConsumerGroup(config.streamName, config.consumerGroup);
  
  state.isRunning = true;
  
  while (!state.shouldShutdown) {
    try {
      const entries = await readFromStream(
        config.streamName,
        config.consumerGroup,
        state.consumerId,
        config.workerConcurrency,
        5000 // Block for 5 seconds
      );
      
      if (!entries || entries.length === 0) {
        continue;
      }
      
      // Process entries
      for (const [messageId, fields] of entries) {
        try {
          // Parse the event from fields
          const eventJson = fields[1]; // fields is [key, value]
          const event: XRNotifyEvent = JSON.parse(eventJson);
          
          await processEvent(event);
          
          // Acknowledge the message
          await ackMessage(config.streamName, config.consumerGroup, messageId);
          
        } catch (error) {
          log.error('Failed to process message', {
            messageId,
            error: (error as Error).message,
          });
          // Still acknowledge to prevent infinite loop
          await ackMessage(config.streamName, config.consumerGroup, messageId);
        }
      }
      
    } catch (error) {
      log.error('Consumer loop error', { error: (error as Error).message });
      // Brief pause before continuing
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  state.isRunning = false;
  log.info('Event consumer stopped');
}

// ============================================
// Graceful Shutdown
// ============================================

async function shutdown(signal: string): Promise<void> {
  log.info('Shutting down worker', { signal, consumerId: state.consumerId });
  state.shouldShutdown = true;
  
  // Wait for current processing to complete
  let waitTime = 0;
  while (state.isRunning && waitTime < 10000) {
    await new Promise(resolve => setTimeout(resolve, 100));
    waitTime += 100;
  }
  
  await closeDb();
  await closeRedis();
  
  log.info('Worker shutdown complete');
  process.exit(0);
}

// ============================================
// Main Entry Point
// ============================================

export async function startWorker(): Promise<void> {
  log.info('Starting XRNotify Worker', {
    consumerId: state.consumerId,
    concurrency: config.workerConcurrency,
    maxRetries: config.webhookMaxRetries,
  });
  
  // Setup graceful shutdown
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Start consuming
  await consumeEvents();
}

// Auto-start if running as main service
if (process.env.SERVICE_ROLE === 'worker') {
  startWorker().catch((error) => {
    log.error('Fatal error starting worker', { error: error.message });
    process.exit(1);
  });
}
