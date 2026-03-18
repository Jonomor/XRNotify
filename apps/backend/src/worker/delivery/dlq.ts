/**
 * @fileoverview XRNotify Dead Letter Queue
 * Manages failed deliveries that have exhausted all retry attempts.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/worker/delivery/dlq
 */

import { createModuleLogger } from '../../core/logger.js';
import { query, queryOne, queryAll } from '../../core/db.js';
import { publishToDlq, requestReplay } from '../../queue/publish.js';
import { recordDeliveryDlq } from '../../core/metrics.js';
import { uuid, nowISO } from '@xrnotify/shared';
import type { EventType } from '@xrnotify/shared';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('dlq');

/**
 * DLQ entry
 */
export interface DlqEntry {
  id: string;
  deliveryId: string;
  webhookId: string;
  eventId: string;
  tenantId: string;
  eventType: EventType;
  url: string;
  payload: string;
  finalError: string;
  finalErrorCode: string | null;
  finalStatusCode: number | null;
  totalAttempts: number;
  firstAttemptAt: Date;
  lastAttemptAt: Date;
  createdAt: Date;
  expiresAt: Date;
  status: DlqEntryStatus;
  requeuedAt: Date | null;
  requeuedBy: string | null;
  discardedAt: Date | null;
  discardedBy: string | null;
  discardReason: string | null;
  metadata: Record<string, unknown>;
}

/**
 * DLQ entry status
 */
export type DlqEntryStatus = 'pending' | 'requeued' | 'discarded' | 'expired';

/**
 * DLQ entry summary (for listing)
 */
export interface DlqEntrySummary {
  id: string;
  deliveryId: string;
  webhookId: string;
  eventId: string;
  eventType: EventType;
  finalError: string;
  finalErrorCode: string | null;
  totalAttempts: number;
  createdAt: Date;
  expiresAt: Date;
  status: DlqEntryStatus;
}

/**
 * DLQ statistics
 */
export interface DlqStats {
  totalEntries: number;
  pendingEntries: number;
  requeuedEntries: number;
  discardedEntries: number;
  expiredEntries: number;
  entriesByErrorCode: Record<string, number>;
  entriesByWebhook: Record<string, number>;
  oldestEntryAt: Date | null;
  newestEntryAt: Date | null;
}

/**
 * Move to DLQ parameters
 */
export interface MoveToDlqParams {
  deliveryId: string;
  webhookId: string;
  eventId: string;
  tenantId: string;
  eventType: EventType;
  url: string;
  payload: string;
  finalError: string;
  finalErrorCode?: string;
  finalStatusCode?: number;
  totalAttempts: number;
  firstAttemptAt: Date;
  lastAttemptAt: Date;
  retentionDays?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Requeue options
 */
export interface RequeueOptions {
  /**
   * Reset attempt count
   */
  resetAttempts?: boolean;

  /**
   * New max attempts
   */
  newMaxAttempts?: number;

  /**
   * Delay before first retry (ms)
   */
  initialDelayMs?: number;

