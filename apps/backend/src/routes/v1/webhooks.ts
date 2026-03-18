/**
 * @fileoverview XRNotify Webhooks Routes
 * CRUD operations for webhook management.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/routes/v1/webhooks
 */

import { type FastifyPluginAsync, type FastifyRequest, type FastifyReply } from 'fastify';
import { createModuleLogger } from '../../core/logger.js';
import { query, queryOne, queryAll, withTransaction } from '../../core/db.js';
import { del, invalidatePattern } from '../../core/redis.js';
import {
  authenticateApiKey,
  requireScopes,
  getTenantId,
  Scopes,
} from '../../middleware/authApiKey.js';
import { webhookCreateRateLimiter } from '../../middleware/rateLimit.js';
import { validateWebhookUrl } from '../../core/http.js';
import { recordWebhookOperation } from '../../core/metrics.js';
import {
  createSuccessResponse,
  createPaginatedResponse,
  createErrorResponse,
} from '../index.js';
import {
  generateWebhookSecret,
  hashAPIKey,
  getAPIKeyPrefix,
  uuid,
  nowISO,
} from '@xrnotify/shared';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('webhooks-routes');

/**
 * Event type enum values
 */
const EVENT_TYPES = [
  'payment.xrp',
  'payment.issued',
  'trustline.created',
  'trustline.modified',
  'trustline.removed',
  'nft.minted',
  'nft.burned',
  'nft.offer_created',
  'nft.offer_accepted',
  'nft.offer_cancelled',
  'dex.offer_created',
  'dex.offer_cancelled',
  'dex.offer_filled',
  'dex.offer_partially_filled',
  'account.settings_changed',
  'account.deleted',
  'escrow.created',
  'escrow.finished',
  'escrow.cancelled',
  'check.created',
  'check.cashed',
  'check.cancelled',
] as const;

type EventType = typeof EVENT_TYPES[number];

/**
 * Network type
 */
type XrplNetwork = 'mainnet' | 'testnet' | 'devnet';

/**
 * Webhook database row
 */
