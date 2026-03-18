/**
 * @fileoverview XRNotify XRPL Ledger Cursor
 * Persists last processed ledger index for resume capability.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/listener/xrpl/cursor
 */

import { createModuleLogger } from '../../core/logger.js';
import { query, queryOne } from '../../core/db.js';
import { get, set, del } from '../../core/redis.js';
import { uuid, nowISO } from '@xrnotify/shared';
import type { XrplNetwork } from './client.js';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('xrpl-cursor');

/**
 * Cursor state
 */
export interface CursorState {
  id: string;
  network: XrplNetwork;
  ledgerIndex: number;
  ledgerHash: string | null;
  ledgerCloseTime: Date | null;
  lastTxHash: string | null;
  lastTxIndex: number | null;
  transactionsProcessed: number;
  eventsEmitted: number;
  lastHeartbeatAt: Date;
  processingLagSeconds: number;
  consecutiveErrors: number;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
  checkpointLedgerIndex: number | null;
  checkpointAt: Date | null;
  lockedBy: string | null;
  lockedAt: Date | null;
  lockExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cursor update options
 */
export interface CursorUpdateOptions {
  ledgerIndex: number;
  ledgerHash?: string;
  ledgerCloseTime?: Date;
  lastTxHash?: string;
  lastTxIndex?: number;
  transactionsProcessed?: number;
  eventsEmitted?: number;
}

/**
 * Lock options
 */
export interface LockOptions {
  durationSeconds?: number;
  workerId?: string;
}

// =============================================================================
// Constants
// =============================================================================

const CURSOR_CACHE_PREFIX = 'cursor:';
const CURSOR_CACHE_TTL = 30; // 30 seconds
const DEFAULT_LOCK_DURATION = 60; // 60 seconds

// =============================================================================
// Cursor Class
// =============================================================================

/**
 * Ledger Cursor Manager
 *
 * Tracks processing position for XRPL ledger streaming.
 * Supports distributed locking for single-writer guarantee.
 */
export class LedgerCursor {
  private cursorId: string;
  private network: XrplNetwork;
  private workerId: string;
  private lockDurationSeconds: number;
  private lockRenewalTimer: NodeJS.Timeout | null = null;
  private state: CursorState | null = null;

