// =============================================================================
// XRNotify Platform - Webhook Service
// =============================================================================
// Webhook CRUD operations, event matching, subscription management
// =============================================================================

import type { Webhook, EventType, CreateWebhookInput, UpdateWebhookInput } from '@xrnotify/shared';
import { generateWebhookSecret, EVENT_TYPES } from '@xrnotify/shared';
import { uuid, nowISO } from '@xrnotify/shared';
import { query, queryOne, queryAll, withTransaction, type PoolClient } from '../db';
import { getJson, setJson, del, invalidatePattern } from '../redis';
import { createModuleLogger } from '../logger';
import { validateWebhookUrl, validateWebhookUrlSync } from './urlPolicy';
import { setActiveWebhooks } from '../metrics';
import { parseJsonArray } from '../utils/db';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface WebhookWithSecret extends Webhook {
  /** Only returned on creation */
  secret: string;
}

export interface WebhookFilter {
  tenantId: string;
  isActive?: boolean;
  eventTypes?: EventType[];
  limit?: number;
  offset?: number;
}

export interface WebhookMatch {
  webhookId: string;
  url: string;
  secret: string;
  metadata?: Record<string, unknown>;
}

export interface WebhookStats {
  total: number;
  active: number;
  byEventType: Record<string, number>;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const WEBHOOK_CACHE_PREFIX = 'webhook:';
const WEBHOOK_LIST_CACHE_PREFIX = 'webhooks:tenant:';
const WEBHOOK_MATCH_CACHE_PREFIX = 'webhook:match:';
const CACHE_TTL = 300; // 5 minutes

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = createModuleLogger('webhook-service');

// -----------------------------------------------------------------------------
// Create Webhook
// -----------------------------------------------------------------------------

/**
 * Create a new webhook subscription
 */
export async function createWebhook(
  tenantId: string,
  input: CreateWebhookInput
): Promise<WebhookWithSecret> {
  // Validate URL synchronously first
  const syncValidation = validateWebhookUrlSync(input.url);
  if (!syncValidation.valid) {
    throw new WebhookValidationError(syncValidation.error ?? 'Invalid URL', 'URL_INVALID');
  }

  // Full async validation with DNS
  const asyncValidation = await validateWebhookUrl(input.url);
  if (!asyncValidation.valid) {
    throw new WebhookValidationError(asyncValidation.error ?? 'Invalid URL', 'URL_VALIDATION_FAILED');
  }

  // Validate event types
  for (const eventType of input.event_types) {
    if (!EVENT_TYPES.includes(eventType)) {
      throw new WebhookValidationError(`Invalid event type: ${eventType}`, 'INVALID_EVENT_TYPE');
    }
  }

  // Generate secret
  const { secret, prefix } = generateWebhookSecret();
  const webhookId = uuid();

  const webhook = await queryOne<Webhook>(`
    INSERT INTO webhooks (
      id,
      tenant_id,
      url,
      secret,
      secret_prefix,
      event_types,
      account_filters,
      description,
      metadata,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING 
      id,
      tenant_id,
      url,
      secret_prefix,
      event_types,
      account_filters,
      description,
      metadata,
      is_active,
      consecutive_failures,
      last_delivery_at,
      last_success_at,
      last_failure_at,
      created_at,
      updated_at
  `, [
    webhookId,
    tenantId,
    input.url,
    secret,
    prefix,
    input.event_types,
    input.account_filters ?? [],
    input.description ?? null,
    input.metadata ?? {},
    true,
  ]);

  if (!webhook) {
    throw new Error('Failed to create webhook');
  }

  // Invalidate caches
  await invalidateWebhookCaches(tenantId);

  // Update metrics
  await updateWebhookMetrics();

  logger.info({ 
    webhookId: webhook.id, 
    tenantId, 
    url: maskUrl(input.url),
    eventTypes: input.event_types,
  }, 'Webhook created');

  return {
    ...formatWebhook(webhook),
    secret, // Only returned on creation
  };
}

// -----------------------------------------------------------------------------
// Get Webhook
// -----------------------------------------------------------------------------

/**
 * Get a webhook by ID
 */
export async function getWebhook(
  webhookId: string,
  tenantId: string
): Promise<Webhook | null> {
  // Try cache first
  const cacheKey = `${WEBHOOK_CACHE_PREFIX}${webhookId}`;
  const cached = await getJson<Webhook>(cacheKey);
  
  if (cached && cached.tenant_id === tenantId) {
    return cached;
  }

  const webhook = await queryOne<Webhook>(`
    SELECT 
      id,
      tenant_id,
      url,
      secret_prefix,
      event_types,
      account_filters,
      description,
      metadata,
      is_active,
      consecutive_failures,
      last_delivery_at,
      last_success_at,
      last_failure_at,
      created_at,
      updated_at
    FROM webhooks
    WHERE id = $1 AND tenant_id = $2
  `, [webhookId, tenantId]);

  if (!webhook) {
    return null;
  }

  const formatted = formatWebhook(webhook);

  // Cache the result
  await setJson(cacheKey, formatted, CACHE_TTL);

  return formatted;
}

/**
 * Get webhook with secret (for delivery)
 */
export async function getWebhookWithSecret(webhookId: string): Promise<{
  webhook: Webhook;
  secret: string;
} | null> {
  const row = await queryOne<Webhook & { secret: string }>(`
    SELECT 
      id,
      tenant_id,
      url,
      secret,
      secret_prefix,
      event_types,
      account_filters,
      description,
      metadata,
      is_active,
      consecutive_failures,
      last_delivery_at,
      last_success_at,
      last_failure_at,
      created_at,
      updated_at
    FROM webhooks
    WHERE id = $1
  `, [webhookId]);

  if (!row) {
    return null;
  }

  return {
    webhook: formatWebhook(row),
    secret: row.secret,
  };
}

// -----------------------------------------------------------------------------
// List Webhooks
// -----------------------------------------------------------------------------

/**
 * List webhooks for a tenant
 */
export async function listWebhooks(filter: WebhookFilter): Promise<{
  webhooks: Webhook[];
  total: number;
}> {
  const { tenantId, isActive, eventTypes, limit = 50, offset = 0 } = filter;

  // Build query conditions
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let paramIndex = 2;

  if (isActive !== undefined) {
    conditions.push(`is_active = $${paramIndex}`);
    params.push(isActive);
    paramIndex++;
  }

  if (eventTypes && eventTypes.length > 0) {
    conditions.push(`event_types && $${paramIndex}`);
    params.push(eventTypes);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = await queryOne<{ count: string }>(`
    SELECT COUNT(*) as count FROM webhooks WHERE ${whereClause}
  `, params);

  const total = parseInt(countResult?.count ?? '0', 10);

  // Get webhooks
  const webhooks = await queryAll<Webhook>(`
    SELECT 
      id,
      tenant_id,
      url,
      secret_prefix,
      event_types,
      account_filters,
      description,
      metadata,
      is_active,
      consecutive_failures,
      last_delivery_at,
      last_success_at,
      last_failure_at,
      created_at,
      updated_at
    FROM webhooks
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `, [...params, limit, offset]);

  return {
    webhooks: webhooks.map(formatWebhook),
    total,
  };
}

// -----------------------------------------------------------------------------
// Update Webhook
// -----------------------------------------------------------------------------

/**
 * Update a webhook
 */
export async function updateWebhook(
  webhookId: string,
  tenantId: string,
  input: UpdateWebhookInput
): Promise<Webhook | null> {
  // If URL is being updated, validate it
  if (input.url) {
    const syncValidation = validateWebhookUrlSync(input.url);
    if (!syncValidation.valid) {
      throw new WebhookValidationError(syncValidation.error ?? 'Invalid URL', 'URL_INVALID');
    }

    const asyncValidation = await validateWebhookUrl(input.url);
    if (!asyncValidation.valid) {
      throw new WebhookValidationError(asyncValidation.error ?? 'Invalid URL', 'URL_VALIDATION_FAILED');
    }
  }

  // Validate event types if provided
  if (input.event_types) {
    for (const eventType of input.event_types) {
      if (!EVENT_TYPES.includes(eventType)) {
        throw new WebhookValidationError(`Invalid event type: ${eventType}`, 'INVALID_EVENT_TYPE');
      }
    }
  }

  // Build update query dynamically
  const updates: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (input.url !== undefined) {
    updates.push(`url = $${paramIndex}`);
    params.push(input.url);
    paramIndex++;
  }

  if (input.event_types !== undefined) {
    updates.push(`event_types = $${paramIndex}`);
    params.push(input.event_types);
    paramIndex++;
  }

  if (input.account_filters !== undefined) {
    updates.push(`account_filters = $${paramIndex}`);
    params.push(input.account_filters);
    paramIndex++;
  }

  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex}`);
    params.push(input.description);
    paramIndex++;
  }

  if (input.metadata !== undefined) {
    updates.push(`metadata = $${paramIndex}`);
    params.push(input.metadata);
    paramIndex++;
  }

  if (input.is_active !== undefined) {
    updates.push(`is_active = $${paramIndex}`);
    params.push(input.is_active);
    paramIndex++;

    // Reset consecutive failures when reactivating
    if (input.is_active === true) {
      updates.push('consecutive_failures = 0');
    }
  }

  // Add webhook ID and tenant ID
  params.push(webhookId, tenantId);

  const webhook = await queryOne<Webhook>(`
    UPDATE webhooks
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
    RETURNING 
      id,
      tenant_id,
      url,
      secret_prefix,
      event_types,
      account_filters,
      description,
      metadata,
      is_active,
      consecutive_failures,
      last_delivery_at,
      last_success_at,
      last_failure_at,
      created_at,
      updated_at
  `, params);

  if (!webhook) {
    return null;
  }

  // Invalidate caches
  await invalidateWebhookCaches(tenantId, webhookId);

  // Update metrics
  await updateWebhookMetrics();

  logger.info({ webhookId, tenantId }, 'Webhook updated');

  return formatWebhook(webhook);
}

// -----------------------------------------------------------------------------
// Delete Webhook
// -----------------------------------------------------------------------------

/**
 * Delete a webhook
 */
export async function deleteWebhook(
  webhookId: string,
  tenantId: string
): Promise<boolean> {
  const result = await query(`
    DELETE FROM webhooks
    WHERE id = $1 AND tenant_id = $2
    RETURNING id
  `, [webhookId, tenantId]);

  if (result.rowCount === 0) {
    return false;
  }

  // Invalidate caches
  await invalidateWebhookCaches(tenantId, webhookId);

  // Update metrics
  await updateWebhookMetrics();

  logger.info({ webhookId, tenantId }, 'Webhook deleted');

  return true;
}

// -----------------------------------------------------------------------------
// Rotate Secret
// -----------------------------------------------------------------------------

/**
 * Rotate webhook secret
 */
export async function rotateWebhookSecret(
  webhookId: string,
  tenantId: string
): Promise<{ secret: string } | null> {
  const { secret, prefix } = generateWebhookSecret();

  const result = await query(`
    UPDATE webhooks
    SET secret = $1, secret_prefix = $2, updated_at = NOW()
    WHERE id = $3 AND tenant_id = $4
    RETURNING id
  `, [secret, prefix, webhookId, tenantId]);

  if (result.rowCount === 0) {
    return null;
  }

  // Invalidate caches
  await invalidateWebhookCaches(tenantId, webhookId);

  logger.info({ webhookId, tenantId }, 'Webhook secret rotated');

  return { secret };
}

// -----------------------------------------------------------------------------
// Event Matching
// -----------------------------------------------------------------------------

/**
 * Find webhooks that match an event
 */
export async function findMatchingWebhooks(
  eventType: EventType,
  accounts: string[]
): Promise<WebhookMatch[]> {
  // Find all active webhooks that:
  // 1. Subscribe to this event type
  // 2. Either have no account filters OR have matching account filters
  const webhooks = await queryAll<{
    id: string;
    url: string;
    secret: string;
    metadata: Record<string, unknown>;
    account_filters: string[];
  }>(`
    SELECT id, url, secret, metadata, account_filters
    FROM webhooks
    WHERE is_active = true
      AND $1 = ANY(event_types)
      AND (
        account_filters = '{}' 
        OR account_filters && $2
      )
  `, [eventType, accounts]);

  return webhooks.map((w) => ({
    webhookId: w.id,
    url: w.url,
    secret: w.secret,
    metadata: w.metadata,
  }));
}

/**
 * Find webhooks for a tenant that match an event
 */
export async function findTenantMatchingWebhooks(
  tenantId: string,
  eventType: EventType,
  accounts: string[]
): Promise<WebhookMatch[]> {
  const webhooks = await queryAll<{
    id: string;
    url: string;
    secret: string;
    metadata: Record<string, unknown>;
    account_filters: string[];
  }>(`
    SELECT id, url, secret, metadata, account_filters
    FROM webhooks
    WHERE tenant_id = $1
      AND is_active = true
      AND $2 = ANY(event_types)
      AND (
        account_filters = '{}' 
        OR account_filters && $3
      )
  `, [tenantId, eventType, accounts]);

  return webhooks.map((w) => ({
    webhookId: w.id,
    url: w.url,
    secret: w.secret,
    metadata: w.metadata,
  }));
}

// -----------------------------------------------------------------------------
// Delivery Status Updates
// -----------------------------------------------------------------------------

/**
 * Record successful delivery
 */
export async function recordDeliverySuccess(webhookId: string): Promise<void> {
  await query(`
    UPDATE webhooks
    SET 
      last_delivery_at = NOW(),
      last_success_at = NOW(),
      consecutive_failures = 0,
      updated_at = NOW()
    WHERE id = $1
  `, [webhookId]);

  await del(`${WEBHOOK_CACHE_PREFIX}${webhookId}`);
}

/**
 * Record failed delivery
 */
export async function recordDeliveryFailure(
  webhookId: string,
  maxFailures: number = 10
): Promise<{ disabled: boolean }> {
  const result = await queryOne<{ consecutive_failures: number; is_active: boolean }>(`
    UPDATE webhooks
    SET 
      last_delivery_at = NOW(),
      last_failure_at = NOW(),
      consecutive_failures = consecutive_failures + 1,
      is_active = CASE 
        WHEN consecutive_failures + 1 >= $2 THEN false 
        ELSE is_active 
      END,
      updated_at = NOW()
    WHERE id = $1
    RETURNING consecutive_failures, is_active
  `, [webhookId, maxFailures]);

  await del(`${WEBHOOK_CACHE_PREFIX}${webhookId}`);

  const disabled = result ? !result.is_active && result.consecutive_failures >= maxFailures : false;

  if (disabled) {
    logger.warn({ webhookId, failures: result?.consecutive_failures }, 'Webhook disabled due to consecutive failures');
  }

  return { disabled };
}

// -----------------------------------------------------------------------------
// Stats
// -----------------------------------------------------------------------------

/**
 * Get webhook stats for a tenant
 */
export async function getWebhookStats(tenantId: string): Promise<WebhookStats> {
  const result = await queryOne<{
    total: string;
    active: string;
  }>(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_active = true) as active
    FROM webhooks
    WHERE tenant_id = $1
  `, [tenantId]);

