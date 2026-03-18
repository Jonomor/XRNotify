/**
 * @fileoverview XRNotify XRPL Listener Service
 * Connects to XRPL WebSocket, processes ledgers, and emits events.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/services/xrpl
 */

import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import { createModuleLogger } from '../../core/logger.js';
import { getConfig } from '../../core/config.js';
import { query, queryOne } from '../../core/db.js';
import { publishMessage } from '../../core/redis.js';
import {
  recordXrplConnection,
  recordXrplLedger,
  recordXrplTransaction,
  recordXrplEvent,
  recordXrplError,
} from '../../core/metrics.js';
import { uuid, nowISO } from '@xrnotify/shared';
import type { XrplEvent, EventType } from '@xrnotify/shared';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('xrpl-listener');

/**
 * XRPL network type
 */
export type XrplNetwork = 'mainnet' | 'testnet' | 'devnet';

/**
 * Listener configuration
 */
export interface XrplListenerConfig {
  network: XrplNetwork;
  nodeUrls: string[];
  cursorId: string;
  startLedger?: number;
  reconnectIntervalMs?: number;
  heartbeatIntervalMs?: number;
  lockDurationSeconds?: number;
}

/**
 * Listener state
 */
export type ListenerState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'subscribing'
  | 'streaming'
  | 'error'
  | 'stopped';

/**
 * XRPL transaction type
 */
interface XrplTransaction {
  hash: string;
  TransactionType: string;
  Account: string;
  Destination?: string;
  Amount?: string | { currency: string; issuer: string; value: string };
  Fee?: string;
  Sequence?: number;
  meta?: {
    TransactionResult: string;
    delivered_amount?: string | { currency: string; issuer: string; value: string };
    AffectedNodes?: Array<Record<string, unknown>>;
  };
  [key: string]: unknown;
}

/**
 * XRPL ledger response
 */
interface XrplLedgerResponse {
  ledger_index: number;
  ledger_hash: string;
  ledger_time: number;
  close_time: number;
  close_time_human: string;
  transactions?: XrplTransaction[];
  txn_count?: number;
}

/**
 * XRPL WebSocket message
 */
interface XrplMessage {
  id?: number | string;
  type?: string;
  status?: string;
  result?: Record<string, unknown>;
  error?: string;
  error_message?: string;
  transaction?: XrplTransaction;
  ledger_index?: number;
  ledger_hash?: string;
  validated_ledgers?: string;
  engine_result?: string;
  engine_result_message?: string;
}

/**
 * Pending request
 */
interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

// =============================================================================
// Constants
// =============================================================================

const EVENTS_CHANNEL = 'events';
const DEFAULT_RECONNECT_INTERVAL = 5000;
const DEFAULT_HEARTBEAT_INTERVAL = 30000;
const DEFAULT_LOCK_DURATION = 60;
const REQUEST_TIMEOUT = 30000;

/**
 * Default XRPL WebSocket URLs
 */
const DEFAULT_NODES: Record<XrplNetwork, string[]> = {
  mainnet: [
    'wss://s1.ripple.com',
    'wss://s2.ripple.com',
    'wss://xrplcluster.com',
  ],
  testnet: [
    'wss://s.altnet.rippletest.net:51233',
  ],
  devnet: [
    'wss://s.devnet.rippletest.net:51233',
  ],
};

// =============================================================================
// XRPL Listener Class
// =============================================================================

/**
 * XRPL Ledger Listener
 *
 * Connects to XRPL nodes and streams transactions,
 * converting them to normalized events.
 */
export class XrplListener extends EventEmitter {
  private config: Required<XrplListenerConfig>;
  private ws: WebSocket | null = null;
  private state: ListenerState = 'disconnected';
  private currentNodeIndex = 0;
  private requestId = 0;
  private pendingRequests = new Map<number, PendingRequest>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lockRenewalTimer: NodeJS.Timeout | null = null;
  private workerId: string;
  private lastLedgerIndex = 0;
  private lastLedgerTime: Date | null = null;
  private processedTxCount = 0;
  private emittedEventCount = 0;
  private isShuttingDown = false;