interface WebhookRow {
  id: string;
  tenant_id: string;
  url: string;
  description: string | null;
  events: EventType[];
  filter_accounts: string[] | null;
  filter_network: XrplNetwork | null;
  filter_min_xrp_amount: string | null;
  secret_hash: string;
  secret_prefix: string;
  active: boolean;
  disabled_reason: string | null;
  retry_max_attempts: number;
  timeout_ms: number;
  total_deliveries: string;
  successful_deliveries: string;
  failed_deliveries: string;
  last_delivery_at: Date | null;
  last_success_at: Date | null;
  last_failure_at: Date | null;
  last_failure_reason: string | null;
  consecutive_failures: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Webhook API response (safe)
 */
interface WebhookResponse {
  id: string;
  url: string;
  description: string | null;
  events: EventType[];
  filter: {
    accounts: string[] | null;
    network: XrplNetwork | null;
    min_xrp_amount: string | null;
  };
  active: boolean;
  disabled_reason: string | null;
  config: {
    retry_max_attempts: number;
    timeout_ms: number;
  };
  stats: {
    total_deliveries: number;
    successful_deliveries: number;
    failed_deliveries: number;
    success_rate: number;
    last_delivery_at: string | null;
    last_success_at: string | null;
    last_failure_at: string | null;
    last_failure_reason: string | null;
    consecutive_failures: number;
  };
  secret_prefix: string;
  created_at: string;
  updated_at: string;
}

/**
 * Webhook created response (includes secret once)
 */
interface WebhookCreatedResponse extends WebhookResponse {
  secret: string;
}

/**
 * Create webhook request body
 */
interface CreateWebhookBody {
  url: string;
  description?: string;
  events: EventType[];
  filter?: {
    accounts?: string[];
    network?: XrplNetwork;
    min_xrp_amount?: number;
  };
  config?: {
    retry_max_attempts?: number;
    timeout_ms?: number;
  };
}

/**
 * Update webhook request body
 */
interface UpdateWebhookBody {
  url?: string;
  description?: string;
  events?: EventType[];
  filter?: {
    accounts?: string[] | null;
    network?: XrplNetwork | null;
    min_xrp_amount?: number | null;
  };
  config?: {
    retry_max_attempts?: number;
    timeout_ms?: number;
  };
  active?: boolean;
}

/**
 * List webhooks query params
 */
interface ListWebhooksQuery {
  limit?: number;
  offset?: number;
  active?: boolean;
  event_type?: EventType;
}

/**
 * Test webhook request body
 */
interface TestWebhookBody {
  event_type?: EventType;
}

// =============================================================================
// Constants
// =============================================================================

const WEBHOOK_CACHE_PREFIX = 'webhook:';
const MAX_ACCOUNTS_FILTER = 100;
const MAX_EVENTS = 20;
const DEFAULT_RETRY_MAX_ATTEMPTS = 5;
const DEFAULT_TIMEOUT_MS = 10000;
const MIN_TIMEOUT_MS = 1000;
const MAX_TIMEOUT_MS = 30000;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Transform database row to API response
 */
function toWebhookResponse(row: WebhookRow): WebhookResponse {
  const totalDeliveries = parseInt(row.total_deliveries, 10);
  const successfulDeliveries = parseInt(row.successful_deliveries, 10);

  return {
    id: row.id,
    url: row.url,
    description: row.description,
    events: row.events,
    filter: {
      accounts: row.filter_accounts,
      network: row.filter_network,
      min_xrp_amount: row.filter_min_xrp_amount,
    },
    active: row.active,
    disabled_reason: row.disabled_reason,
    config: {
      retry_max_attempts: row.retry_max_attempts,
      timeout_ms: row.timeout_ms,
    },
    stats: {
      total_deliveries: totalDeliveries,
      successful_deliveries: successfulDeliveries,
      failed_deliveries: parseInt(row.failed_deliveries, 10),
      success_rate: totalDeliveries > 0
        ? Math.round((successfulDeliveries / totalDeliveries) * 100 * 100) / 100
        : 100,
      last_delivery_at: row.last_delivery_at?.toISOString() ?? null,
      last_success_at: row.last_success_at?.toISOString() ?? null,
      last_failure_at: row.last_failure_at?.toISOString() ?? null,
      last_failure_reason: row.last_failure_reason,
      consecutive_failures: row.consecutive_failures,
    },
    secret_prefix: row.secret_prefix,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

/**
 * Validate event types array
 */
function validateEventTypes(events: unknown): EventType[] | null {
  if (!Array.isArray(events) || events.length === 0) {
    return null;
  }

  if (events.length > MAX_EVENTS) {
    return null;
  }

  for (const event of events) {
    if (!EVENT_TYPES.includes(event as EventType)) {
      return null;
    }
  }

  // Remove duplicates
  return [...new Set(events)] as EventType[];
}

/**
 * Validate XRPL addresses
 */
function validateXrplAddresses(addresses: unknown): string[] | null {
  if (!Array.isArray(addresses)) {
    return null;
  }

  if (addresses.length > MAX_ACCOUNTS_FILTER) {
    return null;
  }

  // Basic XRPL address validation (starts with 'r', 25-35 chars)
  const addressRegex = /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/;

  for (const addr of addresses) {
    if (typeof addr !== 'string' || !addressRegex.test(addr)) {
      return null;
    }
  }

  return [...new Set(addresses)];
}

/**
 * Check webhook limit for tenant
 */
async function checkWebhookLimit(tenantId: string): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
}> {
  const result = await queryOne<{ current_count: number; limit_count: number; allowed: boolean }>(
    'SELECT * FROM check_tenant_limit($1, $2)',
    [tenantId, 'webhooks']
  );

  return {
    allowed: result?.allowed ?? false,
    current: result?.current_count ?? 0,
    limit: result?.limit_count ?? 0,
  };
}

/**
 * Invalidate webhook cache
 */
async function invalidateWebhookCache(webhookId: string): Promise<void> {
  try {
    await del(`${WEBHOOK_CACHE_PREFIX}${webhookId}`);
    // Also invalidate tenant webhook list cache if exists
  } catch (error) {
    logger.warn({ err: error, webhookId }, 'Failed to invalidate webhook cache');
  }
}

// =============================================================================
// Route Handlers
// =============================================================================

/**
 * List webhooks
 */
async function listWebhooks(
  request: FastifyRequest<{ Querystring: ListWebhooksQuery }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = getTenantId(request);
  const { limit = 20, offset = 0, active, event_type } = request.query;

  const safeLimit = Math.min(Math.max(1, limit), 100);
  const safeOffset = Math.max(0, offset);

  // Build query
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let paramIndex = 2;

  if (active !== undefined) {
    conditions.push(`active = $${paramIndex++}`);
    params.push(active);
  }

  if (event_type) {
    conditions.push(`$${paramIndex++} = ANY(events)`);
    params.push(event_type);
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM webhooks WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult?.count ?? '0', 10);

  // Get webhooks
  const rows = await queryAll<WebhookRow>(
    `SELECT * FROM webhooks 
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, safeLimit, safeOffset]
  );

  const webhooks = rows.map(toWebhookResponse);

  reply.send(createPaginatedResponse(webhooks, total, safeLimit, safeOffset, request.requestId));
}

/**
 * Get single webhook
 */
async function getWebhook(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = getTenantId(request);
  const { id } = request.params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    reply.status(404).send(
      createErrorResponse('not_found', 'Webhook not found', request.requestId)
    );
    return;
  }

  const row = await queryOne<WebhookRow>(
    'SELECT * FROM webhooks WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );

  if (!row) {
    reply.status(404).send(
      createErrorResponse('not_found', 'Webhook not found', request.requestId)
    );
    return;
  }

  reply.send(createSuccessResponse(toWebhookResponse(row), request.requestId));
}

/**
 * Create webhook
 */
async function createWebhook(
  request: FastifyRequest<{ Body: CreateWebhookBody }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = getTenantId(request);
  const { url, description, events, filter, config } = request.body;

  // Validate URL
  if (!url || typeof url !== 'string') {
    reply.status(400).send(
      createErrorResponse('validation_error', 'URL is required', request.requestId)
    );
    return;
  }

  const urlValidation = await validateWebhookUrl(url);
  if (!urlValidation.valid) {
    reply.status(400).send(
      createErrorResponse('validation_error', urlValidation.error ?? 'Invalid URL', request.requestId)
    );
    return;
  }

  // Validate events
  const validatedEvents = validateEventTypes(events);
  if (!validatedEvents) {
    reply.status(400).send(
      createErrorResponse(
        'validation_error',
        `Invalid events. Must be 1-${MAX_EVENTS} valid event types.`,
        request.requestId,
        { valid_event_types: EVENT_TYPES }
      )
    );
    return;
  }

  // Validate filter accounts
  let filterAccounts: string[] | null = null;
  if (filter?.accounts) {
    filterAccounts = validateXrplAddresses(filter.accounts);
    if (!filterAccounts) {
      reply.status(400).send(
        createErrorResponse(
          'validation_error',
          `Invalid filter accounts. Must be valid XRPL addresses (max ${MAX_ACCOUNTS_FILTER}).`,
          request.requestId
        )
      );
      return;
    }
  }

  // Validate filter network
  let filterNetwork: XrplNetwork | null = null;
  if (filter?.network) {
    if (!['mainnet', 'testnet', 'devnet'].includes(filter.network)) {
      reply.status(400).send(
        createErrorResponse(
          'validation_error',
          'Invalid filter network. Must be mainnet, testnet, or devnet.',
          request.requestId
        )
      );
      return;
    }
    filterNetwork = filter.network;
  }

  // Validate filter min_xrp_amount
  let filterMinXrpAmount: string | null = null;
  if (filter?.min_xrp_amount !== undefined && filter.min_xrp_amount !== null) {
    if (typeof filter.min_xrp_amount !== 'number' || filter.min_xrp_amount < 0) {
      reply.status(400).send(
        createErrorResponse(
          'validation_error',
          'Invalid min_xrp_amount. Must be a non-negative number.',
          request.requestId
        )
      );
      return;
    }
    filterMinXrpAmount = filter.min_xrp_amount.toString();
  }

  // Validate config
  const retryMaxAttempts = config?.retry_max_attempts ?? DEFAULT_RETRY_MAX_ATTEMPTS;
  const timeoutMs = config?.timeout_ms ?? DEFAULT_TIMEOUT_MS;

  if (retryMaxAttempts < 0 || retryMaxAttempts > 10) {
    reply.status(400).send(
      createErrorResponse(
        'validation_error',
        'retry_max_attempts must be between 0 and 10',
        request.requestId
      )
    );
    return;
  }

  if (timeoutMs < MIN_TIMEOUT_MS || timeoutMs > MAX_TIMEOUT_MS) {
    reply.status(400).send(
      createErrorResponse(
        'validation_error',
        `timeout_ms must be between ${MIN_TIMEOUT_MS} and ${MAX_TIMEOUT_MS}`,
        request.requestId
      )
    );
    return;
  }

  // Check tenant limit
  const limitCheck = await checkWebhookLimit(tenantId);
  if (!limitCheck.allowed) {
    reply.status(403).send(
      createErrorResponse(
        'limit_exceeded',
        `Webhook limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan for more.`,
        request.requestId,
        { current: limitCheck.current, limit: limitCheck.limit }
      )
    );
    return;
  }

  // Generate secret
  const secret = generateWebhookSecret();
  const secretHash = hashAPIKey(secret);
  const secretPrefix = getAPIKeyPrefix(secret);
  const id = uuid();

  // Insert webhook
  const row = await queryOne<WebhookRow>(
    `INSERT INTO webhooks (
      id, tenant_id, url, description,
      events, filter_accounts, filter_network, filter_min_xrp_amount,
      secret_hash, secret_prefix,
      retry_max_attempts, timeout_ms
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      id,
      tenantId,
      urlValidation.normalizedUrl ?? url,
      description?.trim() || null,
      validatedEvents,
      filterAccounts,
      filterNetwork,
      filterMinXrpAmount,
      secretHash,
      secretPrefix,
      retryMaxAttempts,
      timeoutMs,
    ]
  );

  if (!row) {
    reply.status(500).send(
      createErrorResponse('internal_error', 'Failed to create webhook', request.requestId)
    );
    return;
  }

  recordWebhookOperation('create');
  logger.info(
    { webhookId: id, tenantId, url: row.url, events: validatedEvents },
    'Webhook created'
  );

  // Return response with secret (only time it's shown)
  const response: WebhookCreatedResponse = {
    ...toWebhookResponse(row),
    secret,
  };

  reply.status(201).send({
    data: response,
    meta: {
      request_id: request.requestId,
      timestamp: nowISO(),
      warning: 'Store this webhook secret securely. It will not be shown again.',
    },
  });
}

/**
 * Update webhook
 */
async function updateWebhook(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateWebhookBody }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = getTenantId(request);
  const { id } = request.params;
  const { url, description, events, filter, config, active } = request.body;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    reply.status(404).send(
      createErrorResponse('not_found', 'Webhook not found', request.requestId)
    );
    return;
  }

