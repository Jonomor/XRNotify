/**
 * @fileoverview XRNotify Redis Streams Configuration
 * Stream names, consumer groups, and helper utilities.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/queue/streams
 */

import { createModuleLogger } from '../core/logger.js';
import { getRedis } from '../core/redis.js';
import { getConfig } from '../core/config.js';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('queue-streams');

/**
 * Stream info
 */
export interface StreamInfo {
  name: string;
  length: number;
  radixTreeKeys: number;
  radixTreeNodes: number;
  groups: number;
  lastGeneratedId: string;
  firstEntry: StreamEntry | null;
  lastEntry: StreamEntry | null;
}

/**
 * Stream entry
 */
export interface StreamEntry {
  id: string;
  fields: Record<string, string>;
}

/**
 * Consumer group info
 */
export interface ConsumerGroupInfo {
  name: string;
  consumers: number;
  pending: number;
  lastDeliveredId: string;
}

/**
 * Consumer info
 */
export interface ConsumerInfo {
  name: string;
  pending: number;
  idle: number;
}

/**
 * Pending entry info
 */
export interface PendingEntry {
  id: string;
  consumer: string;
  idleTime: number;
  deliveryCount: number;
}

// =============================================================================
// Stream Names
// =============================================================================

/**
 * Stream name prefix
 */
const STREAM_PREFIX = 'xrn:stream:';

/**
 * Stream names
 */
export const Streams = {
  /**
   * Main events stream - raw XRPL events
   */
  EVENTS: `${STREAM_PREFIX}events`,

  /**
   * Deliveries stream - webhook deliveries to process
   */
  DELIVERIES: `${STREAM_PREFIX}deliveries`,

  /**
   * Retries stream - deliveries to retry
   */
  RETRIES: `${STREAM_PREFIX}retries`,

  /**
   * Dead letter stream - failed deliveries
   */
  DLQ: `${STREAM_PREFIX}dlq`,

  /**
   * Replay stream - replayed events
   */
  REPLAY: `${STREAM_PREFIX}replay`,

  /**
   * Network-specific event streams
   */
  EVENTS_MAINNET: `${STREAM_PREFIX}events:mainnet`,
  EVENTS_TESTNET: `${STREAM_PREFIX}events:testnet`,
  EVENTS_DEVNET: `${STREAM_PREFIX}events:devnet`,
} as const;

export type StreamName = typeof Streams[keyof typeof Streams];

// =============================================================================
// Consumer Groups
// =============================================================================

/**
 * Consumer group prefix
 */
const GROUP_PREFIX = 'xrn:group:';

/**
 * Consumer group names
 */
export const ConsumerGroups = {
  /**
   * Event processors - consume events and create deliveries
   */
  EVENT_PROCESSORS: `${GROUP_PREFIX}event-processors`,

  /**
   * Delivery workers - execute webhook deliveries
   */
  DELIVERY_WORKERS: `${GROUP_PREFIX}delivery-workers`,

  /**
   * Retry workers - handle retry deliveries
   */
  RETRY_WORKERS: `${GROUP_PREFIX}retry-workers`,

  /**
   * DLQ processors - handle dead letter entries
   */
  DLQ_PROCESSORS: `${GROUP_PREFIX}dlq-processors`,

  /**
   * Replay workers - handle replayed events
   */
  REPLAY_WORKERS: `${GROUP_PREFIX}replay-workers`,
} as const;

export type ConsumerGroupName = typeof ConsumerGroups[keyof typeof ConsumerGroups];

// =============================================================================
// Stream Configuration
// =============================================================================

/**
 * Stream configuration
 */
export interface StreamConfig {
  /**
   * Maximum stream length (approximate)
   */
  maxLen: number;

  /**
   * Use approximate trimming (~)
   */
  approximate: boolean;

  /**
   * Consumer group for this stream
   */
  consumerGroup: ConsumerGroupName;

  /**
   * Block timeout for XREADGROUP (ms)
   */
  blockTimeout: number;

  /**
   * Batch size for reading
   */
  batchSize: number;

  /**
   * Claim timeout for pending entries (ms)
   */
  claimTimeout: number;
}

/**
 * Default stream configurations
 */
