/**
 * XRNotify XRPL Listener
 * Real-time XRPL ledger monitoring with resilient WebSocket connection
 */

import { Client, LedgerStream, TransactionStream } from 'xrpl';
import {
  config,
  createChildLogger,
  redis,
  addToStream,
  closeRedis,
} from '../core/index.js';
import {
  xrplLedgersSeen,
  xrplConnectionState,
  xrplReconnects,
  queueWriteLatency,
  queueDepth,
} from '../core/metrics.js';
import { parseXRPLEvent, type XRNotifyEvent } from './eventParser.js';

const log = createChildLogger('xrpl-listener');

// ============================================
// Connection State
// ============================================

interface ListenerState {
  client: Client | null;
  isConnecting: boolean;
  reconnectAttempts: number;
  lastLedgerIndex: number;
  shouldShutdown: boolean;
}

const state: ListenerState = {
  client: null,
  isConnecting: false,
  reconnectAttempts: 0,
  lastLedgerIndex: 0,
  shouldShutdown: false,
};

// ============================================
// Event Publishing
// ============================================

async function publishEvent(event: XRNotifyEvent): Promise<void> {
  const start = Date.now();
  
  try {
    await addToStream(
      config.streamName,
      { event: JSON.stringify(event) },
      config.streamMaxLength
    );
    
    queueWriteLatency.observe(Date.now() - start);
    
    log.debug('Event published to stream', {
      event_type: event.event_type,
      tx_hash: event.tx_hash,
      latency: Date.now() - start,
    });
  } catch (error) {
    log.error('Failed to publish event', {
      error: (error as Error).message,
      event_type: event.event_type,
      tx_hash: event.tx_hash,
    });
    throw error;
  }
}

// ============================================
// Transaction Processing
// ============================================

async function processTransaction(tx: TransactionStream): Promise<void> {
  try {
    // Only process validated transactions
    if (!tx.validated) return;
    
    const event = parseXRPLEvent(tx as unknown as Record<string, unknown>);
    
    if (event) {
      await publishEvent(event);
    }
  } catch (error) {
    log.error('Failed to process transaction', {
      error: (error as Error).message,
      tx_hash: tx.transaction?.hash,
    });
  }
}

// ============================================
// Ledger Processing
// ============================================

async function processLedger(ledger: LedgerStream): Promise<void> {
  xrplLedgersSeen.inc();
  state.lastLedgerIndex = ledger.ledger_index;
  
  log.debug('Ledger closed', {
    ledger_index: ledger.ledger_index,
    tx_count: ledger.txn_count,
  });
  
  // Update queue depth metric periodically
  if (ledger.ledger_index % 10 === 0) {
    try {
      const streamInfo = await redis.xlen(config.streamName);
      queueDepth.set({ stream: config.streamName }, streamInfo);
    } catch {
      // Ignore metric update errors
    }
  }
}

// ============================================
// Connection Management
// ============================================

async function connect(): Promise<void> {
  if (state.isConnecting || state.shouldShutdown) return;
  
  state.isConnecting = true;
  
  const wsUrl = state.reconnectAttempts > 2 
    ? config.xrplWsFallback 
    : config.xrplWs;
  
  log.info('Connecting to XRPL', { 
    url: wsUrl, 
    attempt: state.reconnectAttempts + 1 
  });
  
  try {
    const client = new Client(wsUrl, {
      timeout: 20000,
      connectionTimeout: 10000,
    });
    
    // Set up event handlers before connecting
    client.on('connected', () => {
      log.info('Connected to XRPL', { url: wsUrl });
      xrplConnectionState.set(1);
      state.reconnectAttempts = 0;
    });
    
    client.on('disconnected', (code) => {
      log.warn('Disconnected from XRPL', { code });
      xrplConnectionState.set(0);
      
      if (!state.shouldShutdown) {
        scheduleReconnect();
      }
    });
    
    client.on('error', (error) => {
      log.error('XRPL client error', { error: error.message });
    });
    
    client.on('ledgerClosed', async (ledger: LedgerStream) => {
      await processLedger(ledger);
    });
    
    client.on('transaction', async (tx: TransactionStream) => {
      await processTransaction(tx);
    });
    
    // Connect
    await client.connect();
    
    // Subscribe to ledger and transactions
    await client.request({
      command: 'subscribe',
      streams: ['ledger', 'transactions'],
    });
    
    log.info('Subscribed to XRPL streams');
    
    state.client = client;
    state.isConnecting = false;
    
  } catch (error) {
    log.error('Failed to connect to XRPL', { 
      error: (error as Error).message,
      url: wsUrl,
    });
    state.isConnecting = false;
    
    if (!state.shouldShutdown) {
      scheduleReconnect();
    }
  }
}

function scheduleReconnect(): void {
  if (state.shouldShutdown) return;
  
  state.reconnectAttempts++;
  xrplReconnects.inc();
  
  const delay = Math.min(
    config.xrplReconnectDelay * Math.pow(2, state.reconnectAttempts - 1),
    60000 // Max 60 seconds
  );
  
  log.info('Scheduling reconnect', { 
    attempt: state.reconnectAttempts, 
    delay 
  });
  
  setTimeout(() => {
    connect().catch(err => {
      log.error('Reconnect failed', { error: err.message });
    });
  }, delay);
}

// ============================================
// Graceful Shutdown
// ============================================

async function shutdown(signal: string): Promise<void> {
  log.info('Shutting down listener', { signal });
  state.shouldShutdown = true;
  
  if (state.client) {
    try {
      await state.client.disconnect();
    } catch (error) {
      log.warn('Error disconnecting client', { error: (error as Error).message });
    }
  }
  
  await closeRedis();
  
  log.info('Listener shutdown complete');
  process.exit(0);
}

// ============================================
// Main Entry Point
// ============================================

export async function startXRPLListener(): Promise<void> {
  log.info('Starting XRPL Listener', {
    wsUrl: config.xrplWs,
    streamName: config.streamName,
  });
  
  // Setup graceful shutdown
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // Start connection
  await connect();
}

// Auto-start if running as main service
if (process.env.SERVICE_ROLE === 'listener') {
  startXRPLListener().catch((error) => {
    log.error('Fatal error starting listener', { error: error.message });
    process.exit(1);
  });
}