  // Check if webhook exists
  const existing = await queryOne<WebhookRow>(
    'SELECT * FROM webhooks WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );

  if (!existing) {
    reply.status(404).send(
      createErrorResponse('not_found', 'Webhook not found', request.requestId)
    );
    return;
  }

  // Build update query
  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  // URL
  if (url !== undefined) {
    const urlValidation = await validateWebhookUrl(url);
    if (!urlValidation.valid) {
      reply.status(400).send(
        createErrorResponse('validation_error', urlValidation.error ?? 'Invalid URL', request.requestId)
      );
      return;
    }
    updates.push(`url = $${paramIndex++}`);
    params.push(urlValidation.normalizedUrl ?? url);
  }

  // Description
  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(description?.trim() || null);
  }

  // Events
  if (events !== undefined) {
    const validatedEvents = validateEventTypes(events);
    if (!validatedEvents) {
      reply.status(400).send(
        createErrorResponse(
          'validation_error',
          `Invalid events. Must be 1-${MAX_EVENTS} valid event types.`,
          request.requestId
        )
      );
      return;
    }
    updates.push(`events = $${paramIndex++}`);
    params.push(validatedEvents);
  }

  // Filter accounts
  if (filter?.accounts !== undefined) {
    if (filter.accounts === null) {
      updates.push(`filter_accounts = $${paramIndex++}`);
      params.push(null);
    } else {
      const filterAccounts = validateXrplAddresses(filter.accounts);
      if (!filterAccounts) {
        reply.status(400).send(
          createErrorResponse('validation_error', 'Invalid filter accounts', request.requestId)
        );
        return;
      }
      updates.push(`filter_accounts = $${paramIndex++}`);
      params.push(filterAccounts);
    }
  }