  /**
   * User/system that requested requeue
   */
  requestedBy: string;
}

/**
 * DLQ query options
 */
export interface DlqQueryOptions {
  webhookId?: string;
  tenantId?: string;
  eventType?: EventType;
  errorCode?: string;
  status?: DlqEntryStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'expires_at' | 'total_attempts';
  orderDirection?: 'asc' | 'desc';
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_RETENTION_DAYS = 30;
const MAX_RETENTION_DAYS = 90;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

// =============================================================================
// Move to DLQ
// =============================================================================

/**
 * Move failed delivery to dead letter queue
 */
export async function moveToDlq(params: MoveToDlqParams): Promise<DlqEntry> {
  const retentionDays = Math.min(
    params.retentionDays ?? DEFAULT_RETENTION_DAYS,
    MAX_RETENTION_DAYS
  );

  const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
  const id = `dlq_${uuid()}`;

  // Insert into database
  const row = await queryOne<{
    id: string;
    delivery_id: string;
    webhook_id: string;
    event_id: string;
    tenant_id: string;
    event_type: EventType;
    url: string;
    payload: string;
    final_error: string;
    final_error_code: string | null;
    final_status_code: number | null;
    total_attempts: number;
    first_attempt_at: Date;
    last_attempt_at: Date;
    created_at: Date;
    expires_at: Date;
    status: DlqEntryStatus;
    requeued_at: Date | null;
    requeued_by: string | null;
    discarded_at: Date | null;
    discarded_by: string | null;
    discard_reason: string | null;
    metadata: Record<string, unknown>;
  }>(
    `INSERT INTO dlq_entries (
      id, delivery_id, webhook_id, event_id, tenant_id, event_type,
      url, payload, final_error, final_error_code, final_status_code,
      total_attempts, first_attempt_at, last_attempt_at,
      created_at, expires_at, status, metadata
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11,
      $12, $13, $14,
      NOW(), $15, 'pending', $16
    )
    RETURNING *`,
    [
      id,
      params.deliveryId,
      params.webhookId,
      params.eventId,
      params.tenantId,
      params.eventType,
      params.url,
      params.payload,
      params.finalError,
      params.finalErrorCode ?? null,
      params.finalStatusCode ?? null,
      params.totalAttempts,
      params.firstAttemptAt,
      params.lastAttemptAt,
      expiresAt,
      JSON.stringify(params.metadata ?? {}),
    ]
  );

  if (!row) {
    throw new Error('Failed to create DLQ entry');
  }

  // Update delivery status
  await query(
    `UPDATE deliveries SET status = 'dlq', updated_at = NOW() WHERE id = $1`,
    [params.deliveryId]
  );

  // Publish to Redis stream for monitoring
  await publishToDlq({
    deliveryId: params.deliveryId,
    webhookId: params.webhookId,
    eventId: params.eventId,
    tenantId: params.tenantId,
    eventType: params.eventType,
    finalError: params.finalError,
    finalErrorCode: params.finalErrorCode ?? null,
    totalAttempts: params.totalAttempts,
    createdAt: nowISO(),
    expiresAt: expiresAt.toISOString(),
  });

  // Record metric
  recordDeliveryDlq(params.eventType);

  logger.warn(
    {
      dlqId: id,
      deliveryId: params.deliveryId,
      webhookId: params.webhookId,
      eventId: params.eventId,
      error: params.finalError,
      attempts: params.totalAttempts,
      expiresAt,
    },
    'Delivery moved to DLQ'
  );

  return rowToDlqEntry(row);
}

// =============================================================================
// Query DLQ
// =============================================================================

/**
 * Get DLQ entry by ID
 */
export async function getDlqEntry(id: string): Promise<DlqEntry | null> {
  const row = await queryOne<DlqEntryRow>(
    `SELECT * FROM dlq_entries WHERE id = $1`,
    [id]
  );

  return row ? rowToDlqEntry(row) : null;
}

/**
 * Get DLQ entry by delivery ID
 */
export async function getDlqEntryByDeliveryId(deliveryId: string): Promise<DlqEntry | null> {
  const row = await queryOne<DlqEntryRow>(
    `SELECT * FROM dlq_entries WHERE delivery_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [deliveryId]
  );

  return row ? rowToDlqEntry(row) : null;
}

/**
 * List DLQ entries
 */
export async function listDlqEntries(
  options: DlqQueryOptions = {}
): Promise<{ entries: DlqEntrySummary[]; total: number }> {
  const {
    webhookId,
    tenantId,
    eventType,
    errorCode,
    status,
    startDate,
    endDate,
    limit = DEFAULT_PAGE_SIZE,
    offset = 0,
    orderBy = 'created_at',
    orderDirection = 'desc',
  } = options;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (webhookId) {
    conditions.push(`webhook_id = $${paramIndex++}`);
    params.push(webhookId);
  }

  if (tenantId) {
    conditions.push(`tenant_id = $${paramIndex++}`);
    params.push(tenantId);
  }

  if (eventType) {
    conditions.push(`event_type = $${paramIndex++}`);
    params.push(eventType);
  }

  if (errorCode) {
    conditions.push(`final_error_code = $${paramIndex++}`);
    params.push(errorCode);
  }

  if (status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(status);
  }

  if (startDate) {
    conditions.push(`created_at >= $${paramIndex++}`);
    params.push(startDate);
  }

  if (endDate) {
    conditions.push(`created_at <= $${paramIndex++}`);
    params.push(endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Validate order by
  const validOrderBy = ['created_at', 'expires_at', 'total_attempts'].includes(orderBy)
    ? orderBy
    : 'created_at';
  const validDirection = orderDirection === 'asc' ? 'ASC' : 'DESC';

  // Get total count
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM dlq_entries ${whereClause}`,
    params
  );

  const total = parseInt(countResult?.count ?? '0', 10);

  // Get entries
  const effectiveLimit = Math.min(limit, MAX_PAGE_SIZE);

  const rows = await queryAll<{
    id: string;
    delivery_id: string;
    webhook_id: string;
    event_id: string;
    event_type: EventType;
    final_error: string;
    final_error_code: string | null;
    total_attempts: number;
    created_at: Date;
    expires_at: Date;
    status: DlqEntryStatus;
  }>(
    `SELECT 
      id, delivery_id, webhook_id, event_id, event_type,
      final_error, final_error_code, total_attempts,
      created_at, expires_at, status
     FROM dlq_entries
     ${whereClause}
     ORDER BY ${validOrderBy} ${validDirection}
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, effectiveLimit, offset]
  );

  const entries: DlqEntrySummary[] = rows.map((row) => ({
    id: row.id,
    deliveryId: row.delivery_id,
    webhookId: row.webhook_id,
    eventId: row.event_id,
    eventType: row.event_type,
    finalError: row.final_error,
    finalErrorCode: row.final_error_code,
    totalAttempts: row.total_attempts,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    status: row.status,
  }));

  return { entries, total };
}

/**
 * Get DLQ entries for webhook
 */
export async function getDlqEntriesForWebhook(
  webhookId: string,
  options: { limit?: number; status?: DlqEntryStatus } = {}
): Promise<DlqEntrySummary[]> {
  const result = await listDlqEntries({
    webhookId,
    status: options.status,
    limit: options.limit ?? 100,
  });

  return result.entries;
}

/**
 * Get DLQ entries for tenant
 */
export async function getDlqEntriesForTenant(
  tenantId: string,
  options: { limit?: number; status?: DlqEntryStatus } = {}
): Promise<DlqEntrySummary[]> {
  const result = await listDlqEntries({
    tenantId,
    status: options.status,
    limit: options.limit ?? 100,
  });

  return result.entries;
}

// =============================================================================
// Requeue
// =============================================================================

/**
 * Requeue DLQ entry for retry
 */
export async function requeueDlqEntry(
  dlqId: string,
  options: RequeueOptions
): Promise<{ success: boolean; newDeliveryId?: string; error?: string }> {
  // Get DLQ entry
  const entry = await getDlqEntry(dlqId);

  if (!entry) {
    return { success: false, error: 'DLQ entry not found' };
  }

  if (entry.status !== 'pending') {
    return { success: false, error: `Cannot requeue entry with status: ${entry.status}` };
  }

  // Check if webhook still exists and is active
  const webhook = await queryOne<{ id: string; active: boolean }>(
    `SELECT id, active FROM webhooks WHERE id = $1`,
    [entry.webhookId]
  );

  if (!webhook) {
    return { success: false, error: 'Webhook no longer exists' };
  }

  if (!webhook.active) {
    return { success: false, error: 'Webhook is not active' };
  }

  try {
    // Create replay request
    const replayResult = await requestReplay({
      eventId: entry.eventId,
      webhookId: entry.webhookId,
      tenantId: entry.tenantId,
      eventType: entry.eventType,
      requestedBy: options.requestedBy,
    });

    if (!replayResult.success) {
      return { success: false, error: 'Failed to create replay request' };
    }

    // Update DLQ entry
    await query(
      `UPDATE dlq_entries SET
        status = 'requeued',
        requeued_at = NOW(),
        requeued_by = $2,
        metadata = metadata || $3
       WHERE id = $1`,
      [
        dlqId,
        options.requestedBy,
        JSON.stringify({
          requeue_options: {
            reset_attempts: options.resetAttempts ?? false,
            new_max_attempts: options.newMaxAttempts,
            initial_delay_ms: options.initialDelayMs,
          },
        }),
      ]
    );

    logger.info(
      {
        dlqId,
        deliveryId: entry.deliveryId,
        eventId: entry.eventId,
        requestedBy: options.requestedBy,
      },
      'DLQ entry requeued'
    );

    return { success: true, newDeliveryId: entry.deliveryId };
  } catch (error) {
    logger.error({ err: error, dlqId }, 'Failed to requeue DLQ entry');
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Bulk requeue DLQ entries
 */
export async function requeueDlqEntries(
  dlqIds: string[],
  options: RequeueOptions
): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ dlqId: string; error: string }>;
}> {
  const errors: Array<{ dlqId: string; error: string }> = [];
  let succeeded = 0;
  let failed = 0;

  for (const dlqId of dlqIds) {
    const result = await requeueDlqEntry(dlqId, options);

    if (result.success) {
      succeeded++;
    } else {
      failed++;
      errors.push({ dlqId, error: result.error ?? 'Unknown error' });
    }
  }

  return {
    total: dlqIds.length,
    succeeded,
    failed,
    errors,
  };
}

// =============================================================================
// Discard
// =============================================================================

/**
 * Discard DLQ entry
 */
export async function discardDlqEntry(
  dlqId: string,
  reason: string,
  discardedBy: string
): Promise<boolean> {
  const result = await query(
    `UPDATE dlq_entries SET
      status = 'discarded',
      discarded_at = NOW(),
      discarded_by = $2,
      discard_reason = $3
     WHERE id = $1 AND status = 'pending'`,
    [dlqId, discardedBy, reason]
  );

  const updated = result.rowCount > 0;

  if (updated) {
    logger.info({ dlqId, reason, discardedBy }, 'DLQ entry discarded');
  }

  return updated;
}

/**
 * Bulk discard DLQ entries
 */
export async function discardDlqEntries(
  dlqIds: string[],
  reason: string,
  discardedBy: string
): Promise<number> {
  const result = await query(
    `UPDATE dlq_entries SET
      status = 'discarded',
      discarded_at = NOW(),
      discarded_by = $2,
      discard_reason = $3
     WHERE id = ANY($1) AND status = 'pending'`,
    [dlqIds, discardedBy, reason]
  );

  const count = result.rowCount;

  if (count > 0) {
    logger.info({ count, reason, discardedBy }, 'DLQ entries discarded');
  }

  return count;
}

/**
 * Discard all DLQ entries for webhook
 */
export async function discardAllForWebhook(
  webhookId: string,
  reason: string,
  discardedBy: string
): Promise<number> {
  const result = await query(
    `UPDATE dlq_entries SET
      status = 'discarded',
      discarded_at = NOW(),
      discarded_by = $2,
      discard_reason = $3
     WHERE webhook_id = $1 AND status = 'pending'`,
    [webhookId, discardedBy, reason]
  );

  const count = result.rowCount;

  if (count > 0) {
    logger.info({ webhookId, count, reason, discardedBy }, 'Webhook DLQ entries discarded');
  }

  return count;
}

// =============================================================================
// Expiration
// =============================================================================

/**
 * Expire old DLQ entries
 */
export async function expireOldEntries(): Promise<number> {
  const result = await query(
    `UPDATE dlq_entries SET
      status = 'expired'
     WHERE status = 'pending' AND expires_at < NOW()`
  );

  const count = result.rowCount;

  if (count > 0) {
    logger.info({ count }, 'Expired DLQ entries');
  }

  return count;
}

/**
 * Purge old expired/discarded entries
 */
export async function purgeOldEntries(olderThanDays: number = 90): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const result = await query(
    `DELETE FROM dlq_entries
     WHERE status IN ('expired', 'discarded', 'requeued')
       AND created_at < $1`,
    [cutoff]
  );

  const count = result.rowCount;

  if (count > 0) {
    logger.info({ count, olderThanDays }, 'Purged old DLQ entries');
  }

  return count;
}

// =============================================================================
// Statistics
// =============================================================================

/**
 * Get DLQ statistics
 */
export async function getDlqStats(tenantId?: string): Promise<DlqStats> {
  const whereClause = tenantId ? 'WHERE tenant_id = $1' : '';
  const params = tenantId ? [tenantId] : [];

  // Get counts by status
  const statusCounts = await queryAll<{ status: DlqEntryStatus; count: string }>(
    `SELECT status, COUNT(*) as count
     FROM dlq_entries
     ${whereClause}
     GROUP BY status`,
    params
  );

  const countsByStatus: Record<DlqEntryStatus, number> = {
    pending: 0,
    requeued: 0,
    discarded: 0,
    expired: 0,
  };

  for (const row of statusCounts) {
    countsByStatus[row.status] = parseInt(row.count, 10);
  }

  // Get counts by error code
  const errorCodeCounts = await queryAll<{ final_error_code: string; count: string }>(
    `SELECT COALESCE(final_error_code, 'UNKNOWN') as final_error_code, COUNT(*) as count
     FROM dlq_entries
     ${whereClause ? whereClause + ' AND status = \'pending\'' : 'WHERE status = \'pending\''}
     GROUP BY final_error_code`,
    params
  );

  const entriesByErrorCode: Record<string, number> = {};
  for (const row of errorCodeCounts) {
    entriesByErrorCode[row.final_error_code] = parseInt(row.count, 10);
  }

  // Get counts by webhook
  const webhookCounts = await queryAll<{ webhook_id: string; count: string }>(
    `SELECT webhook_id, COUNT(*) as count
     FROM dlq_entries
     ${whereClause ? whereClause + ' AND status = \'pending\'' : 'WHERE status = \'pending\''}
     GROUP BY webhook_id
     ORDER BY count DESC
     LIMIT 10`,
    params
  );

  const entriesByWebhook: Record<string, number> = {};
  for (const row of webhookCounts) {
    entriesByWebhook[row.webhook_id] = parseInt(row.count, 10);
  }

  // Get date range
  const dateRange = await queryOne<{ oldest: Date | null; newest: Date | null }>(
    `SELECT MIN(created_at) as oldest, MAX(created_at) as newest
     FROM dlq_entries
     ${whereClause ? whereClause + ' AND status = \'pending\'' : 'WHERE status = \'pending\''}`,
    params
  );

  return {
    totalEntries: Object.values(countsByStatus).reduce((a, b) => a + b, 0),
    pendingEntries: countsByStatus.pending,
    requeuedEntries: countsByStatus.requeued,
    discardedEntries: countsByStatus.discarded,
    expiredEntries: countsByStatus.expired,
    entriesByErrorCode,
    entriesByWebhook,
    oldestEntryAt: dateRange?.oldest ?? null,
    newestEntryAt: dateRange?.newest ?? null,
  };
}

/**
 * Get DLQ health status
 */
export async function getDlqHealth(): Promise<{
  healthy: boolean;
  pendingCount: number;
  issues: string[];
}> {
  const issues: string[] = [];

  // Get pending count
  const result = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM dlq_entries WHERE status = 'pending'`
  );

  const pendingCount = parseInt(result?.count ?? '0', 10);

  // Check for issues
  if (pendingCount > 1000) {
    issues.push(`High pending DLQ entries: ${pendingCount}`);
  }

  // Check for very old entries
  const oldEntries = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM dlq_entries
     WHERE status = 'pending'
       AND created_at < NOW() - INTERVAL '7 days'`
  );

  const oldCount = parseInt(oldEntries?.count ?? '0', 10);
  if (oldCount > 100) {
    issues.push(`${oldCount} entries older than 7 days`);
  }

  return {
    healthy: issues.length === 0,
    pendingCount,
    issues,
  };
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Database row type
 */
interface DlqEntryRow {
  id: string;
  delivery_id: string;
  webhook_id: string;
  event_id: string;
  tenant_id: string;
  event_type: EventType;
  url: string;
  payload: string;
  final_error: string;
  final_error_code: string | null;
  final_status_code: number | null;
  total_attempts: number;
  first_attempt_at: Date;
  last_attempt_at: Date;
  created_at: Date;
  expires_at: Date;
  status: DlqEntryStatus;
  requeued_at: Date | null;
  requeued_by: string | null;
  discarded_at: Date | null;
  discarded_by: string | null;
  discard_reason: string | null;
  metadata: Record<string, unknown>;
}

/**
 * Convert database row to DLQ entry
 */
function rowToDlqEntry(row: DlqEntryRow): DlqEntry {
  return {
    id: row.id,
    deliveryId: row.delivery_id,
    webhookId: row.webhook_id,
    eventId: row.event_id,
    tenantId: row.tenant_id,
    eventType: row.event_type,
    url: row.url,
    payload: row.payload,
    finalError: row.final_error,
    finalErrorCode: row.final_error_code,
    finalStatusCode: row.final_status_code,
    totalAttempts: row.total_attempts,
    firstAttemptAt: row.first_attempt_at,
    lastAttemptAt: row.last_attempt_at,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    status: row.status,
    requeuedAt: row.requeued_at,
    requeuedBy: row.requeued_by,
    discardedAt: row.discarded_at,
    discardedBy: row.discarded_by,
    discardReason: row.discard_reason,
    metadata: row.metadata,
  };
}

// =============================================================================
// Export
// =============================================================================

export default {
  // Move to DLQ
  moveToDlq,

  // Query
  getDlqEntry,
  getDlqEntryByDeliveryId,
  listDlqEntries,
  getDlqEntriesForWebhook,
  getDlqEntriesForTenant,

  // Requeue
  requeueDlqEntry,
  requeueDlqEntries,

  // Discard
  discardDlqEntry,
  discardDlqEntries,
  discardAllForWebhook,

  // Expiration
  expireOldEntries,
  purgeOldEntries,

  // Statistics
  getDlqStats,
  getDlqHealth,
};
