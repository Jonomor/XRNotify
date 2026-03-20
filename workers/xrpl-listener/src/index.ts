// =============================================================================
// XRNotify XRPL Listener - Main Entry Point
// =============================================================================
// Connects to XRPL nodes via WebSocket, processes transactions, publishes events
// =============================================================================

import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, LedgerStream, TransactionStream } from 'xrpl';
import { Redis } from 'ioredis';
import pg from 'pg';
import pino from 'pino';
import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';
import type { EventType, XRPLEvent } from '@xrnotify/shared';
import 'dotenv/config';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const config = {
  // XRPL nodes (comma-separated for failover)
  xrplNodes: (process.env.XRPL_NODES ?? 'wss://xrplcluster.com,wss://s1.ripple.com,wss://s2.ripple.com').split(','),
  xrplNetwork: process.env.XRPL_NETWORK ?? 'mainnet',
  
  // Redis
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  streamKey: process.env.STREAM_KEY ?? 'xrnotify:events',
  streamMaxLen: parseInt(process.env.STREAM_MAX_LEN ?? '100000', 10),
  
  // PostgreSQL
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://xrnotify:xrnotify@localhost:5432/xrnotify',
  
  // Listener settings
  listenerId: process.env.LISTENER_ID ?? `listener-${randomUUID().slice(0, 8)}`,
  reconnectDelayMs: parseInt(process.env.RECONNECT_DELAY_MS ?? '5000', 10),
  healthCheckIntervalMs: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS ?? '30000', 10),
  
  // Metrics
  metricsPort: parseInt(process.env.METRICS_PORT ?? '9092', 10),
  
  // Environment
  nodeEnv: process.env.NODE_ENV ?? 'development',
};

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  // Don't use pino-pretty in production - it's a dev dependency
  ...(config.nodeEnv === 'development' && process.env.PINO_PRETTY === 'true'
    ? { transport: { target: 'pino-pretty' } }
    : {}),
}).child({ listenerId: config.listenerId });

// -----------------------------------------------------------------------------
// Metrics
// -----------------------------------------------------------------------------

const register = new Registry();
collectDefaultMetrics({ register });

const ledgersProcessed = new Counter({
  name: 'xrnotify_listener_ledgers_processed_total',
  help: 'Total ledgers processed',
  registers: [register],
});

const transactionsProcessed = new Counter({
  name: 'xrnotify_listener_transactions_processed_total',
  help: 'Total transactions processed',
  labelNames: ['type'],
  registers: [register],
});

const eventsPublished = new Counter({
  name: 'xrnotify_listener_events_published_total',
  help: 'Total events published to stream',
  labelNames: ['event_type'],
  registers: [register],
});

const currentLedgerIndex = new Gauge({
  name: 'xrnotify_listener_current_ledger_index',
  help: 'Current ledger index being processed',
  registers: [register],
});

const connectionStatus = new Gauge({
  name: 'xrnotify_listener_connection_status',
  help: 'XRPL connection status (1=connected, 0=disconnected)',
  registers: [register],
});