  // Filter network
  if (filter?.network !== undefined) {
    if (filter.network === null) {
      updates.push(`filter_network = $${paramIndex++}`);
      params.push(null);
    } else if (['mainnet', 'testnet', 'devnet'].includes(filter.network)) {
      updates.push(`filter_network = $${paramIndex++}`);
      params.push(filter.network);
    } else {
      reply.status(400).send(
        createErrorResponse('validation_error', 'Invalid filter network', request.requestId)
      );
      return;
    }
  }

  // Filter min_xrp_amount
  if (filter?.min_xrp_amount !== undefined) {
    if (filter.min_xrp_amount === null) {
      updates.push(`filter_min_xrp_amount = $${paramIndex++}`);
      params.push(null);
    } else if (typeof filter.min_xrp_amount === 'number' && filter.min_xrp_amount >= 0) {
      updates.push(`filter_min_xrp_amount = $${paramIndex++}`);
      params.push(filter.min_xrp_amount.toString());
    } else {
      reply.status(400).send(
        createErrorResponse('validation_error', 'Invalid min_xrp_amount', request.requestId)
      );
      return;
    }
  }

  // Config
  if (config?.retry_max_attempts !== undefined) {
    if (config.retry_max_attempts < 0 || config.retry_max_attempts > 10) {
      reply.status(400).send(
        createErrorResponse('validation_error', 'retry_max_attempts must be 0-10', request.requestId)
      );
      return;
    }
    updates.push(`retry_max_attempts = $${paramIndex++}`);
    params.push(config.retry_max_attempts);
  }

