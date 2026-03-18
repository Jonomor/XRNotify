/**
 * @fileoverview XRNotify Webhook Cache Service
 * Redis-based caching for webhook lookups with event type indexing.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/services/webhooks/cache
 */

import { createModuleLogger } from '../../core/logger.js';
import { getRedis, get, set, del, mget } from '../../core/redis.js';
import { queryAll } from '../../core/db.js';
import type { EventType } from '@xrnotify/shared';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('webhook-cache');

/**
 * Cached webhook data
 */
export interface CachedWebhook {
  id: string;
  tenantId: string;
  url: string;
  secretHash: string;
  events: EventType[];
  filterAccounts: string[] | null;
  filterNetwork: string | null;
  filterMinXrpAmount: number | null;
  retryMaxAttempts: number;
  timeoutMs: number;
  active: boolean;
  consecutiveFailures: number;
  cachedAt: number;
}

/**
 * Event type index entry
 */
interface EventTypeIndexEntry {
  webhookIds: string[];
  updatedAt: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  webhookCacheHits: number;
  webhookCacheMisses: number;
  eventIndexHits: number;
  eventIndexMisses: number;
  lastRefreshAt: Date | null;
}

// =============================================================================
// Constants
// =============================================================================

const WEBHOOK_CACHE_PREFIX = 'wh:';
const EVENT_INDEX_PREFIX = 'wh:idx:evt:';
const TENANT_INDEX_PREFIX = 'wh:idx:tenant:';
const NETWORK_INDEX_PREFIX = 'wh:idx:net:';
const ALL_WEBHOOKS_KEY = 'wh:all';
const CACHE_VERSION_KEY = 'wh:version';

const WEBHOOK_TTL = 300; // 5 minutes
const INDEX_TTL = 60; // 1 minute (indexes refresh more frequently)
const FULL_CACHE_TTL = 600; // 10 minutes for full cache

// =============================================================================
// Cache Statistics
// =============================================================================

let stats: CacheStats = {
  webhookCacheHits: 0,
  webhookCacheMisses: 0,
  eventIndexHits: 0,
  eventIndexMisses: 0,
  lastRefreshAt: null,
};

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  return { ...stats };
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  stats = {
    webhookCacheHits: 0,
    webhookCacheMisses: 0,
    eventIndexHits: 0,
    eventIndexMisses: 0,
    lastRefreshAt: null,
  };
}

// =============================================================================
// Individual Webhook Cache
// =============================================================================

/**
 * Get webhook from cache
 */
export async function getCachedWebhook(webhookId: string): Promise<CachedWebhook | null> {
  try {
    const cached = await get(`${WEBHOOK_CACHE_PREFIX}${webhookId}`);
    if (cached) {
      stats.webhookCacheHits++;
      return JSON.parse(cached) as CachedWebhook;
    }
    stats.webhookCacheMisses++;
    return null;
  } catch (error) {
    logger.warn({ err: error, webhookId }, 'Failed to get cached webhook');
    stats.webhookCacheMisses++;
    return null;
  }
}

/**
 * Get multiple webhooks from cache
 */
export async function getCachedWebhooks(webhookIds: string[]): Promise<Map<string, CachedWebhook>> {
  const result = new Map<string, CachedWebhook>();
  
  if (webhookIds.length === 0) {
    return result;
  }

  try {
    const keys = webhookIds.map((id) => `${WEBHOOK_CACHE_PREFIX}${id}`);
    const values = await mget(keys);

    for (let i = 0; i < webhookIds.length; i++) {
      const value = values[i];
      if (value) {
        result.set(webhookIds[i]!, JSON.parse(value) as CachedWebhook);
        stats.webhookCacheHits++;
      } else {
        stats.webhookCacheMisses++;
      }
    }
  } catch (error) {
    logger.warn({ err: error }, 'Failed to get cached webhooks');
  }

  return result;
}

/**
 * Cache a webhook
 */
