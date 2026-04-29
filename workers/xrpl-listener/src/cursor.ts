// =============================================================================
// XRNotify XRPL Listener - Cursor Module
// =============================================================================
// Tracks last processed ledger index in PostgreSQL for crash recovery
// =============================================================================

import type { Pool } from 'pg';
import type { Logger } from 'pino';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface CursorConfig {
  /** Listener identifier (for multiple listeners) */
  listenerId: string;
  /** Network identifier (mainnet, testnet, devnet) */
  network: string;
  /** How often to persist cursor (every N ledgers) */
  persistIntervalLedgers: number;
  /** Also persist cursor after this many seconds */
  persistIntervalSeconds: number;
}

export interface CursorState {
  /** Last fully processed ledger index */
  ledgerIndex: number;
  /** Hash of the last fully processed ledger */
  ledgerHash: string | null;
  /** Timestamp of last update */
  updatedAt: string;
  /** Number of events processed since last persist */
  eventsSinceLastPersist: number;
}

export interface CursorRecord {
  listener_id: string;
  network: string;
  ledger_index: number;
  ledger_hash: string | null;
  updated_at: Date;
}

// -----------------------------------------------------------------------------
// Ledger Cursor Class
// -----------------------------------------------------------------------------

export class LedgerCursor {
  private readonly db: Pool;
  private readonly config: CursorConfig;
  private readonly logger: Logger;

  private state: CursorState = {
    ledgerIndex: 0,
    ledgerHash: null,
    updatedAt: new Date().toISOString(),
    eventsSinceLastPersist: 0,
  };

  private lastPersistedLedger = 0;
  private lastPersistTime = Date.now();
  private persistTimer: NodeJS.Timeout | null = null;