export const StreamConfigs: Record<StreamName, StreamConfig> = {
  [Streams.EVENTS]: {
    maxLen: 100000,
    approximate: true,
    consumerGroup: ConsumerGroups.EVENT_PROCESSORS,
    blockTimeout: 5000,
    batchSize: 100,
    claimTimeout: 60000,
  },
  [Streams.DELIVERIES]: {
    maxLen: 50000,
    approximate: true,
    consumerGroup: ConsumerGroups.DELIVERY_WORKERS,
    blockTimeout: 1000,
    batchSize: 10,
    claimTimeout: 30000,
  },
  [Streams.RETRIES]: {
    maxLen: 10000,
    approximate: true,
    consumerGroup: ConsumerGroups.RETRY_WORKERS,
    blockTimeout: 5000,
    batchSize: 10,
    claimTimeout: 60000,
  },
  [Streams.DLQ]: {
    maxLen: 10000,
    approximate: false, // Exact for DLQ
    consumerGroup: ConsumerGroups.DLQ_PROCESSORS,
    blockTimeout: 10000,
    batchSize: 10,
    claimTimeout: 300000, // 5 minutes
  },
  [Streams.REPLAY]: {
    maxLen: 10000,
    approximate: true,
    consumerGroup: ConsumerGroups.REPLAY_WORKERS,
    blockTimeout: 5000,
    batchSize: 10,
    claimTimeout: 60000,
  },
  [Streams.EVENTS_MAINNET]: {
    maxLen: 100000,
    approximate: true,
    consumerGroup: ConsumerGroups.EVENT_PROCESSORS,
    blockTimeout: 5000,
    batchSize: 100,
    claimTimeout: 60000,
  },
  [Streams.EVENTS_TESTNET]: {
    maxLen: 50000,
    approximate: true,
    consumerGroup: ConsumerGroups.EVENT_PROCESSORS,
    blockTimeout: 5000,
    batchSize: 100,
    claimTimeout: 60000,
  },
  [Streams.EVENTS_DEVNET]: {
    maxLen: 50000,
    approximate: true,
    consumerGroup: ConsumerGroups.EVENT_PROCESSORS,
    blockTimeout: 5000,
    batchSize: 100,
    claimTimeout: 60000,
  },
};

// =============================================================================
// Stream Initialization
// =============================================================================

/**
 * Initialize a stream with consumer group
 */
export async function initializeStream(
  streamName: StreamName,
  groupName?: ConsumerGroupName
): Promise<void> {
  const redis = getRedis();
  const config = StreamConfigs[streamName];
  const group = groupName ?? config.consumerGroup;

  try {
    // Create consumer group (creates stream if not exists)
    await redis.xgroup('CREATE', streamName, group, '0', 'MKSTREAM');
    logger.info({ stream: streamName, group }, 'Stream and consumer group created');
  } catch (error) {
    const err = error as Error;
    // Ignore if group already exists
    if (!err.message.includes('BUSYGROUP')) {
      throw error;
    }
    logger.debug({ stream: streamName, group }, 'Consumer group already exists');
  }
}

/**
 * Initialize all streams
 */
export async function initializeAllStreams(): Promise<void> {
  logger.info('Initializing all streams');

  const streamGroups: Array<[StreamName, ConsumerGroupName]> = [
    [Streams.EVENTS, ConsumerGroups.EVENT_PROCESSORS],
    [Streams.DELIVERIES, ConsumerGroups.DELIVERY_WORKERS],
    [Streams.RETRIES, ConsumerGroups.RETRY_WORKERS],
    [Streams.DLQ, ConsumerGroups.DLQ_PROCESSORS],
    [Streams.REPLAY, ConsumerGroups.REPLAY_WORKERS],
    [Streams.EVENTS_MAINNET, ConsumerGroups.EVENT_PROCESSORS],
    [Streams.EVENTS_TESTNET, ConsumerGroups.EVENT_PROCESSORS],
    [Streams.EVENTS_DEVNET, ConsumerGroups.EVENT_PROCESSORS],
  ];

  for (const [stream, group] of streamGroups) {
    await initializeStream(stream, group);
  }

  logger.info('All streams initialized');
}

// =============================================================================
// Stream Operations
// =============================================================================

/**
 * Get stream info
 */