export async function cacheWebhook(webhook: CachedWebhook): Promise<void> {
  try {
    const key = `${WEBHOOK_CACHE_PREFIX}${webhook.id}`;
    const data = { ...webhook, cachedAt: Date.now() };
    await set(key, JSON.stringify(data), WEBHOOK_TTL);
  } catch (error) {
    logger.warn({ err: error, webhookId: webhook.id }, 'Failed to cache webhook');
  }
}

/**
 * Cache multiple webhooks
 */
export async function cacheWebhooks(webhooks: CachedWebhook[]): Promise<void> {
  if (webhooks.length === 0) {
    return;
  }

  try {
    const redis = getRedis();
    const pipeline = redis.pipeline();
    const now = Date.now();

    for (const webhook of webhooks) {
      const key = `${WEBHOOK_CACHE_PREFIX}${webhook.id}`;
      const data = { ...webhook, cachedAt: now };
      pipeline.setex(key, WEBHOOK_TTL, JSON.stringify(data));
    }

    await pipeline.exec();
  } catch (error) {
    logger.warn({ err: error, count: webhooks.length }, 'Failed to cache webhooks');
  }
}

/**
 * Invalidate cached webhook
 */
export async function invalidateWebhook(webhookId: string): Promise<void> {
  try {
    await del(`${WEBHOOK_CACHE_PREFIX}${webhookId}`);
    
    // Also invalidate related indexes
    await invalidateIndexes();
    
    logger.debug({ webhookId }, 'Webhook cache invalidated');
  } catch (error) {
    logger.warn({ err: error, webhookId }, 'Failed to invalidate webhook cache');
  }
}

/**
 * Invalidate all webhook caches for a tenant
 */
export async function invalidateTenantWebhooks(tenantId: string): Promise<void> {
  try {
    const redis = getRedis();
    
    // Get webhook IDs for tenant from index
    const indexKey = `${TENANT_INDEX_PREFIX}${tenantId}`;
    const webhookIds = await redis.smembers(indexKey);
    
    if (webhookIds.length > 0) {
      const keys = webhookIds.map((id) => `${WEBHOOK_CACHE_PREFIX}${id}`);
      await redis.del(...keys);
    }
    
    // Delete tenant index
    await redis.del(indexKey);
    
    // Invalidate event indexes
    await invalidateIndexes();
    
    logger.debug({ tenantId, count: webhookIds.length }, 'Tenant webhook caches invalidated');
  } catch (error) {
    logger.warn({ err: error, tenantId }, 'Failed to invalidate tenant webhook caches');
  }
}

// =============================================================================
// Event Type Index
// =============================================================================

/**
 * Get webhook IDs subscribed to an event type
 */
export async function getWebhookIdsByEventType(
  eventType: EventType,
  network?: string
): Promise<string[]> {
  try {
    const redis = getRedis();
    const eventKey = `${EVENT_INDEX_PREFIX}${eventType}`;
    
    // Check if index exists
    const exists = await redis.exists(eventKey);
    
    if (!exists) {
      stats.eventIndexMisses++;
      return [];
    }
    
    stats.eventIndexHits++;
    
    // If network filter, intersect with network index
    if (network) {
      const networkKey = `${NETWORK_INDEX_PREFIX}${network}`;
      const networkExists = await redis.exists(networkKey);
      
      if (networkExists) {
        // Return intersection
        const ids = await redis.sinter(eventKey, networkKey);
        return ids;
      }
    }
    
    // Return all webhook IDs for event type
    return redis.smembers(eventKey);
  } catch (error) {
    logger.warn({ err: error, eventType }, 'Failed to get webhooks by event type');
    stats.eventIndexMisses++;
    return [];
  }
}

/**
 * Get webhook IDs subscribed to any of the given event types
 */
