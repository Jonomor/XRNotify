// =============================================================================
// XRNotify Platform - Database
// =============================================================================
// PostgreSQL connection pool, query helpers, transactions, and health checks
// =============================================================================

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { getConfig, getDatabaseUrl } from './config';
import { createModuleLogger, logDbQuery } from './logger';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface QueryOptions {
  /** Query timeout in milliseconds */
  timeout?: number;
  /** Log the query */
  log?: boolean;
}

export interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

export interface TransactionClient extends PoolClient {
  /** Transaction ID for logging */
  transactionId: string;
}

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = createModuleLogger('database');

// -----------------------------------------------------------------------------
// Connection Pool Singleton
// -----------------------------------------------------------------------------

let pool: Pool | null = null;

/**
 * Get or create the database connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    const config = getConfig();
    
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      min: config.database.poolMin,
      max: config.database.poolMax,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: false,
    });

    // Pool event handlers
    pool.on('connect', (client) => {
      logger.debug('New database connection established');
      // Set timezone for this connection
      client.query('SET timezone = \'UTC\'').catch(() => {});
    });

    pool.on('acquire', () => {
      logger.trace('Connection acquired from pool');
    });

    pool.on('release', () => {
      logger.trace('Connection released to pool');
    });

    pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected database pool error');
    });

    pool.on('remove', () => {
      logger.debug('Connection removed from pool');
    });

    logger.info(
      { poolMin: config.database.poolMin, poolMax: config.database.poolMax },
      'Database pool initialized'
    );
  }

  return pool;
}

// -----------------------------------------------------------------------------
// Query Functions
// -----------------------------------------------------------------------------

/**
 * Execute a query and return all rows
 * 
 * @param text - SQL query text
 * @param values - Query parameters
 * @param options - Query options
 * @returns Query result with rows
 * 
 * @example
 * const result = await query('SELECT * FROM users WHERE id = $1', [userId]);
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[],
  options: QueryOptions = {}
): Promise<QueryResult<T>> {
  const start = performance.now();
  const client = await getPool().connect();
  
  try {
    // Set statement timeout if specified
    if (options.timeout) {
      await client.query(`SET statement_timeout = ${options.timeout}`);
    }

    const result = await client.query<T>(text, values);
    const durationMs = Math.round(performance.now() - start);

    if (options.log !== false) {
      logDbQuery(logger, text, durationMs, result.rowCount ?? undefined);
    }

    return result;
  } finally {
    client.release();
  }
}

/**
 * Execute a query and return a single row or null
 * 
 * @param text - SQL query text
 * @param values - Query parameters
 * @param options - Query options
 * @returns Single row or null
 * 
 * @example
 * const user = await queryOne<User>('SELECT * FROM users WHERE id = $1', [userId]);
 */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[],
  options: QueryOptions = {}
): Promise<T | null> {
  const result = await query<T>(text, values, options);
  return result.rows[0] ?? null;
}

/**
 * Execute a query and return all rows as an array
 * 
 * @param text - SQL query text
 * @param values - Query parameters
 * @param options - Query options
 * @returns Array of rows
 * 
 * @example
 * const users = await queryAll<User>('SELECT * FROM users WHERE active = true');
 */
export async function queryAll<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values?: unknown[],
  options: QueryOptions = {}
): Promise<T[]> {
  const result = await query<T>(text, values, options);
  return result.rows;
}

/**
 * Execute a query and return the count of affected rows
 * 
 * @param text - SQL query text
 * @param values - Query parameters
 * @param options - Query options
 * @returns Number of affected rows
 */
export async function execute(
  text: string,
  values?: unknown[],
  options: QueryOptions = {}
): Promise<number> {
  const result = await query(text, values, options);
  return result.rowCount ?? 0;
}

// -----------------------------------------------------------------------------
// Transactions
// -----------------------------------------------------------------------------