export async function getStreamInfo(streamName: StreamName): Promise<StreamInfo | null> {
  const redis = getRedis();

  try {
    const info = await redis.xinfo('STREAM', streamName) as unknown[];

    // Parse XINFO STREAM response (flat array of key-value pairs)
    const infoMap = new Map<string, unknown>();
    for (let i = 0; i < info.length; i += 2) {
      infoMap.set(info[i] as string, info[i + 1]);
    }

    const parseEntry = (entry: unknown[] | null): StreamEntry | null => {
      if (!entry) return null;
      const [id, fields] = entry as [string, string[]];
      const fieldMap: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        fieldMap[fields[i]!] = fields[i + 1]!;
      }
      return { id, fields: fieldMap };
    };

    return {
      name: streamName,
      length: infoMap.get('length') as number,
      radixTreeKeys: infoMap.get('radix-tree-keys') as number,
      radixTreeNodes: infoMap.get('radix-tree-nodes') as number,
      groups: infoMap.get('groups') as number,
      lastGeneratedId: infoMap.get('last-generated-id') as string,
      firstEntry: parseEntry(infoMap.get('first-entry') as unknown[] | null),
      lastEntry: parseEntry(infoMap.get('last-entry') as unknown[] | null),
    };
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('no such key')) {
      return null;
    }
    throw error;
  }
}

/**
 * Get consumer group info
 */
export async function getConsumerGroupInfo(
  streamName: StreamName,
  groupName: ConsumerGroupName
): Promise<ConsumerGroupInfo | null> {
  const redis = getRedis();

  try {
    const groups = await redis.xinfo('GROUPS', streamName) as unknown[][];

    for (const group of groups) {
      const groupMap = new Map<string, unknown>();
      for (let i = 0; i < group.length; i += 2) {
        groupMap.set(group[i] as string, group[i + 1]);
      }

      if (groupMap.get('name') === groupName) {
        return {
          name: groupName,
          consumers: groupMap.get('consumers') as number,
          pending: groupMap.get('pending') as number,
          lastDeliveredId: groupMap.get('last-delivered-id') as string,
        };
      }
    }

    return null;
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('no such key')) {
      return null;
    }
    throw error;
  }
}

/**
 * Get consumers in a group
 */
export async function getConsumers(
  streamName: StreamName,
  groupName: ConsumerGroupName
): Promise<ConsumerInfo[]> {
  const redis = getRedis();

  try {
    const consumers = await redis.xinfo('CONSUMERS', streamName, groupName) as unknown[][];

    return consumers.map((consumer) => {
      const consumerMap = new Map<string, unknown>();
      for (let i = 0; i < consumer.length; i += 2) {
        consumerMap.set(consumer[i] as string, consumer[i + 1]);
      }

      return {
        name: consumerMap.get('name') as string,
        pending: consumerMap.get('pending') as number,
        idle: consumerMap.get('idle') as number,
      };
    });
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('no such key')) {
      return [];
    }
    throw error;
  }
}

/**
 * Get pending entries
 */
export async function getPendingEntries(
  streamName: StreamName,
  groupName: ConsumerGroupName,
  count: number = 100
): Promise<PendingEntry[]> {
  const redis = getRedis();

  try {
    const pending = await redis.xpending(
      streamName,
      groupName,
      '-',
      '+',
      count
    ) as unknown[][];

    return pending.map((entry) => ({
      id: entry[0] as string,
      consumer: entry[1] as string,
      idleTime: entry[2] as number,
      deliveryCount: entry[3] as number,
    }));
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('no such key')) {
      return [];
    }
    throw error;
  }
}

/**
 * Get stream length
 */
export async function getStreamLength(streamName: StreamName): Promise<number> {
  const redis = getRedis();

  try {
    return await redis.xlen(streamName);
  } catch (error) {
    return 0;
  }
}

/**
 * Trim stream to max length
 */
export async function trimStream(
  streamName: StreamName,
  maxLen?: number
): Promise<number> {
  const redis = getRedis();
  const config = StreamConfigs[streamName];
  const targetLen = maxLen ?? config.maxLen;

  const trimmed = await redis.xtrim(
    streamName,
    'MAXLEN',
    config.approximate ? '~' : '=',
    targetLen
  );

  if (trimmed > 0) {
    logger.debug({ stream: streamName, trimmed }, 'Stream trimmed');
  }

  return trimmed;
}

/**
 * Delete stream
 */
export async function deleteStream(streamName: StreamName): Promise<boolean> {
  const redis = getRedis();

  const deleted = await redis.del(streamName);

  if (deleted > 0) {
    logger.info({ stream: streamName }, 'Stream deleted');
  }

  return deleted > 0;
}

// =============================================================================
// Consumer Group Operations
// =============================================================================

/**
 * Delete consumer from group
 */
