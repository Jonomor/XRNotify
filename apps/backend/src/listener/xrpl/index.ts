/**
 * @fileoverview XRNotify XRPL Listener Service
 * Main entry point for XRPL ledger streaming and event emission.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/listener/xrpl
 */

import { EventEmitter } from 'node:events';
import { createModuleLogger } from '../../core/logger.js';
import { getConfig } from '../../core/config.js';
import { query } from '../../core/db.js';
import { publishMessage } from '../../core/redis.js';
import {
  recordXrplLedger,
  recordXrplTransaction,
  recordXrplEvent,
  recordXrplError,
} from '../../core/metrics.js';
import { XrplClient, createXrplClient, type XrplNetwork } from './client.js';
import { LedgerCursor, createCursor } from './cursor.js';
import {
  normalizeTransaction,
  normalizeLedger,
  isSuccessful,
  type RawTransaction,
  type LedgerContext,
} from './normalize.js';
import type { XrplEvent } from '@xrnotify/shared';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('xrpl-listener');

/**
 * Listener configuration
 */
export interface XrplListenerConfig {
  network: XrplNetwork;
  nodeUrls?: string[];
  cursorId?: string;
  startLedger?: number;
  batchSize?: number;
  catchUpEnabled?: boolean;
  maxCatchUpLedgers?: number;
  processingDelayMs?: number;
}

/**
 * Listener state
 */
export type ListenerState =
  | 'stopped'
  | 'starting'
  | 'connecting'
  | 'syncing'
  | 'streaming'
  | 'error'
  | 'stopping';

/**
 * Listener statistics
 */
export interface ListenerStats {
  state: ListenerState;
  network: XrplNetwork;
  currentLedger: number;
  latestLedger: number;
  lag: number;
  ledgersProcessed: number;
  transactionsProcessed: number;
  eventsEmitted: number;
  errorsCount: number;
  uptime: number;
  startedAt: Date | null;
}

/**
 * Ledger response from XRPL
 */
interface LedgerResponse {
  ledger: {
    ledger_index: number;
    ledger_hash: string;
    close_time: number;
    close_time_human: string;
    parent_hash: string;
    total_coins: string;
    transaction_hash: string;
    transactions?: RawTransaction[];
  };
  ledger_index: number;
  validated: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const EVENTS_CHANNEL = 'xrpl:events';
const DEFAULT_BATCH_SIZE = 1;
const DEFAULT_MAX_CATCH_UP = 1000;
const DEFAULT_PROCESSING_DELAY = 0;

// =============================================================================
// XRPL Listener Service
// =============================================================================

/**
 * XRPL Listener Service
 *
 * Streams XRPL ledgers, normalizes transactions into events,
 * and publishes them for webhook delivery.
 */
export class XrplListenerService extends EventEmitter {
  private config: Required<XrplListenerConfig>;
  private client: XrplClient;
  private cursor: LedgerCursor | null = null;
  private state: ListenerState = 'stopped';
  private isShuttingDown = false;

  // Statistics
  private startedAt: Date | null = null;
  private ledgersProcessed = 0;
  private transactionsProcessed = 0;
  private eventsEmitted = 0;
  private errorsCount = 0;
  private latestLedger = 0;

  // Processing
  private processingQueue: number[] = [];
  private isProcessing = false;

