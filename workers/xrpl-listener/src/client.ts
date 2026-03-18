// =============================================================================
// XRNotify XRPL Listener - Client Module
// =============================================================================
// WebSocket client with automatic reconnection and multi-node failover
// =============================================================================

import { Client, type TransactionStream } from 'xrpl';
import { EventEmitter } from 'node:events';
import type { Logger } from 'pino';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface XrplClientConfig {
  /** List of XRPL node WebSocket URLs */
  nodes: string[];
  /** Reconnection delay in milliseconds */
  reconnectDelayMs: number;
  /** Maximum reconnection delay (with backoff) */
  maxReconnectDelayMs: number;
  /** Connection timeout in milliseconds */
  connectionTimeoutMs: number;
  /** Ping interval for keepalive */
  pingIntervalMs: number;
  /** Request timeout */
  requestTimeoutMs: number;
}

export interface ConnectionState {
  /** Whether currently connected */
  connected: boolean;
  /** Current node URL */
  currentNode: string | null;
  /** Current node index */
  currentNodeIndex: number;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
  /** Last error message */
  lastError: string | null;
  /** Connected since timestamp */
  connectedSince: string | null;
}

export type XrplClientEvent = 
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'transaction'
  | 'ledgerClosed'
  | 'error';

// -----------------------------------------------------------------------------
// XRPL Client Manager
// -----------------------------------------------------------------------------

export class XrplClientManager extends EventEmitter {
  private client: Client | null = null;
  private readonly config: XrplClientConfig;
  private readonly logger: Logger;
  
  private currentNodeIndex = 0;
  private reconnectAttempts = 0;
  private isShuttingDown = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectedSince: Date | null = null;
  private lastError: string | null = null;

  constructor(config: XrplClientConfig, logger: Logger) {
    super();
    this.config = config;
    this.logger = logger.child({ component: 'xrpl-client' });
  }

  // ---------------------------------------------------------------------------
  // Connection Management
  // ---------------------------------------------------------------------------

