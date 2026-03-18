-- Migration: initial
-- Created at: 2024-01-01T00:00:00.000Z
-- Description: Core tables for tenants, users, and API keys

-- =============================================================================
-- Extensions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- Enum Types
-- =============================================================================

CREATE TYPE plan_type AS ENUM ('free', 'starter', 'pro', 'enterprise');

CREATE TYPE api_key_scope AS ENUM (
  'webhooks:read',
  'webhooks:write',
  'deliveries:read',
  'deliveries:write',
  'events:read',
  'api_keys:read',
  'api_keys:write',
  'admin'
);

-- =============================================================================
-- Tenants Table
-- =============================================================================

CREATE TABLE tenants (
  id VARCHAR(36) PRIMARY KEY DEFAULT 'ten_' || replace(uuid_generate_v4()::text, '-', ''),
  name VARCHAR(255) NOT NULL,
  plan plan_type NOT NULL DEFAULT 'free',
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Plan limits
  webhook_limit INTEGER NOT NULL DEFAULT 2,
  events_per_month INTEGER NOT NULL DEFAULT 1000,
  
  -- Settings (JSONB for flexibility)
  settings JSONB NOT NULL DEFAULT '{
    "replay_enabled": false,
    "events_api_enabled": false,
    "websocket_enabled": false,
    "retention_days": 30,
    "custom_retry_policy": false
  }'::jsonb,
  
  -- Billing
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tenants_stripe_customer ON tenants(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_tenants_plan ON tenants(plan);
CREATE INDEX idx_tenants_is_active ON tenants(is_active);

-- =============================================================================
-- Users Table
-- =============================================================================

CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY DEFAULT 'usr_' || replace(uuid_generate_v4()::text, '-', ''),
  tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Auth
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  
  -- Profile
  name VARCHAR(255),
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  
  -- Security
  last_login_at TIMESTAMPTZ,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

-- =============================================================================
-- API Keys Table
-- =============================================================================

CREATE TABLE api_keys (
  id VARCHAR(36) PRIMARY KEY DEFAULT 'ak_' || replace(uuid_generate_v4()::text, '-', ''),
  tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Key data (only hash stored, never the raw key)
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  key_prefix VARCHAR(20) NOT NULL, -- First 8 chars for identification
  
  -- Permissions
  scopes api_key_scope[] NOT NULL DEFAULT ARRAY['webhooks:read', 'webhooks:write', 'deliveries:read']::api_key_scope[],
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  last_used_ip VARCHAR(45),
  
  -- Expiration
  expires_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_expires ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

-- =============================================================================
-- Sessions Table (for JWT session invalidation)
-- =============================================================================

CREATE TABLE sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT 'ses_' || replace(uuid_generate_v4()::text, '-', ''),
  user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Session token hash (for invalidation)
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  
  -- Metadata
  user_agent TEXT,
  ip_address VARCHAR(45),
  
  -- Timestamps
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_tenant ON sessions(tenant_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- =============================================================================
-- Updated At Trigger Function
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Seed Data (Optional - Development Only)
-- =============================================================================

-- Insert a default tenant and user for development
-- Password is 'password123' hashed with bcrypt
-- DO $$
-- BEGIN
--   INSERT INTO tenants (id, name, plan, webhook_limit, events_per_month, settings)
--   VALUES (
--     'ten_dev000000000000000000000001',
--     'Development Tenant',
--     'pro',
--     50,
--     500000,
--     '{"replay_enabled": true, "events_api_enabled": true, "websocket_enabled": true, "retention_days": 90}'::jsonb
--   );
--   
--   INSERT INTO users (id, tenant_id, email, password_hash, name, email_verified)
--   VALUES (
--     'usr_dev000000000000000000000001',
--     'ten_dev000000000000000000000001',
--     'dev@xrnotify.dev',
--     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.qMFLwF5JqJ5q6C',
--     'Developer',
--     true
--   );
-- END $$;

-- DOWN

DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tenants;

DROP TYPE IF EXISTS api_key_scope;
DROP TYPE IF EXISTS plan_type;