  if (config?.timeout_ms !== undefined) {
    if (config.timeout_ms < MIN_TIMEOUT_MS || config.timeout_ms > MAX_TIMEOUT_MS) {
      reply.status(400).send(
        createErrorResponse(
          'validation_error',
          `timeout_ms must be ${MIN_TIMEOUT_MS}-${MAX_TIMEOUT_MS}`,
          request.requestId
        )
      );
      return;
    }
    updates.push(`timeout_ms = $${paramIndex++}`);
    params.push(config.timeout_ms);
  }

  // Active status
  if (active !== undefined) {
    updates.push(`active = $${paramIndex++}`);
    params.push(active);

    // Clear disabled reason if re-enabling
    if (active) {
      updates.push(`disabled_reason = NULL`);
      updates.push(`disabled_at = NULL`);
      updates.push(`consecutive_failures = 0`);
    }
  }

  if (updates.length === 0) {
    reply.status(400).send(
      createErrorResponse('validation_error', 'At least one field to update is required', request.requestId)
    );
    return;
  }

  updates.push('updated_at = NOW()');

  // Execute update
  const row = await queryOne<WebhookRow>(
    `UPDATE webhooks SET ${updates.join(', ')}
     WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
     RETURNING *`,
    [...params, id, tenantId]
  );

  if (!row) {
    reply.status(500).send(
      createErrorResponse('internal_error', 'Failed to update webhook', request.requestId)
    );
    return;
  }

  await invalidateWebhookCache(id);
  recordWebhookOperation('update');
  logger.info({ webhookId: id, tenantId }, 'Webhook updated');

  reply.send(createSuccessResponse(toWebhookResponse(row), request.requestId));
}

/**
 * Delete webhook
 */
