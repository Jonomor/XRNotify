/**
 * @fileoverview XRNotify Delivery Idempotency
 * Ensures exactly-once delivery semantics using unique constraints.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/worker/delivery/idempotency
 */

import { createModuleLogger } from '../../core/logger.js';
import { query, queryOne } from '../../core/db.js';
import { get, set, del, getRedis } from '../../core/redis.js';
import { uuid, nowISO } from '@xrnotify/shared';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('idempotency');

/**
 * Idempotency key components
 */
export interface IdempotencyKeyComponents {
  webhookId: string;
  eventId: string;
}

/**
 * Idempotency check result
 */
export interface IdempotencyCheckResult {
  /**
   * Whether this is a new delivery (not seen before)
   */
  isNew: boolean;

  /**
   * Existing delivery ID if duplicate
   */
  existingDeliveryId: string | null;

  /**
   * Existing delivery status if duplicate
   */
  existingStatus: DeliveryStatus | null;

  /**
   * When the existing delivery was created
   */
  existingCreatedAt: Date | null;
}

/**
 * Delivery status
 */
export type DeliveryStatus =
  | 'pending'
  | 'processing'
  | 'delivered'
  | 'failed'
  | 'retrying'
  | 'cancelled'
  | 'dlq';

/**
 * Lock result
 */
export interface LockResult {
  acquired: boolean;
  lockId: string | null;
  existingLockHolder: string | null;
}

/**
 * Idempotency options
 */
export interface IdempotencyOptions {
  /**
   * Lock TTL in seconds (default: 60)
   */
  lockTtlSeconds?: number;

  /**
   * Use Redis for fast checks (default: true)
   */
  useRedisCache?: boolean;

  /**
   * Redis cache TTL in seconds (default: 3600 = 1 hour)
   */
  redisCacheTtlSeconds?: number;
}

// =============================================================================
// Constants
// =============================================================================

const IDEMPOTENCY_KEY_PREFIX = 'idemp:';
const DELIVERY_LOCK_PREFIX = 'lock:delivery:';
const DEFAULT_LOCK_TTL = 60;
const DEFAULT_CACHE_TTL = 3600;

// =============================================================================
// Idempotency Key Generation
// =============================================================================

/**
 * Generate idempotency key
 *
 * Format: webhook_id:event_id
 * This ensures each event is only delivered once per webhook.
 */
export function generateIdempotencyKey(components: IdempotencyKeyComponents): string {
  return `${components.webhookId}:${components.eventId}`;
}

/**
 * Parse idempotency key
 */
export function parseIdempotencyKey(key: string): IdempotencyKeyComponents | null {
  const parts = key.split(':');

  if (parts.length !== 2) {
    return null;
  }

  return {
    webhookId: parts[0]!,
    eventId: parts[1]!,
  };
}

/**
 * Generate delivery ID
 */
export function generateDeliveryId(): string {
  return `del_${uuid()}`;
}

// =============================================================================
// Redis-based Fast Check
// =============================================================================

/**
 * Check idempotency in Redis (fast path)
 */
async function checkIdempotencyRedis(
  idempotencyKey: string
): Promise<{ found: boolean; deliveryId: string | null; status: DeliveryStatus | null }> {
  try {
    const cached = await get(`${IDEMPOTENCY_KEY_PREFIX}${idempotencyKey}`);

    if (cached) {
      const data = JSON.parse(cached) as { deliveryId: string; status: DeliveryStatus };
      return {
        found: true,
        deliveryId: data.deliveryId,
        status: data.status,
      };
    }

    return { found: false, deliveryId: null, status: null };
  } catch (error) {
    logger.warn({ err: error, idempotencyKey }, 'Redis idempotency check failed');
    return { found: false, deliveryId: null, status: null };
  }
}

/**
 * Set idempotency in Redis
 */