  async connect(): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('Client is shutting down');
    }

    if (this.client?.isConnected()) {
      this.logger.warn('Already connected');
      return;
    }

    await this.connectToNextNode();
  }

  private async connectToNextNode(): Promise<void> {
    // Try each node in round-robin fashion
    for (let attempt = 0; attempt < this.config.nodes.length; attempt++) {
      const nodeIndex = (this.currentNodeIndex + attempt) % this.config.nodes.length;
      const nodeUrl = this.config.nodes[nodeIndex];

      if (!nodeUrl) continue;

      this.logger.info({ nodeUrl, attempt: attempt + 1 }, 'Attempting to connect');

      try {
        await this.connectToNode(nodeUrl, nodeIndex);
        return; // Success
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.lastError = errorMsg;
        this.logger.warn({ nodeUrl, error: errorMsg }, 'Connection failed');
      }
    }

    // All nodes failed
    throw new Error('Failed to connect to any XRPL node');
  }

  private async connectToNode(nodeUrl: string, nodeIndex: number): Promise<void> {
    // Create new client
    this.client = new Client(nodeUrl, {
      timeout: this.config.requestTimeoutMs,
      connectionTimeout: this.config.connectionTimeoutMs,
    });

    // Set up event handlers before connecting
    this.setupEventHandlers();

    // Connect with timeout
    const connectPromise = this.client.connect();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), this.config.connectionTimeoutMs);
    });

    await Promise.race([connectPromise, timeoutPromise]);

    // Success
    this.currentNodeIndex = nodeIndex;
    this.reconnectAttempts = 0;
    this.connectedSince = new Date();
    this.lastError = null;

    this.logger.info({ nodeUrl }, 'Connected to XRPL node');
    this.emit('connected', { nodeUrl, nodeIndex });
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('disconnected', (code: number) => {
      this.logger.warn({ code }, 'Disconnected from XRPL');
      this.connectedSince = null;
      this.emit('disconnected', { code });

      if (!this.isShuttingDown) {
        this.scheduleReconnect();
      }
    });

    this.client.on('error', (error: Error) => {
      this.lastError = error.message;
      this.logger.error({ error: error.message }, 'XRPL client error');
      this.emit('error', error);
    });

    this.client.on('transaction', (tx: TransactionStream) => {
      this.emit('transaction', tx);
    });

    this.client.on('ledgerClosed', (ledger: unknown) => {
      this.emit('ledgerClosed', ledger);
    });
  }

  // ---------------------------------------------------------------------------
  // Reconnection
  // ---------------------------------------------------------------------------

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isShuttingDown) return;

    this.reconnectAttempts++;
    
    // Exponential backoff with jitter
    const baseDelay = Math.min(
      this.config.reconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelayMs
    );
    const jitter = baseDelay * 0.2 * (Math.random() - 0.5);
    const delay = Math.floor(baseDelay + jitter);

    this.logger.info(
      { attempt: this.reconnectAttempts, delayMs: delay },
      'Scheduling reconnection'
    );

    this.emit('reconnecting', { attempt: this.reconnectAttempts, delayMs: delay });

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      
      if (this.isShuttingDown) return;

      // Try next node
      this.currentNodeIndex = (this.currentNodeIndex + 1) % this.config.nodes.length;

      try {
        await this.connectToNextNode();
      } catch (error) {
        this.logger.error({ error }, 'Reconnection failed');
        this.scheduleReconnect();
      }
    }, delay);
  }

  // ---------------------------------------------------------------------------
  // Subscription Management
  // ---------------------------------------------------------------------------

  async subscribeToTransactions(): Promise<void> {
    if (!this.client?.isConnected()) {
      throw new Error('Not connected');
    }

    await this.client.request({
      command: 'subscribe',
      streams: ['transactions'],
    });

    this.logger.info('Subscribed to transaction stream');
  }

  async subscribeToLedger(): Promise<void> {
    if (!this.client?.isConnected()) {
      throw new Error('Not connected');
    }

    await this.client.request({
      command: 'subscribe',
      streams: ['ledger'],
    });

    this.logger.info('Subscribed to ledger stream');
  }

  async subscribeToAccounts(accounts: string[]): Promise<void> {
    if (!this.client?.isConnected()) {
      throw new Error('Not connected');
    }

    if (accounts.length === 0) return;

    await this.client.request({
      command: 'subscribe',
      accounts,
    });

    this.logger.info({ count: accounts.length }, 'Subscribed to accounts');
  }

  async unsubscribeFromTransactions(): Promise<void> {
    if (!this.client?.isConnected()) return;

    await this.client.request({
      command: 'unsubscribe',
      streams: ['transactions'],
    });

    this.logger.info('Unsubscribed from transaction stream');
  }

  // ---------------------------------------------------------------------------
  // Request Methods
  // ---------------------------------------------------------------------------

  async request<T>(command: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!this.client?.isConnected()) {
      throw new Error('Not connected');
    }

    return this.client.request({
      command,
      ...params,
    } as never) as Promise<T>;
  }

  async getLedgerIndex(): Promise<number> {
    const response = await this.request<{ result: { ledger_index: number } }>('ledger', {
      ledger_index: 'validated',
    });
    return response.result.ledger_index;
  }

  async getServerInfo(): Promise<unknown> {
    return this.request('server_info');
  }

  // ---------------------------------------------------------------------------
  // State & Lifecycle
  // ---------------------------------------------------------------------------

  getState(): ConnectionState {
    return {
      connected: this.client?.isConnected() ?? false,
      currentNode: this.config.nodes[this.currentNodeIndex] ?? null,
      currentNodeIndex: this.currentNodeIndex,
      reconnectAttempts: this.reconnectAttempts,
      lastError: this.lastError,
      connectedSince: this.connectedSince?.toISOString() ?? null,
    };
  }

  isConnected(): boolean {
    return this.client?.isConnected() ?? false;
  }

  async disconnect(): Promise<void> {
    this.isShuttingDown = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client?.isConnected()) {
      await this.client.disconnect();
    }

    this.client = null;
    this.connectedSince = null;

    this.logger.info('Disconnected');
  }

  // ---------------------------------------------------------------------------
  // Health Check
  // ---------------------------------------------------------------------------

  async healthCheck(): Promise<{
    healthy: boolean;
    connected: boolean;
    latencyMs: number | null;
    error: string | null;
  }> {
    if (!this.client?.isConnected()) {
      return {
        healthy: false,
        connected: false,
        latencyMs: null,
        error: this.lastError ?? 'Not connected',
      };
    }

    const start = Date.now();

    try {
      await this.request('ping');
      const latencyMs = Date.now() - start;

      return {
        healthy: true,
        connected: true,
        latencyMs,
        error: null,
      };
    } catch (error) {
      return {
        healthy: false,
        connected: true,
        latencyMs: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// -----------------------------------------------------------------------------
// Default Configuration
// -----------------------------------------------------------------------------

export const DEFAULT_XRPL_CLIENT_CONFIG: XrplClientConfig = {
  nodes: [
    'wss://xrplcluster.com',
    'wss://s1.ripple.com',
    'wss://s2.ripple.com',
  ],
  reconnectDelayMs: 1000,
  maxReconnectDelayMs: 60000,
  connectionTimeoutMs: 10000,
  pingIntervalMs: 30000,
  requestTimeoutMs: 20000,
};

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

export function createXrplClient(
  config: Partial<XrplClientConfig> = {},
  logger: Logger
): XrplClientManager {
  const fullConfig: XrplClientConfig = {
    ...DEFAULT_XRPL_CLIENT_CONFIG,
    ...config,
  };

  // Parse nodes from comma-separated string if needed
  if (typeof fullConfig.nodes === 'string') {
    fullConfig.nodes = (fullConfig.nodes as string).split(',').map(n => n.trim());
  }

  return new XrplClientManager(fullConfig, logger);
}

// -----------------------------------------------------------------------------
// Testnet/Devnet Configurations
// -----------------------------------------------------------------------------

export const MAINNET_NODES = [
  'wss://xrplcluster.com',
  'wss://s1.ripple.com',
  'wss://s2.ripple.com',
];

export const TESTNET_NODES = [
  'wss://s.altnet.rippletest.net:51233',
  'wss://testnet.xrpl-labs.com',
];

export const DEVNET_NODES = [
  'wss://s.devnet.rippletest.net:51233',
];