  constructor(db: Pool, config: CursorConfig, logger: Logger) {
    this.db = db;
    this.config = config;
    this.logger = logger.child({
      component: 'cursor',
      listenerId: config.listenerId,
      network: config.network,
    });
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async initialize(): Promise<number | null> {
    // Load existing cursor from database
    const cursor = await this.load();

    if (cursor) {
      this.state.ledgerIndex = cursor.ledgerIndex;
      this.state.ledgerHash = cursor.ledgerHash;
      this.lastPersistedLedger = cursor.ledgerIndex;

      this.logger.info(
        { ledgerIndex: cursor.ledgerIndex },
        'Loaded cursor from database'
      );
    } else {
      this.logger.info('No existing cursor found, starting fresh');
    }

    // Start periodic persist timer
    this.startPersistTimer();

    return cursor?.ledgerIndex ?? null;
  }

  async shutdown(): Promise<void> {
    this.stopPersistTimer();

    // Final persist
    if (this.state.ledgerIndex > this.lastPersistedLedger) {
      await this.persist();
    }

    this.logger.info('Cursor shutdown complete');
  }

  // ---------------------------------------------------------------------------
  // State Management
  // ---------------------------------------------------------------------------

  /**
   * Update cursor after processing a transaction within a ledger
   */
  update(ledgerIndex: number, ledgerHash?: string): void {
    this.state.ledgerIndex = ledgerIndex;
    this.state.ledgerHash = ledgerHash ?? null;
    this.state.updatedAt = new Date().toISOString();
    this.state.eventsSinceLastPersist++;

    // Check if we should persist
    this.checkPersistConditions();
  }

  /**
   * Mark a ledger as fully processed
   */
  completeLedger(ledgerIndex: number, ledgerHash: string): void {
    if (ledgerIndex > this.state.ledgerIndex) {
      this.state.ledgerIndex = ledgerIndex;
      this.state.ledgerHash = ledgerHash;
      this.state.updatedAt = new Date().toISOString();
    }

    this.checkPersistConditions();
  }

  /**
   * Get current cursor state
   */
  getState(): CursorState {
    return { ...this.state };
  }

  /**
   * Get last processed ledger index
   */
  getLedgerIndex(): number {
    return this.state.ledgerIndex;
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  private async load(): Promise<{ ledgerIndex: number; ledgerHash: string | null } | null> {
    try {
      // Singleton-aware: schema enforces id = 'main' as the single-row PK,
      // so we read the singleton row directly rather than filtering by
      // listener_id (which can change between deploys via LISTENER_ID env var).
      const result = await this.db.query<CursorRecord>(
        `SELECT ledger_index, ledger_hash
         FROM ledger_cursor
         WHERE id = 'main'`
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0]!;
      return {
        ledgerIndex: row.ledger_index,
        ledgerHash: row.ledger_hash,
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to load cursor');
      throw error;
    }
  }

  async persist(): Promise<void> {
    if (this.state.ledgerIndex === 0) {
      return; // Nothing to persist
    }

    try {
      await this.db.query(
        `INSERT INTO ledger_cursor (listener_id, network, ledger_index, ledger_hash, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (id)
         DO UPDATE SET
           listener_id = EXCLUDED.listener_id,
           network = EXCLUDED.network,
           ledger_index = EXCLUDED.ledger_index,
           ledger_hash = EXCLUDED.ledger_hash,
           updated_at = NOW()`,
        [
          this.config.listenerId,
          this.config.network,
          this.state.ledgerIndex,
          this.state.ledgerHash,
        ]
      );

      this.lastPersistedLedger = this.state.ledgerIndex;
      this.lastPersistTime = Date.now();
      this.state.eventsSinceLastPersist = 0;

      this.logger.debug(
        { ledgerIndex: this.state.ledgerIndex },
        'Persisted cursor'
      );
    } catch (error) {
      this.logger.error({ error }, 'Failed to persist cursor');
      // Don't throw - we'll retry on next interval
    }
  }

  private checkPersistConditions(): void {
    const ledgersSinceLastPersist = this.state.ledgerIndex - this.lastPersistedLedger;
    const secondsSinceLastPersist = (Date.now() - this.lastPersistTime) / 1000;

    const shouldPersist =
      ledgersSinceLastPersist >= this.config.persistIntervalLedgers ||
      secondsSinceLastPersist >= this.config.persistIntervalSeconds;

    if (shouldPersist) {
      // Persist asynchronously (don't block processing)
      this.persist().catch((error) => {
        this.logger.error({ error }, 'Background persist failed');
      });
    }
  }

  private startPersistTimer(): void {
    // Periodic persist as backup
    this.persistTimer = setInterval(() => {
      if (this.state.ledgerIndex > this.lastPersistedLedger) {
        this.persist().catch((error) => {
          this.logger.error({ error }, 'Timer persist failed');
        });
      }
    }, this.config.persistIntervalSeconds * 1000);
  }

  private stopPersistTimer(): void {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Recovery
  // ---------------------------------------------------------------------------

  /**
   * Reset cursor to a specific ledger (for replay/recovery)
   */
  async resetTo(ledgerIndex: number): Promise<void> {
    this.state.ledgerIndex = ledgerIndex;
    this.state.ledgerHash = null;
    this.state.updatedAt = new Date().toISOString();
    this.state.eventsSinceLastPersist = 0;

    await this.persist();

    this.logger.info({ ledgerIndex }, 'Reset cursor');
  }

  /**
   * Delete cursor (for clean restart)
   */
  async delete(): Promise<void> {
    // Singleton-aware: deletes the lone id='main' row regardless of
    // current listener_id/network config. Consistent with load() and persist().
    await this.db.query(
      `DELETE FROM ledger_cursor
       WHERE id = 'main'`
    );

    this.state.ledgerIndex = 0;
    this.state.ledgerHash = null;
    this.lastPersistedLedger = 0;

    this.logger.info('Deleted cursor');
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  getStats(): {
    currentLedger: number;
    persistedLedger: number;
    lag: number;
    eventsSinceLastPersist: number;
    secondsSinceLastPersist: number;
  } {
    return {
      currentLedger: this.state.ledgerIndex,
      persistedLedger: this.lastPersistedLedger,
      lag: this.state.ledgerIndex - this.lastPersistedLedger,
      eventsSinceLastPersist: this.state.eventsSinceLastPersist,
      secondsSinceLastPersist: Math.floor((Date.now() - this.lastPersistTime) / 1000),
    };
  }
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

export const DEFAULT_CURSOR_CONFIG: Omit<CursorConfig, 'listenerId'> = {
  network: 'mainnet',
  persistIntervalLedgers: 10,
  persistIntervalSeconds: 30,
};

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

export function createLedgerCursor(
  db: Pool,
  config: Partial<CursorConfig> & Pick<CursorConfig, 'listenerId'>,
  logger: Logger
): LedgerCursor {
  const fullConfig: CursorConfig = {
    ...DEFAULT_CURSOR_CONFIG,
    ...config,
  };

  return new LedgerCursor(db, fullConfig, logger);
}

// -----------------------------------------------------------------------------
// Multiple Cursor Manager (for multi-network support)
// -----------------------------------------------------------------------------

export class CursorManager {
  private readonly cursors = new Map<string, LedgerCursor>();
  private readonly db: Pool;
  private readonly logger: Logger;

  constructor(db: Pool, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  async getCursor(listenerId: string, network: string): Promise<LedgerCursor> {
    const key = `${listenerId}:${network}`;

    if (!this.cursors.has(key)) {
      const cursor = createLedgerCursor(
        this.db,
        { listenerId, network },
        this.logger
      );
      await cursor.initialize();
      this.cursors.set(key, cursor);
    }

    return this.cursors.get(key)!;
  }

  async shutdownAll(): Promise<void> {
    for (const cursor of this.cursors.values()) {
      await cursor.shutdown();
    }
    this.cursors.clear();
  }
}