export async function getWebhookIdsByEventTypes(
  eventTypes: EventType[],
  network?: string
): Promise<string[]> {
  if (eventTypes.length === 0) {
    return [];
  }

  try {
    const redis = getRedis();
    const eventKeys = eventTypes.map((et) => `${EVENT_INDEX_PREFIX}${et}`);
    
    // Union all event type sets
    let webhookIds: string[];
    
    if (eventKeys.length === 1) {
      webhookIds = await redis.smembers(eventKeys[0]!);
    } else {
      webhookIds = await redis.sunion(...eventKeys);
    }
    
    // Filter by network if specified
    if (network && webhookIds.length > 0) {
      const networkKey = `${NETWORK_INDEX_PREFIX}${network}`;
      const networkWebhooks = await redis.smembers(networkKey);
      const networkSet = new Set(networkWebhooks);
      webhookIds = webhookIds.filter((id) => networkSet.has(id));
    }
    
    return webhookIds;
  } catch (error) {
    logger.warn({ err: error, eventTypes }, 'Failed to get webhooks by event types');
    return [];
  }
}

/**
 * Build event type index from database
 */
export async function buildEventTypeIndex(): Promise<void> {
  const startTime = Date.now();
  
  try {
    const redis = getRedis();
    
    // Fetch all active webhook subscriptions
    const subscriptions = await queryAll<{
      webhook_id: string;
      event_type: EventType;
      filter_network: string | null;
      tenant_id: string;
    }>(
      `SELECT 
        w.id as webhook_id,
        wes.event_type,
        w.filter_network,
        w.tenant_id
      FROM webhooks w
      INNER JOIN webhook_event_subscriptions wes ON wes.webhook_id = w.id
      WHERE w.active = TRUE AND w.consecutive_failures < 100`
    );
    
    // Group by event type, network, and tenant
    const eventIndex = new Map<string, Set<string>>();
    const networkIndex = new Map<string, Set<string>>();
    const tenantIndex = new Map<string, Set<string>>();
    
    for (const sub of subscriptions) {
      // Event type index
      if (!eventIndex.has(sub.event_type)) {
        eventIndex.set(sub.event_type, new Set());
      }
      eventIndex.get(sub.event_type)!.add(sub.webhook_id);
      
      // Network index (only for webhooks with no network filter OR matching network)
      if (!sub.filter_network) {
        // No filter means all networks
        for (const network of ['mainnet', 'testnet', 'devnet']) {
          if (!networkIndex.has(network)) {
            networkIndex.set(network, new Set());
          }
          networkIndex.get(network)!.add(sub.webhook_id);
        }
      } else {
        if (!networkIndex.has(sub.filter_network)) {
          networkIndex.set(sub.filter_network, new Set());
        }
        networkIndex.get(sub.filter_network)!.add(sub.webhook_id);
      }
      
      // Tenant index
      if (!tenantIndex.has(sub.tenant_id)) {
        tenantIndex.set(sub.tenant_id, new Set());
      }
      tenantIndex.get(sub.tenant_id)!.add(sub.webhook_id);
    }
    
    // Write indexes to Redis
    const pipeline = redis.pipeline();
    
    // Clear old indexes
    const oldEventKeys = await redis.keys(`${EVENT_INDEX_PREFIX}*`);
    const oldNetworkKeys = await redis.keys(`${NETWORK_INDEX_PREFIX}*`);
    const oldTenantKeys = await redis.keys(`${TENANT_INDEX_PREFIX}*`);
    
    for (const key of [...oldEventKeys, ...oldNetworkKeys, ...oldTenantKeys]) {
      pipeline.del(key);
    }
    
    // Write event type indexes
    for (const [eventType, webhookIds] of eventIndex) {
      const key = `${EVENT_INDEX_PREFIX}${eventType}`;
      if (webhookIds.size > 0) {
        pipeline.sadd(key, ...webhookIds);
        pipeline.expire(key, INDEX_TTL);
      }
    }
    
    // Write network indexes
    for (const [network, webhookIds] of networkIndex) {
      const key = `${NETWORK_INDEX_PREFIX}${network}`;
      if (webhookIds.size > 0) {
        pipeline.sadd(key, ...webhookIds);
        pipeline.expire(key, INDEX_TTL);
      }
    }
    
    // Write tenant indexes
    for (const [tenantId, webhookIds] of tenantIndex) {
      const key = `${TENANT_INDEX_PREFIX}${tenantId}`;
      if (webhookIds.size > 0) {
        pipeline.sadd(key, ...webhookIds);
        pipeline.expire(key, INDEX_TTL);
      }
    }
    
    // Update version
    pipeline.set(CACHE_VERSION_KEY, Date.now().toString());
    
    await pipeline.exec();
    
    stats.lastRefreshAt = new Date();
    const duration = Date.now() - startTime;
    
    logger.info(
      {
        eventTypes: eventIndex.size,
        networks: networkIndex.size,
        tenants: tenantIndex.size,
        totalSubscriptions: subscriptions.length,
        durationMs: duration,
      },
      'Event type index rebuilt'
    );
  } catch (error) {
    logger.error({ err: error }, 'Failed to build event type index');
    throw error;
  }
}