  // Get event type breakdown
  const eventTypeResult = await queryAll<{ event_type: string; count: string }>(`
    SELECT unnest(event_types) as event_type, COUNT(*) as count
    FROM webhooks
    WHERE tenant_id = $1 AND is_active = true
    GROUP BY event_type
  `, [tenantId]);

  const byEventType: Record<string, number> = {};
  for (const row of eventTypeResult) {
    byEventType[row.event_type] = parseInt(row.count, 10);
  }

  return {
    total: parseInt(result?.total ?? '0', 10),
    active: parseInt(result?.active ?? '0', 10),
    byEventType,
  };
}

// -----------------------------------------------------------------------------
// Cache Management
// -----------------------------------------------------------------------------

/**
 * Invalidate webhook caches
 */
async function invalidateWebhookCaches(tenantId: string, webhookId?: string): Promise<void> {
  const promises: Promise<unknown>[] = [
    del(`${WEBHOOK_LIST_CACHE_PREFIX}${tenantId}`),
    invalidatePattern(`${WEBHOOK_MATCH_CACHE_PREFIX}*`),
  ];

  if (webhookId) {
    promises.push(del(`${WEBHOOK_CACHE_PREFIX}${webhookId}`));
  }

  await Promise.all(promises);
}

/**
 * Update webhook metrics
 */
async function updateWebhookMetrics(): Promise<void> {
  try {
    const result = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM webhooks WHERE is_active = true
    `);
    setActiveWebhooks(parseInt(result?.count ?? '0', 10));
  } catch (error) {
    logger.error({ error }, 'Failed to update webhook metrics');
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Format webhook from database row
 */
function formatWebhook(row: Webhook): Webhook {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    url: row.url,
    secret_prefix: row.secret_prefix,
    event_types: parseJsonArray(row.event_types) as Webhook['event_types'],
    account_filters: parseJsonArray(row.account_filters),
    description: row.description ?? undefined,
    metadata: row.metadata ?? {},
    is_active: row.is_active,
    consecutive_failures: row.consecutive_failures ?? 0,
    last_delivery_at: row.last_delivery_at ?? undefined,
    last_success_at: row.last_success_at ?? undefined,
    last_failure_at: row.last_failure_at ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Mask URL for logging
 */
function maskUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}/***`;
  } catch {
    return '[invalid-url]';
  }
}

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

export class WebhookValidationError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'WebhookValidationError';
    this.code = code;
  }
}