const processingLatency = new Histogram({
  name: 'xrnotify_listener_processing_latency_seconds',
  help: 'Time to process a ledger',
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// -----------------------------------------------------------------------------
// Clients
// -----------------------------------------------------------------------------

const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

let xrplClient: Client | null = null;
let currentNodeIndex = 0;

// -----------------------------------------------------------------------------
// Ripple Epoch Conversion
// -----------------------------------------------------------------------------

const RIPPLE_EPOCH_OFFSET = 946684800; // Seconds from Unix epoch to Ripple epoch (2000-01-01)

function rippleTimeToISO(rippleTime: number): string {
  return new Date((rippleTime + RIPPLE_EPOCH_OFFSET) * 1000).toISOString();
}

// -----------------------------------------------------------------------------
// Ledger Cursor Management
// -----------------------------------------------------------------------------

async function getLastProcessedLedger(): Promise<number | null> {
  const result = await pool.query<{ ledger_index: string }>(
    `SELECT ledger_index FROM ledger_cursor 
     WHERE network = $1 AND listener_id = $2
     ORDER BY updated_at DESC LIMIT 1`,
    [config.xrplNetwork, config.listenerId]
  );
  
  return result.rows[0] ? parseInt(result.rows[0].ledger_index, 10) : null;
}

async function updateLedgerCursor(ledgerIndex: number, ledgerHash: string): Promise<void> {
  await pool.query(
    `INSERT INTO ledger_cursor (network, listener_id, ledger_index, ledger_hash, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (network, listener_id) 
     DO UPDATE SET ledger_index = $3, ledger_hash = $4, updated_at = NOW()`,
    [config.xrplNetwork, config.listenerId, ledgerIndex, ledgerHash]
  );
}

// -----------------------------------------------------------------------------
// Event Normalization
// -----------------------------------------------------------------------------

interface TransactionMeta {
  TransactionResult: string;
  delivered_amount?: string | { currency: string; issuer: string; value: string };
  AffectedNodes?: Array<{
    CreatedNode?: { LedgerEntryType: string; NewFields?: Record<string, unknown> };
    ModifiedNode?: { LedgerEntryType: string; FinalFields?: Record<string, unknown>; PreviousFields?: Record<string, unknown> };
    DeletedNode?: { LedgerEntryType: string; FinalFields?: Record<string, unknown> };
  }>;
}

interface Transaction {
  TransactionType: string;
  Account: string;
  Destination?: string;
  Amount?: string | { currency: string; issuer: string; value: string };
  hash: string;
  date?: number;
  Flags?: number;
  // NFT fields
  NFTokenID?: string;
  NFTokenOffers?: string[];
  NFTokenSellOffer?: string;
  NFTokenBuyOffer?: string;
  // DEX fields
  TakerGets?: string | { currency: string; issuer: string; value: string };
  TakerPays?: string | { currency: string; issuer: string; value: string };
  OfferSequence?: number;
  // Trustline fields
  LimitAmount?: { currency: string; issuer: string; value: string };
  // Metadata
  meta?: TransactionMeta;
  metaData?: TransactionMeta;
}

function extractAccounts(tx: Transaction): string[] {
  const accounts = new Set<string>();
  
  accounts.add(tx.Account);
  
  if (tx.Destination) accounts.add(tx.Destination);
  
  // Extract from Amount
  if (typeof tx.Amount === 'object' && tx.Amount.issuer) {
    accounts.add(tx.Amount.issuer);
  }
  
  // Extract from TakerGets/TakerPays
  if (typeof tx.TakerGets === 'object' && tx.TakerGets.issuer) {
    accounts.add(tx.TakerGets.issuer);
  }
  if (typeof tx.TakerPays === 'object' && tx.TakerPays.issuer) {
    accounts.add(tx.TakerPays.issuer);
  }
  
  // Extract from LimitAmount
  if (tx.LimitAmount?.issuer) {
    accounts.add(tx.LimitAmount.issuer);
  }
  
  return Array.from(accounts);
}

function normalizeAmount(amount: string | { currency: string; issuer: string; value: string } | undefined): {
  currency: string;
  value: string;
  issuer?: string;
} | null {
  if (!amount) return null;
  
  if (typeof amount === 'string') {
    return {
      currency: 'XRP',
      value: (parseInt(amount, 10) / 1_000_000).toString(),
    };
  }
  
  return {
    currency: amount.currency,
    value: amount.value,
    issuer: amount.issuer,
  };
}

function parseTransaction(
  tx: Transaction,
  ledgerIndex: number,
  closeTime: number
): XRPLEvent[] {
  const events: XRPLEvent[] = [];
  const meta = tx.meta ?? tx.metaData;
  
  // Skip failed transactions
  if (meta?.TransactionResult !== 'tesSUCCESS') {
    return events;
  }
  
  const timestamp = rippleTimeToISO(closeTime);
  const accounts = extractAccounts(tx);
  
  const baseEvent = {
    ledger_index: ledgerIndex,
    tx_hash: tx.hash,
    timestamp,
    accounts,
  };
  
  switch (tx.TransactionType) {
    case 'Payment': {
      const amount = normalizeAmount(meta?.delivered_amount ?? tx.Amount);
      if (!amount) break;
      
      const eventType: EventType = amount.currency === 'XRP' ? 'payment.xrp' : 'payment.issued';
      
      events.push({
        event_id: `xrpl:${ledgerIndex}:${tx.hash}:${eventType}`,
        event_type: eventType,
        ...baseEvent,
        payload: {
          sender: tx.Account,
          receiver: tx.Destination,
          amount: amount.value,
          currency: amount.currency,
          issuer: amount.issuer,
        },
      });
      break;
    }
    
    case 'NFTokenMint': {
      // Find the minted NFT ID from metadata
      let nftId = tx.NFTokenID;
      if (!nftId && meta?.AffectedNodes) {
        for (const node of meta.AffectedNodes) {
          if (node.CreatedNode?.LedgerEntryType === 'NFTokenPage' ||
              node.ModifiedNode?.LedgerEntryType === 'NFTokenPage') {
            // NFT ID extraction would require deeper parsing
            // For now, we'll use a placeholder
            nftId = 'unknown';
            break;
          }
        }
      }
      
      events.push({
        event_id: `xrpl:${ledgerIndex}:${tx.hash}:nft.minted`,
        event_type: 'nft.minted',
        ...baseEvent,
        payload: {
          minter: tx.Account,
          nft_id: nftId ?? 'unknown',
        },
      });
      break;
    }
    
    case 'NFTokenBurn': {
      events.push({
        event_id: `xrpl:${ledgerIndex}:${tx.hash}:nft.burned`,
        event_type: 'nft.burned',
        ...baseEvent,
        payload: {
          burner: tx.Account,
          nft_id: tx.NFTokenID ?? 'unknown',
        },
      });
      break;
    }
    
    case 'NFTokenCreateOffer': {
      events.push({
        event_id: `xrpl:${ledgerIndex}:${tx.hash}:nft.offer_created`,
        event_type: 'nft.offer_created',
        ...baseEvent,
        payload: {
          creator: tx.Account,
          nft_id: tx.NFTokenID ?? 'unknown',
          amount: normalizeAmount(tx.Amount),
          is_sell_offer: !!((tx.Flags ?? 0) & 1),
        },
      });
      break;
    }
    
    case 'NFTokenAcceptOffer': {
      events.push({
        event_id: `xrpl:${ledgerIndex}:${tx.hash}:nft.offer_accepted`,
        event_type: 'nft.offer_accepted',
        ...baseEvent,
        payload: {
          accepter: tx.Account,
          sell_offer: tx.NFTokenSellOffer,
          buy_offer: tx.NFTokenBuyOffer,
        },
      });
      break;
    }
    
    case 'NFTokenCancelOffer': {
      events.push({
        event_id: `xrpl:${ledgerIndex}:${tx.hash}:nft.offer_cancelled`,
        event_type: 'nft.offer_cancelled',
        ...baseEvent,
        payload: {
          canceller: tx.Account,
          offer_ids: tx.NFTokenOffers ?? [],
        },
      });
      break;
    }
    
    case 'OfferCreate': {
      const takerGets = normalizeAmount(tx.TakerGets);
      const takerPays = normalizeAmount(tx.TakerPays);
      
      events.push({
        event_id: `xrpl:${ledgerIndex}:${tx.hash}:dex.offer_created`,
        event_type: 'dex.offer_created',
        ...baseEvent,
        payload: {
          creator: tx.Account,
          taker_gets: takerGets,
          taker_pays: takerPays,
        },
      });
      
      // Check for fills in metadata
      if (meta?.AffectedNodes) {
        let fillIndex = 0;
        for (const node of meta.AffectedNodes) {
          if (node.DeletedNode?.LedgerEntryType === 'Offer' ||
              (node.ModifiedNode?.LedgerEntryType === 'Offer' && node.ModifiedNode.PreviousFields)) {
            events.push({
              event_id: `xrpl:${ledgerIndex}:${tx.hash}:dex.offer_filled:${fillIndex}`,
              event_type: 'dex.offer_filled',
              ...baseEvent,
              payload: {
                taker: tx.Account,
                filled_offer: node.DeletedNode ?? node.ModifiedNode,
              },
            });
            fillIndex++;
          }
        }
      }
      break;
    }
    
    case 'OfferCancel': {
      events.push({
        event_id: `xrpl:${ledgerIndex}:${tx.hash}:dex.offer_cancelled`,
        event_type: 'dex.offer_cancelled',
        ...baseEvent,
        payload: {
          canceller: tx.Account,
          offer_sequence: tx.OfferSequence,
        },
      });
      break;
    }
    
    case 'TrustSet': {
      const limit = tx.LimitAmount;
      if (!limit) break;
      
      // Determine if created, modified, or deleted based on metadata
      let eventType: EventType = 'trustline.modified';
      if (meta?.AffectedNodes) {
        for (const node of meta.AffectedNodes) {
          if (node.CreatedNode?.LedgerEntryType === 'RippleState') {
            eventType = 'trustline.created';
            break;
          }
          if (node.DeletedNode?.LedgerEntryType === 'RippleState') {
            eventType = 'trustline.deleted';
            break;
          }
        }
      }
      
      events.push({
        event_id: `xrpl:${ledgerIndex}:${tx.hash}:${eventType}`,
        event_type: eventType,
        ...baseEvent,
        payload: {
          account: tx.Account,
          currency: limit.currency,
          issuer: limit.issuer,
          limit: limit.value,
        },
      });
      break;
    }
    
    // Add more transaction types as needed
  }
  
  return events;
}

// -----------------------------------------------------------------------------
// Event Publishing
// -----------------------------------------------------------------------------

async function publishEvent(event: XRPLEvent): Promise<void> {
  await redis.xadd(
    config.streamKey,
    'MAXLEN', '~', config.streamMaxLen,
    '*',
    'event_id', event.event_id,
    'event_type', event.event_type,
    'ledger_index', event.ledger_index.toString(),
    'tx_hash', event.tx_hash,
    'timestamp', event.timestamp,
    'accounts', JSON.stringify(event.accounts),
    'payload', JSON.stringify(event.payload)
  );
  
  eventsPublished.inc({ event_type: event.event_type });
  logger.debug({ eventId: event.event_id, eventType: event.event_type }, 'Event published');
}

// -----------------------------------------------------------------------------
// XRPL Connection Management
// -----------------------------------------------------------------------------

async function connectToXRPL(): Promise<Client> {
  const nodeUrl = config.xrplNodes[currentNodeIndex];
  if (!nodeUrl) {
    throw new Error('No XRPL nodes configured');
  }
  
  logger.info({ nodeUrl, nodeIndex: currentNodeIndex }, 'Connecting to XRPL node');
  
  const client = new Client(nodeUrl, {
    timeout: 20000,
  });
  
  client.on('error', (error) => {
    logger.error({ error }, 'XRPL client error');
    connectionStatus.set(0);
  });
  
  client.on('disconnected', (code) => {
    logger.warn({ code }, 'XRPL client disconnected');
    connectionStatus.set(0);
    scheduleReconnect();
  });
  
  client.on('connected', () => {
    logger.info('XRPL client connected');
    connectionStatus.set(1);
  });
  
  await client.connect();
  
  return client;
}

function scheduleReconnect(): void {
  // Try next node
  currentNodeIndex = (currentNodeIndex + 1) % config.xrplNodes.length;
  
  logger.info({ delayMs: config.reconnectDelayMs, nextNode: config.xrplNodes[currentNodeIndex] }, 'Scheduling reconnect');
  
  setTimeout(async () => {
    try {
      if (xrplClient) {
        try {
          await xrplClient.disconnect();
        } catch {
          // Ignore disconnect errors
        }
      }
      
      xrplClient = await connectToXRPL();
      await subscribeToLedgers();
    } catch (error) {
      logger.error({ error }, 'Reconnect failed');
      scheduleReconnect();
    }
  }, config.reconnectDelayMs);
}

// -----------------------------------------------------------------------------
// Ledger Subscription
// -----------------------------------------------------------------------------

async function subscribeToLedgers(): Promise<void> {
  if (!xrplClient || !xrplClient.isConnected()) {
    throw new Error('XRPL client not connected');
  }
  
  // Subscribe to ledger and transaction streams
  await xrplClient.request({
    command: 'subscribe',
    streams: ['ledger', 'transactions'],
  });
  
  logger.info('Subscribed to ledger and transaction streams');
  
  // Handle ledger events
  xrplClient.on('ledgerClosed', async (ledger: LedgerStream) => {
    const startTime = Date.now();
    
    try {
      logger.info({ 
        ledgerIndex: ledger.ledger_index, 
        txCount: ledger.txn_count,
      }, 'Ledger closed');
      
      currentLedgerIndex.set(ledger.ledger_index);
      ledgersProcessed.inc();
      
      // Update cursor
      await updateLedgerCursor(ledger.ledger_index, ledger.ledger_hash);
      
      const duration = (Date.now() - startTime) / 1000;
      processingLatency.observe(duration);
      
    } catch (error) {
      logger.error({ error, ledgerIndex: ledger.ledger_index }, 'Error processing ledger');
    }
  });
  
  // Handle transaction events
  xrplClient.on('transaction', async (tx: TransactionStream) => {
    try {
      if (!tx.validated) return;
      
      const transaction = tx.transaction as unknown as Transaction;
      transaction.meta = tx.meta as unknown as TransactionMeta;
      transaction.hash = tx.transaction.hash ?? '';
      
      transactionsProcessed.inc({ type: transaction.TransactionType });
      
      // Parse and publish events
      const events = parseTransaction(
        transaction,
        tx.ledger_index ?? 0,
        tx.transaction.date ?? Math.floor(Date.now() / 1000) - RIPPLE_EPOCH_OFFSET
      );
      
      for (const event of events) {
        await publishEvent(event);
      }
      
    } catch (error) {
      logger.error({ error, txHash: tx.transaction?.hash }, 'Error processing transaction');
    }
  });
}

// -----------------------------------------------------------------------------
// Metrics Server
// -----------------------------------------------------------------------------

async function startMetricsServer(): Promise<void> {
  const { createServer } = await import('node:http');
  
  const server = createServer(async (req, res) => {
    if (req.url === '/metrics') {
      res.setHeader('Content-Type', register.contentType);
      res.end(await register.metrics());
    } else if (req.url === '/health') {
      const isHealthy = xrplClient?.isConnected() ?? false;
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = isHealthy ? 200 : 503;
      res.end(JSON.stringify({ 
        status: isHealthy ? 'healthy' : 'unhealthy',
        connected: isHealthy,
        currentNode: config.xrplNodes[currentNodeIndex],
      }));
    } else if (req.url === '/ready') {
      const isReady = xrplClient?.isConnected() ?? false;
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = isReady ? 200 : 503;
      res.end(JSON.stringify({ ready: isReady }));
    } else {
      res.statusCode = 404;
      res.end('Not found');
    }
  });
  
  server.listen(config.metricsPort, () => {
    logger.info({ port: config.metricsPort }, 'Metrics server started');
  });
}

// -----------------------------------------------------------------------------
// Graceful Shutdown
// -----------------------------------------------------------------------------

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  logger.info({ signal }, 'Shutting down gracefully');
  
  if (xrplClient) {
    try {
      await xrplClient.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
  
  await redis.quit();
  await pool.end();
  
  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// -----------------------------------------------------------------------------
// Database Migrations
// -----------------------------------------------------------------------------

async function runMigrations(): Promise<void> {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const migrationsDir = join(currentDir, '../../../apps/platform/src/lib/db/migrations');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const files = (await readdir(migrationsDir)).filter(f => f.endsWith('.sql')).sort();
  const applied = await pool.query<{ version: string }>('SELECT version FROM schema_migrations ORDER BY version ASC');
  const appliedVersions = new Set(applied.rows.map(r => r.version));

  for (const file of files) {
    const match = file.match(/^(\d+)_(.+)\.sql$/);
    if (!match) continue;
    const [, version, name] = match as [string, string, string];
    if (appliedVersions.has(version)) continue;

    const sql = await readFile(join(migrationsDir, file), 'utf-8');
    const upSql = sql.split(/^-- DOWN$/m)[0]?.trim() ?? '';

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(upSql);
      await client.query('INSERT INTO schema_migrations (version, name) VALUES ($1, $2)', [version, name]);
      await client.query('COMMIT');
      logger.info({ migration: file }, 'Applied migration');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  logger.info('Database migrations up to date');
}

// -----------------------------------------------------------------------------
// Main Entry Point
// -----------------------------------------------------------------------------

async function main(): Promise<void> {
  logger.info({
    listenerId: config.listenerId,
    network: config.xrplNetwork,
    nodes: config.xrplNodes,
  }, 'Starting XRPL listener');
  
  // Test database connection
  try {
    await pool.query('SELECT 1');
    logger.info('Database connection established');
  } catch (error) {
    logger.fatal({ error }, 'Failed to connect to database');
    process.exit(1);
  }

  // Run database migrations
  try {
    await runMigrations();
  } catch (error) {
    logger.fatal({ error }, 'Failed to run database migrations');
    process.exit(1);
  }

  // Test Redis connection
  try {
    await redis.ping();
    logger.info('Redis connection established');
  } catch (error) {
    logger.fatal({ error }, 'Failed to connect to Redis');
    process.exit(1);
  }
  
  // Check for last processed ledger
  const lastLedger = await getLastProcessedLedger();
  if (lastLedger) {
    logger.info({ lastLedger }, 'Resuming from last processed ledger');
  }
  
  // Start metrics server
  await startMetricsServer();
  
  // Connect to XRPL
  try {
    xrplClient = await connectToXRPL();
    await subscribeToLedgers();
    
    logger.info('XRPL listener ready');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to XRPL');
    scheduleReconnect();
  }
}

main().catch((error) => {
  logger.fatal({ error }, 'Fatal error in listener');
  process.exit(1);
});