/**
 * Invalidate all indexes
 */
export async function invalidateIndexes(): Promise<void> {
  try {
    const redis = getRedis();
    
    // Increment version to signal stale cache
    await redis.incr(CACHE_VERSION_KEY);
    
    logger.debug('Indexes invalidated');
  } catch (error) {
    logger.warn({ err: error }, 'Failed to invalidate indexes');
  }
}

/**
 * Check if indexes need refresh
 */
export async function indexesNeedRefresh(): Promise<boolean> {
  try {
    const redis = getRedis();
    
    // Check if any event index exists
    const keys = await redis.keys(`${EVENT_INDEX_PREFIX}*`);
    
    if (keys.length === 0) {
      return true;
    }
    
    // Check TTL of first key
    const ttl = await redis.ttl(keys[0]!);
    
    // Refresh if less than 10 seconds remaining
    return ttl < 10;
  } catch (error) {
    logger.warn({ err: error }, 'Failed to check index refresh status');
    return true;
  }
}

// =============================================================================
// Full Cache Warming
// =============================================================================

/**
 * Warm the full webhook cache
 */
export async function warmCache(): Promise<{
  webhooksCached: number;
  eventTypesIndexed: number;
  durationMs: number;
}> {
  const startTime = Date.now();
  
  try {
    // Fetch all active webhooks
    const webhooks = await queryAll<{
      id: string;
      tenant_id: string;
      url: string;
      secret_hash: string;
      events: EventType[];
      filter_accounts: string[] | null;
      filter_network: string | null;
      filter_min_xrp_amount: string | null;
      retry_max_attempts: number;
      timeout_ms: number;
      active: boolean;
      consecutive_failures: number;
    }>(
      `SELECT 
        id, tenant_id, url, secret_hash, events,
        filter_accounts, filter_network, filter_min_xrp_amount,
        retry_max_attempts, timeout_ms, active, consecutive_failures
      FROM webhooks
      WHERE active = TRUE AND consecutive_failures < 100`
    );
    
    // Transform to cached format
    const cachedWebhooks: CachedWebhook[] = webhooks.map((w) => ({
      id: w.id,
      tenantId: w.tenant_id,
      url: w.url,
      secretHash: w.secret_hash,
      events: w.events,
      filterAccounts: w.filter_accounts,
      filterNetwork: w.filter_network,
      filterMinXrpAmount: w.filter_min_xrp_amount
        ? parseFloat(w.filter_min_xrp_amount)
        : null,
      retryMaxAttempts: w.retry_max_attempts,
      timeoutMs: w.timeout_ms,
      active: w.active,
      consecutiveFailures: w.consecutive_failures,
      cachedAt: Date.now(),
    }));
    
    // Cache all webhooks
    await cacheWebhooks(cachedWebhooks);
    
    // Build indexes
    await buildEventTypeIndex();
    
    const durationMs = Date.now() - startTime;
    
    logger.info(
      { webhooksCached: cachedWebhooks.length, durationMs },
      'Cache warmed'
    );
    
    return {
      webhooksCached: cachedWebhooks.length,
      eventTypesIndexed: new Set(webhooks.flatMap((w) => w.events)).size,
      durationMs,
    };
  } catch (error) {
    logger.error({ err: error }, 'Failed to warm cache');
    throw error;
  }
}