async function deleteWebhook(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = getTenantId(request);
  const { id } = request.params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    reply.status(404).send(
      createErrorResponse('not_found', 'Webhook not found', request.requestId)
    );
    return;
  }

  const result = await query(
    'DELETE FROM webhooks WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );

  if (result.rowCount === 0) {
    reply.status(404).send(
      createErrorResponse('not_found', 'Webhook not found', request.requestId)
    );
    return;
  }

  await invalidateWebhookCache(id);
  recordWebhookOperation('delete');
  logger.info({ webhookId: id, tenantId }, 'Webhook deleted');

  reply.status(204).send();
}

/**
 * Rotate webhook secret
 */
async function rotateWebhookSecret(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = getTenantId(request);
  const { id } = request.params;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    reply.status(404).send(
      createErrorResponse('not_found', 'Webhook not found', request.requestId)
    );
    return;
  }

  // Get existing webhook
  const existing = await queryOne<WebhookRow>(
    'SELECT * FROM webhooks WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );

  if (!existing) {
    reply.status(404).send(
      createErrorResponse('not_found', 'Webhook not found', request.requestId)
    );
    return;
  }

  // Generate new secret
  const newSecret = generateWebhookSecret();
  const newSecretHash = hashAPIKey(newSecret);
  const newSecretPrefix = getAPIKeyPrefix(newSecret);

  // Update with new secret, keeping old secret valid for grace period
  const row = await queryOne<WebhookRow>(
    `UPDATE webhooks SET
      previous_secret_hash = secret_hash,
      previous_secret_valid_until = NOW() + INTERVAL '24 hours',
      secret_hash = $1,
      secret_prefix = $2,
      secret_rotated_at = NOW(),
      updated_at = NOW()
    WHERE id = $3 AND tenant_id = $4
    RETURNING *`,
    [newSecretHash, newSecretPrefix, id, tenantId]
  );

  if (!row) {
    reply.status(500).send(
      createErrorResponse('internal_error', 'Failed to rotate secret', request.requestId)
    );
    return;
  }

  await invalidateWebhookCache(id);
  recordWebhookOperation('rotate_secret');
  logger.info({ webhookId: id, tenantId }, 'Webhook secret rotated');

  reply.send({
    data: {
      ...toWebhookResponse(row),
      secret: newSecret,
    },
    meta: {
      request_id: request.requestId,
      timestamp: nowISO(),
      warning: 'Store this new webhook secret securely. The old secret will remain valid for 24 hours.',
      previous_secret_valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  });
}

/**
 * Test webhook
 */
async function testWebhook(
  request: FastifyRequest<{ Params: { id: string }; Body: TestWebhookBody }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = getTenantId(request);
  const { id } = request.params;
  const { event_type = 'payment.xrp' } = request.body;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    reply.status(404).send(
      createErrorResponse('not_found', 'Webhook not found', request.requestId)
    );
    return;
  }

  // Get webhook
  const webhook = await queryOne<WebhookRow>(
    'SELECT * FROM webhooks WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );

  if (!webhook) {
    reply.status(404).send(
      createErrorResponse('not_found', 'Webhook not found', request.requestId)
    );
    return;
  }

  // Import delivery function dynamically to avoid circular deps
  const { deliverWebhook } = await import('../../core/http.js');
  const { generateSignature } = await import('@xrnotify/shared');

  // Create test event payload
  const testEventId = `test:${Date.now()}:${uuid().substring(0, 8)}`;
  const testPayload = {
    event_id: testEventId,
    event_type,
    ledger_index: 12345678,
    tx_hash: '0000000000000000000000000000000000000000000000000000000000000000',
    timestamp: nowISO(),
    network: 'mainnet',
    test: true,
    account_context: ['rTestAccountXXXXXXXXXXXXXXXXXX'],
    payload: {
      message: 'This is a test webhook delivery from XRNotify',
      webhook_id: id,
    },
  };

  // We need to get the actual secret (not hash) to sign
  // For testing, we'll use a test signature approach
  // In production, this would need to retrieve or regenerate
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const testBody = JSON.stringify(testPayload);
  
  // Create a test signature using webhook secret hash as identifier
  // Note: In real implementation, you'd need to store/retrieve the actual secret
  // For now, we'll use a placeholder that indicates this is a test
  const testSignature = `sha256=test_${webhook.secret_prefix}_${timestamp}`;

  // Attempt delivery
  const result = await deliverWebhook({
    url: webhook.url,
    payload: testPayload,
    signature: testSignature,
    timestamp,
    timeoutMs: webhook.timeout_ms,
  });

  recordWebhookOperation('test');
  logger.info(
    { webhookId: id, tenantId, success: result.success, durationMs: result.durationMs },
    'Webhook test completed'
  );

  reply.send(createSuccessResponse({
    success: result.success,
    test_event_id: testEventId,
    request: {
      url: webhook.url,
      event_type,
      timestamp,
    },
    response: {
      status_code: result.statusCode ?? null,
      duration_ms: result.durationMs,
      error: result.error ?? null,
      error_code: result.errorCode ?? null,
      body_preview: result.responseBody?.substring(0, 200) ?? null,
    },
    message: result.success
      ? 'Test webhook delivered successfully'
      : `Test webhook failed: ${result.error}`,
  }, request.requestId));
}

/**
 * Get webhook delivery history
 */
async function getWebhookDeliveries(
  request: FastifyRequest<{ Params: { id: string }; Querystring: { limit?: number; offset?: number } }>,
  reply: FastifyReply
): Promise<void> {
  const tenantId = getTenantId(request);
  const { id } = request.params;
  const { limit = 20, offset = 0 } = request.query;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    reply.status(404).send(
      createErrorResponse('not_found', 'Webhook not found', request.requestId)
    );
    return;
  }

  // Verify webhook belongs to tenant
  const webhook = await queryOne<{ id: string }>(
    'SELECT id FROM webhooks WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );

  if (!webhook) {
    reply.status(404).send(
      createErrorResponse('not_found', 'Webhook not found', request.requestId)
    );
    return;
  }

  const safeLimit = Math.min(Math.max(1, limit), 100);
  const safeOffset = Math.max(0, offset);

  // Get total count
  const countResult = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM deliveries WHERE webhook_id = $1',
    [id]
  );
  const total = parseInt(countResult?.count ?? '0', 10);

  // Get deliveries
  const deliveries = await queryAll<{
    id: string;
    event_id: string;
    event_type: string;
    status: string;
    attempt: number;
    max_attempts: number;
    response_status: number | null;
    duration_ms: number | null;
    error_code: string | null;
    error_message: string | null;
    created_at: Date;
    delivered_at: Date | null;
    failed_at: Date | null;
  }>(
    `SELECT 
      id, event_id, event_type, status, attempt, max_attempts,
      response_status, duration_ms, error_code, error_message,
      created_at, delivered_at, failed_at
    FROM deliveries
    WHERE webhook_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3`,
    [id, safeLimit, safeOffset]
  );

  const formattedDeliveries = deliveries.map(d => ({
    id: d.id,
    event_id: d.event_id,
    event_type: d.event_type,
    status: d.status,
    attempt: d.attempt,
    max_attempts: d.max_attempts,
    response_status: d.response_status,
    duration_ms: d.duration_ms,
    error: d.error_code ? { code: d.error_code, message: d.error_message } : null,
    created_at: d.created_at.toISOString(),
    delivered_at: d.delivered_at?.toISOString() ?? null,
    failed_at: d.failed_at?.toISOString() ?? null,
  }));

  reply.send(createPaginatedResponse(formattedDeliveries, total, safeLimit, safeOffset, request.requestId));
}