  constructor(config: XrplListenerConfig) {
    super();

    this.workerId = `worker-${uuid().substring(0, 8)}`;

    this.config = {
      network: config.network,
      nodeUrls: config.nodeUrls.length > 0 ? config.nodeUrls : DEFAULT_NODES[config.network],
      cursorId: config.cursorId,
      startLedger: config.startLedger ?? 0,
      reconnectIntervalMs: config.reconnectIntervalMs ?? DEFAULT_RECONNECT_INTERVAL,
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL,
      lockDurationSeconds: config.lockDurationSeconds ?? DEFAULT_LOCK_DURATION,
    };

    logger.info(
      {
        network: this.config.network,
        cursorId: this.config.cursorId,
        nodeUrls: this.config.nodeUrls,
        workerId: this.workerId,
      },
      'XRPL Listener initialized'
    );
  }

  // ===========================================================================
  // Public Methods
  // ===========================================================================

  /**
   * Start the listener
   */
  async start(): Promise<void> {
    if (this.state !== 'disconnected' && this.state !== 'error') {
      logger.warn({ state: this.state }, 'Listener already running');
      return;
    }

    this.isShuttingDown = false;

    // Try to acquire lock
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      logger.warn({ cursorId: this.config.cursorId }, 'Could not acquire lock, another worker is processing');
      this.scheduleReconnect();
      return;
    }

    // Initialize cursor position
    await this.initializeCursor();

    // Start lock renewal
    this.startLockRenewal();