  constructor(config: XrplListenerConfig) {
    super();

    const appConfig = getConfig();

    this.config = {
      network: config.network,
      nodeUrls: config.nodeUrls ?? [],
      cursorId: config.cursorId ?? `${config.network}-primary`,
      startLedger: config.startLedger ?? 0,
      batchSize: config.batchSize ?? DEFAULT_BATCH_SIZE,
      catchUpEnabled: config.catchUpEnabled ?? true,
      maxCatchUpLedgers: config.maxCatchUpLedgers ?? DEFAULT_MAX_CATCH_UP,
      processingDelayMs: config.processingDelayMs ?? DEFAULT_PROCESSING_DELAY,
    };

    // Create XRPL client
    this.client = createXrplClient(config.network, {
      nodeUrls: this.config.nodeUrls.length > 0 ? this.config.nodeUrls : undefined,
    });

    // Set up client event handlers
    this.setupClientHandlers();

    logger.info(
      {
        network: this.config.network,
        cursorId: this.config.cursorId,
      },
      'XRPL Listener Service initialized'
    );
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Start the listener
   */
  async start(): Promise<void> {
    if (this.state !== 'stopped') {
      logger.warn({ state: this.state }, 'Listener already running');
      return;
    }

    this.isShuttingDown = false;
    this.state = 'starting';
    this.startedAt = new Date();

    logger.info({ network: this.config.network }, 'Starting XRPL Listener');

    try {
      // Initialize cursor
      this.cursor = await createCursor(this.config.network, {
        cursorId: this.config.cursorId,
        startLedgerIndex: this.config.startLedger,
      });

      // Acquire lock
      const hasLock = await this.cursor.acquireLock();
      if (!hasLock) {
        throw new Error('Could not acquire cursor lock - another worker may be processing');
      }

      // Connect to XRPL
      this.state = 'connecting';
      await this.client.connect();

      // Subscribe to streams
      await this.client.subscribe(['ledger', 'transactions']);

      // Start syncing
      await this.sync();

      this.state = 'streaming';
      this.emit('started');

      logger.info(
        {
          network: this.config.network,
          ledgerIndex: this.cursor.getLedgerIndex(),
        },
        'XRPL Listener started'
      );
    } catch (error) {
      this.state = 'error';
      this.errorsCount++;

      logger.error({ err: error }, 'Failed to start listener');

      // Cleanup
      if (this.cursor) {
        await this.cursor.releaseLock();
      }

      throw error;
    }
  }

  /**
   * Stop the listener
   */
  async stop(): Promise<void> {
    if (this.state === 'stopped' || this.state === 'stopping') {
      return;
    }

    logger.info({ network: this.config.network }, 'Stopping XRPL Listener');

    this.isShuttingDown = true;
    this.state = 'stopping';

    try {
      // Disconnect client
      await this.client.disconnect();

      // Cleanup cursor
      if (this.cursor) {
        await this.cursor.createCheckpoint();
        await this.cursor.releaseLock();
      }

      this.state = 'stopped';
      this.emit('stopped');

      logger.info(
        {
          network: this.config.network,
          ledgersProcessed: this.ledgersProcessed,
          transactionsProcessed: this.transactionsProcessed,
          eventsEmitted: this.eventsEmitted,
        },
        'XRPL Listener stopped'
      );
    } catch (error) {
      logger.error({ err: error }, 'Error stopping listener');
      this.state = 'stopped';
    }
  }

  /**
   * Get current state
   */
  getState(): ListenerState {
    return this.state;
  }

  /**
   * Get statistics
   */
  getStats(): ListenerStats {
    const currentLedger = this.cursor?.getLedgerIndex() ?? 0;

    return {
      state: this.state,
      network: this.config.network,
      currentLedger,
      latestLedger: this.latestLedger,
      lag: this.latestLedger - currentLedger,
      ledgersProcessed: this.ledgersProcessed,
      transactionsProcessed: this.transactionsProcessed,
      eventsEmitted: this.eventsEmitted,
      errorsCount: this.errorsCount,
      uptime: this.startedAt ? Date.now() - this.startedAt.getTime() : 0,
      startedAt: this.startedAt,
    };
  }

  /**
   * Check if listener is healthy
   */
  isHealthy(): boolean {
    if (this.state !== 'streaming') {
      return false;
    }

    // Check lag
    const currentLedger = this.cursor?.getLedgerIndex() ?? 0;
    const lag = this.latestLedger - currentLedger;

    // Unhealthy if more than 100 ledgers behind
    if (lag > 100) {
      return false;
    }

    return true;
  }

  // ===========================================================================
  // Client Event Handlers
  // ===========================================================================

  /**
   * Set up client event handlers
   */
  private setupClientHandlers(): void {
    this.client.on('ready', () => {
      logger.info('XRPL client ready');
    });

    this.client.on('ledgerClosed', (message) => {
      this.onLedgerClosed(message);
    });

    this.client.on('transaction', (message) => {
      this.onTransaction(message);
    });

    this.client.on('disconnected', () => {
      if (!this.isShuttingDown) {
        logger.warn('XRPL client disconnected unexpectedly');
        this.state = 'connecting';
      }
    });

    this.client.on('error', (error) => {
      logger.error({ err: error }, 'XRPL client error');
      this.errorsCount++;
      recordXrplError('client_error', this.config.network);
    });
  }

  /**
   * Handle ledger closed event
   */
  private async onLedgerClosed(message: Record<string, unknown>): Promise<void> {
    const ledgerIndex = message.ledger_index as number;
    const ledgerHash = message.ledger_hash as string;

    this.latestLedger = Math.max(this.latestLedger, ledgerIndex);

    logger.debug({ ledgerIndex, ledgerHash }, 'Ledger closed');

    recordXrplLedger(this.config.network);

    // Queue for processing
    this.queueLedger(ledgerIndex);
  }

  /**
   * Handle transaction stream event
   */
  private async onTransaction(message: Record<string, unknown>): Promise<void> {
    // Transaction stream is for real-time notifications
    // We still process full ledgers for reliability
    const tx = message.transaction as RawTransaction;
    const ledgerIndex = message.ledger_index as number;

    recordXrplTransaction(tx.TransactionType, this.config.network);

    // Emit raw transaction event (for real-time subscribers)
    this.emit('transaction', { tx, ledgerIndex });
  }

  // ===========================================================================
  // Synchronization
  // ===========================================================================

  /**
   * Sync cursor with current ledger
   */
  private async sync(): Promise<void> {
    if (!this.cursor) {
      throw new Error('Cursor not initialized');
    }

    this.state = 'syncing';

    // Get current ledger from server
    const serverInfo = this.client.getServerInfo();
    if (!serverInfo) {
      throw new Error('Server info not available');
    }

    const currentLedger = serverInfo.validatedLedger.seq;
    this.latestLedger = currentLedger;

    const cursorLedger = this.cursor.getLedgerIndex();

    logger.info(
      { cursorLedger, currentLedger, diff: currentLedger - cursorLedger },
      'Syncing cursor'
    );

    // Check if catch-up is needed
    if (this.config.catchUpEnabled && cursorLedger > 0 && cursorLedger < currentLedger) {
      await this.catchUp(cursorLedger, currentLedger);
    } else if (cursorLedger === 0) {
      // Fresh start - set to current ledger
      await this.cursor.update({ ledgerIndex: currentLedger });
      logger.info({ ledgerIndex: currentLedger }, 'Starting from current ledger');
    }
  }

  /**
   * Catch up on missed ledgers
   */
  private async catchUp(fromLedger: number, toLedger: number): Promise<void> {
    const behindBy = toLedger - fromLedger;

    logger.info({ fromLedger, toLedger, behindBy }, 'Catching up on missed ledgers');

    // Limit catch-up
    if (behindBy > this.config.maxCatchUpLedgers) {
      logger.warn(
        { behindBy, maxCatchUp: this.config.maxCatchUpLedgers },
        'Too far behind, skipping catch-up'
      );

      // Jump to recent ledger
      const skipTo = toLedger - 10;
      await this.cursor!.update({ ledgerIndex: skipTo });
      return;
    }

    // Process missed ledgers
    for (let ledgerIndex = fromLedger + 1; ledgerIndex <= toLedger; ledgerIndex++) {
      if (this.isShuttingDown) {
        break;
      }

      try {
        await this.processLedger(ledgerIndex);

        // Progress update
        if ((ledgerIndex - fromLedger) % 100 === 0) {
          const progress = ((ledgerIndex - fromLedger) / behindBy * 100).toFixed(1);
          logger.info({ ledgerIndex, progress: `${progress}%` }, 'Catch-up progress');
        }
      } catch (error) {
        logger.error({ err: error, ledgerIndex }, 'Error processing catch-up ledger');
        await this.cursor!.recordError(`Catch-up error: ${(error as Error).message}`);
        this.errorsCount++;

        // Stop catch-up on persistent errors
        if (this.cursor!.getState()?.consecutiveErrors ?? 0 > 10) {
          logger.error('Too many catch-up errors, aborting');
          break;
        }
      }
    }

    logger.info({ ledgersProcessed: behindBy }, 'Catch-up complete');
  }

  // ===========================================================================
  // Ledger Processing
  // ===========================================================================

  /**
   * Queue ledger for processing
   */
  private queueLedger(ledgerIndex: number): void {
    // Avoid duplicates
    if (!this.processingQueue.includes(ledgerIndex)) {
      this.processingQueue.push(ledgerIndex);
      this.processingQueue.sort((a, b) => a - b);
    }

    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process queued ledgers
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.isShuttingDown) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.processingQueue.length > 0 && !this.isShuttingDown) {
        const ledgerIndex = this.processingQueue[0]!;
        const cursorIndex = this.cursor?.getLedgerIndex() ?? 0;

        // Only process if this is the next ledger
        if (ledgerIndex !== cursorIndex + 1) {
          // Check if we need to catch up
          if (ledgerIndex > cursorIndex + 1) {
            // Missing ledgers - need to fetch them
            for (let i = cursorIndex + 1; i < ledgerIndex; i++) {
              try {
                await this.processLedger(i);
              } catch (error) {
                logger.error({ err: error, ledgerIndex: i }, 'Error processing missing ledger');
                break;
              }
            }
          }
        }

        // Process current ledger
        try {
          await this.processLedger(ledgerIndex);
          this.processingQueue.shift();
        } catch (error) {
          logger.error({ err: error, ledgerIndex }, 'Error processing ledger');
          this.errorsCount++;

          // Remove from queue after too many failures
          if (this.errorsCount > 10) {
            this.processingQueue.shift();
          }
          break;
        }

        // Optional processing delay
        if (this.config.processingDelayMs > 0) {
          await new Promise((r) => setTimeout(r, this.config.processingDelayMs));
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single ledger
   */
  private async processLedger(ledgerIndex: number): Promise<void> {
    const startTime = Date.now();

    // Fetch ledger with transactions
    const response = await this.client.getLedger(ledgerIndex, {
      transactions: true,
      expand: true,
    }) as LedgerResponse;

    const ledger = response.ledger;
    const transactions = ledger.transactions ?? [];

    logger.debug(
      { ledgerIndex, txCount: transactions.length },
      'Processing ledger'
    );

    // Build context
    const context: LedgerContext = {
      ledgerIndex: ledger.ledger_index,
      ledgerHash: ledger.ledger_hash,
      ledgerCloseTime: ledger.close_time,
      network: this.config.network,
    };

    // Normalize transactions to events
    const events = normalizeLedger(transactions, context);

    // Store and publish events
    for (const event of events) {
      await this.processEvent(event);
    }

    // Update cursor
    await this.cursor!.update({
      ledgerIndex: ledger.ledger_index,
      ledgerHash: ledger.ledger_hash,
      ledgerCloseTime: new Date((ledger.close_time + 946684800) * 1000),
      transactionsProcessed: transactions.length,
      eventsEmitted: events.length,
    });

    // Update stats
    this.ledgersProcessed++;
    this.transactionsProcessed += transactions.length;
    this.eventsEmitted += events.length;

    // Update lag
    const lag = this.latestLedger - ledger.ledger_index;
    await this.cursor!.updateLag(lag * 4); // ~4 seconds per ledger

    const durationMs = Date.now() - startTime;

    logger.debug(
      {
        ledgerIndex,
        txCount: transactions.length,
        eventCount: events.length,
        durationMs,
      },
      'Ledger processed'
    );

    // Emit ledger event
    this.emit('ledger', {
      ledgerIndex,
      ledgerHash: ledger.ledger_hash,
      transactionCount: transactions.length,
      eventCount: events.length,
      durationMs,
    });
  }

  /**
   * Process a single event
   */
  private async processEvent(event: XrplEvent): Promise<void> {
    try {
      // Store event in database
      await this.storeEvent(event);

      // Publish to Redis for webhook workers
      await this.publishEvent(event);

      // Record metric
      recordXrplEvent(event.event_type, this.config.network);

      // Emit for local subscribers
      this.emit('event', event);
    } catch (error) {
      logger.error(
        { err: error, eventId: event.id, eventType: event.event_type },
        'Error processing event'
      );
      throw error;
    }
  }

  /**
   * Store event in database
   */
  private async storeEvent(event: XrplEvent): Promise<void> {
    await query(
      `INSERT INTO events (
        id, event_type, ledger_index, tx_hash, network,
        account_context, payload, result_code, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (id) DO NOTHING`,
      [
        event.id,
        event.event_type,
        event.ledger_index,
        event.tx_hash,
        event.network,
        event.account_context,
        JSON.stringify(event.payload),
        event.result_code ?? null,
      ]
    );
  }

  /**
   * Publish event to Redis
   */
  private async publishEvent(event: XrplEvent): Promise<void> {
    await publishMessage(EVENTS_CHANNEL, JSON.stringify(event));
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create and start XRPL listener for a network
 */
export async function startXrplListener(
  network: XrplNetwork,
  options: Partial<XrplListenerConfig> = {}
): Promise<XrplListenerService> {
  const listener = new XrplListenerService({
    network,
    ...options,
  });

  await listener.start();

  return listener;
}

/**
 * Create listeners for all configured networks
 */
export async function startAllListeners(
  options: {
    mainnet?: boolean;
    testnet?: boolean;
    devnet?: boolean;
  } = {}
): Promise<Map<XrplNetwork, XrplListenerService>> {
  const config = getConfig();
  const listeners = new Map<XrplNetwork, XrplListenerService>();

  const networks: XrplNetwork[] = [];

  if (options.mainnet ?? config.xrpl.mainnetEnabled) {
    networks.push('mainnet');
  }
  if (options.testnet ?? config.xrpl.testnetEnabled) {
    networks.push('testnet');
  }
  if (options.devnet ?? config.xrpl.devnetEnabled) {
    networks.push('devnet');
  }

  for (const network of networks) {
    try {
      const listener = await startXrplListener(network);
      listeners.set(network, listener);
      logger.info({ network }, 'Listener started');
    } catch (error) {
      logger.error({ err: error, network }, 'Failed to start listener');
    }
  }

  return listeners;
}

/**
 * Stop all listeners
 */
export async function stopAllListeners(
  listeners: Map<XrplNetwork, XrplListenerService>
): Promise<void> {
  for (const [network, listener] of listeners) {
    try {
      await listener.stop();
      logger.info({ network }, 'Listener stopped');
    } catch (error) {
      logger.error({ err: error, network }, 'Error stopping listener');
    }
  }

  listeners.clear();
}

// =============================================================================
// Export
// =============================================================================

export {
  XrplClient,
  createXrplClient,
  LedgerCursor,
  createCursor,
} from './client.js';

export * from './normalize.js';
export * from './parsers/payment.js';
export * from './parsers/nft.js';
export * from './parsers/trustline.js';
export * from './parsers/dex.js';

export default XrplListenerService;