async function setIdempotencyRedis(
  idempotencyKey: string,
  deliveryId: string,
  status: DeliveryStatus,
  ttlSeconds: number
): Promise<void> {
  try {
    const data = JSON.stringify({ deliveryId, status, updatedAt: nowISO() });
    await set(`${IDEMPOTENCY_KEY_PREFIX}${idempotencyKey}`, data, ttlSeconds);
  } catch (error) {
    logger.warn({ err: error, idempotencyKey }, 'Redis idempotency set failed');
  }
}

/**
 * Update idempotency status in Redis
 */
export async function updateIdempotencyStatus(
  idempotencyKey: string,
  deliveryId: string,
  status: DeliveryStatus,
  ttlSeconds: number = DEFAULT_CACHE_TTL
): Promise<void> {
  await setIdempotencyRedis(idempotencyKey, deliveryId, status, ttlSeconds);
}

/**
 * Remove idempotency from Redis
 */
export async function removeIdempotency(idempotencyKey: string): Promise<void> {
  try {
    await del(`${IDEMPOTENCY_KEY_PREFIX}${idempotencyKey}`);
  } catch (error) {
    logger.warn({ err: error, idempotencyKey }, 'Redis idempotency delete failed');
  }
}

// =============================================================================
// Database-based Check
// =============================================================================

/**
 * Check idempotency in database (authoritative source)
 */
async function checkIdempotencyDatabase(
  idempotencyKey: string
): Promise<IdempotencyCheckResult> {
  const row = await queryOne<{
    id: string;
    status: DeliveryStatus;
    created_at: Date;
  }>(
    `SELECT id, status, created_at
     FROM deliveries
     WHERE idempotency_key = $1
     LIMIT 1`,
    [idempotencyKey]
  );

  if (row) {
    return {
      isNew: false,
      existingDeliveryId: row.id,
      existingStatus: row.status,
      existingCreatedAt: row.created_at,
    };
  }

  return {
    isNew: true,
    existingDeliveryId: null,
    existingStatus: null,
    existingCreatedAt: null,
  };
}

// =============================================================================
// Combined Idempotency Check
// =============================================================================

/**
 * Check if delivery already exists (idempotency check)
 *
 * Uses Redis as fast cache, falls back to database for authoritative check.
 */
export async function checkIdempotency(
  components: IdempotencyKeyComponents,
  options: IdempotencyOptions = {}
): Promise<IdempotencyCheckResult> {
  const useRedis = options.useRedisCache ?? true;
  const idempotencyKey = generateIdempotencyKey(components);

  // Fast path: Check Redis
  if (useRedis) {
    const redisResult = await checkIdempotencyRedis(idempotencyKey);

    if (redisResult.found) {
      logger.debug(
        { idempotencyKey, deliveryId: redisResult.deliveryId },
        'Idempotency hit (Redis)'
      );

      return {
        isNew: false,
        existingDeliveryId: redisResult.deliveryId,
        existingStatus: redisResult.status,
        existingCreatedAt: null, // Not stored in Redis
      };
    }
  }

  // Slow path: Check database
  const dbResult = await checkIdempotencyDatabase(idempotencyKey);

  // Update Redis cache if found in database
  if (useRedis && !dbResult.isNew) {
    const cacheTtl = options.redisCacheTtlSeconds ?? DEFAULT_CACHE_TTL;
    await setIdempotencyRedis(
      idempotencyKey,
      dbResult.existingDeliveryId!,
      dbResult.existingStatus!,
      cacheTtl
    );
  }

  if (!dbResult.isNew) {
    logger.debug(
      { idempotencyKey, deliveryId: dbResult.existingDeliveryId },
      'Idempotency hit (database)'
    );
  }

  return dbResult;
}

/**
 * Create delivery with idempotency check (atomic)
 *
 * Returns the delivery ID if created, or existing delivery if duplicate.
 */
