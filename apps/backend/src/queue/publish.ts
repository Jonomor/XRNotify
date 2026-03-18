/**
 * @fileoverview XRNotify Redis Streams Publisher
 * XADD operations with maxlen policy for publishing to streams.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/queue/publish
 */

import { createModuleLogger } from '../core/logger.js';
import { getRedis } from '../core/redis.js';
import {
  Streams,
  StreamConfigs,
  type StreamName,
} from './streams.js';
import { uuid, nowISO } from '@xrnotify/shared';
import type { XrplEvent, EventType } from '@xrnotify/shared';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('queue-publish');

/**
 * Published message result
 */
export interface PublishResult {
  success: boolean;
  entryId: string | null;
  error?: string;
}

/**
 * Delivery job payload
 */
export interface DeliveryJobPayload {
  deliveryId: string;
  webhookId: string;
  eventId: string;
  tenantId: string;
  eventType: EventType;
  url: string;
  attempt: number;
  maxAttempts: number;
  timeoutMs: number;
  scheduledAt: string;
}

/**
 * Retry job payload
 */
export interface RetryJobPayload {
  deliveryId: string;
  webhookId: string;
  eventId: string;
  attempt: number;
  maxAttempts: number;
  retryAt: string;
  reason: string;
}

/**
 * DLQ entry payload
 */
export interface DlqEntryPayload {
  deliveryId: string;
  webhookId: string;
  eventId: string;
  tenantId: string;
  eventType: EventType;
  finalError: string;
  finalErrorCode: string | null;
  totalAttempts: number;
  createdAt: string;
  expiresAt: string;
}

/**
 * Replay job payload
 */
export interface ReplayJobPayload {
  replayId: string;
  originalEventId: string;
  webhookId: string;
  tenantId: string;
  eventType: EventType;
  requestedBy: string;
  requestedAt: string;
}

/**
 * Batch publish options
 */
export interface BatchPublishOptions {
  /**
   * Use pipeline for atomic batch
   */
  usePipeline?: boolean;

  /**
   * Continue on individual errors
   */
  continueOnError?: boolean;
}

// =============================================================================
// Core Publishing
// =============================================================================

/**
 * Publish message to stream with XADD
 */
export async function publishToStream(
  streamName: StreamName,
  fields: Record<string, string>,
  options: {
    maxLen?: number;
    approximate?: boolean;
    entryId?: string;
  } = {}
): Promise<PublishResult> {
  const redis = getRedis();
  const config = StreamConfigs[streamName];

  const maxLen = options.maxLen ?? config.maxLen;
  const approximate = options.approximate ?? config.approximate;
  const entryId = options.entryId ?? '*';

  try {
    // Build XADD arguments
    const args: (string | number)[] = [streamName];

    // Add MAXLEN option
    if (maxLen > 0) {
      args.push('MAXLEN');
      if (approximate) {
        args.push('~');
      }
      args.push(maxLen);
    }

    // Add entry ID
    args.push(entryId);

    // Add fields
    for (const [key, value] of Object.entries(fields)) {
      args.push(key, value);
    }

    // Execute XADD
    const resultId = await redis.xadd(...(args as [string, ...Array<string | number>])) as string;

    logger.debug(
      { stream: streamName, entryId: resultId, fieldCount: Object.keys(fields).length },
      'Message published'
    );

    return {
      success: true,
      entryId: resultId,
    };
  } catch (error) {
    const err = error as Error;
    logger.error(
      { err, stream: streamName },
      'Failed to publish message'
    );

    return {
      success: false,
      entryId: null,
      error: err.message,
    };
  }
}

/**
 * Publish multiple messages to stream using pipeline
 */
export async function publishBatchToStream(
  streamName: StreamName,
  messages: Array<Record<string, string>>,
  options: BatchPublishOptions = {}
): Promise<PublishResult[]> {
  const redis = getRedis();
  const config = StreamConfigs[streamName];
  const usePipeline = options.usePipeline ?? true;

  if (messages.length === 0) {
    return [];
  }

  const results: PublishResult[] = [];

  if (usePipeline) {
    const pipeline = redis.pipeline();

    for (const fields of messages) {
      const args: (string | number)[] = [
        streamName,
        'MAXLEN',
        config.approximate ? '~' : '=',
        config.maxLen,
        '*',
      ];

      for (const [key, value] of Object.entries(fields)) {
        args.push(key, value);
      }

      pipeline.xadd(...(args as [string, ...Array<string | number>]));
    }

    try {
      const pipelineResults = await pipeline.exec();

      if (pipelineResults) {
        for (const [error, entryId] of pipelineResults) {
          if (error) {
            results.push({
              success: false,
              entryId: null,
              error: (error as Error).message,
            });
          } else {
            results.push({
              success: true,
              entryId: entryId as string,
            });
          }
        }
      }

      logger.debug(
        { stream: streamName, count: messages.length, successful: results.filter(r => r.success).length },
        'Batch published'
      );
    } catch (error) {
      const err = error as Error;
      logger.error({ err, stream: streamName }, 'Batch publish failed');

      // All failed
      for (let i = 0; i < messages.length; i++) {
        results.push({
          success: false,
          entryId: null,
          error: err.message,
        });
      }
    }
  } else {
    // Sequential publishing
    for (const fields of messages) {
      const result = await publishToStream(streamName, fields);
      results.push(result);

      if (!result.success && !options.continueOnError) {
        break;
      }
    }
  }

  return results;
}