/**
 * Start background cache refresh
 */
let refreshInterval: NodeJS.Timeout | null = null;

export function startCacheRefresh(intervalMs: number = 30000): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  refreshInterval = setInterval(async () => {
    try {
      const needsRefresh = await indexesNeedRefresh();
      if (needsRefresh) {
        await buildEventTypeIndex();
      }
    } catch (error) {
      logger.error({ err: error }, 'Background cache refresh failed');
    }
  }, intervalMs);
  
  logger.info({ intervalMs }, 'Cache refresh started');
}

/**
 * Stop background cache refresh
 */
export function stopCacheRefresh(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  
  logger.info('Cache refresh stopped');
}

// =============================================================================
// Account-Based Lookup
// =============================================================================

/**
 * Get webhooks matching accounts
 * 
 * This is used to filter webhooks by account context.
 * Webhooks with no account filter match all accounts.
 */
export async function filterWebhooksByAccounts(
  webhookIds: string[],
  accounts: string[]
): Promise<string[]> {
  if (webhookIds.length === 0 || accounts.length === 0) {
    return webhookIds;
  }
  
  // Get cached webhooks
  const cached = await getCachedWebhooks(webhookIds);
  
  // Filter by account
  const accountSet = new Set(accounts);
  const matchingIds: string[] = [];
  
  for (const id of webhookIds) {
    const webhook = cached.get(id);
    
    if (!webhook) {
      // Not in cache, include it (will be filtered at delivery time)
      matchingIds.push(id);
      continue;
    }
    
    // No filter means match all accounts
    if (!webhook.filterAccounts || webhook.filterAccounts.length === 0) {
      matchingIds.push(id);
      continue;
    }
    
    // Check if any account matches
    const hasMatch = webhook.filterAccounts.some((a) => accountSet.has(a));
    if (hasMatch) {
      matchingIds.push(id);
    }
  }
  
  return matchingIds;
}

// =============================================================================
// Cache Health Check
// =============================================================================

/**
 * Check cache health
 */
export async function checkCacheHealth(): Promise<{
  healthy: boolean;
  webhookCount: number;
  eventIndexCount: number;
  lastRefresh: Date | null;
  error?: string;
}> {
  try {
    const redis = getRedis();
    
    // Count cached webhooks
    const webhookKeys = await redis.keys(`${WEBHOOK_CACHE_PREFIX}*`);
    
    // Count event indexes
    const eventKeys = await redis.keys(`${EVENT_INDEX_PREFIX}*`);
    
    return {
      healthy: true,
      webhookCount: webhookKeys.length,
      eventIndexCount: eventKeys.length,
      lastRefresh: stats.lastRefreshAt,
    };
  } catch (error) {
    const err = error as Error;
    return {
      healthy: false,
      webhookCount: 0,
      eventIndexCount: 0,
      lastRefresh: null,
      error: err.message,
    };
  }
}

/**
 * Clear all webhook cache
 */
export async function clearCache(): Promise<void> {
  try {
    const redis = getRedis();
    
    // Get all cache keys
    const keys = await redis.keys('wh:*');
    
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    
    resetCacheStats();
    
    logger.info({ keysDeleted: keys.length }, 'Cache cleared');
  } catch (error) {
    logger.error({ err: error }, 'Failed to clear cache');
    throw error;
  }
}

// =============================================================================
// Export
// =============================================================================

export default {
  // Individual webhook cache
  getCachedWebhook,
  getCachedWebhooks,
  cacheWebhook,
  cacheWebhooks,
  invalidateWebhook,
  invalidateTenantWebhooks,
  
  // Event type index
  getWebhookIdsByEventType,
  getWebhookIdsByEventTypes,
  buildEventTypeIndex,
  invalidateIndexes,
  indexesNeedRefresh,
  
  // Account filtering
  filterWebhooksByAccounts,
  
  // Cache management
  warmCache,
  startCacheRefresh,
  stopCacheRefresh,
  clearCache,
  checkCacheHealth,
  
  // Statistics
  getCacheStats,
  resetCacheStats,
};
