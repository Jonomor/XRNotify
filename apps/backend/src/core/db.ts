/**
 * @fileoverview XRNotify Database Module
 * PostgreSQL connection pool and query utilities using pg.
 *
 * @packageDocumentation
 * @module @xrnotify/backend/core/db
 */

import { Pool, type PoolClient, type PoolConfig, type QueryResult, type QueryResultRow } from 'pg';
import { getConfig } from './config.js';
import { createModuleLogger, logDbQuery, logError, type Logger } from './logger.js';
import { nowISO } from '@xrnotify/shared';

// =============================================================================
// Types
// =============================================================================

/**
 * Query parameters
 */
export type QueryParams = unknown[];

/**
 * Transaction callback function
 */
export type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

/**
 * Database health status
 */
export interface DbHealthStatus {
  connected: boolean;
  latencyMs: number;
  poolSize: number;
  idleCount: number;
  waitingCount: number;
  error?: string;
}

/**
 * Query options
 */
export interface QueryOptions {
  /**
   * Query timeout in milliseconds
   */
  timeout?: number;

  /**
   * Log the query (default: true for non-production)
   */
  log?: boolean;

  /**
   * Custom logger instance
   */
  logger?: Logger;
}

// =============================================================================
// Database Pool
// =============================================================================

let pool: Pool | null = null;
const logger = createModuleLogger('database');

/**
 * Get pool configuration from app config
 */
function getPoolConfig(): PoolConfig {
  const config = getConfig();

  const poolConfig: PoolConfig = {
    connectionString: config.database.url,
    min: config.database.poolMin,
    max: config.database.poolMax,
    idleTimeoutMillis: config.database.idleTimeoutMs,
    connectionTimeoutMillis: config.database.connectionTimeoutMs,
    allowExitOnIdle: false,
  };

  // SSL configuration
  if (config.database.ssl) {
    poolConfig.ssl = {
      rejectUnauthorized: config.nodeEnv === 'production',
    };
  }

  return poolConfig;
}

/**
 * Initialize the database connection pool
 *
 * @returns Pool instance
 */
export function initializePool(): Pool {
  if (pool) {
    return pool;
  }

  const config = getPoolConfig();
  pool = new Pool(config);

  // Pool event handlers
  pool.on('connect', (client) => {
    logger.debug('New database connection established');
    
    // Set session parameters
    client.query("SET timezone = 'UTC'").catch((err) => {
      logger.warn({ err }, 'Failed to set timezone');
    });
  });

  pool.on('acquire', () => {
    logger.trace('Client acquired from pool');
  });

  pool.on('release', () => {
    logger.trace('Client released to pool');
  });

  pool.on('remove', () => {
    logger.debug('Client removed from pool');
  });

  pool.on('error', (err) => {
    logError(logger, err, 'Unexpected database pool error');
  });

  logger.info(
    {
      poolMin: config.min,
      poolMax: config.max,
      idleTimeoutMs: config.idleTimeoutMillis,
    },
    'Database pool initialized'
  );

  return pool;
}

/**
 * Get the database pool instance
 *
 * @returns Pool instance
 * @throws Error if pool not initialized
 */
export function getPool(): Pool {
  if (!pool) {
    return initializePool();
  }
  return pool;
}

/**
 * Close the database pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    logger.info('Closing database pool...');
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Execute a SQL query
 *
 * @param text - SQL query text
 * @param params - Query parameters
 * @param options - Query options
 * @returns Query result
 *
 * @example
 * 