// =============================================================================
// Event Publishing
// =============================================================================

/**
 * Serialize event for stream
 */
function serializeEvent(event: XrplEvent): Record<string, string> {
  return {
    id: event.id,
    event_type: event.event_type,
    ledger_index: event.ledger_index.toString(),
    tx_hash: event.tx_hash,
    network: event.network,
    timestamp: event.timestamp,
    account_context: JSON.stringify(event.account_context),
    payload: JSON.stringify(event.payload),
    result_code: event.result_code ?? '',
    published_at: nowISO(),
  };
}

/**
 * Publish XRPL event to events stream
 */
export async function publishEvent(event: XrplEvent): Promise<PublishResult> {
  const fields = serializeEvent(event);

  // Publish to main events stream
  const result = await publishToStream(Streams.EVENTS, fields);

  // Also publish to network-specific stream
  const networkStream = getNetworkStream(event.network);
  if (networkStream) {
    await publishToStream(networkStream, fields);
  }

  return result;
}

/**
 * Publish multiple events
 */
export async function publishEvents(events: XrplEvent[]): Promise<PublishResult[]> {
  const messages = events.map(serializeEvent);
  return publishBatchToStream(Streams.EVENTS, messages);
}

/**
 * Get network-specific stream
 */
function getNetworkStream(network: string): StreamName | null {
  switch (network) {
    case 'mainnet':
      return Streams.EVENTS_MAINNET;
    case 'testnet':
      return Streams.EVENTS_TESTNET;
    case 'devnet':
      return Streams.EVENTS_DEVNET;
    default:
      return null;
  }
}

// =============================================================================
// Delivery Job Publishing
// =============================================================================

/**
 * Serialize delivery job for stream
 */
function serializeDeliveryJob(job: DeliveryJobPayload): Record<string, string> {
  return {
    delivery_id: job.deliveryId,
    webhook_id: job.webhookId,
    event_id: job.eventId,
    tenant_id: job.tenantId,
    event_type: job.eventType,
    url: job.url,
    attempt: job.attempt.toString(),
    max_attempts: job.maxAttempts.toString(),
    timeout_ms: job.timeoutMs.toString(),
    scheduled_at: job.scheduledAt,
    published_at: nowISO(),
  };
}

/**
 * Publish delivery job to deliveries stream
 */
export async function publishDeliveryJob(job: DeliveryJobPayload): Promise<PublishResult> {
  const fields = serializeDeliveryJob(job);
  return publishToStream(Streams.DELIVERIES, fields);
}

/**
 * Publish multiple delivery jobs
 */
export async function publishDeliveryJobs(jobs: DeliveryJobPayload[]): Promise<PublishResult[]> {
  const messages = jobs.map(serializeDeliveryJob);
  return publishBatchToStream(Streams.DELIVERIES, messages);
}

/**
 * Create and publish delivery job
 */
export async function createDeliveryJob(params: {
  deliveryId: string;
  webhookId: string;
  eventId: string;
  tenantId: string;
  eventType: EventType;
  url: string;
  attempt?: number;
  maxAttempts?: number;
  timeoutMs?: number;
}): Promise<PublishResult> {
  const job: DeliveryJobPayload = {
    deliveryId: params.deliveryId,
    webhookId: params.webhookId,
    eventId: params.eventId,
    tenantId: params.tenantId,
    eventType: params.eventType,
    url: params.url,
    attempt: params.attempt ?? 1,
    maxAttempts: params.maxAttempts ?? 5,
    timeoutMs: params.timeoutMs ?? 10000,
    scheduledAt: nowISO(),
  };

  return publishDeliveryJob(job);
}

// =============================================================================
// Retry Job Publishing
// =============================================================================

