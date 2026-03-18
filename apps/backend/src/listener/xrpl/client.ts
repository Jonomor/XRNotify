/**
 * @fileoverview XRNotify XRPL WebSocket Client
 * Manages WebSocket connections to XRPL nodes with failover support.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/listener/xrpl/client
 */

import { EventEmitter } from 'node:events';
import WebSocket from 'ws';
import { createModuleLogger } from '../../core/logger.js';
import { getConfig } from '../../core/config.js';
import { query, queryOne } from '../../core/db.js';
import {
  recordXrplConnection,
  recordXrplError,
} from '../../core/metrics.js';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('xrpl-client');

/**
 * XRPL network type
 */
export type XrplNetwork = 'mainnet' | 'testnet' | 'devnet';

/**
 * Connection state
 */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'ready'
  | 'error'
  | 'closed';

/**
 * Node info
 */
export interface XrplNode {
  url: string;
  priority: number;
  isPrimary: boolean;
  status: 'unknown' | 'healthy' | 'unhealthy' | 'connecting';
  latencyMs: number | null;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  consecutiveFailures: number;
}

/**
 * Client configuration
 */
export interface XrplClientConfig {
  network: XrplNetwork;
  nodeUrls?: string[];
  reconnectIntervalMs?: number;
  maxReconnectIntervalMs?: number;
  heartbeatIntervalMs?: number;
  requestTimeoutMs?: number;
  maxRequestRetries?: number;
}

/**
 * Pending request
 */
interface PendingRequest {
  id: number;
  command: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  startTime: number;
  retries: number;
}

/**
 * XRPL response
 */
interface XrplResponse {
  id?: number;
  type?: string;
  status?: string;
  result?: Record<string, unknown>;
  error?: string;
  error_message?: string;
  error_code?: number;
}

/**
 * Server info result
 */
export interface ServerInfo {
  buildVersion: string;
  completeLedgers: string;
  hostId: string;
  ioLatencyMs: number;
  lastClose: {
    convergeTimeS: number;
    proposers: number;
  };
  loadFactor: number;
  peers: number;
  pubkeyNode: string;
  serverState: string;
  validatedLedger: {
    age: number;
    baseFeeXrp: number;
    hash: string;
    reserveBaseXrp: number;
    reserveIncXrp: number;
    seq: number;
  };
  validationQuorum: number;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Default node URLs per network
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

const DEFAULT_RECONNECT_INTERVAL = 1000;
const MAX_RECONNECT_INTERVAL = 30000;
const DEFAULT_HEARTBEAT_INTERVAL = 30000;
const DEFAULT_REQUEST_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 3;

// =============================================================================
// XRPL Client
// =============================================================================

/**
 * XRPL WebSocket Client with failover
 */
export class XrplClient extends EventEmitter {
  private config: Required<XrplClientConfig>;
  private nodes: XrplNode[];
  private currentNodeIndex: number = 0;
  private ws: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private requestId: number = 0;
  private pendingRequests: Map<number, PendingRequest> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private isShuttingDown: boolean = false;
  private serverInfo: ServerInfo | null = null;

  constructor(config: XrplClientConfig) {
    super();

    const nodeUrls = config.nodeUrls?.length
      ? config.nodeUrls
      : DEFAULT_NODES[config.network];

    this.config = {
      network: config.network,
      nodeUrls,
      reconnectIntervalMs: config.reconnectIntervalMs ?? DEFAULT_RECONNECT_INTERVAL,
      maxReconnectIntervalMs: config.maxReconnectIntervalMs ?? MAX_RECONNECT_INTERVAL,
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL,
      requestTimeoutMs: config.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT,
      maxRequestRetries: config.maxRequestRetries ?? DEFAULT_MAX_RETRIES,
    };

    // Initialize nodes
    this.nodes = nodeUrls.map((url, index) => ({
      url,
      priority: index,
      isPrimary: index === 0,
      status: 'unknown',
      latencyMs: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      consecutiveFailures: 0,
    }));

    logger.info(
      {
        network: this.config.network,
        nodes: this.nodes.map((n) => n.url),
      },
      'XRPL client initialized'
    );
  }

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Connect to XRPL
   */
  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'ready') {
      logger.warn('Already connected');
      return;
    }