    // Connect to XRPL
    await this.connect();
  }

  /**
   * Stop the listener
   */
  async stop(): Promise<void> {
    logger.info({ workerId: this.workerId }, 'Stopping listener');

    this.isShuttingDown = true;
    this.state = 'stopped';

    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.lockRenewalTimer) {
      clearInterval(this.lockRenewalTimer);
      this.lockRenewalTimer = null;
    }

    // Reject pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Listener stopped'));
      this.pendingRequests.delete(id);
    }

    // Close WebSocket
    if (this.ws) {
      this.ws.close(1000, 'Listener stopped');
      this.ws = null;
    }

    // Release lock
    await this.releaseLock();

    // Create checkpoint
    await this.createCheckpoint();

    this.emit('stopped');
    logger.info({ workerId: this.workerId }, 'Listener stopped');
  }

  /**
   * Get current state
   */
  getState(): ListenerState {
    return this.state;
  }

  /**
   * Get listener stats
   */
  getStats(): {
    state: ListenerState;
    network: XrplNetwork;
    workerId: string;
    currentNode: string;
    lastLedgerIndex: number;
    lastLedgerTime: string | null;
    processedTxCount: number;
    emittedEventCount: number;
  } {
    return {
      state: this.state,
      network: this.config.network,
      workerId: this.workerId,
      currentNode: this.config.nodeUrls[this.currentNodeIndex] ?? 'none',
      lastLedgerIndex: this.lastLedgerIndex,
      lastLedgerTime: this.lastLedgerTime?.toISOString() ?? null,
      processedTxCount: this.processedTxCount,
      emittedEventCount: this.emittedEventCount,
    };
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  /**
   * Connect to XRPL node
   */
  private async connect(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.state = 'connecting';
    const nodeUrl = this.config.nodeUrls[this.currentNodeIndex]!;

    logger.info({ nodeUrl, network: this.config.network }, 'Connecting to XRPL');

    try {
      this.ws = new WebSocket(nodeUrl);

      this.ws.on('open', () => this.onOpen());
      this.ws.on('message', (data) => this.onMessage(data));
      this.ws.on('error', (error) => this.onError(error));
      this.ws.on('close', (code, reason) => this.onClose(code, reason.toString()));
    } catch (error) {
      logger.error({ err: error, nodeUrl }, 'Failed to create WebSocket');
      this.onError(error as Error);
    }
  }

  /**
   * Handle WebSocket open
   */
  private async onOpen(): Promise<void> {
    const nodeUrl = this.config.nodeUrls[this.currentNodeIndex]!;
    logger.info({ nodeUrl }, 'Connected to XRPL');

    this.state = 'connected';
    recordXrplConnection(true, this.config.network);

    // Update node health
    await this.updateNodeHealth(nodeUrl, 'healthy');

    // Start heartbeat
    this.startHeartbeat();

    // Subscribe to ledger stream
    await this.subscribe();
  }

  /**
   * Handle WebSocket message
   */
  private onMessage(data: WebSocket.Data): void {
    try {
      const message: XrplMessage = JSON.parse(data.toString());

      // Handle response to request
      if (message.id !== undefined && this.pendingRequests.has(message.id as number)) {
        const pending = this.pendingRequests.get(message.id as number)!;
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id as number);

        if (message.status === 'error') {
          pending.reject(new Error(message.error_message ?? message.error ?? 'Unknown error'));
        } else {
          pending.resolve(message.result);
        }
        return;
      }

      // Handle stream messages
      if (message.type === 'ledgerClosed') {
        this.onLedgerClosed(message);
      } else if (message.type === 'transaction') {
        this.onTransaction(message);
      }
    } catch (error) {
      logger.error({ err: error, data: data.toString().substring(0, 200) }, 'Failed to parse message');
    }
  }

  /**
   * Handle WebSocket error
   */
  private onError(error: Error): void {
    logger.error({ err: error, network: this.config.network }, 'WebSocket error');

    this.state = 'error';
    recordXrplConnection(false, this.config.network);
    recordXrplError('websocket_error', this.config.network);

    this.emit('error', error);

    // Try next node
    this.rotateNode();
    this.scheduleReconnect();
  }

  /**
   * Handle WebSocket close
   */
  private async onClose(code: number, reason: string): Promise<void> {
    logger.info({ code, reason, network: this.config.network }, 'WebSocket closed');

    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.isShuttingDown) {
      return;
    }

    this.state = 'disconnected';
    recordXrplConnection(false, this.config.network);

    this.emit('disconnected', { code, reason });

    // Reconnect
    this.rotateNode();
    this.scheduleReconnect();
  }

  /**
   * Rotate to next node
   */
  private rotateNode(): void {
    this.currentNodeIndex = (this.currentNodeIndex + 1) % this.config.nodeUrls.length;
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.isShuttingDown) {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.connect();
    }, this.config.reconnectIntervalMs);

    logger.info(
      { reconnectMs: this.config.reconnectIntervalMs },
      'Scheduled reconnection'
    );
  }

  // ===========================================================================
  // Subscription
  // ===========================================================================

  /**
   * Subscribe to ledger stream
   */
  private async subscribe(): Promise<void> {
    this.state = 'subscribing';

    try {
      // Subscribe to ledger and transactions
      await this.sendRequest({
        command: 'subscribe',
        streams: ['ledger', 'transactions'],
      });

      this.state = 'streaming';
      logger.info({ network: this.config.network }, 'Subscribed to XRPL streams');

      this.emit('streaming');

      // If we're behind, catch up
      await this.catchUp();
    } catch (error) {
      logger.error({ err: error }, 'Failed to subscribe');
      this.onError(error as Error);
    }
  }

  /**
   * Catch up on missed ledgers
   */
  private async catchUp(): Promise<void> {
    const cursor = await this.getCursorPosition();
    if (cursor.ledgerIndex === 0) {
      // Fresh start, don't catch up
      logger.info('Fresh start, no catch-up needed');
      return;
    }

    // Get current ledger
    const serverInfo = await this.sendRequest({ command: 'server_info' }) as {
      info: { validated_ledger: { seq: number } };
    };
    const currentLedger = serverInfo.info.validated_ledger.seq;

    const behindBy = currentLedger - cursor.ledgerIndex;

    if (behindBy <= 0) {
      logger.info('Cursor is up to date');
      return;
    }

    if (behindBy > 1000) {
      logger.warn(
        { behindBy, cursorLedger: cursor.ledgerIndex, currentLedger },
        'Too far behind, skipping catch-up'
      );
      await this.updateCursor(currentLedger);
      return;
    }

    logger.info({ behindBy, startLedger: cursor.ledgerIndex + 1 }, 'Catching up on missed ledgers');

    // Process missed ledgers
    for (let ledgerIndex = cursor.ledgerIndex + 1; ledgerIndex <= currentLedger; ledgerIndex++) {
      if (this.isShuttingDown) {
        break;
      }

      try {
        await this.processLedger(ledgerIndex);
      } catch (error) {
        logger.error({ err: error, ledgerIndex }, 'Failed to process catch-up ledger');
        await this.recordError(`Catch-up failed: ${(error as Error).message}`);
        break;
      }
    }

    logger.info('Catch-up complete');
  }

  // ===========================================================================
  // Ledger Processing
  // ===========================================================================

  /**
   * Handle ledger closed event
   */
  private async onLedgerClosed(message: XrplMessage): Promise<void> {
    const ledgerIndex = message.ledger_index!;
    const ledgerHash = message.ledger_hash!;

    logger.debug({ ledgerIndex, ledgerHash }, 'Ledger closed');
    recordXrplLedger(this.config.network);

    // Fetch and process the ledger
    try {
      await this.processLedger(ledgerIndex);
    } catch (error) {
      logger.error({ err: error, ledgerIndex }, 'Failed to process ledger');
      await this.recordError(`Ledger processing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Process a complete ledger
   */
  private async processLedger(ledgerIndex: number): Promise<void> {
    const startTime = Date.now();

    // Fetch ledger with transactions
    const ledger = await this.sendRequest({
      command: 'ledger',
      ledger_index: ledgerIndex,
      transactions: true,
      expand: true,
    }) as { ledger: XrplLedgerResponse };

    const ledgerData = ledger.ledger;
    const transactions = ledgerData.transactions ?? [];

    logger.debug(
      { ledgerIndex, txCount: transactions.length },
      'Processing ledger'
    );

    // Process each transaction
    let eventCount = 0;
    for (const tx of transactions) {
      const events = await this.processTransaction(tx, ledgerData);
      eventCount += events.length;
    }

    // Update cursor
    await this.updateCursor(ledgerIndex, ledgerData.ledger_hash, ledgerData.close_time);

    // Log processing
    const durationMs = Date.now() - startTime;
    await this.logLedgerProcessing(ledgerIndex, ledgerData, transactions.length, eventCount, durationMs);

    this.lastLedgerIndex = ledgerIndex;
    this.lastLedgerTime = new Date(ledgerData.close_time * 1000 + 946684800000); // Ripple epoch
    this.processedTxCount += transactions.length;

    logger.debug(
      { ledgerIndex, txCount: transactions.length, eventCount, durationMs },
      'Ledger processed'
    );
  }

  /**
   * Handle transaction stream message
   */
  private async onTransaction(message: XrplMessage): Promise<void> {
    const tx = message.transaction!;
    const ledgerIndex = message.ledger_index!;

    recordXrplTransaction(tx.TransactionType, this.config.network);

    // Process transaction (without ledger context, for real-time updates)
    try {
      const events = await this.processTransaction(tx, { 
        ledger_index: ledgerIndex,
        ledger_hash: '',
        ledger_time: Math.floor(Date.now() / 1000),
        close_time: Math.floor(Date.now() / 1000),
        close_time_human: new Date().toISOString(),
      });

      if (events.length > 0) {
        logger.debug(
          { txHash: tx.hash, eventCount: events.length },
          'Transaction processed from stream'
        );
      }
    } catch (error) {
      logger.error({ err: error, txHash: tx.hash }, 'Failed to process transaction');
    }
  }

  /**
   * Process a single transaction
   */
  private async processTransaction(
    tx: XrplTransaction,
    ledger: XrplLedgerResponse
  ): Promise<XrplEvent[]> {
    // Check if transaction was successful
    const resultCode = tx.meta?.TransactionResult ?? '';
    if (!resultCode.startsWith('tes')) {
      // Only process successful transactions
      return [];
    }

    // Parse transaction into events
    const events = this.parseTransaction(tx, ledger);

    // Store and publish events
    for (const event of events) {
      await this.storeEvent(event);
      await this.publishEvent(event);
      this.emittedEventCount++;
      recordXrplEvent(event.event_type, this.config.network);
    }

    return events;
  }

  /**
   * Parse transaction into events
   */
  private parseTransaction(
    tx: XrplTransaction,
    ledger: XrplLedgerResponse
  ): XrplEvent[] {
    const events: XrplEvent[] = [];
    const baseEvent = {
      ledger_index: ledger.ledger_index,
      tx_hash: tx.hash,
      network: this.config.network,
      timestamp: nowISO(),
    };

    switch (tx.TransactionType) {
      case 'Payment':
        events.push(...this.parsePayment(tx, baseEvent));
        break;

      case 'TrustSet':
        events.push(...this.parseTrustSet(tx, baseEvent));
        break;

      case 'NFTokenMint':
        events.push(this.createEvent('nft.minted', tx, baseEvent));
        break;

      case 'NFTokenBurn':
        events.push(this.createEvent('nft.burned', tx, baseEvent));
        break;

      case 'NFTokenCreateOffer':
        events.push(this.createEvent('nft.offer_created', tx, baseEvent));
        break;

      case 'NFTokenAcceptOffer':
        events.push(this.createEvent('nft.offer_accepted', tx, baseEvent));
        break;

      case 'NFTokenCancelOffer':
        events.push(this.createEvent('nft.offer_cancelled', tx, baseEvent));
        break;

      case 'OfferCreate':
        events.push(this.createEvent('dex.offer_created', tx, baseEvent));
        break;

      case 'OfferCancel':
        events.push(this.createEvent('dex.offer_cancelled', tx, baseEvent));
        break;

      case 'AccountSet':
        events.push(this.createEvent('account.settings_changed', tx, baseEvent));
        break;

      case 'AccountDelete':
        events.push(this.createEvent('account.deleted', tx, baseEvent));
        break;

      case 'EscrowCreate':
        events.push(this.createEvent('escrow.created', tx, baseEvent));
        break;

      case 'EscrowFinish':
        events.push(this.createEvent('escrow.finished', tx, baseEvent));
        break;

      case 'EscrowCancel':
        events.push(this.createEvent('escrow.cancelled', tx, baseEvent));
        break;

      case 'CheckCreate':
        events.push(this.createEvent('check.created', tx, baseEvent));
        break;

      case 'CheckCash':
        events.push(this.createEvent('check.cashed', tx, baseEvent));
        break;

      case 'CheckCancel':
        events.push(this.createEvent('check.cancelled', tx, baseEvent));
        break;

      default:
        // Unknown transaction type, skip
        break;
    }

    return events;
  }

  /**
   * Parse Payment transaction
   */
  private parsePayment(
    tx: XrplTransaction,
    baseEvent: Partial<XrplEvent>
  ): XrplEvent[] {
    const amount = tx.Amount;
    const deliveredAmount = tx.meta?.delivered_amount ?? amount;

    if (typeof amount === 'string' || typeof deliveredAmount === 'string') {
      // XRP payment
      return [this.createEvent('payment.xrp', tx, baseEvent)];
    } else {
      // Issued currency payment
      return [this.createEvent('payment.issued', tx, baseEvent)];
    }
  }

  /**
   * Parse TrustSet transaction
   */
  private parseTrustSet(
    tx: XrplTransaction,
    baseEvent: Partial<XrplEvent>
  ): XrplEvent[] {
    const limitAmount = tx.LimitAmount as { value: string } | undefined;

    if (!limitAmount) {
      return [this.createEvent('trustline.modified', tx, baseEvent)];
    }

    if (parseFloat(limitAmount.value) === 0) {
      return [this.createEvent('trustline.removed', tx, baseEvent)];
    }

    // Check if this is a new trustline by looking at affected nodes
    const affectedNodes = tx.meta?.AffectedNodes ?? [];
    const isNew = affectedNodes.some((node) => 'CreatedNode' in node);

    if (isNew) {
      return [this.createEvent('trustline.created', tx, baseEvent)];
    }

    return [this.createEvent('trustline.modified', tx, baseEvent)];
  }

  /**
   * Create event from transaction
   */
  private createEvent(
    eventType: EventType,
    tx: XrplTransaction,
    baseEvent: Partial<XrplEvent>
  ): XrplEvent {
    // Extract account context
    const accounts: string[] = [tx.Account];
    if (tx.Destination && typeof tx.Destination === 'string') {
      accounts.push(tx.Destination);
    }

    return {
      id: `evt_${uuid()}`,
      event_type: eventType,
      ledger_index: baseEvent.ledger_index!,
      tx_hash: baseEvent.tx_hash!,
      network: baseEvent.network!,
      timestamp: baseEvent.timestamp!,
      account_context: [...new Set(accounts)],
      payload: this.sanitizePayload(tx),
      result_code: tx.meta?.TransactionResult,
    };
  }

  /**
   * Sanitize transaction payload for storage
   */
  private sanitizePayload(tx: XrplTransaction): Record<string, unknown> {
    // Remove sensitive or overly large fields
    const { meta, ...rest } = tx;

    return {
      ...rest,
      result_code: meta?.TransactionResult,
      delivered_amount: meta?.delivered_amount,
    };
  }

  // ===========================================================================
  // Storage & Publishing
  // ===========================================================================

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
    this.emit('event', event);
  }

  // ===========================================================================
  // Cursor Management
  // ===========================================================================

  /**
   * Initialize cursor position
   */
  private async initializeCursor(): Promise<void> {
    const cursor = await queryOne<{ ledger_index: string }>(
      'SELECT ledger_index FROM ledger_cursor WHERE id = $1',
      [this.config.cursorId]
    );

    if (!cursor) {
      // Create cursor
      await query(
        `INSERT INTO ledger_cursor (id, network, ledger_index)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [this.config.cursorId, this.config.network, this.config.startLedger]
      );
    }

    const position = await this.getCursorPosition();
    this.lastLedgerIndex = position.ledgerIndex;

    logger.info(
      { cursorId: this.config.cursorId, ledgerIndex: this.lastLedgerIndex },
      'Cursor initialized'
    );
  }

  /**
   * Get current cursor position
   */
  private async getCursorPosition(): Promise<{ ledgerIndex: number }> {
    const cursor = await queryOne<{ ledger_index: string }>(
      'SELECT ledger_index FROM ledger_cursor WHERE id = $1',
      [this.config.cursorId]
    );

    return {
      ledgerIndex: cursor ? parseInt(cursor.ledger_index, 10) : 0,
    };
  }

  /**
   * Update cursor position
   */
  private async updateCursor(
    ledgerIndex: number,
    ledgerHash?: string,
    closeTime?: number
  ): Promise<void> {
    const closeTimeDate = closeTime
      ? new Date(closeTime * 1000 + 946684800000) // Ripple epoch
      : null;

    await query(
      `UPDATE ledger_cursor SET
        ledger_index = $2,
        ledger_hash = COALESCE($3, ledger_hash),
        ledger_close_time = COALESCE($4, ledger_close_time),
        last_heartbeat_at = NOW(),
        consecutive_errors = 0,
        updated_at = NOW()
      WHERE id = $1`,
      [this.config.cursorId, ledgerIndex, ledgerHash ?? null, closeTimeDate]
    );
  }

  /**
   * Create checkpoint
   */
  private async createCheckpoint(): Promise<void> {
    await query('SELECT create_cursor_checkpoint($1)', [this.config.cursorId]);
    logger.info({ cursorId: this.config.cursorId }, 'Checkpoint created');
  }

  /**
   * Record error
   */
  private async recordError(message: string): Promise<void> {
    await query('SELECT record_cursor_error($1, $2)', [this.config.cursorId, message]);
  }

  /**
   * Log ledger processing
   */
  private async logLedgerProcessing(
    ledgerIndex: number,
    ledger: XrplLedgerResponse,
    txCount: number,
    eventCount: number,
    durationMs: number
  ): Promise<void> {
    const closeTimeDate = new Date(ledger.close_time * 1000 + 946684800000);

    await query(
      `SELECT log_ledger_processing($1, $2, $3, $4, $5, $6, $7, NOW() - $8 * INTERVAL '1 millisecond', 'completed', NULL)`,
      [
        this.config.cursorId,
        this.config.network,
        ledgerIndex,
        ledger.ledger_hash,
        closeTimeDate,
        txCount,
        eventCount,
        durationMs,
      ]
    );
  }

  // ===========================================================================
  // Locking
  // ===========================================================================

  /**
   * Acquire distributed lock
   */
  private async acquireLock(): Promise<boolean> {
    const result = await queryOne<{ acquire_cursor_lock: boolean }>(
      'SELECT acquire_cursor_lock($1, $2, $3)',
      [this.config.cursorId, this.workerId, this.config.lockDurationSeconds]
    );

    return result?.acquire_cursor_lock ?? false;
  }

  /**
   * Release distributed lock
   */
  private async releaseLock(): Promise<void> {
    await query('SELECT release_cursor_lock($1, $2)', [this.config.cursorId, this.workerId]);
  }

  /**
   * Renew lock
   */
  private async renewLock(): Promise<boolean> {
    const result = await queryOne<{ renew_cursor_lock: boolean }>(
      'SELECT renew_cursor_lock($1, $2, $3)',
      [this.config.cursorId, this.workerId, this.config.lockDurationSeconds]
    );

    return result?.renew_cursor_lock ?? false;
  }

  /**
   * Start lock renewal timer
   */
  private startLockRenewal(): void {
    const renewalInterval = (this.config.lockDurationSeconds * 1000) / 2;

    this.lockRenewalTimer = setInterval(async () => {
      const renewed = await this.renewLock();
      if (!renewed) {
        logger.error({ workerId: this.workerId }, 'Failed to renew lock');
        await this.stop();
      }
    }, renewalInterval);
  }

  // ===========================================================================
  // Heartbeat
  // ===========================================================================

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.sendRequest({ command: 'ping' });
      } catch (error) {
        logger.warn({ err: error }, 'Heartbeat failed');
      }
    }, this.config.heartbeatIntervalMs);
  }

  // ===========================================================================
  // Node Health
  // ===========================================================================

  /**
   * Update node health
   */
  private async updateNodeHealth(nodeUrl: string, status: string): Promise<void> {
    await query(
      `SELECT update_node_health($1, $2, $3, $4, $5, $6)`,
      [
        nodeUrl,
        this.config.network,
        status,
        null, // latency
        this.lastLedgerIndex || null,
        null, // server_state
      ]
    );
  }

  // ===========================================================================
  // WebSocket Requests
  // ===========================================================================

  /**
   * Send request and wait for response
   */
  private async sendRequest(request: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const id = ++this.requestId;
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Request timeout'));
      }, REQUEST_TIMEOUT);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      this.ws.send(JSON.stringify({ ...request, id }));
    });
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create and start XRPL listener for a network
 */
export async function createXrplListener(
  network: XrplNetwork,
  options: Partial<XrplListenerConfig> = {}
): Promise<XrplListener> {
  const config = getConfig();
  const cursorId = `${network}-primary`;

  const nodeUrls = (() => {
    switch (network) {
      case 'mainnet':
        return config.xrpl.mainnetUrls;
      case 'testnet':
        return config.xrpl.testnetUrls;
      case 'devnet':
        return config.xrpl.devnetUrls;
    }
  })();

  const listener = new XrplListener({
    network,
    nodeUrls,
    cursorId,
    ...options,
  });

  return listener;
}

// =============================================================================
// Export
// =============================================================================

export default XrplListener;