/**
 * Execute a function within a transaction
 * 
 * @param fn - Function to execute within transaction
 * @returns Result of the function
 * 
 * @example
 * const result = await withTransaction(async (client) => {
 *   await client.query('INSERT INTO users ...', [...]);
 *   await client.query('INSERT INTO profiles ...', [...]);
 *   return { success: true };
 * });
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  const transactionId = Math.random().toString(36).substring(2, 10);
  
  try {
    logger.debug({ transactionId }, 'Beginning transaction');
    await client.query('BEGIN');
    
    const result = await fn(client);
    
    await client.query('COMMIT');
    logger.debug({ transactionId }, 'Transaction committed');
    
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.debug({ transactionId, error }, 'Transaction rolled back');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute queries within a transaction with automatic savepoints
 * 
 * @param fn - Function to execute
 * @param savepointName - Optional savepoint name
 */
export async function withSavepoint<T>(
  client: PoolClient,
  savepointName: string,
  fn: () => Promise<T>
): Promise<T> {
  await client.query(`SAVEPOINT ${savepointName}`);
  
  try {
    const result = await fn();
    await client.query(`RELEASE SAVEPOINT ${savepointName}`);
    return result;
  } catch (error) {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
    throw error;
  }
}

// -----------------------------------------------------------------------------
// Health Check
// -----------------------------------------------------------------------------

/**
 * Check database health
 * 
 * @returns Health check result
 */
export async function checkHealth(): Promise<{
  healthy: boolean;
  latencyMs: number;
  message?: string;
}> {
  const start = performance.now();
  
  try {
    await query('SELECT 1', [], { log: false });
    const latencyMs = Math.round(performance.now() - start);
    
    return {
      healthy: true,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - start);
    
    return {
      healthy: false,
      latencyMs,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get pool statistics
 */
export function getPoolStats(): PoolStats {
  const p = getPool();
  
  return {
    totalCount: p.totalCount,
    idleCount: p.idleCount,
    waitingCount: p.waitingCount,
  };
}

// -----------------------------------------------------------------------------
// Graceful Shutdown
// -----------------------------------------------------------------------------

/**
 * Close the database pool gracefully
 */
export async function closePool(): Promise<void> {
  if (pool) {
    logger.info('Closing database pool...');
    await pool.end();
    pool = null;
    logger.info('Database pool closed');
  }
}

// -----------------------------------------------------------------------------
// Query Builders / Helpers
// -----------------------------------------------------------------------------

/**
 * Build a parameterized INSERT query
 * 
 * @param table - Table name
 * @param data - Object with column names and values
 * @returns Query text and values
 * 
 * @example
 * const { text, values } = buildInsert('users', { name: 'John', email: 'john@example.com' });
 */
export function buildInsert(
  table: string,
  data: Record<string, unknown>
): { text: string; values: unknown[] } {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map((_, i) => `$${i + 1}`);
  
  const text = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
    RETURNING *
  `.trim();
  
  return { text, values };
}

/**
 * Build a parameterized UPDATE query
 * 
 * @param table - Table name
 * @param data - Object with column names and values to update
 * @param where - WHERE clause conditions
 * @returns Query text and values
 * 
 * @example
 * const { text, values } = buildUpdate('users', { name: 'Jane' }, { id: userId });
 */
export function buildUpdate(
  table: string,
  data: Record<string, unknown>,
  where: Record<string, unknown>
): { text: string; values: unknown[] } {
  const setClauses: string[] = [];
  const whereClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;
  
  // Build SET clause
  for (const [column, value] of Object.entries(data)) {
    setClauses.push(`${column} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  }
  
  // Build WHERE clause
  for (const [column, value] of Object.entries(where)) {
    whereClauses.push(`${column} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  }
  
  const text = `
    UPDATE ${table}
    SET ${setClauses.join(', ')}, updated_at = NOW()
    WHERE ${whereClauses.join(' AND ')}
    RETURNING *
  `.trim();
  
  return { text, values };
}

/**
 * Escape identifier (table/column name)
 */
export function escapeIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Build pagination clause
 * 
 * @param page - Page number (1-indexed)
 * @param perPage - Items per page
 * @returns LIMIT and OFFSET clause
 */
export function buildPagination(page: number, perPage: number): string {
  const offset = (page - 1) * perPage;
  return `LIMIT ${perPage} OFFSET ${offset}`;
}

/**
 * Calculate total pages
 */
export function calculateTotalPages(total: number, perPage: number): number {
  return Math.ceil(total / perPage);
}

// -----------------------------------------------------------------------------
// Re-export PoolClient for transactions
// -----------------------------------------------------------------------------

export type { PoolClient };