export async function createDeliveryIdempotent(params: {
  webhookId: string;
  eventId: string;
  tenantId: string;
  options?: IdempotencyOptions;
}): Promise<{
  created: boolean;
  deliveryId: string;
  status: DeliveryStatus;
}> {
  const idempotencyKey = generateIdempotencyKey({
    webhookId: params.webhookId,
    eventId: params.eventId,
  });

  const deliveryId = generateDeliveryId();

  try {
    // Attempt insert with ON CONFLICT
    const row = await queryOne<{
      id: string;
      status: DeliveryStatus;
      created: boolean;
    }>(
      `WITH new_delivery AS (
        INSERT INTO deliveries (
          id, webhook_id, event_id, tenant_id, idempotency_key, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id, status, TRUE as created
      )
      SELECT id, status, created FROM new_delivery
      UNION ALL
      SELECT id, status, FALSE as created
      FROM deliveries
      WHERE idempotency_key = $5
        AND NOT EXISTS (SELECT 1 FROM new_delivery)
      LIMIT 1`,
      [deliveryId, params.webhookId, params.eventId, params.tenantId, idempotencyKey]
    );

    if (!row) {
      throw new Error('Failed to create or retrieve delivery');
    }

    // Update Redis cache
    const cacheTtl = params.options?.redisCacheTtlSeconds ?? DEFAULT_CACHE_TTL;
    await setIdempotencyRedis(idempotencyKey, row.id, row.status, cacheTtl);

    if (row.created) {
      logger.debug(
        { deliveryId: row.id, idempotencyKey },
        'Delivery created'
      );
    } else {
      logger.debug(
        { deliveryId: row.id, idempotencyKey },
        'Delivery already exists'
      );
    }

    return {
      created: row.created,
      deliveryId: row.id,
      status: row.status,
    };
  } catch (error) {
    logger.error(
      { err: error, webhookId: params.webhookId, eventId: params.eventId },
      'Failed to create delivery idempotently'
    );
    throw error;
  }
}

// =============================================================================
// Delivery Locking
// =============================================================================

/**
 * Acquire delivery lock
 *
 * Prevents concurrent processing of the same delivery.
 */
export async function acquireDeliveryLock(
  deliveryId: string,
  workerId: string,
  options: IdempotencyOptions = {}
): Promise<LockResult> {
  const lockKey = `${DELIVERY_LOCK_PREFIX}${deliveryId}`;
  const lockTtl = options.lockTtlSeconds ?? DEFAULT_LOCK_TTL;
  const lockId = `${workerId}:${Date.now()}`;

  try {
    const redis = getRedis();

    // Try to set lock with NX (only if not exists)
    const result = await redis.set(lockKey, lockId, 'EX', lockTtl, 'NX');

    if (result === 'OK') {
      logger.debug({ deliveryId, lockId }, 'Delivery lock acquired');
      return { acquired: true, lockId, existingLockHolder: null };
    }

    // Lock exists, get holder
    const existingLock = await redis.get(lockKey);

    logger.debug(
      { deliveryId, existingLockHolder: existingLock },
      'Delivery already locked'
    );

    return {
      acquired: false,
      lockId: null,
      existingLockHolder: existingLock,
    };
  } catch (error) {
    logger.error({ err: error, deliveryId }, 'Failed to acquire delivery lock');
    return { acquired: false, lockId: null, existingLockHolder: null };
  }
}

/**
 * Release delivery lock
 */
export async function releaseDeliveryLock(
  deliveryId: string,
  lockId: string
): Promise<boolean> {
  const lockKey = `${DELIVERY_LOCK_PREFIX}${deliveryId}`;

  try {
    const redis = getRedis();

    // Only release if we hold the lock (Lua script for atomicity)
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    const result = await redis.eval(script, 1, lockKey, lockId);

    const released = result === 1;

    if (released) {
      logger.debug({ deliveryId, lockId }, 'Delivery lock released');
    } else {
      logger.warn({ deliveryId, lockId }, 'Delivery lock not held');
    }

    return released;
  } catch (error) {
    logger.error({ err: error, deliveryId }, 'Failed to release delivery lock');
    return false;
  }
}

