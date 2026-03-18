/**
 * @fileoverview XRNotify Events API Routes
 * Event history and search endpoints.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/routes/v1/events
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createModuleLogger } from '../../core/logger.js';
import { query, queryOne, queryAll } from '../../core/db.js';
import type { EventType, XrplNetwork } from '@xrnotify/shared';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('routes-events');

/**
 * Event record
 */
interface Event {
  id: string;
  eventType: EventType;
  ledgerIndex: number;
  txHash: string;
  network: XrplNetwork;
  timestamp: string;
  accountContext: string[];
  payload: Record<string, unknown>;
  resultCode: string | null;
  createdAt: Date;
}

/**
 * Event summary (for listing)
 */
interface EventSummary {
  id: string;
  eventType: EventType;
  ledgerIndex: number;
  txHash: string;
  network: XrplNetwork;
  timestamp: string;
  accountContext: string[];
  createdAt: Date;
}

/**
 * Event with delivery info
 */
interface EventWithDeliveries extends Event {
  deliveries: Array<{
    id: string;
    webhookId: string;
    webhookName: string | null;
    status: string;
    attemptCount: number;
    deliveredAt: Date | null;
  }>;
}

/**
 * List events query params
 */
interface ListEventsQuery {
  event_type?: EventType;
  network?: XrplNetwork;
  account?: string;
  tx_hash?: string;
  ledger_index_min?: number;
  ledger_index_max?: number;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
  order_by?: 'ledger_index' | 'timestamp' | 'created_at';
  order_direction?: 'asc' | 'desc';
}

/**
 * Search events body
 */
interface SearchEventsBody {
  query: string;
  filters?: {
    event_types?: EventType[];
    networks?: XrplNetwork[];
    accounts?: string[];
    start_date?: string;
    end_date?: string;
  };
  limit?: number;
  offset?: number;
}

/**
 * Event statistics
 */
