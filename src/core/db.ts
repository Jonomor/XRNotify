/**
 * XRNotify Database Module
 * PostgreSQL connection pool with health monitoring
 */

import pg from 'pg';
import { config } from './config.js';
import { logger, createChildLogger } from './logger.js';

const log = createChildLogger('database');

// Create connection pool
export const db = new pg.Pool({
  connectionString: config.dbUrl,
  min: config.dbPoolMin,
  max: config.dbPoolMax,
  idleTimeoutMillis: config.dbIdleTimeout,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: false,
});

// Connection event handlers
db.on('connect', (client) => {
  log.info('New database client connected', {
    totalCount: db.totalCount,
    idleCount: db.idleCount,
    waitingCount: db.waitingCount,
  });
});

db.on('error', (err) => {
  log.error('Database pool error', { error: err.message, stack: err.stack });
});

db.on('remove', () => {
  log.debug('Database client removed from pool');
});

// Health check function
export async function checkDbHealth(): Promise<{
  healthy: boolean;
  latencyMs: number;
  poolStats: {
    total: number;
    idle: number;
    waiting: number;
  };
}> {
  const start = Date.now();
  try {
    await db.query('SELECT 1');
    return {
      healthy: true,
      latencyMs: Date.now() - start,
      poolStats: {
        total: db.totalCount,
        idle: db.idleCount,
        waiting: db.waitingCount,
      },
    };
  } catch (error) {
    log.error('Database health check failed', { error });
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      poolStats: {
        total: db.totalCount,
        idle: db.idleCount,
        waiting: db.waitingCount,
      },
    };
  }
}

// Graceful shutdown
export async function closeDb(): Promise<void> {
  log.info('Closing database connections...');
  await db.end();
  log.info('Database connections closed');
}

// Transaction helper
export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Query helper with logging
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values?: unknown[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await db.query<T>(text, values);
    const duration = Date.now() - start;
    log.debug('Query executed', {
      query: text.substring(0, 100),
      duration,
      rows: result.rowCount,
    });
    return result;
  } catch (error) {
    log.error('Query failed', {
      query: text.substring(0, 100),
      error: (error as Error).message,
    });
    throw error;
  }
}