    if (this.state === 'connecting') {
      logger.warn('Connection in progress');
      return;
    }

    this.isShuttingDown = false;
    await this.connectToNode();
  }

  /**
   * Disconnect from XRPL
   */
  async disconnect(): Promise<void> {
    logger.info('Disconnecting from XRPL');

    this.isShuttingDown = true;
    this.state = 'closed';

    this.clearTimers();
    this.rejectPendingRequests(new Error('Client disconnected'));

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.emit('disconnected');
  }

  /**
   * Send request to XRPL
   */
  async request<T = unknown>(
    command: string,
    params: Record<string, unknown> = {}
  ): Promise<T> {
    if (this.state !== 'ready') {
      throw new Error(`Client not ready (state: ${this.state})`);
    }

    return this.sendRequest<T>(command, params);
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Get current node
   */
  getCurrentNode(): XrplNode | null {
    return this.nodes[this.currentNodeIndex] ?? null;
  }

  /**
   * Get all nodes with status
   */
  getNodes(): XrplNode[] {
    return [...this.nodes];
  }

  /**
   * Get server info
   */
  getServerInfo(): ServerInfo | null {
    return this.serverInfo;
  }

  /**
   * Get current ledger index
   */
  getCurrentLedgerIndex(): number | null {
    return this.serverInfo?.validatedLedger?.seq ?? null;
  }

  /**
   * Check if connected and ready
   */
  isReady(): boolean {
    return this.state === 'ready';
  }

  // ===========================================================================
  // Connection Management
  // ===========================================================================

  /**
   * Connect to current node
   */
  private async connectToNode(): Promise<void> {
    const node = this.nodes[this.currentNodeIndex]!;

    this.state = 'connecting';
    node.status = 'connecting';

    logger.info({ url: node.url, network: this.config.network }, 'Connecting to XRPL node');

    try {
      await this.createWebSocket(node.url);
    } catch (error) {
      this.handleConnectionError(node, error as Error);
    }
  }

  /**
   * Create WebSocket connection
   */
  private createWebSocket(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        const connectTimeout = setTimeout(() => {
          if (this.ws) {
            this.ws.close();
          }
          reject(new Error('Connection timeout'));
        }, this.config.requestTimeoutMs);

        this.ws.on('open', () => {
          clearTimeout(connectTimeout);
          this.onOpen();
          resolve();
        });

        this.ws.on('message', (data) => this.onMessage(data));
        this.ws.on('error', (error) => {
          clearTimeout(connectTimeout);
          this.onError(error);
          reject(error);
        });
        this.ws.on('close', (code, reason) => this.onClose(code, reason.toString()));
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle WebSocket open
   */
  private async onOpen(): Promise<void> {
    const node = this.nodes[this.currentNodeIndex]!;

    logger.info({ url: node.url }, 'WebSocket connected');

    this.state = 'connected';
    node.status = 'healthy';
    node.consecutiveFailures = 0;
    node.lastSuccessAt = new Date();
    this.reconnectAttempts = 0;

    recordXrplConnection(true, this.config.network);

    // Update node health in database
    await this.updateNodeHealthInDb(node, 'healthy');

    // Start heartbeat
    this.startHeartbeat();

    // Get server info
    try {
      await this.fetchServerInfo();
      this.state = 'ready';
      this.emit('ready', this.serverInfo);
    } catch (error) {
      logger.error({ err: error }, 'Failed to get server info');
      this.state = 'ready'; // Still ready, just no server info
      this.emit('ready', null);
    }
  }

  /**
   * Handle WebSocket message
   */
  private onMessage(data: WebSocket.Data): void {
    try {
      const message: XrplResponse = JSON.parse(data.toString());

      // Handle response to request
      if (message.id !== undefined && this.pendingRequests.has(message.id)) {
        this.handleResponse(message);
        return;
      }

      // Handle stream messages
      this.emit('message', message);

      if (message.type === 'ledgerClosed') {
        this.emit('ledgerClosed', message);
      } else if (message.type === 'transaction') {
        this.emit('transaction', message);
      } else if (message.type === 'validationReceived') {
        this.emit('validation', message);
      }
    } catch (error) {
      logger.error(
        { err: error, data: data.toString().substring(0, 200) },
        'Failed to parse message'
      );
    }
  }

  /**
   * Handle WebSocket error
   */
  private onError(error: Error): void {
    const node = this.nodes[this.currentNodeIndex]!;

    logger.error({ err: error, url: node.url }, 'WebSocket error');

    this.handleConnectionError(node, error);
  }

  /**
   * Handle WebSocket close
   */
  private onClose(code: number, reason: string): void {
    const node = this.nodes[this.currentNodeIndex]!;

    logger.info({ code, reason, url: node.url }, 'WebSocket closed');

    this.stopHeartbeat();

    if (this.isShuttingDown) {
      return;
    }

    this.state = 'disconnected';
    recordXrplConnection(false, this.config.network);

    this.emit('disconnected', { code, reason });

    // Reconnect
    this.scheduleReconnect();
  }

  /**
   * Handle connection error
   */
  private async handleConnectionError(node: XrplNode, error: Error): Promise<void> {
    node.status = 'unhealthy';
    node.consecutiveFailures++;
    node.lastFailureAt = new Date();

    this.state = 'error';
    recordXrplConnection(false, this.config.network);
    recordXrplError('connection_error', this.config.network);

    // Update node health in database
    await this.updateNodeHealthInDb(node, 'unhealthy');

    this.emit('error', error);

    // Try next node
    this.rotateNode();
    this.scheduleReconnect();
  }

  // ===========================================================================
  // Node Management
  // ===========================================================================

  /**
   * Rotate to next healthy node
   */
  private rotateNode(): void {
    const startIndex = this.currentNodeIndex;

    do {
      this.currentNodeIndex = (this.currentNodeIndex + 1) % this.nodes.length;

      const node = this.nodes[this.currentNodeIndex]!;

      // Skip nodes with too many consecutive failures
      if (node.consecutiveFailures < 5) {
        logger.info(
          { from: this.nodes[startIndex]!.url, to: node.url },
          'Rotated to next node'
        );
        return;
      }
    } while (this.currentNodeIndex !== startIndex);

    // All nodes have failures, reset and try first
    logger.warn('All nodes have failures, resetting to primary');
    this.currentNodeIndex = 0;
    this.nodes.forEach((n) => {
      n.consecutiveFailures = 0;
    });
  }

  /**
   * Select best node based on health and latency
   */
  async selectBestNode(): Promise<XrplNode> {
    // Sort by: healthy status, latency, priority
    const sortedNodes = [...this.nodes].sort((a, b) => {
      // Healthy nodes first
      if (a.status === 'healthy' && b.status !== 'healthy') return -1;
      if (b.status === 'healthy' && a.status !== 'healthy') return 1;

      // Lower consecutive failures better
      if (a.consecutiveFailures !== b.consecutiveFailures) {
        return a.consecutiveFailures - b.consecutiveFailures;
      }

      // Lower latency better
      if (a.latencyMs !== null && b.latencyMs !== null) {
        return a.latencyMs - b.latencyMs;
      }

      // Priority
      return a.priority - b.priority;
    });

    const bestNode = sortedNodes[0]!;
    this.currentNodeIndex = this.nodes.indexOf(bestNode);

    return bestNode;
  }

  /**
   * Update node health in database
   */
  private async updateNodeHealthInDb(
    node: XrplNode,
    status: 'healthy' | 'unhealthy'
  ): Promise<void> {
    try {
      await query(
        `SELECT update_node_health($1, $2, $3, $4, $5, $6)`,
        [
          node.url,
          this.config.network,
          status,
          node.latencyMs,
          this.serverInfo?.validatedLedger?.seq ?? null,
          this.serverInfo?.serverState ?? null,
        ]
      );
    } catch (error) {
      logger.warn({ err: error }, 'Failed to update node health');
    }
  }

  /**
   * Load node health from database
   */
  async loadNodeHealth(): Promise<void> {
    try {
      const rows = await queryOne<{
        node_url: string;
        latency_ms: number | null;
        consecutive_failures: number;
        status: string;
      }[]>(
        `SELECT node_url, latency_ms, consecutive_failures, status
         FROM xrpl_node_health
         WHERE network = $1`,
        [this.config.network]
      );

      if (rows) {
        for (const row of rows as unknown as Array<{
          node_url: string;
          latency_ms: number | null;
          consecutive_failures: number;
          status: string;
        }>) {
          const node = this.nodes.find((n) => n.url === row.node_url);
          if (node) {
            node.latencyMs = row.latency_ms;
            node.consecutiveFailures = row.consecutive_failures;
            node.status = row.status as XrplNode['status'];
          }
        }
      }
    } catch (error) {
      logger.warn({ err: error }, 'Failed to load node health');
    }
  }

  // ===========================================================================
  // Request Management
  // ===========================================================================

  /**
   * Send request and wait for response
   */
  private async sendRequest<T>(
    command: string,
    params: Record<string, unknown> = {},
    retries: number = 0
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const id = ++this.requestId;
      const startTime = Date.now();

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);

        // Retry if not exceeded
        if (retries < this.config.maxRequestRetries) {
          logger.warn({ command, id, retries }, 'Request timeout, retrying');
          this.sendRequest<T>(command, params, retries + 1)
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error(`Request timeout: ${command}`));
        }
      }, this.config.requestTimeoutMs);

      const pending: PendingRequest = {
        id,
        command,
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
        startTime,
        retries,
      };

      this.pendingRequests.set(id, pending);

      const message = JSON.stringify({ id, command, ...params });
      this.ws.send(message);
    });
  }

  /**
   * Handle response
   */
  private handleResponse(message: XrplResponse): void {
    const id = message.id!;
    const pending = this.pendingRequests.get(id);

    if (!pending) {
      logger.warn({ id }, 'Received response for unknown request');
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(id);

    // Update latency
    const latencyMs = Date.now() - pending.startTime;
    const node = this.nodes[this.currentNodeIndex]!;
    node.latencyMs = latencyMs;

    if (message.status === 'error') {
      const error = new Error(
        message.error_message ?? message.error ?? 'Unknown error'
      );
      (error as Error & { code?: number }).code = message.error_code;
      pending.reject(error);
    } else {
      pending.resolve(message.result);
    }
  }

  /**
   * Reject all pending requests
   */
  private rejectPendingRequests(error: Error): void {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }

  // ===========================================================================
  // Reconnection
  // ===========================================================================

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.isShuttingDown) {
      return;
    }

    this.clearTimers();

    // Calculate backoff
    const baseInterval = this.config.reconnectIntervalMs;
    const backoff = Math.min(
      baseInterval * Math.pow(2, this.reconnectAttempts),
      this.config.maxReconnectIntervalMs
    );
    const jitter = Math.random() * 0.3 * backoff;
    const delay = Math.floor(backoff + jitter);

    this.reconnectAttempts++;

    logger.info(
      { delay, attempt: this.reconnectAttempts },
      'Scheduling reconnection'
    );

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.connectToNode();
    }, delay);
  }

  // ===========================================================================
  // Heartbeat
  // ===========================================================================

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(async () => {
      try {
        const start = Date.now();
        await this.sendRequest('ping', {});
        const latencyMs = Date.now() - start;

        const node = this.nodes[this.currentNodeIndex]!;
        node.latencyMs = latencyMs;

        logger.debug({ latencyMs }, 'Heartbeat OK');
      } catch (error) {
        logger.warn({ err: error }, 'Heartbeat failed');
      }
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ===========================================================================
  // Server Info
  // ===========================================================================

  /**
   * Fetch server info
   */
  private async fetchServerInfo(): Promise<void> {
    const result = await this.sendRequest<{ info: Record<string, unknown> }>('server_info', {});

    const info = result.info;

    this.serverInfo = {
      buildVersion: info.build_version as string,
      completeLedgers: info.complete_ledgers as string,
      hostId: info.hostid as string,
      ioLatencyMs: info.io_latency_ms as number,
      lastClose: {
        convergeTimeS: (info.last_close as Record<string, unknown>)?.converge_time_s as number,
        proposers: (info.last_close as Record<string, unknown>)?.proposers as number,
      },
      loadFactor: info.load_factor as number,
      peers: info.peers as number,
      pubkeyNode: info.pubkey_node as string,
      serverState: info.server_state as string,
      validatedLedger: {
        age: (info.validated_ledger as Record<string, unknown>)?.age as number,
        baseFeeXrp: (info.validated_ledger as Record<string, unknown>)?.base_fee_xrp as number,
        hash: (info.validated_ledger as Record<string, unknown>)?.hash as string,
        reserveBaseXrp: (info.validated_ledger as Record<string, unknown>)?.reserve_base_xrp as number,
        reserveIncXrp: (info.validated_ledger as Record<string, unknown>)?.reserve_inc_xrp as number,
        seq: (info.validated_ledger as Record<string, unknown>)?.seq as number,
      },
      validationQuorum: info.validation_quorum as number,
    };

    logger.info(
      {
        serverState: this.serverInfo.serverState,
        ledgerSeq: this.serverInfo.validatedLedger.seq,
        peers: this.serverInfo.peers,
      },
      'Server info fetched'
    );
  }

  /**
   * Refresh server info
   */
  async refreshServerInfo(): Promise<ServerInfo | null> {
    try {
      await this.fetchServerInfo();
      return this.serverInfo;
    } catch (error) {
      logger.warn({ err: error }, 'Failed to refresh server info');
      return null;
    }
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();
  }

  // ===========================================================================
  // Subscription Methods
  // ===========================================================================

  /**
   * Subscribe to streams
   */
  async subscribe(streams: string[]): Promise<unknown> {
    return this.request('subscribe', { streams });
  }

  /**
   * Unsubscribe from streams
   */
  async unsubscribe(streams: string[]): Promise<unknown> {
    return this.request('unsubscribe', { streams });
  }

  /**
   * Subscribe to accounts
   */
  async subscribeAccounts(accounts: string[]): Promise<unknown> {
    return this.request('subscribe', { accounts });
  }

  /**
   * Get ledger
   */
  async getLedger(
    ledgerIndex: number | 'validated' | 'current' | 'closed',
    options: {
      transactions?: boolean;
      expand?: boolean;
      ownerFunds?: boolean;
    } = {}
  ): Promise<unknown> {
    return this.request('ledger', {
      ledger_index: ledgerIndex,
      transactions: options.transactions ?? false,
      expand: options.expand ?? false,
      owner_funds: options.ownerFunds ?? false,
    });
  }

  /**
   * Get transaction
   */
  async getTransaction(hash: string): Promise<unknown> {
    return this.request('tx', { transaction: hash });
  }

  /**
   * Get account info
   */
  async getAccountInfo(account: string): Promise<unknown> {
    return this.request('account_info', { account });
  }
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create XRPL client for network
 */
export function createXrplClient(
  network: XrplNetwork,
  options: Partial<XrplClientConfig> = {}
): XrplClient {
  const config = getConfig();

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

  return new XrplClient({
    network,
    nodeUrls,
    ...options,
  });
}

// =============================================================================
// Export
// =============================================================================

export default XrplClient;