interface EventStats {
  total: number;
  byEventType: Record<string, number>;
  byNetwork: Record<string, number>;
  byDay: Array<{
    date: string;
    count: number;
  }>;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_RESULTS = 500;

// =============================================================================
// Route Handler
// =============================================================================

/**
 * Register event routes
 */
export async function eventsRoutes(fastify: FastifyInstance): Promise<void> {
  // ===========================================================================
  // List Events
  // ===========================================================================

  /**
   * GET /v1/events
   * List events with filtering
   */
  fastify.get<{
    Querystring: ListEventsQuery;
  }>('/events', async (request, reply) => {
    const {
      event_type,
      network,
      account,
      tx_hash,
      ledger_index_min,
      ledger_index_max,
      start_date,
      end_date,
      limit = DEFAULT_PAGE_SIZE,
      offset = 0,
      order_by = 'ledger_index',
      order_direction = 'desc',
    } = request.query;

    // Build query
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (event_type) {
      conditions.push(`event_type = $${paramIndex++}`);
      params.push(event_type);
    }

    if (network) {
      conditions.push(`network = $${paramIndex++}`);
      params.push(network);
    }

    if (account) {
      conditions.push(`$${paramIndex++} = ANY(account_context)`);
      params.push(account);
    }

    if (tx_hash) {
      conditions.push(`tx_hash = $${paramIndex++}`);
      params.push(tx_hash);
    }

    if (ledger_index_min !== undefined) {
      conditions.push(`ledger_index >= $${paramIndex++}`);
      params.push(ledger_index_min);
    }

    if (ledger_index_max !== undefined) {
      conditions.push(`ledger_index <= $${paramIndex++}`);
      params.push(ledger_index_max);
    }

    if (start_date) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      params.push(end_date);
    }

    // Default: last 7 days
    if (!start_date && !end_date && !tx_hash && ledger_index_min === undefined) {
      conditions.push(`created_at >= NOW() - INTERVAL '7 days'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate order by
    const validOrderBy = ['ledger_index', 'timestamp', 'created_at'].includes(order_by)
      ? order_by
      : 'ledger_index';
    const validDirection = order_direction === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM events ${whereClause}`,
      params
    );

    const total = parseInt(countResult?.count ?? '0', 10);

    // Get events
    const effectiveLimit = Math.min(limit, MAX_PAGE_SIZE);

    const rows = await queryAll<{
      id: string;
      event_type: EventType;
      ledger_index: number;
      tx_hash: string;
      network: XrplNetwork;
      timestamp: string;
      account_context: string[];
      created_at: Date;
    }>(
      `SELECT id, event_type, ledger_index, tx_hash, network,
              timestamp, account_context, created_at
       FROM events
       ${whereClause}
       ORDER BY ${validOrderBy} ${validDirection}
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, effectiveLimit, offset]
    );

    const events: EventSummary[] = rows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      ledgerIndex: row.ledger_index,
      txHash: row.tx_hash,
      network: row.network,
      timestamp: row.timestamp,
      accountContext: row.account_context,
      createdAt: row.created_at,
    }));

    return reply.send({
      events,
      pagination: {
        total,
        limit: effectiveLimit,
        offset,
        has_more: offset + events.length < total,
      },
    });
  });

  // ===========================================================================
  // Get Event
  // ===========================================================================

  /**
   * GET /v1/events/:id
   * Get event details
   */
  fastify.get<{
    Params: { id: string };
  }>('/events/:id', async (request, reply) => {
    const { id } = request.params;

    const row = await queryOne<{
      id: string;
      event_type: EventType;
      ledger_index: number;
      tx_hash: string;
      network: XrplNetwork;
      timestamp: string;
      account_context: string[];
      payload: string;
      result_code: string | null;
      created_at: Date;
    }>(
      `SELECT id, event_type, ledger_index, tx_hash, network,
              timestamp, account_context, payload::text, result_code, created_at
       FROM events WHERE id = $1`,
      [id]
    );

    if (!row) {
      return reply.status(404).send({
        error: 'not_found',
        message: 'Event not found',
      });
    }

    const event: Event = {
      id: row.id,
      eventType: row.event_type,
      ledgerIndex: row.ledger_index,
      txHash: row.tx_hash,
      network: row.network,
      timestamp: row.timestamp,
      accountContext: row.account_context,
      payload: JSON.parse(row.payload),
      resultCode: row.result_code,
      createdAt: row.created_at,
    };

    return reply.send({ event });
  });

  // ===========================================================================
  // Get Event by Transaction Hash
  // ===========================================================================

  /**
   * GET /v1/events/tx/:hash
   * Get events by transaction hash
   */
  fastify.get<{
    Params: { hash: string };
  }>('/events/tx/:hash', async (request, reply) => {
    const { hash } = request.params;

    const rows = await queryAll<{
      id: string;
      event_type: EventType;
      ledger_index: number;
      tx_hash: string;
      network: XrplNetwork;
      timestamp: string;
      account_context: string[];
      payload: string;
      result_code: string | null;
      created_at: Date;
    }>(
      `SELECT id, event_type, ledger_index, tx_hash, network,
              timestamp, account_context, payload::text, result_code, created_at
       FROM events WHERE tx_hash = $1
       ORDER BY id`,
      [hash]
    );

    if (rows.length === 0) {
      return reply.status(404).send({
        error: 'not_found',
        message: 'No events found for transaction',
      });
    }

    const events: Event[] = rows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      ledgerIndex: row.ledger_index,
      txHash: row.tx_hash,
      network: row.network,
      timestamp: row.timestamp,
      accountContext: row.account_context,
      payload: JSON.parse(row.payload),
      resultCode: row.result_code,
      createdAt: row.created_at,
    }));

    return reply.send({ events });
  });

  // ===========================================================================
  // Get Event with Deliveries
  // ===========================================================================

  /**
   * GET /v1/events/:id/deliveries
   * Get event with delivery history
   */
  fastify.get<{
    Params: { id: string };
  }>('/events/:id/deliveries', async (request, reply) => {
    const tenantId = request.tenantId!;
    const { id } = request.params;

    // Get event
    const eventRow = await queryOne<{
      id: string;
      event_type: EventType;
      ledger_index: number;
      tx_hash: string;
      network: XrplNetwork;
      timestamp: string;
      account_context: string[];
      payload: string;
      result_code: string | null;
      created_at: Date;
    }>(
      `SELECT id, event_type, ledger_index, tx_hash, network,
              timestamp, account_context, payload::text, result_code, created_at
       FROM events WHERE id = $1`,
      [id]
    );

    if (!eventRow) {
      return reply.status(404).send({
        error: 'not_found',
        message: 'Event not found',
      });
    }

    // Get deliveries for this tenant
    const deliveryRows = await queryAll<{
      id: string;
      webhook_id: string;
      webhook_name: string | null;
      status: string;
      attempt_count: number;
      delivered_at: Date | null;
    }>(
      `SELECT d.id, d.webhook_id, w.name as webhook_name,
              d.status, d.attempt_count, d.delivered_at
       FROM deliveries d
       JOIN webhooks w ON w.id = d.webhook_id
       WHERE d.event_id = $1 AND d.tenant_id = $2
       ORDER BY d.created_at`,
      [id, tenantId]
    );

    const event: EventWithDeliveries = {
      id: eventRow.id,
      eventType: eventRow.event_type,
      ledgerIndex: eventRow.ledger_index,
      txHash: eventRow.tx_hash,
      network: eventRow.network,
      timestamp: eventRow.timestamp,
      accountContext: eventRow.account_context,
      payload: JSON.parse(eventRow.payload),
      resultCode: eventRow.result_code,
      createdAt: eventRow.created_at,
      deliveries: deliveryRows.map((row) => ({
        id: row.id,
        webhookId: row.webhook_id,
        webhookName: row.webhook_name,
        status: row.status,
        attemptCount: row.attempt_count,
        deliveredAt: row.delivered_at,
      })),
    };

    return reply.send({ event });
  });

  // ===========================================================================
  // Search Events
  // ===========================================================================

  /**
   * POST /v1/events/search
   * Search events with full-text and filters
   */
  fastify.post<{
    Body: SearchEventsBody;
  }>('/events/search', async (request, reply) => {
    const { query: searchQuery, filters = {}, limit = DEFAULT_PAGE_SIZE, offset = 0 } = request.body;

    if (!searchQuery || searchQuery.trim().length === 0) {
      return reply.status(400).send({
        error: 'invalid_query',
        message: 'Search query is required',
      });
    }

    // Build conditions
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Text search in payload and accounts
    const searchTerms = searchQuery.trim().split(/\s+/).filter(Boolean);

    if (searchTerms.length > 0) {
      // Search in tx_hash, account_context, and payload
      const searchConditions: string[] = [];

      for (const term of searchTerms) {
        searchConditions.push(`(
          tx_hash ILIKE $${paramIndex} OR
          $${paramIndex + 1} = ANY(account_context) OR
          payload::text ILIKE $${paramIndex}
        )`);
        params.push(`%${term}%`, term);
        paramIndex += 2;
      }

      conditions.push(`(${searchConditions.join(' AND ')})`);
    }

    // Apply filters
    if (filters.event_types && filters.event_types.length > 0) {
      conditions.push(`event_type = ANY($${paramIndex++})`);
      params.push(filters.event_types);
    }

    if (filters.networks && filters.networks.length > 0) {
      conditions.push(`network = ANY($${paramIndex++})`);
      params.push(filters.networks);
    }

    if (filters.accounts && filters.accounts.length > 0) {
      conditions.push(`account_context && $${paramIndex++}`);
      params.push(filters.accounts);
    }

    if (filters.start_date) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      params.push(filters.end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const effectiveLimit = Math.min(limit, MAX_SEARCH_RESULTS);

    // Get results
    const rows = await queryAll<{
      id: string;
      event_type: EventType;
      ledger_index: number;
      tx_hash: string;
      network: XrplNetwork;
      timestamp: string;
      account_context: string[];
      created_at: Date;
    }>(
      `SELECT id, event_type, ledger_index, tx_hash, network,
              timestamp, account_context, created_at
       FROM events
       ${whereClause}
       ORDER BY ledger_index DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, effectiveLimit, offset]
    );

    const events: EventSummary[] = rows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      ledgerIndex: row.ledger_index,
      txHash: row.tx_hash,
      network: row.network,
      timestamp: row.timestamp,
      accountContext: row.account_context,
      createdAt: row.created_at,
    }));

    return reply.send({
      events,
      query: searchQuery,
      filters,
      pagination: {
        limit: effectiveLimit,
        offset,
        has_more: events.length === effectiveLimit,
      },
    });
  });

  // ===========================================================================
  // Get Events for Account
  // ===========================================================================

  /**
   * GET /v1/events/account/:address
   * Get events for a specific account
   */
  fastify.get<{
    Params: { address: string };
    Querystring: {
      event_type?: EventType;
      network?: XrplNetwork;
      start_date?: string;
      end_date?: string;
      limit?: number;
      offset?: number;
    };
  }>('/events/account/:address', async (request, reply) => {
    const { address } = request.params;
    const {
      event_type,
      network,
      start_date,
      end_date,
      limit = DEFAULT_PAGE_SIZE,
      offset = 0,
    } = request.query;

    // Validate address format (basic check)
    if (!address.startsWith('r') || address.length < 25 || address.length > 35) {
      return reply.status(400).send({
        error: 'invalid_address',
        message: 'Invalid XRPL address format',
      });
    }

    // Build query
    const conditions: string[] = [`$1 = ANY(account_context)`];
    const params: unknown[] = [address];
    let paramIndex = 2;

    if (event_type) {
      conditions.push(`event_type = $${paramIndex++}`);
      params.push(event_type);
    }

    if (network) {
      conditions.push(`network = $${paramIndex++}`);
      params.push(network);
    }

    if (start_date) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      params.push(start_date);
    }

    if (end_date) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      params.push(end_date);
    }

    // Default: last 30 days
    if (!start_date && !end_date) {
      conditions.push(`created_at >= NOW() - INTERVAL '30 days'`);
    }

    const whereClause = conditions.join(' AND ');
    const effectiveLimit = Math.min(limit, MAX_PAGE_SIZE);

    // Get count
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM events WHERE ${whereClause}`,
      params
    );

    const total = parseInt(countResult?.count ?? '0', 10);

    // Get events
    const rows = await queryAll<{
      id: string;
      event_type: EventType;
      ledger_index: number;
      tx_hash: string;
      network: XrplNetwork;
      timestamp: string;
      account_context: string[];
      created_at: Date;
    }>(
      `SELECT id, event_type, ledger_index, tx_hash, network,
              timestamp, account_context, created_at
       FROM events
       WHERE ${whereClause}
       ORDER BY ledger_index DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, effectiveLimit, offset]
    );

    const events: EventSummary[] = rows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      ledgerIndex: row.ledger_index,
      txHash: row.tx_hash,
      network: row.network,
      timestamp: row.timestamp,
      accountContext: row.account_context,
      createdAt: row.created_at,
    }));

    return reply.send({
      account: address,
      events,
      pagination: {
        total,
        limit: effectiveLimit,
        offset,
        has_more: offset + events.length < total,
      },
    });
  });

  // ===========================================================================
  // Get Event Statistics
  // ===========================================================================

  /**
   * GET /v1/events/stats
   * Get event statistics
   */
  fastify.get<{
    Querystring: {
      network?: XrplNetwork;
      days?: number;
    };
  }>('/events/stats', async (request, reply) => {
    const { network, days = 30 } = request.query;

    const effectiveDays = Math.min(days, 90);
    const networkCondition = network ? `AND network = $1` : '';
    const params = network ? [network] : [];

    // Get total count
    const totalResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM events
       WHERE created_at >= NOW() - INTERVAL '${effectiveDays} days'
       ${networkCondition}`,
      params
    );

    const total = parseInt(totalResult?.count ?? '0', 10);

    // Get counts by event type
    const eventTypeCounts = await queryAll<{ event_type: EventType; count: string }>(
      `SELECT event_type, COUNT(*) as count FROM events
       WHERE created_at >= NOW() - INTERVAL '${effectiveDays} days'
       ${networkCondition}
       GROUP BY event_type
       ORDER BY count DESC`,
      params
    );

    const byEventType: Record<string, number> = {};
    for (const row of eventTypeCounts) {
      byEventType[row.event_type] = parseInt(row.count, 10);
    }

    // Get counts by network
    const networkCounts = await queryAll<{ network: XrplNetwork; count: string }>(
      `SELECT network, COUNT(*) as count FROM events
       WHERE created_at >= NOW() - INTERVAL '${effectiveDays} days'
       ${networkCondition}
       GROUP BY network
       ORDER BY count DESC`,
      params
    );

    const byNetwork: Record<string, number> = {};
    for (const row of networkCounts) {
      byNetwork[row.network] = parseInt(row.count, 10);
    }

    // Get daily counts
    const dailyCounts = await queryAll<{ date: string; count: string }>(
      `SELECT DATE(created_at) as date, COUNT(*) as count FROM events
       WHERE created_at >= NOW() - INTERVAL '${effectiveDays} days'
       ${networkCondition}
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      params
    );

    const byDay = dailyCounts.map((row) => ({
      date: row.date,
      count: parseInt(row.count, 10),
    }));

    const stats: EventStats = {
      total,
      byEventType,
      byNetwork,
      byDay,
    };

    return reply.send({ stats, days: effectiveDays });
  });

  // ===========================================================================
  // Get Recent Events
  // ===========================================================================

  /**
   * GET /v1/events/recent
   * Get most recent events (fast endpoint)
   */
  fastify.get<{
    Querystring: {
      network?: XrplNetwork;
      event_type?: EventType;
      limit?: number;
    };
  }>('/events/recent', async (request, reply) => {
    const { network, event_type, limit = 20 } = request.query;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (network) {
      conditions.push(`network = $${paramIndex++}`);
      params.push(network);
    }

    if (event_type) {
      conditions.push(`event_type = $${paramIndex++}`);
      params.push(event_type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const effectiveLimit = Math.min(limit, 50);

    const rows = await queryAll<{
      id: string;
      event_type: EventType;
      ledger_index: number;
      tx_hash: string;
      network: XrplNetwork;
      timestamp: string;
      account_context: string[];
      created_at: Date;
    }>(
      `SELECT id, event_type, ledger_index, tx_hash, network,
              timestamp, account_context, created_at
       FROM events
       ${whereClause}
       ORDER BY ledger_index DESC
       LIMIT $${paramIndex}`,
      [...params, effectiveLimit]
    );

    const events: EventSummary[] = rows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      ledgerIndex: row.ledger_index,
      txHash: row.tx_hash,
      network: row.network,
      timestamp: row.timestamp,
      accountContext: row.account_context,
      createdAt: row.created_at,
    }));

    return reply.send({ events });
  });

  // ===========================================================================
  // Get Event Types
  // ===========================================================================

  /**
   * GET /v1/events/types
   * Get available event types with descriptions
   */
  fastify.get('/events/types', async (request, reply) => {
    const eventTypes = [
      // Payments
      { type: 'payment.xrp', category: 'payments', description: 'XRP payment' },
      { type: 'payment.issued', category: 'payments', description: 'Issued currency payment' },

      // Trustlines
      { type: 'trustline.created', category: 'trustlines', description: 'Trust line created' },
      { type: 'trustline.modified', category: 'trustlines', description: 'Trust line modified' },
      { type: 'trustline.removed', category: 'trustlines', description: 'Trust line removed' },

      // NFTs
      { type: 'nft.minted', category: 'nfts', description: 'NFT minted' },
      { type: 'nft.burned', category: 'nfts', description: 'NFT burned' },
      { type: 'nft.offer_created', category: 'nfts', description: 'NFT offer created' },
      { type: 'nft.offer_accepted', category: 'nfts', description: 'NFT offer accepted' },
      { type: 'nft.offer_cancelled', category: 'nfts', description: 'NFT offer cancelled' },

      // DEX
      { type: 'dex.offer_created', category: 'dex', description: 'DEX offer created' },
      { type: 'dex.offer_cancelled', category: 'dex', description: 'DEX offer cancelled' },
      { type: 'dex.offer_filled', category: 'dex', description: 'DEX offer fully filled' },
      { type: 'dex.offer_partially_filled', category: 'dex', description: 'DEX offer partially filled' },

      // Account
      { type: 'account.settings_changed', category: 'account', description: 'Account settings changed' },
      { type: 'account.deleted', category: 'account', description: 'Account deleted' },

      // Escrow
      { type: 'escrow.created', category: 'escrow', description: 'Escrow created' },
      { type: 'escrow.finished', category: 'escrow', description: 'Escrow finished' },
      { type: 'escrow.cancelled', category: 'escrow', description: 'Escrow cancelled' },

      // Checks
      { type: 'check.created', category: 'checks', description: 'Check created' },
      { type: 'check.cashed', category: 'checks', description: 'Check cashed' },
      { type: 'check.cancelled', category: 'checks', description: 'Check cancelled' },
    ];

    // Get counts for active event types
    const counts = await queryAll<{ event_type: EventType; count: string }>(
      `SELECT event_type, COUNT(*) as count FROM events
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY event_type`
    );

    const countMap = new Map(counts.map((c) => [c.event_type, parseInt(c.count, 10)]));

    const typesWithCounts = eventTypes.map((t) => ({
      ...t,
      recent_count: countMap.get(t.type as EventType) ?? 0,
    }));

    return reply.send({ event_types: typesWithCounts });
  });

  // ===========================================================================
  // Get Ledger Range
  // ===========================================================================

  /**
   * GET /v1/events/ledger-range
   * Get available ledger index range
   */
  fastify.get<{
    Querystring: { network?: XrplNetwork };
  }>('/events/ledger-range', async (request, reply) => {
    const { network } = request.query;

    const networkCondition = network ? `WHERE network = $1` : '';
    const params = network ? [network] : [];

    const result = await queryOne<{
      min_ledger: number;
      max_ledger: number;
      event_count: string;
    }>(
      `SELECT 
        MIN(ledger_index) as min_ledger,
        MAX(ledger_index) as max_ledger,
        COUNT(*) as event_count
       FROM events
       ${networkCondition}`,
      params
    );

    return reply.send({
      network: network ?? 'all',
      min_ledger_index: result?.min_ledger ?? 0,
      max_ledger_index: result?.max_ledger ?? 0,
      event_count: parseInt(result?.event_count ?? '0', 10),
    });
  });

  // ===========================================================================
  // Get Events by Ledger
  // ===========================================================================

  /**
   * GET /v1/events/ledger/:index
   * Get events for a specific ledger
   */
  fastify.get<{
    Params: { index: string };
    Querystring: { network?: XrplNetwork };
  }>('/events/ledger/:index', async (request, reply) => {
    const ledgerIndex = parseInt(request.params.index, 10);
    const { network } = request.query;

    if (isNaN(ledgerIndex) || ledgerIndex < 0) {
      return reply.status(400).send({
        error: 'invalid_ledger_index',
        message: 'Invalid ledger index',
      });
    }

    const conditions: string[] = [`ledger_index = $1`];
    const params: unknown[] = [ledgerIndex];
    let paramIndex = 2;

    if (network) {
      conditions.push(`network = $${paramIndex++}`);
      params.push(network);
    }

    const whereClause = conditions.join(' AND ');

    const rows = await queryAll<{
      id: string;
      event_type: EventType;
      ledger_index: number;
      tx_hash: string;
      network: XrplNetwork;
      timestamp: string;
      account_context: string[];
      payload: string;
      result_code: string | null;
      created_at: Date;
    }>(
      `SELECT id, event_type, ledger_index, tx_hash, network,
              timestamp, account_context, payload::text, result_code, created_at
       FROM events
       WHERE ${whereClause}
       ORDER BY id`,
      params
    );

    const events: Event[] = rows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      ledgerIndex: row.ledger_index,
      txHash: row.tx_hash,
      network: row.network,
      timestamp: row.timestamp,
      accountContext: row.account_context,
      payload: JSON.parse(row.payload),
      resultCode: row.result_code,
      createdAt: row.created_at,
    }));

    return reply.send({
      ledger_index: ledgerIndex,
      network: network ?? 'all',
      event_count: events.length,
      events,
    });
  });

  logger.info('Events routes registered');
}

// =============================================================================
// Export
// =============================================================================

export default eventsRoutes;
