// =============================================================================
// XRNotify Platform - Database Migration Runner
// =============================================================================
// Runs SQL migrations in order, tracks applied migrations in a migrations table
// Usage: npx tsx src/lib/db/migrate.ts [up|down|status]
// =============================================================================

import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATIONS_DIR = join(__dirname, 'migrations');

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  return url;
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface Migration {
  id: number;
  name: string;
  applied_at: Date;
}

interface MigrationFile {
  version: string;
  name: string;
  filename: string;
  upSql: string;
  downSql: string;
}

// -----------------------------------------------------------------------------
// Database Connection
// -----------------------------------------------------------------------------

function createPool(): pg.Pool {
  return new Pool({
    connectionString: getDatabaseUrl(),
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

// -----------------------------------------------------------------------------
// Migration Table Management
// -----------------------------------------------------------------------------

async function ensureMigrationsTable(pool: pg.Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(pool: pg.Pool): Promise<Migration[]> {
  const result = await pool.query<Migration>(`
    SELECT id, version as name, applied_at
    FROM schema_migrations
    ORDER BY version ASC
  `);
  return result.rows;
}

async function recordMigration(pool: pg.Pool, version: string, name: string): Promise<void> {
  await pool.query(
    'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
    [version, name]
  );
}

async function removeMigration(pool: pg.Pool, version: string): Promise<void> {
  await pool.query('DELETE FROM schema_migrations WHERE version = $1', [version]);
}

// -----------------------------------------------------------------------------
// Migration File Loading
// -----------------------------------------------------------------------------

async function loadMigrationFiles(): Promise<MigrationFile[]> {
  const files = await readdir(MIGRATIONS_DIR);
  
  // Filter for .sql files and sort by version
  const sqlFiles = files
    .filter(f => f.endsWith('.sql'))
    .sort();

  const migrations: MigrationFile[] = [];

  for (const filename of sqlFiles) {
    // Expected format: 001_initial.sql
    const match = filename.match(/^(\d+)_(.+)\.sql$/);
    if (!match) {
      console.warn(`Skipping invalid migration filename: ${filename}`);
      continue;
    }

    const [, version, name] = match;
    const filepath = join(MIGRATIONS_DIR, filename);
    const content = await readFile(filepath, 'utf-8');

    // Split on -- DOWN marker
    const parts = content.split(/^-- DOWN$/m);
    const upSql = parts[0]?.trim() ?? '';
    const downSql = parts[1]?.trim() ?? '';

    migrations.push({
      version,
      name,
      filename,
      upSql,
      downSql,
    });
  }

  return migrations;
}

// -----------------------------------------------------------------------------
// Migration Execution
// -----------------------------------------------------------------------------

async function runMigrationUp(pool: pg.Pool, migration: MigrationFile): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Execute migration SQL
    await client.query(migration.upSql);
    
    // Record migration
    await client.query(
      'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
      [migration.version, migration.name]
    );
    
    await client.query('COMMIT');
    console.log(`✓ Applied migration: ${migration.filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function runMigrationDown(pool: pg.Pool, migration: MigrationFile): Promise<void> {
  if (!migration.downSql) {
    throw new Error(`No DOWN migration defined for: ${migration.filename}`);
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Execute rollback SQL
    await client.query(migration.downSql);
    
    // Remove migration record
    await client.query(
      'DELETE FROM schema_migrations WHERE version = $1',
      [migration.version]
    );
    
    await client.query('COMMIT');
    console.log(`✓ Rolled back migration: ${migration.filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// -----------------------------------------------------------------------------
// Commands
// -----------------------------------------------------------------------------

async function migrateUp(pool: pg.Pool): Promise<void> {
  await ensureMigrationsTable(pool);
  
  const applied = await getAppliedMigrations(pool);
  const appliedVersions = new Set(applied.map(m => m.name.split('_')[0]));
  
  const migrations = await loadMigrationFiles();
  const pending = migrations.filter(m => !appliedVersions.has(m.version));
  
  if (pending.length === 0) {
    console.log('No pending migrations');
    return;
  }
  
  console.log(`Found ${pending.length} pending migration(s)\n`);
  
  for (const migration of pending) {
    await runMigrationUp(pool, migration);
  }
  
  console.log('\n✓ All migrations applied successfully');
}

async function migrateDown(pool: pg.Pool, steps = 1): Promise<void> {
  await ensureMigrationsTable(pool);
  
  const appliedResult = await pool.query<{ version: string }>(`
    SELECT version FROM schema_migrations ORDER BY version DESC LIMIT $1
  `, [steps]);
  
  if (appliedResult.rows.length === 0) {
    console.log('No migrations to rollback');
    return;
  }
  
  const migrations = await loadMigrationFiles();
  const migrationMap = new Map(migrations.map(m => [m.version, m]));
  
  console.log(`Rolling back ${appliedResult.rows.length} migration(s)\n`);
  
  for (const row of appliedResult.rows) {
    const migration = migrationMap.get(row.version);
    if (!migration) {
      throw new Error(`Migration file not found for version: ${row.version}`);
    }
    await runMigrationDown(pool, migration);
  }
  
  console.log('\n✓ Rollback completed successfully');
}

async function migrationStatus(pool: pg.Pool): Promise<void> {
  await ensureMigrationsTable(pool);
  
  const applied = await pool.query<{ version: string; name: string; applied_at: Date }>(`
    SELECT version, name, applied_at FROM schema_migrations ORDER BY version ASC
  `);
  
  const migrations = await loadMigrationFiles();
  const appliedVersions = new Set(applied.rows.map(m => m.version));
  
  console.log('Migration Status\n');
  console.log('Applied:');
  
  if (applied.rows.length === 0) {
    console.log('  (none)');
  } else {
    for (const row of applied.rows) {
      const date = row.applied_at.toISOString().split('T')[0];
      console.log(`  ✓ ${row.version}_${row.name}.sql (${date})`);
    }
  }
  
  const pending = migrations.filter(m => !appliedVersions.has(m.version));
  
  console.log('\nPending:');
  
  if (pending.length === 0) {
    console.log('  (none)');
  } else {
    for (const migration of pending) {
      console.log(`  ○ ${migration.filename}`);
    }
  }
}

async function createMigration(name: string): Promise<void> {
  const migrations = await loadMigrationFiles();
  
  // Calculate next version number
  const lastVersion = migrations.length > 0 
    ? Math.max(...migrations.map(m => parseInt(m.version, 10)))
    : 0;
  const nextVersion = String(lastVersion + 1).padStart(3, '0');
  
  // Sanitize name
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  
  const filename = `${nextVersion}_${safeName}.sql`;
  const filepath = join(MIGRATIONS_DIR, filename);
  
  const template = `-- Migration: ${safeName}
-- Created at: ${new Date().toISOString()}

-- Add your migration SQL here



-- DOWN
-- Add your rollback SQL here

`;

  const { writeFile } = await import('fs/promises');
  await writeFile(filepath, template, 'utf-8');
  
  console.log(`Created migration: ${filename}`);
}

// -----------------------------------------------------------------------------
// CLI Entry Point
// -----------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'up';
  
  if (command === 'create') {
    const name = args[1];
    if (!name) {
      console.error('Usage: migrate create <name>');
      process.exit(1);
    }
    await createMigration(name);
    return;
  }
  
  const pool = createPool();
  
  try {
    switch (command) {
      case 'up':
        await migrateUp(pool);
        break;
      
      case 'down': {
        const steps = parseInt(args[1] ?? '1', 10);
        await migrateDown(pool, steps);
        break;
      }
      
      case 'status':
        await migrationStatus(pool);
        break;
      
      case 'redo': {
        await migrateDown(pool, 1);
        await migrateUp(pool);
        break;
      }
      
      default:
        console.error(`Unknown command: ${command}`);
        console.error('Usage: migrate [up|down|status|redo|create <name>]');
        process.exit(1);
    }
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
main().catch(console.error);

// Export for programmatic use
export {
  migrateUp,
  migrateDown,
  migrationStatus,
  createMigration,
  loadMigrationFiles,
  ensureMigrationsTable,
};
