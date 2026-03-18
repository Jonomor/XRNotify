-- Migration: 001_init.sql
-- Created: 2024-01-01T00:00:00.000Z
-- Description: Initial database setup with extensions and base configuration

-- =============================================================================
-- Extensions
-- =============================================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Full-text search (for future use)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- Custom Types
-- =============================================================================

-- XRPL Network
DO $$ BEGIN
  CREATE TYPE xrpl_network AS ENUM ('mainnet', 'testnet', 'devnet');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Event types (matches shared package EventType)
DO $$ BEGIN
  CREATE TYPE event_type AS ENUM (
    -- Payment events
    'payment.xrp',
    'payment.issued',
    -- Trustline events
    'trustline.created',
    'trustline.modified',
    'trustline.removed',
    -- NFT events
    'nft.minted',
    'nft.burned',
    'nft.offer_created',
    'nft.offer_accepted',
    'nft.offer_cancelled',
    -- DEX events
    'dex.offer_created',
    'dex.offer_cancelled',
    'dex.offer_filled',
    'dex.offer_partially_filled',
    -- Account events
    'account.settings_changed',
    'account.deleted',
    -- Escrow events (roadmap)
    'escrow.created',
    'escrow.finished',
    'escrow.cancelled',
    -- Check events (roadmap)
    'check.created',
    'check.cashed',
    'check.cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Delivery status
DO $$ BEGIN
  CREATE TYPE delivery_status AS ENUM (
    'pending',
    'delivered',
    'failed',
    'retrying'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Plan types
DO $$ BEGIN
  CREATE TYPE plan_type AS ENUM (
    'free',
    'starter',
    'pro',
    'enterprise'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- API key scopes
DO $$ BEGIN
  CREATE TYPE api_key_scope AS ENUM (
    'webhooks:read',
    'webhooks:write',
    'deliveries:read',
    'deliveries:replay',
    'api_keys:read',
    'api_keys:write',
    'billing:read',
    'billing:write'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- Utility Functions
-- =============================================================================

-- Generate short ID (for human-readable identifiers)
CREATE OR REPLACE FUNCTION generate_short_id(length INTEGER DEFAULT 8)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Notify on table changes (for real-time features)
CREATE OR REPLACE FUNCTION notify_table_change()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
BEGIN
  payload := jsonb_build_object(
    'operation', TG_OP,
    'table', TG_TABLE_NAME,
    'id', CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id 
      ELSE NEW.id 
    END,
    'timestamp', NOW()
  );
  
  PERFORM pg_notify('table_changes', payload::TEXT);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Events Table (XRPL events archive)
-- =============================================================================

CREATE TABLE IF NOT EXISTS events (
  -- Primary key is the deterministic event ID
  id TEXT PRIMARY KEY,
  
  -- Event classification
  event_type event_type NOT NULL,
  
  -- XRPL context
  ledger_index BIGINT NOT NULL,
  tx_hash TEXT NOT NULL,
  network xrpl_network NOT NULL DEFAULT 'mainnet',
  
  -- Accounts involved (for filtering/routing)
  account_context TEXT[] NOT NULL DEFAULT '{}',
  
  -- Event payload (JSONB for flexibility)
  payload JSONB NOT NULL,
  
  -- Transaction result
  result_code TEXT NOT NULL,
  result_success BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Raw transaction (optional, for debugging)
  raw_tx JSONB,
  
  -- Timestamps
  ledger_close_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_ledger_index ON events(ledger_index DESC);
CREATE INDEX IF NOT EXISTS idx_events_tx_hash ON events(tx_hash);
CREATE INDEX IF NOT EXISTS idx_events_network ON events(network);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_account_context ON events USING GIN(account_context);
CREATE INDEX IF NOT EXISTS idx_events_ledger_close_time ON events(ledger_close_time DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_events_type_created 
  ON events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_network_ledger 
  ON events(network, ledger_index DESC);

-- =============================================================================
-- Ledger Cursor Table (track processing position)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ledger_cursor (
  id TEXT PRIMARY KEY DEFAULT 'default',
  network xrpl_network NOT NULL,
  ledger_index BIGINT NOT NULL,
  ledger_hash TEXT,
  last_tx_hash TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraint to ensure only one cursor per network
  CONSTRAINT unique_network_cursor UNIQUE (network)
);

-- Insert default cursor if not exists
INSERT INTO ledger_cursor (id, network, ledger_index)
VALUES ('mainnet', 'mainnet', 0)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Audit Log Table (track important changes)
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What happened
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  
  -- Who did it
  tenant_id UUID,
  user_id UUID,
  api_key_id UUID,
  
  -- Request context
  ip_address INET,
  user_agent TEXT,
  request_id TEXT,
  
  -- Details
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  
  -- Result
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- =============================================================================
-- System Settings Table (key-value configuration)
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO system_settings (key, value, description)
VALUES 
  ('maintenance_mode', 'false', 'Enable maintenance mode'),
  ('max_webhooks_per_tenant', '50', 'Maximum webhooks per tenant'),
  ('max_api_keys_per_tenant', '20', 'Maximum API keys per tenant'),
  ('default_retry_attempts', '5', 'Default webhook retry attempts'),
  ('event_retention_days', '30', 'Days to retain events')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- Data Retention Policies
-- =============================================================================

-- Function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data(
  events_retention_days INTEGER DEFAULT 30,
  audit_retention_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  events_deleted BIGINT,
  audit_logs_deleted BIGINT
) AS $$
DECLARE
  events_count BIGINT;
  audit_count BIGINT;
BEGIN
  -- Delete old events
  WITH deleted_events AS (
    DELETE FROM events
    WHERE created_at < NOW() - (events_retention_days || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO events_count FROM deleted_events;
  
  -- Delete old audit logs
  WITH deleted_audit AS (
    DELETE FROM audit_logs
    WHERE created_at < NOW() - (audit_retention_days || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO audit_count FROM deleted_audit;
  
  RETURN QUERY SELECT events_count, audit_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Statistics Views
-- =============================================================================

-- Events per type view
CREATE OR REPLACE VIEW events_by_type AS
SELECT 
  event_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7d,
  MIN(created_at) as first_event,
  MAX(created_at) as last_event
FROM events
GROUP BY event_type;

-- Events per day view (last 30 days)
CREATE OR REPLACE VIEW events_per_day AS
SELECT 
  DATE(created_at) as date,
  event_type,
  COUNT(*) as count
FROM events
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), event_type
ORDER BY date DESC, event_type;

-- =============================================================================
-- Permissions (for row-level security if needed later)
-- =============================================================================

-- Grant basic permissions to application user (if using separate DB users)
-- Note: Adjust 'xrnotify_app' to your actual application database user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO xrnotify_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO xrnotify_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO xrnotify_app;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE events IS 'XRPL events captured from ledger transactions';
COMMENT ON TABLE ledger_cursor IS 'Tracks the last processed ledger for each network';
COMMENT ON TABLE audit_logs IS 'Audit trail for important system changes';
COMMENT ON TABLE system_settings IS 'Key-value store for system configuration';

COMMENT ON FUNCTION generate_short_id IS 'Generate a random short alphanumeric ID';
COMMENT ON FUNCTION update_updated_at_column IS 'Trigger function to update updated_at timestamp';
COMMENT ON FUNCTION cleanup_old_data IS 'Clean up data older than retention period';