/**
 * Serialize retry job for stream
 */
function serializeRetryJob(job: RetryJobPayload): Record<string, string> {
  return {
    delivery_id: job.deliveryId,
    webhook_id: job.webhookId,
    event_id: job.eventId,
    attempt: job.attempt.toString(),
    max_attempts: job.maxAttempts.toString(),
    retry_at: job.retryAt,
    reason: job.reason,
    published_at: nowISO(),
  };
}

/**
 * Publish retry job to retries stream
 */
export async function publishRetryJob(job: RetryJobPayload): Promise<PublishResult> {
  const fields = serializeRetryJob(job);
  return publishToStream(Streams.RETRIES, fields);
}

/**
 * Schedule delivery retry
 */
export async function scheduleRetry(params: {
  deliveryId: string;
  webhookId: string;
  eventId: string;
  attempt: number;
  maxAttempts: number;
  retryDelayMs: number;
  reason: string;
}): Promise<PublishResult> {
  const retryAt = new Date(Date.now() + params.retryDelayMs).toISOString();

  const job: RetryJobPayload = {
    deliveryId: params.deliveryId,
    webhookId: params.webhookId,
    eventId: params.eventId,
    attempt: params.attempt,
    maxAttempts: params.maxAttempts,
    retryAt,
    reason: params.reason,
  };

  logger.debug(
    { deliveryId: params.deliveryId, attempt: params.attempt, retryAt },
    'Retry scheduled'
  );

  return publishRetryJob(job);
}

// =============================================================================
// DLQ Publishing
// =============================================================================

/**
 * Serialize DLQ entry for stream
 */
function serializeDlqEntry(entry: DlqEntryPayload): Record<string, string> {
  return {
    delivery_id: entry.deliveryId,
    webhook_id: entry.webhookId,
    event_id: entry.eventId,
    tenant_id: entry.tenantId,
    event_type: entry.eventType,
    final_error: entry.finalError,
    final_error_code: entry.finalErrorCode ?? '',
    total_attempts: entry.totalAttempts.toString(),
    created_at: entry.createdAt,
    expires_at: entry.expiresAt,
    published_at: nowISO(),
  };
}

/**
 * Publish to DLQ
 */
export async function publishToDlq(entry: DlqEntryPayload): Promise<PublishResult> {
  const fields = serializeDlqEntry(entry);
  return publishToStream(Streams.DLQ, fields);
}

/**
 * Move failed delivery to DLQ
 */
export async function moveToDeadLetter(params: {
  deliveryId: string;
  webhookId: string;
  eventId: string;
  tenantId: string;
  eventType: EventType;
  finalError: string;
  finalErrorCode?: string;
  totalAttempts: number;
  retentionDays?: number;
}): Promise<PublishResult> {
  const retentionDays = params.retentionDays ?? 30;
  const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

  const entry: DlqEntryPayload = {
    deliveryId: params.deliveryId,
    webhookId: params.webhookId,
    eventId: params.eventId,
    tenantId: params.tenantId,
    eventType: params.eventType,
    finalError: params.finalError,
    finalErrorCode: params.finalErrorCode ?? null,
    totalAttempts: params.totalAttempts,
    createdAt: nowISO(),
    expiresAt,
  };

  logger.warn(
    { deliveryId: params.deliveryId, error: params.finalError, attempts: params.totalAttempts },
    'Delivery moved to DLQ'
  );

  return publishToDlq(entry);
}

// =============================================================================
// Replay Publishing
// =============================================================================

/**
 * Serialize replay job for stream
 */
function serializeReplayJob(job: ReplayJobPayload): Record<string, string> {
  return {
    replay_id: job.replayId,
    original_event_id: job.originalEventId,
    webhook_id: job.webhookId,
    tenant_id: job.tenantId,
    event_type: job.eventType,
    requested_by: job.requestedBy,
    requested_at: job.requestedAt,
    published_at: nowISO(),
  };
}

/**
 * Publish replay job
 */
export async function publishReplayJob(job: ReplayJobPayload): Promise<PublishResult> {
  const fields = serializeReplayJob(job);
  return publishToStream(Streams.REPLAY, fields);
}

/**
 * Request event replay
 */
export async function requestReplay(params: {
  eventId: string;
  webhookId: string;
  tenantId: string;
  eventType: EventType;
  requestedBy: string;
}): Promise<PublishResult> {
  const job: ReplayJobPayload = {
    replayId: `replay_${uuid()}`,
    originalEventId: params.eventId,
    webhookId: params.webhookId,
    tenantId: params.tenantId,
    eventType: params.eventType,
    requestedBy: params.requestedBy,
    requestedAt: nowISO(),
  };

  logger.info(
    { replayId: job.replayId, eventId: params.eventId, webhookId: params.webhookId },
    'Replay requested'
  );

  return publishReplayJob(job);
}