export async function deleteConsumer(
  streamName: StreamName,
  groupName: ConsumerGroupName,
  consumerName: string
): Promise<number> {
  const redis = getRedis();

  const pending = await redis.xgroup(
    'DELCONSUMER',
    streamName,
    groupName,
    consumerName
  ) as number;

  logger.info(
    { stream: streamName, group: groupName, consumer: consumerName, pendingReturned: pending },
    'Consumer deleted'
  );

  return pending;
}

/**
 * Set consumer group ID
 */
export async function setGroupId(
  streamName: StreamName,
  groupName: ConsumerGroupName,
  id: string
): Promise<void> {
  const redis = getRedis();

  await redis.xgroup('SETID', streamName, groupName, id);

  logger.info({ stream: streamName, group: groupName, id }, 'Group ID set');
}

/**
 * Destroy consumer group
 */
export async function destroyGroup(
  streamName: StreamName,
  groupName: ConsumerGroupName
): Promise<boolean> {
  const redis = getRedis();

  try {
    await redis.xgroup('DESTROY', streamName, groupName);
    logger.info({ stream: streamName, group: groupName }, 'Consumer group destroyed');
    return true;
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('NOGROUP')) {
      return false;
    }
    throw error;
  }
}

// =============================================================================
// Health Check
// =============================================================================

/**
 * Stream health status
 */
export interface StreamHealthStatus {
  stream: StreamName;
  exists: boolean;
  length: number;
  groups: number;
  pendingTotal: number;
  healthy: boolean;
  issues: string[];
}

/**
 * Check stream health
 */
export async function checkStreamHealth(streamName: StreamName): Promise<StreamHealthStatus> {
  const issues: string[] = [];
  const config = StreamConfigs[streamName];

  const info = await getStreamInfo(streamName);

  if (!info) {
    return {
      stream: streamName,
      exists: false,
      length: 0,
      groups: 0,
      pendingTotal: 0,
      healthy: false,
      issues: ['Stream does not exist'],
    };
  }

  // Check length
  if (info.length > config.maxLen * 1.5) {
    issues.push(`Stream length (${info.length}) exceeds limit (${config.maxLen})`);
  }

  // Check consumer groups
  const groupInfo = await getConsumerGroupInfo(streamName, config.consumerGroup);
  let pendingTotal = 0;

  if (!groupInfo) {
    issues.push(`Consumer group ${config.consumerGroup} does not exist`);
  } else {
    pendingTotal = groupInfo.pending;

    // Check pending
    if (groupInfo.pending > 1000) {
      issues.push(`High pending count: ${groupInfo.pending}`);
    }

    // Check consumers
    if (groupInfo.consumers === 0) {
      issues.push('No active consumers');
    }
  }

  return {
    stream: streamName,
    exists: true,
    length: info.length,
    groups: info.groups,
    pendingTotal,
    healthy: issues.length === 0,
    issues,
  };
}

/**
 * Check all streams health
 */
export async function checkAllStreamsHealth(): Promise<Map<StreamName, StreamHealthStatus>> {
  const results = new Map<StreamName, StreamHealthStatus>();

  for (const streamName of Object.values(Streams)) {
    const status = await checkStreamHealth(streamName);
    results.set(streamName, status);
  }

  return results;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Parse stream entry ID to timestamp
 */
export function parseEntryId(id: string): { timestamp: number; sequence: number } {
  const [timestamp, sequence] = id.split('-');
  return {
    timestamp: parseInt(timestamp!, 10),
    sequence: parseInt(sequence!, 10),
  };
}

/**
 * Create stream entry ID from timestamp
 */
export function createEntryId(timestamp: number, sequence: number = 0): string {
  return `${timestamp}-${sequence}`;
}

/**
 * Get entry age in milliseconds
 */
export function getEntryAge(id: string): number {
  const { timestamp } = parseEntryId(id);
  return Date.now() - timestamp;
}

/**
 * Generate consumer name
 */
export function generateConsumerName(prefix: string = 'worker'): string {
  const hostname = process.env.HOSTNAME ?? 'local';
  const pid = process.pid;
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${hostname}-${pid}-${random}`;
}

// =============================================================================
// Export
// =============================================================================

export default {
  Streams,
  ConsumerGroups,
  StreamConfigs,
  initializeStream,
  initializeAllStreams,
  getStreamInfo,
  getConsumerGroupInfo,
  getConsumers,
  getPendingEntries,
  getStreamLength,
  trimStream,
  deleteStream,
  deleteConsumer,
  setGroupId,
  destroyGroup,
  checkStreamHealth,
  checkAllStreamsHealth,
  parseEntryId,
  createEntryId,
  getEntryAge,
  generateConsumerName,
};
