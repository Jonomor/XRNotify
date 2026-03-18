import pg from 'pg';
import { config, logger } from '../core/index.js';

const { Pool } = pg;

// ═══════════════════════════════════════════════════════════════════════════════
// Migration Definitions
// ═══════════════════════════════════════════════════════════════════════════════

const migrations = [
  {
    version: 1,
    name: 'create_api_keys_table',
    up: `
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID NOT NULL,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(255),
        key_prefix VARCHAR(8) NOT NULL,
        key_hash VARCHAR(64) NOT NULL UNIQUE,
        permissions TEXT[] NOT NULL DEFAULT '{}',
        rate_limit_max INTEGER NOT NULL DEFAULT 60,
        rate_limit_window_ms INTEGER NOT NULL DEFAULT 60000,
        ip_allowlist TEXT[],
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        last_used_at TIMESTAMPTZ,
        revoked BOOLEAN NOT NULL DEFAULT false,
        revoked_at TIMESTAMPTZ
      );

      CREATE INDEX idx_api_keys_owner_id ON api_keys(owner_id);
      CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
      CREATE INDEX idx_api_keys_revoked ON api_keys(revoked) WHERE revoked = false;
    `,
    down: `DROP TABLE IF EXISTS api_keys;`,
  },
  {
    version: 2,
    name: 'create_webhooks_table',
    up: `
      CREATE TABLE IF NOT EXISTS webhooks (
        id SERIAL PRIMARY KEY,
        owner_id UUID NOT NULL,
        url TEXT NOT NULL,
        secret TEXT NOT NULL,
        secret_prefix VARCHAR(8) NOT NULL,
        event_filter TEXT[] NOT NULL,
        description VARCHAR(255),
        metadata JSONB,
        enabled BOOLEAN NOT NULL DEFAULT true,
        max_retries INTEGER NOT NULL DEFAULT 3,
        retry_delays INTEGER[],
        delivery_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_triggered_at TIMESTAMPTZ,
        deleted_at TIMESTAMPTZ,
        
        CONSTRAINT unique_owner_url UNIQUE (owner_id, url)
      );

      CREATE INDEX idx_webhooks_owner_id ON webhooks(owner_id);
      CREATE INDEX idx_webhooks_enabled ON webhooks(enabled) WHERE enabled = true;
      CREATE INDEX idx_webhooks_event_filter ON webhooks USING GIN(event_filter);
    `,
    down: `DROP TABLE IF EXISTS webhooks;`,
  },
  {
    version: 3,
    name: 'create_deliveries_table',
    up: `
      CREATE TABLE IF NOT EXISTS deliveries (
        id BIGSERIAL PRIMARY KEY,
        webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
        event_id VARCHAR(32) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        event_hash VARCHAR(128) NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'success', 'retry', 'failed')),
        status_code INTEGER,
        attempts INTEGER NOT NULL DEFAULT 1,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        next_retry_at TIMESTAMPTZ,
        last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        latency_ms INTEGER,
        error_message TEXT,
        request_headers JSONB,
        response_headers JSONB,
        response_body TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        
        CONSTRAINT unique_event_webhook UNIQUE (event_hash, webhook_id)
      );

      CREATE INDEX idx_deliveries_webhook_id ON deliveries(webhook_id);
      CREATE INDEX idx_deliveries_status ON deliveries(status);
      CREATE INDEX idx_deliveries_created_at ON deliveries(created_at);
      CREATE INDEX idx_deliveries_event_type ON deliveries(event_type);
      CREATE INDEX idx_deliveries_next_retry ON deliveries(next_retry_at) WHERE status = 'retry';
    `,
    down: `DROP TABLE IF EXISTS deliveries;`,
  },
  {
    version: 4,
    name: 'create_events_table',
    up: `
      CREATE TABLE IF NOT EXISTS events (
        id BIGSERIAL PRIMARY KEY,
        event_id VARCHAR(32) NOT NULL UNIQUE,
        event_type VARCHAR(50) NOT NULL,
        ledger_index BIGINT NOT NULL,
        tx_hash VARCHAR(64) NOT NULL,
        account VARCHAR(35) NOT NULL,
        destination VARCHAR(35),
        amount_value DECIMAL(30, 6),
        amount_currency VARCHAR(10),
        amount_issuer VARCHAR(35),
        fee_xrp DECIMAL(20, 6),
        timestamp TIMESTAMPTZ NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_events_event_type ON events(event_type);
      CREATE INDEX idx_events_ledger_index ON events(ledger_index);
      CREATE INDEX idx_events_tx_hash ON events(tx_hash);
      CREATE INDEX idx_events_account ON events(account);
      CREATE INDEX idx_events_timestamp ON events(timestamp);
      CREATE INDEX idx_events_created_at ON events(created_at);
    `,
    down: `DROP TABLE IF EXISTS events;`,
  },
  {
    version: 5,
    name: 'create_migrations_table',
    up: `
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
    down: `DROP TABLE IF EXISTS migrations;`,
  },
  {
    version: 6,
    name: 'create_audit_logs_table',
    up: `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGSERIAL PRIMARY KEY,
        owner_id UUID NOT NULL,
        action VARCHAR(50) NOT NULL,
        resource_type VARCHAR(50) NOT NULL,
        resource_id VARCHAR(64),
        ip_address INET,
        user_agent TEXT,
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_audit_logs_owner_id ON audit_logs(owner_id);
      CREATE INDEX idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
    `,
    down: `DROP TABLE IF EXISTS audit_logs;`,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Migration Runner
// ═══════════════════════════════════════════════════════════════════════════════

async function getAppliedMigrations(pool: pg.Pool): Promise<number[]> {
  try {
    const result = await pool.query<{ version: number }>(
      'SELECT version FROM migrations ORDER BY version'
    );
    return result.rows.map((row) => row.version);
  } catch {
    return [];
  }
}

async function recordMigration(
  pool: pg.Pool,
  version: number,
  name: string
): Promise<void> {
  await pool.query(
    'INSERT INTO migrations (version, name) VALUES ($1, $2)',
    [version, name]
  );
}

async function runMigrations(): Promise<void> {
  const pool = new Pool({ connectionString: config.databaseUrl });

  try {
    logger.info('Starting database migrations...');

    // Ensure migrations table exists
    await pool.query(migrations.find((m) => m.name === 'create_migrations_table')!.up);

    const applied = await getAppliedMigrations(pool);
    logger.info(`Found ${applied.length} applied migrations`);

    const pending = migrations.filter((m) => !applied.includes(m.version));

    if (pending.length === 0) {
      logger.info('No pending migrations');
      return;
    }

    logger.info(`Running ${pending.length} pending migrations...`);

    for (const migration of pending.sort((a, b) => a.version - b.version)) {
      logger.info(`Applying migration ${migration.version}: ${migration.name}`);
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(migration.up);
        await recordMigration(pool, migration.version, migration.name);
        await client.query('COMMIT');
        logger.info(`Migration ${migration.version} applied successfully`);
      } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Migration ${migration.version} failed`, {
          error: (error as Error).message,
        });
        throw error;
      } finally {
        client.release();
      }
    }

    logger.info('All migrations completed successfully');
  } finally {
    await pool.end();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Rollback Function
// ═══════════════════════════════════════════════════════════════════════════════

async function rollbackMigration(targetVersion?: number): Promise<void> {
  const pool = new Pool({ connectionString: config.databaseUrl });

  try {
    const applied = await getAppliedMigrations(pool);
    
    if (applied.length === 0) {
      logger.info('No migrations to rollback');
      return;
    }

    const target = targetVersion ?? applied[applied.length - 1];
    const toRollback = migrations
      .filter((m) => m.version >= target && applied.includes(m.version))
      .sort((a, b) => b.version - a.version);

    for (const migration of toRollback) {
      logger.info(`Rolling back migration ${migration.version}: ${migration.name}`);
      
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(migration.down);
        await client.query('DELETE FROM migrations WHERE version = $1', [migration.version]);
        await client.query('COMMIT');
        logger.info(`Migration ${migration.version} rolled back`);
      } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Rollback ${migration.version} failed`, {
          error: (error as Error).message,
        });
        throw error;
      } finally {
        client.release();
      }
    }

    logger.info('Rollback completed');
  } finally {
    await pool.end();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI Entry Point
// ═══════════════════════════════════════════════════════════════════════════════

const command = process.argv[2];

async function main(): Promise<void> {
  switch (command) {
    case 'up':
    case undefined:
      await runMigrations();
      break;
    case 'down':
      const version = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;
      await rollbackMigration(version);
      break;
    default:
      console.log('Usage: node migrations/run.js [up|down] [version]');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Migration error:', error);
  process.exit(1);
});

export { runMigrations, rollbackMigration };