/**
 * Request bulk replay
 */
export async function requestBulkReplay(params: {
  eventIds: string[];
  webhookId: string;
  tenantId: string;
  eventType: EventType;
  requestedBy: string;
}): Promise<PublishResult[]> {
  const jobs: ReplayJobPayload[] = params.eventIds.map((eventId) => ({
    replayId: `replay_${uuid()}`,
    originalEventId: eventId,
    webhookId: params.webhookId,
    tenantId: params.tenantId,
    eventType: params.eventType,
    requestedBy: params.requestedBy,
    requestedAt: nowISO(),
  }));

  const messages = jobs.map(serializeReplayJob);
  const results = await publishBatchToStream(Streams.REPLAY, messages);

  logger.info(
    { webhookId: params.webhookId, eventCount: params.eventIds.length, successful: results.filter(r => r.success).length },
    'Bulk replay requested'
  );

  return results;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Deserialize event from stream entry
 */
export function deserializeEvent(fields: Record<string, string>): XrplEvent {
  return {
    id: fields.id!,
    event_type: fields.event_type as EventType,
    ledger_index: parseInt(fields.ledger_index!, 10),
    tx_hash: fields.tx_hash!,
    network: fields.network as XrplEvent['network'],
    timestamp: fields.timestamp!,
    account_context: JSON.parse(fields.account_context!),
    payload: JSON.parse(fields.payload!),
    result_code: fields.result_code || undefined,
  };
}

/**
 * Deserialize delivery job from stream entry
 */
export function deserializeDeliveryJob(fields: Record<string, string>): DeliveryJobPayload {
  return {
    deliveryId: fields.delivery_id!,
    webhookId: fields.webhook_id!,
    eventId: fields.event_id!,
    tenantId: fields.tenant_id!,
    eventType: fields.event_type as EventType,
    url: fields.url!,
    attempt: parseInt(fields.attempt!, 10),
    maxAttempts: parseInt(fields.max_attempts!, 10),
    timeoutMs: parseInt(fields.timeout_ms!, 10),
    scheduledAt: fields.scheduled_at!,
  };
}

/**
 * Deserialize retry job from stream entry
 */
export function deserializeRetryJob(fields: Record<string, string>): RetryJobPayload {
  return {
    deliveryId: fields.delivery_id!,
    webhookId: fields.webhook_id!,
    eventId: fields.event_id!,
    attempt: parseInt(fields.attempt!, 10),
    maxAttempts: parseInt(fields.max_attempts!, 10),
    retryAt: fields.retry_at!,
    reason: fields.reason!,
  };
}

/**
 * Deserialize DLQ entry from stream entry
 */
export function deserializeDlqEntry(fields: Record<string, string>): DlqEntryPayload {
  return {
    deliveryId: fields.delivery_id!,
    webhookId: fields.webhook_id!,
    eventId: fields.event_id!,
    tenantId: fields.tenant_id!,
    eventType: fields.event_type as EventType,
    finalError: fields.final_error!,
    finalErrorCode: fields.final_error_code || null,
    totalAttempts: parseInt(fields.total_attempts!, 10),
    createdAt: fields.created_at!,
    expiresAt: fields.expires_at!,
  };
}

/**
 * Deserialize replay job from stream entry
 */
export function deserializeReplayJob(fields: Record<string, string>): ReplayJobPayload {
  return {
    replayId: fields.replay_id!,
    originalEventId: fields.original_event_id!,
    webhookId: fields.webhook_id!,
    tenantId: fields.tenant_id!,
    eventType: fields.event_type as EventType,
    requestedBy: fields.requested_by!,
    requestedAt: fields.requested_at!,
  };
}

// =============================================================================
// Export
// =============================================================================

export default {
  // Core
  publishToStream,
  publishBatchToStream,

  // Events
  publishEvent,
  publishEvents,
  deserializeEvent,

  // Deliveries
  publishDeliveryJob,
  publishDeliveryJobs,
  createDeliveryJob,
  deserializeDeliveryJob,

  // Retries
  publishRetryJob,
  scheduleRetry,
  deserializeRetryJob,

  // DLQ
  publishToDlq,
  moveToDeadLetter,
  deserializeDlqEntry,

  // Replay
  publishReplayJob,
  requestReplay,
  requestBulkReplay,
  deserializeReplayJob,
};