  constructor(
    cursorId: string,
    network: XrplNetwork,
    options: LockOptions = {}
  ) {
    this.cursorId = cursorId;
    this.network = network;
    this.workerId = options.workerId ?? `worker-${uuid().substring(0, 8)}`;
    this.lockDurationSeconds = options.durationSeconds ?? DEFAULT_LOCK_DURATION;

    logger.debug(
      { cursorId, network, workerId: this.workerId },
      'Cursor initialized'
    );
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Get cursor ID
   */
  getId(): string {
    return this.cursorId;
  }

  /**
   * Get worker ID
   */
  getWorkerId(): string {
    return this.workerId;
  }

  /**
   * Get current state
   */
  getState(): CursorState | null {
    return this.state;
  }

  /**
   * Get current ledger index
   */
  getLedgerIndex(): number {
    return this.state?.ledgerIndex ?? 0;
  }

  /**
   * Initialize cursor (create if not exists)
   */
  async initialize(startLedgerIndex: number = 0): Promise<CursorState> {
    // Try to get existing cursor
    let state = await this.load();

    if (!state) {
      // Create new cursor
      state = await this.create(startLedgerIndex);
      logger.info(
        { cursorId: this.cursorId, startLedgerIndex },
        'Cursor created'
      );
    } else {
      logger.info(
        { cursorId: this.cursorId, ledgerIndex: state.ledgerIndex },
        'Cursor loaded'
      );
    }

    this.state = state;
    return state;
  }

  /**
   * Load cursor from database
   */
  async load(): Promise<CursorState | null> {
    // Try cache first
    const cached = await this.loadFromCache();
    if (cached) {
      this.state = cached;
      return cached;
    }

    // Load from database
    const row = await queryOne<{
      id: string;
      network: XrplNetwork;
      ledger_index: string;
      ledger_hash: string | null;
      ledger_close_time: Date | null;
      last_tx_hash: string | null;
      last_tx_index: number | null;
      transactions_processed: string;
      events_emitted: string;
      last_heartbeat_at: Date;
      processing_lag_seconds: number;
      consecutive_errors: number;
      last_error_at: Date | null;
      last_error_message: string | null;
      checkpoint_ledger_index: string | null;
      checkpoint_at: Date | null;
      locked_by: string | null;
      locked_at: Date | null;
      lock_expires_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      'SELECT * FROM ledger_cursor WHERE id = $1',
      [this.cursorId]
    );

    if (!row) {
      return null;
    }

    const state = this.rowToState(row);

    // Cache it
    await this.saveToCache(state);

    this.state = state;
    return state;
  }

  /**
   * Create new cursor
   */
  private async create(startLedgerIndex: number): Promise<CursorState> {
    const row = await queryOne<{
      id: string;
      network: XrplNetwork;
      ledger_index: string;
      ledger_hash: string | null;
      ledger_close_time: Date | null;
      last_tx_hash: string | null;
      last_tx_index: number | null;
      transactions_processed: string;
      events_emitted: string;
      last_heartbeat_at: Date;
      processing_lag_seconds: number;
      consecutive_errors: number;
      last_error_at: Date | null;
      last_error_message: string | null;
      checkpoint_ledger_index: string | null;
      checkpoint_at: Date | null;
      locked_by: string | null;
      locked_at: Date | null;
      lock_expires_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO ledger_cursor (id, network, ledger_index)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET id = ledger_cursor.id
       RETURNING *`,
      [this.cursorId, this.network, startLedgerIndex]
    );

    if (!row) {
      throw new Error('Failed to create cursor');
    }

    const state = this.rowToState(row);
    await this.saveToCache(state);

    return state;
  }

  /**
   * Update cursor position
   */
  async update(options: CursorUpdateOptions): Promise<void> {
    const {
      ledgerIndex,
      ledgerHash,
      ledgerCloseTime,
      lastTxHash,
      lastTxIndex,
      transactionsProcessed = 0,
      eventsEmitted = 0,
    } = options;

    await query(
      `UPDATE ledger_cursor SET
        ledger_index = $2,
        ledger_hash = COALESCE($3, ledger_hash),
        ledger_close_time = COALESCE($4, ledger_close_time),
        last_tx_hash = COALESCE($5, last_tx_hash),
        last_tx_index = COALESCE($6, last_tx_index),
        transactions_processed = transactions_processed + $7,
        events_emitted = events_emitted + $8,
        last_heartbeat_at = NOW(),
        consecutive_errors = 0,
        updated_at = NOW()
      WHERE id = $1`,
      [
        this.cursorId,
        ledgerIndex,
        ledgerHash ?? null,
        ledgerCloseTime ?? null,
        lastTxHash ?? null,
        lastTxIndex ?? null,
        transactionsProcessed,
        eventsEmitted,
      ]
    );

    // Update local state
    if (this.state) {
      this.state.ledgerIndex = ledgerIndex;
      if (ledgerHash) this.state.ledgerHash = ledgerHash;
      if (ledgerCloseTime) this.state.ledgerCloseTime = ledgerCloseTime;
      if (lastTxHash) this.state.lastTxHash = lastTxHash;
      if (lastTxIndex !== undefined) this.state.lastTxIndex = lastTxIndex;
      this.state.transactionsProcessed += transactionsProcessed;
      this.state.eventsEmitted += eventsEmitted;
      this.state.lastHeartbeatAt = new Date();
      this.state.consecutiveErrors = 0;
      this.state.updatedAt = new Date();
    }

    // Invalidate cache
    await this.invalidateCache();

    logger.debug(
      { cursorId: this.cursorId, ledgerIndex, txProcessed: transactionsProcessed },
      'Cursor updated'
    );
  }

  /**
   * Record error
   */
  async recordError(message: string): Promise<void> {
    await query(
      `UPDATE ledger_cursor SET
        last_error_at = NOW(),
        last_error_message = $2,
        consecutive_errors = consecutive_errors + 1,
        last_heartbeat_at = NOW(),
        updated_at = NOW()
      WHERE id = $1`,
      [this.cursorId, message]
    );

    if (this.state) {
      this.state.lastErrorAt = new Date();
      this.state.lastErrorMessage = message;
      this.state.consecutiveErrors++;
      this.state.lastHeartbeatAt = new Date();
    }

    await this.invalidateCache();

    logger.warn({ cursorId: this.cursorId, message }, 'Cursor error recorded');
  }

  /**
   * Update processing lag
   */
  async updateLag(lagSeconds: number): Promise<void> {
    await query(
      `UPDATE ledger_cursor SET
        processing_lag_seconds = $2,
        updated_at = NOW()
      WHERE id = $1`,
      [this.cursorId, lagSeconds]
    );

    if (this.state) {
      this.state.processingLagSeconds = lagSeconds;
    }
  }

  /**
   * Heartbeat (update last_heartbeat_at)
   */
  async heartbeat(): Promise<void> {
    await query(
      `UPDATE ledger_cursor SET
        last_heartbeat_at = NOW(),
        updated_at = NOW()
      WHERE id = $1`,
      [this.cursorId]
    );

    if (this.state) {
      this.state.lastHeartbeatAt = new Date();
    }
  }

  // ===========================================================================
  // Checkpointing
  // ===========================================================================

  /**
   * Create checkpoint
   */
  async createCheckpoint(): Promise<void> {
    await query(
      `UPDATE ledger_cursor SET
        checkpoint_ledger_index = ledger_index,
        checkpoint_at = NOW(),
        updated_at = NOW()
      WHERE id = $1`,
      [this.cursorId]
    );

    if (this.state) {
      this.state.checkpointLedgerIndex = this.state.ledgerIndex;
      this.state.checkpointAt = new Date();
    }

    await this.invalidateCache();

    logger.info(
      { cursorId: this.cursorId, ledgerIndex: this.state?.ledgerIndex },
      'Checkpoint created'
    );
  }

  /**
   * Restore from checkpoint
   */
  async restoreFromCheckpoint(): Promise<number | null> {
    const row = await queryOne<{ checkpoint_ledger_index: string | null }>(
      `SELECT checkpoint_ledger_index FROM ledger_cursor WHERE id = $1`,
      [this.cursorId]
    );

    if (!row?.checkpoint_ledger_index) {
      logger.warn({ cursorId: this.cursorId }, 'No checkpoint available');
      return null;
    }

    const checkpointIndex = parseInt(row.checkpoint_ledger_index, 10);

    await query(
      `UPDATE ledger_cursor SET
        ledger_index = checkpoint_ledger_index,
        ledger_hash = NULL,
        last_tx_hash = NULL,
        last_tx_index = NULL,
        consecutive_errors = 0,
        updated_at = NOW()
      WHERE id = $1`,
      [this.cursorId]
    );

    if (this.state) {
      this.state.ledgerIndex = checkpointIndex;
      this.state.ledgerHash = null;
      this.state.lastTxHash = null;
      this.state.lastTxIndex = null;
      this.state.consecutiveErrors = 0;
    }

    await this.invalidateCache();

    logger.info(
      { cursorId: this.cursorId, restoredTo: checkpointIndex },
      'Restored from checkpoint'
    );

    return checkpointIndex;
  }

  // ===========================================================================
  // Distributed Locking
  // ===========================================================================

  /**
   * Acquire lock
   */
  async acquireLock(): Promise<boolean> {
    const result = await queryOne<{ acquire_cursor_lock: boolean }>(
      'SELECT acquire_cursor_lock($1, $2, $3)',
      [this.cursorId, this.workerId, this.lockDurationSeconds]
    );

    const acquired = result?.acquire_cursor_lock ?? false;

    if (acquired) {
      logger.info(
        { cursorId: this.cursorId, workerId: this.workerId },
        'Lock acquired'
      );

      // Start lock renewal
      this.startLockRenewal();
    } else {
      logger.warn(
        { cursorId: this.cursorId, workerId: this.workerId },
        'Failed to acquire lock'
      );
    }

    return acquired;
  }

  /**
   * Release lock
   */
  async releaseLock(): Promise<boolean> {
    this.stopLockRenewal();

    const result = await queryOne<{ release_cursor_lock: boolean }>(
      'SELECT release_cursor_lock($1, $2)',
      [this.cursorId, this.workerId]
    );

    const released = result?.release_cursor_lock ?? false;

    if (released) {
      logger.info(
        { cursorId: this.cursorId, workerId: this.workerId },
        'Lock released'
      );
    }

    return released;
  }

  /**
   * Renew lock
   */
  async renewLock(): Promise<boolean> {
    const result = await queryOne<{ renew_cursor_lock: boolean }>(
      'SELECT renew_cursor_lock($1, $2, $3)',
      [this.cursorId, this.workerId, this.lockDurationSeconds]
    );

    const renewed = result?.renew_cursor_lock ?? false;

    if (!renewed) {
      logger.error(
        { cursorId: this.cursorId, workerId: this.workerId },
        'Failed to renew lock'
      );
    }

    return renewed;
  }

  /**
   * Check if lock is held by this worker
   */
  async hasLock(): Promise<boolean> {
    const row = await queryOne<{ locked_by: string | null; lock_expires_at: Date | null }>(
      'SELECT locked_by, lock_expires_at FROM ledger_cursor WHERE id = $1',
      [this.cursorId]
    );

    if (!row) {
      return false;
    }

    return (
      row.locked_by === this.workerId &&
      row.lock_expires_at !== null &&
      new Date(row.lock_expires_at) > new Date()
    );
  }

  /**
   * Start lock renewal timer
   */
  private startLockRenewal(): void {
    this.stopLockRenewal();

    const renewalInterval = (this.lockDurationSeconds * 1000) / 2;

    this.lockRenewalTimer = setInterval(async () => {
      const renewed = await this.renewLock();
      if (!renewed) {
        this.stopLockRenewal();
      }
    }, renewalInterval);

    logger.debug(
      { cursorId: this.cursorId, intervalMs: renewalInterval },
      'Lock renewal started'
    );
  }

  /**
   * Stop lock renewal timer
   */
  private stopLockRenewal(): void {
    if (this.lockRenewalTimer) {
      clearInterval(this.lockRenewalTimer);
      this.lockRenewalTimer = null;
    }
  }

  // ===========================================================================
  // Caching
  // ===========================================================================

  /**
   * Load from cache
   */
  private async loadFromCache(): Promise<CursorState | null> {
    try {
      const cached = await get(`${CURSOR_CACHE_PREFIX}${this.cursorId}`);
      if (cached) {
        const state = JSON.parse(cached) as CursorState;
        // Convert date strings back to Date objects
        state.ledgerCloseTime = state.ledgerCloseTime
          ? new Date(state.ledgerCloseTime)
          : null;
        state.lastHeartbeatAt = new Date(state.lastHeartbeatAt);
        state.lastErrorAt = state.lastErrorAt
          ? new Date(state.lastErrorAt)
          : null;
        state.checkpointAt = state.checkpointAt
          ? new Date(state.checkpointAt)
          : null;
        state.lockedAt = state.lockedAt ? new Date(state.lockedAt) : null;
        state.lockExpiresAt = state.lockExpiresAt
          ? new Date(state.lockExpiresAt)
          : null;
        state.createdAt = new Date(state.createdAt);
        state.updatedAt = new Date(state.updatedAt);
        return state;
      }
    } catch (error) {
      logger.warn({ err: error }, 'Failed to load cursor from cache');
    }
    return null;
  }

  /**
   * Save to cache
   */
  private async saveToCache(state: CursorState): Promise<void> {
    try {
      await set(
        `${CURSOR_CACHE_PREFIX}${this.cursorId}`,
        JSON.stringify(state),
        CURSOR_CACHE_TTL
      );
    } catch (error) {
      logger.warn({ err: error }, 'Failed to save cursor to cache');
    }
  }

  /**
   * Invalidate cache
   */
  private async invalidateCache(): Promise<void> {
    try {
      await del(`${CURSOR_CACHE_PREFIX}${this.cursorId}`);
    } catch (error) {
      logger.warn({ err: error }, 'Failed to invalidate cursor cache');
    }
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Transform database row to state
   */
  private rowToState(row: {
    id: string;
    network: XrplNetwork;
    ledger_index: string;
    ledger_hash: string | null;
    ledger_close_time: Date | null;
    last_tx_hash: string | null;
    last_tx_index: number | null;
    transactions_processed: string;
    events_emitted: string;
    last_heartbeat_at: Date;
    processing_lag_seconds: number;
    consecutive_errors: number;
    last_error_at: Date | null;
    last_error_message: string | null;
    checkpoint_ledger_index: string | null;
    checkpoint_at: Date | null;
    locked_by: string | null;
    locked_at: Date | null;
    lock_expires_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }): CursorState {
    return {
      id: row.id,
      network: row.network,
      ledgerIndex: parseInt(row.ledger_index, 10),
      ledgerHash: row.ledger_hash,
      ledgerCloseTime: row.ledger_close_time,
      lastTxHash: row.last_tx_hash,
      lastTxIndex: row.last_tx_index,
      transactionsProcessed: parseInt(row.transactions_processed, 10),
      eventsEmitted: parseInt(row.events_emitted, 10),
      lastHeartbeatAt: row.last_heartbeat_at,
      processingLagSeconds: row.processing_lag_seconds,
      consecutiveErrors: row.consecutive_errors,
      lastErrorAt: row.last_error_at,
      lastErrorMessage: row.last_error_message,
      checkpointLedgerIndex: row.checkpoint_ledger_index
        ? parseInt(row.checkpoint_ledger_index, 10)
        : null,
      checkpointAt: row.checkpoint_at,
      lockedBy: row.locked_by,
      lockedAt: row.locked_at,
      lockExpiresAt: row.lock_expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Get processing stats
   */
  getStats(): {
    cursorId: string;
    network: XrplNetwork;
    workerId: string;
    ledgerIndex: number;
    transactionsProcessed: number;
    eventsEmitted: number;
    processingLagSeconds: number;
    consecutiveErrors: number;
    hasLock: boolean;
  } {
    return {
      cursorId: this.cursorId,
      network: this.network,
      workerId: this.workerId,
      ledgerIndex: this.state?.ledgerIndex ?? 0,
      transactionsProcessed: this.state?.transactionsProcessed ?? 0,
      eventsEmitted: this.state?.eventsEmitted ?? 0,
      processingLagSeconds: this.state?.processingLagSeconds ?? 0,
      consecutiveErrors: this.state?.consecutiveErrors ?? 0,
      hasLock: this.state?.lockedBy === this.workerId,
    };
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.stopLockRenewal();
    await this.releaseLock();
    await this.createCheckpoint();
    logger.info({ cursorId: this.cursorId }, 'Cursor cleaned up');
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create or get cursor for network
 */
export async function createCursor(
  network: XrplNetwork,
  options: {
    cursorId?: string;
    startLedgerIndex?: number;
    lockOptions?: LockOptions;
  } = {}
): Promise<LedgerCursor> {
  const cursorId = options.cursorId ?? `${network}-primary`;
  const cursor = new LedgerCursor(cursorId, network, options.lockOptions);

  await cursor.initialize(options.startLedgerIndex ?? 0);

  return cursor;
}

/**
 * Get cursor status for all networks
 */
export async function getAllCursorStatus(): Promise<
  Array<{
    id: string;
    network: XrplNetwork;
    ledgerIndex: number;
    processingLagSeconds: number;
    consecutiveErrors: number;
    lastHeartbeatAt: Date;
    status: 'healthy' | 'stale' | 'error';
  }>
> {
  const rows = await query<{
    id: string;
    network: XrplNetwork;
    ledger_index: string;
    processing_lag_seconds: number;
    consecutive_errors: number;
    last_heartbeat_at: Date;
  }>(
    `SELECT id, network, ledger_index, processing_lag_seconds, 
            consecutive_errors, last_heartbeat_at
     FROM ledger_cursor
     ORDER BY network`
  );

  return rows.rows.map((row) => {
    const lastHeartbeat = new Date(row.last_heartbeat_at);
    const isStale = Date.now() - lastHeartbeat.getTime() > 5 * 60 * 1000;
    const hasErrors = row.consecutive_errors > 10;

    return {
      id: row.id,
      network: row.network,
      ledgerIndex: parseInt(row.ledger_index, 10),
      processingLagSeconds: row.processing_lag_seconds,
      consecutiveErrors: row.consecutive_errors,
      lastHeartbeatAt: lastHeartbeat,
      status: hasErrors ? 'error' : isStale ? 'stale' : 'healthy',
    };
  });
}

/**
 * Release all expired locks
 */
export async function releaseExpiredLocks(): Promise<number> {
  const result = await queryOne<{ release_expired_locks: number }>(
    'SELECT release_expired_locks()'
  );

  const released = result?.release_expired_locks ?? 0;

  if (released > 0) {
    logger.info({ released }, 'Released expired locks');
  }

  return released;
}

// =============================================================================
// Export
// =============================================================================

export default LedgerCursor;
