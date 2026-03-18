-- ============================================
-- XRNotify Database Schema
-- Production-grade PostgreSQL schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- API Keys Table
-- ============================================

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    key_prefix VARCHAR(12) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    revoked BOOLEAN NOT NULL DEFAULT FALSE
);

-- Indexes for API keys
CREATE INDEX IF NOT EXISTS idx_api_keys_owner_id ON api_keys(owner_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash) WHERE revoked = FALSE;

-- ============================================
-- Webhooks Table
-- ============================================

CREATE TABLE IF NOT EXISTS webhooks (
    id SERIAL PRIMARY KEY,
    owner_id UUID NOT NULL,
    url TEXT NOT NULL,
    secret VARCHAR(128) NOT NULL,
    event_filter TEXT[] NOT NULL,
    description VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for webhooks
CREATE INDEX IF NOT EXISTS idx_webhooks_owner_id ON webhooks(owner_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_webhooks_event_filter ON webhooks USING GIN(event_filter);

-- Unique constraint for URL per owner
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhooks_owner_url_active 
    ON webhooks(owner_id, url) WHERE active = TRUE;

-- ============================================
-- Deliveries Table
-- ============================================

CREATE TABLE IF NOT EXISTS deliveries (
    id BIGSERIAL PRIMARY KEY,
    webhook_id INTEGER NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'retry', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 1,
    latency_ms INTEGER,
    last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for deliveries
CREATE INDEX IF NOT EXISTS idx_deliveries_webhook_id ON deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_last_attempt ON deliveries(last_attempt DESC);

-- Unique constraint for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_deliveries_webhook_event 
    ON deliveries(webhook_id, event_hash);

-- ============================================
-- Events Archive Table (for replay)
-- ============================================

CREATE TABLE IF NOT EXISTS events_archive (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    tx_hash VARCHAR(64) NOT NULL,
    ledger_index BIGINT NOT NULL,
    payload JSONB NOT NULL,
    addresses TEXT[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for events archive
CREATE INDEX IF NOT EXISTS idx_events_archive_tx_hash ON events_archive(tx_hash);
CREATE INDEX IF NOT EXISTS idx_events_archive_event_type ON events_archive(event_type);
CREATE INDEX IF NOT EXISTS idx_events_archive_created_at ON events_archive(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_archive_addresses ON events_archive USING GIN(addresses);

-- Partial index for recent events (last 7 days)
CREATE INDEX IF NOT EXISTS idx_events_archive_recent 
    ON events_archive(created_at DESC) 
    WHERE created_at > NOW() - INTERVAL '7 days';

-- ============================================
-- Audit Log Table
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    owner_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_owner_id ON audit_log(owner_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- ============================================
-- Functions
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to webhooks
DROP TRIGGER IF EXISTS update_webhooks_updated_at ON webhooks;
CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Cleanup Function (for cron job)
-- ============================================

-- Delete old deliveries (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_deliveries()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM deliveries 
    WHERE last_attempt < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Delete old events archive (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_events()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM events_archive 
    WHERE created_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Views
-- ============================================

-- Webhook statistics view
CREATE OR REPLACE VIEW webhook_stats AS
SELECT 
    w.id as webhook_id,
    w.owner_id,
    w.url,
    w.active,
    COUNT(d.id) as total_deliveries,
    COUNT(d.id) FILTER (WHERE d.status = 'success') as successful_deliveries,
    COUNT(d.id) FILTER (WHERE d.status = 'failed') as failed_deliveries,
    AVG(d.latency_ms) FILTER (WHERE d.status = 'success') as avg_latency_ms,
    MAX(d.last_attempt) as last_delivery
FROM webhooks w
LEFT JOIN deliveries d ON w.id = d.webhook_id
GROUP BY w.id;

-- ============================================
-- Insert sample data for development
-- ============================================

-- Only insert in development
DO $$
BEGIN
    IF current_setting('app.environment', true) = 'development' THEN
        -- Sample API key (for testing)
        INSERT INTO api_keys (owner_id, name, description, key_hash, key_prefix)
        VALUES (
            'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            'Development Key',
            'For local testing',
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            'xrn_test'
        )
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================
-- Grants (adjust as needed)
-- ============================================

-- Grant permissions to app user
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO xrnotify;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO xrnotify;