/**
 * Extend delivery lock
 */
export async function extendDeliveryLock(
  deliveryId: string,
  lockId: string,
  additionalSeconds: number
): Promise<boolean> {
  const lockKey = `${DELIVERY_LOCK_PREFIX}${deliveryId}`;

  try {
    const redis = getRedis();

    // Only extend if we hold the lock
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("expire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    const result = await redis.eval(script, 1, lockKey, lockId, additionalSeconds);

    return result === 1;
  } catch (error) {
    logger.error({ err: error, deliveryId }, 'Failed to extend delivery lock');
    return false;
  }
}

/**
 * Check if delivery is locked
 */
export async function isDeliveryLocked(deliveryId: string): Promise<{
  locked: boolean;
  holder: string | null;
  ttl: number;
}> {
  const lockKey = `${DELIVERY_LOCK_PREFIX}${deliveryId}`;

  try {
    const redis = getRedis();
    const [holder, ttl] = await Promise.all([
      redis.get(lockKey),
      redis.ttl(lockKey),
    ]);

    return {
      locked: holder !== null,
      holder,
      ttl: ttl > 0 ? ttl : 0,
    };
  } catch (error) {
    logger.error({ err: error, deliveryId }, 'Failed to check delivery lock');
    return { locked: false, holder: null, ttl: 0 };
  }
}

// =============================================================================
// Batch Operations
// =============================================================================

/**
 * Check idempotency for multiple deliveries
 */
export async function checkIdempotencyBatch(
  components: IdempotencyKeyComponents[]
): Promise<Map<string, IdempotencyCheckResult>> {
  const results = new Map<string, IdempotencyCheckResult>();
  const keysToCheck: string[] = [];
  const keyToComponents = new Map<string, IdempotencyKeyComponents>();

  // Generate keys
  for (const comp of components) {
    const key = generateIdempotencyKey(comp);
    keysToCheck.push(key);
    keyToComponents.set(key, comp);
  }

  if (keysToCheck.length === 0) {
    return results;
  }

  // Check Redis in batch
  const redis = getRedis();
  const redisKeys = keysToCheck.map((k) => `${IDEMPOTENCY_KEY_PREFIX}${k}`);

  try {
    const redisValues = await redis.mget(...redisKeys);
    const missingKeys: string[] = [];

    for (let i = 0; i < keysToCheck.length; i++) {
      const key = keysToCheck[i]!;
      const value = redisValues[i];

      if (value) {
        const data = JSON.parse(value) as { deliveryId: string; status: DeliveryStatus };
        results.set(key, {
          isNew: false,
          existingDeliveryId: data.deliveryId,
          existingStatus: data.status,
          existingCreatedAt: null,
        });
      } else {
        missingKeys.push(key);
      }
    }

    // Check database for missing keys
    if (missingKeys.length > 0) {
      const rows = await query<{
        idempotency_key: string;
        id: string;
        status: DeliveryStatus;
        created_at: Date;
      }>(
        `SELECT idempotency_key, id, status, created_at
         FROM deliveries
         WHERE idempotency_key = ANY($1)`,
        [missingKeys]
      );

      const dbResults = new Map<string, {
        id: string;
        status: DeliveryStatus;
        createdAt: Date;
      }>();

      for (const row of rows.rows) {
        dbResults.set(row.idempotency_key, {
          id: row.id,
          status: row.status,
          createdAt: row.created_at,
        });
      }

      for (const key of missingKeys) {
        const dbResult = dbResults.get(key);

        if (dbResult) {
          results.set(key, {
            isNew: false,
            existingDeliveryId: dbResult.id,
            existingStatus: dbResult.status,
            existingCreatedAt: dbResult.createdAt,
          });

          // Update Redis cache
          await setIdempotencyRedis(key, dbResult.id, dbResult.status, DEFAULT_CACHE_TTL);
        } else {
          results.set(key, {
            isNew: true,
            existingDeliveryId: null,
            existingStatus: null,
            existingCreatedAt: null,
          });
        }
      }
    }
  } catch (error) {
    logger.error({ err: error }, 'Batch idempotency check failed');

    // Fall back to individual checks
    for (const comp of components) {
      const key = generateIdempotencyKey(comp);
      const result = await checkIdempotency(comp);
      results.set(key, result);
    }
  }

  return results;
}

/**
 * Create multiple deliveries idempotently
 */
export async function createDeliveriesBatch(
  deliveries: Array<{
    webhookId: string;
    eventId: string;
    tenantId: string;
  }>
): Promise<Map<string, { created: boolean; deliveryId: string; status: DeliveryStatus }>> {
  const results = new Map<string, { created: boolean; deliveryId: string; status: DeliveryStatus }>();

  // Check existing deliveries first
  const components = deliveries.map((d) => ({
    webhookId: d.webhookId,
    eventId: d.eventId,
  }));

  const existingCheck = await checkIdempotencyBatch(components);

  // Process each delivery
  for (const delivery of deliveries) {
    const key = generateIdempotencyKey({
      webhookId: delivery.webhookId,
      eventId: delivery.eventId,
    });

    const existing = existingCheck.get(key);

    if (existing && !existing.isNew) {
      results.set(key, {
        created: false,
        deliveryId: existing.existingDeliveryId!,
        status: existing.existingStatus!,
      });
    } else {
      // Create new delivery
      const result = await createDeliveryIdempotent(delivery);
      results.set(key, result);
    }
  }

  return results;
}

// =============================================================================
// Cleanup
// =============================================================================

/**
 * Clean up old idempotency entries from Redis
 */
export async function cleanupIdempotencyCache(
  olderThanHours: number = 24
): Promise<number> {
  const redis = getRedis();
  let deleted = 0;

  try {
    // Scan for idempotency keys
    let cursor = '0';
    const keysToDelete: string[] = [];

    do {
      const [newCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        `${IDEMPOTENCY_KEY_PREFIX}*`,
        'COUNT',
        1000
      );

      cursor = newCursor;

      // Check TTL for each key
      for (const key of keys) {
        const ttl = await redis.ttl(key);

        // If no TTL or very long TTL, check age
        if (ttl === -1 || ttl > olderThanHours * 3600) {
          const value = await redis.get(key);
          if (value) {
            try {
              const data = JSON.parse(value) as { updatedAt?: string };
              if (data.updatedAt) {
                const age = Date.now() - new Date(data.updatedAt).getTime();
                if (age > olderThanHours * 3600 * 1000) {
                  keysToDelete.push(key);
                }
              }
            } catch {
              // Invalid data, delete
              keysToDelete.push(key);
            }
          }
        }
      }
    } while (cursor !== '0');

    // Delete old keys
    if (keysToDelete.length > 0) {
      deleted = await redis.del(...keysToDelete);
      logger.info({ deleted }, 'Cleaned up old idempotency entries');
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to cleanup idempotency cache');
  }

  return deleted;
}

// =============================================================================
// Export
// =============================================================================

export default {
  // Key generation
  generateIdempotencyKey,
  parseIdempotencyKey,
  generateDeliveryId,

  // Idempotency checks
  checkIdempotency,
  createDeliveryIdempotent,
  updateIdempotencyStatus,
  removeIdempotency,

  // Batch operations
  checkIdempotencyBatch,
  createDeliveriesBatch,

  // Locking
  acquireDeliveryLock,
  releaseDeliveryLock,
  extendDeliveryLock,
  isDeliveryLocked,

  // Cleanup
  cleanupIdempotencyCache,
};