// =============================================================================
// Route Registration
// =============================================================================

/**
 * Webhooks routes plugin
 */
export const webhooksRoutes: FastifyPluginAsync = async (server) => {
  // List webhooks
  server.get<{ Querystring: ListWebhooksQuery }>(
    '/',
    {
      preHandler: [authenticateApiKey, requireScopes(Scopes.WEBHOOKS_READ)],
      schema: {
        description: 'List webhooks',
        tags: ['Webhooks'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'integer', minimum: 0, default: 0 },
            active: { type: 'boolean' },
            event_type: { type: 'string', enum: EVENT_TYPES as unknown as string[] },
          },
        },
      },
    },
    listWebhooks
  );

  // Get single webhook
  server.get<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: [authenticateApiKey, requireScopes(Scopes.WEBHOOKS_READ)],
      schema: {
        description: 'Get webhook details',
        tags: ['Webhooks'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    getWebhook
  );

  // Get webhook deliveries
  server.get<{ Params: { id: string }; Querystring: { limit?: number; offset?: number } }>(
    '/:id/deliveries',
    {
      preHandler: [authenticateApiKey, requireScopes(Scopes.WEBHOOKS_READ)],
      schema: {
        description: 'Get webhook delivery history',
        tags: ['Webhooks'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            offset: { type: 'integer', minimum: 0, default: 0 },
          },
        },
      },
    },
    getWebhookDeliveries
  );

  // Create webhook
  server.post<{ Body: CreateWebhookBody }>(
    '/',
    {
      preHandler: [
        authenticateApiKey,
        requireScopes(Scopes.WEBHOOKS_WRITE),
        webhookCreateRateLimiter,
      ],
      schema: {
        description: 'Create a new webhook',
        tags: ['Webhooks'],
        body: {
          type: 'object',
          required: ['url', 'events'],
          properties: {
            url: { type: 'string', format: 'uri', maxLength: 2048 },
            description: { type: 'string', maxLength: 500 },
            events: {
              type: 'array',
              items: { type: 'string', enum: EVENT_TYPES as unknown as string[] },
              minItems: 1,
              maxItems: MAX_EVENTS,
            },
            filter: {
              type: 'object',
              properties: {
                accounts: { type: 'array', items: { type: 'string' }, maxItems: MAX_ACCOUNTS_FILTER },
                network: { type: 'string', enum: ['mainnet', 'testnet', 'devnet'] },
                min_xrp_amount: { type: 'number', minimum: 0 },
              },
            },
            config: {
              type: 'object',
              properties: {
                retry_max_attempts: { type: 'integer', minimum: 0, maximum: 10 },
                timeout_ms: { type: 'integer', minimum: MIN_TIMEOUT_MS, maximum: MAX_TIMEOUT_MS },
              },
            },
          },
        },
      },
    },
    createWebhook
  );

  // Update webhook
  server.patch<{ Params: { id: string }; Body: UpdateWebhookBody }>(
    '/:id',
    {
      preHandler: [authenticateApiKey, requireScopes(Scopes.WEBHOOKS_WRITE)],
      schema: {
        description: 'Update webhook',
        tags: ['Webhooks'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri', maxLength: 2048 },
            description: { type: 'string', maxLength: 500 },
            events: {
              type: 'array',
              items: { type: 'string', enum: EVENT_TYPES as unknown as string[] },
              minItems: 1,
              maxItems: MAX_EVENTS,
            },
            filter: { type: 'object' },
            config: { type: 'object' },
            active: { type: 'boolean' },
          },
        },
      },
    },
    updateWebhook
  );

  // Delete webhook
  server.delete<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: [authenticateApiKey, requireScopes(Scopes.WEBHOOKS_WRITE)],
      schema: {
        description: 'Delete webhook',
        tags: ['Webhooks'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: { type: 'null' },
        },
      },
    },
    deleteWebhook
  );

  // Rotate webhook secret
  server.post<{ Params: { id: string } }>(
    '/:id/rotate-secret',
    {
      preHandler: [authenticateApiKey, requireScopes(Scopes.WEBHOOKS_WRITE)],
      schema: {
        description: 'Rotate webhook signing secret',
        tags: ['Webhooks'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    rotateWebhookSecret
  );

  // Test webhook
  server.post<{ Params: { id: string }; Body: TestWebhookBody }>(
    '/:id/test',
    {
      preHandler: [authenticateApiKey, requireScopes(Scopes.WEBHOOKS_WRITE)],
      schema: {
        description: 'Send a test event to webhook',
        tags: ['Webhooks'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            event_type: { type: 'string', enum: EVENT_TYPES as unknown as string[] },
          },
        },
      },
    },
    testWebhook
  );

  logger.info('Webhooks routes registered');
};

// =============================================================================
// Export
// =============================================================================

export default webhooksRoutes;
