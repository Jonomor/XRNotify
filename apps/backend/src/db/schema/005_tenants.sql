-- Migration: 005_tenants.sql
-- Created: 2024-01-01T00:00:00.000Z
-- Description: Multi-tenant support with users, tenants, and billing

-- =============================================================================
-- Tenants Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenants (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  
  -- Plan & Billing
  plan plan_type NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'active',
  billing_email TEXT,
  
  -- Usage tracking (current billing period)
  events_this_period BIGINT NOT NULL DEFAULT 0,
  events_limit BIGINT NOT NULL DEFAULT 10000,
  billing_period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW()),
  billing_period_end TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', NOW()) + INTERVAL '1 month',
  
  -- Limits (based on plan, can be overridden)
  webhooks_limit INTEGER NOT NULL DEFAULT 3,
  api_keys_limit INTEGER NOT NULL DEFAULT 2,
  retention_days INTEGER NOT NULL DEFAULT 7,
  replay_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  websocket_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  raw_events_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Status
  active BOOLEAN NOT NULL DEFAULT TRUE,
  suspended_at TIMESTAMPTZ,
  suspended_reason TEXT,
  
  -- Metadata
  settings JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for tenants
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants(stripe_customer_id) 
  WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON tenants(created_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Users Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tenant association
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Authentication
  email VARCHAR(255) NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified_at TIMESTAMPTZ,
  password_hash TEXT,
  
  -- Profile
  name VARCHAR(255),
  avatar_url TEXT,
  
  -- Role within tenant
  role TEXT NOT NULL DEFAULT 'member',
  
  -- OAuth (optional)
  oauth_provider TEXT,
  oauth_provider_id TEXT,
  oauth_data JSONB,
  
  -- Security
  last_login_at TIMESTAMPTZ,
  last_login_ip INET,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  
  -- Password reset
  password_reset_token TEXT,
  password_reset_expires_at TIMESTAMPTZ,
  
  -- Email verification
  email_verification_token TEXT,
  email_verification_expires_at TIMESTAMPTZ,
  
  -- Preferences
  preferences JSONB NOT NULL DEFAULT '{}',
  
  -- Status
  active BOOLEAN NOT NULL DEFAULT TRUE,
  deactivated_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email),
  CONSTRAINT unique_oauth_provider UNIQUE (oauth_provider, oauth_provider_id)
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(tenant_id, active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_provider_id) 
  WHERE oauth_provider IS NOT NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Sessions Table (for dashboard auth)
-- =============================================================================

CREATE TABLE IF NOT EXISTS sessions (
  -- Primary key (the session token hash)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Token storage
  token_hash TEXT NOT NULL UNIQUE,
  
  -- Refresh token (for JWT refresh)
  refresh_token_hash TEXT UNIQUE,
  refresh_token_expires_at TIMESTAMPTZ,
  
  -- Session info
  user_agent TEXT,
  ip_address INET,
  
  -- Status
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_id ON sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token_hash) 
  WHERE refresh_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(user_id, revoked, expires_at) 
  WHERE revoked = FALSE;

-- =============================================================================
-- Invitations Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tenant
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Invitation details
  email VARCHAR(255) NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  
  -- Token
  token_hash TEXT NOT NULL UNIQUE,
  
  -- Inviter
  invited_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  accepted_at TIMESTAMPTZ,
  accepted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  
  CONSTRAINT unique_pending_invitation UNIQUE (tenant_id, email)
);

-- Indexes for invitations
CREATE INDEX IF NOT EXISTS idx_invitations_tenant_id ON invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- =============================================================================
-- Billing History Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tenant
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Event info
  event_type TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE,
  
  -- Data
  amount_cents INTEGER,
  currency VARCHAR(3) DEFAULT 'usd',
  description TEXT,
  invoice_url TEXT,
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for billing events
CREATE INDEX IF NOT EXISTS idx_billing_events_tenant_id ON billing_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_created_at ON billing_events(created_at DESC);

-- =============================================================================
-- Usage Tracking Table (daily aggregates)
-- =============================================================================

CREATE TABLE IF NOT EXISTS usage_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tenant
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Date
  date DATE NOT NULL,
  
  -- Event counts
  events_received BIGINT NOT NULL DEFAULT 0,
  events_by_type JSONB NOT NULL DEFAULT '{}',
  
  -- Delivery counts
  deliveries_total BIGINT NOT NULL DEFAULT 0,
  deliveries_successful BIGINT NOT NULL DEFAULT 0,
  deliveries_failed BIGINT NOT NULL DEFAULT 0,
  
  -- API usage
  api_requests BIGINT NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_tenant_date UNIQUE (tenant_id, date)
);

-- Indexes for usage
CREATE INDEX IF NOT EXISTS idx_usage_daily_tenant_id ON usage_daily(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_daily_date ON usage_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_daily_tenant_date ON usage_daily(tenant_id, date DESC);

-- =============================================================================
-- Functions
-- =============================================================================

-- Create a new tenant with initial user
CREATE OR REPLACE FUNCTION create_tenant_with_user(
  p_tenant_name VARCHAR(255),
  p_user_email VARCHAR(255),
  p_user_name VARCHAR(255),
  p_password_hash TEXT,
  p_plan plan_type DEFAULT 'free'
)
RETURNS TABLE (
  tenant_id UUID,
  user_id UUID
) AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_slug TEXT;
  v_limits RECORD;
BEGIN
  -- Generate slug from tenant name
  v_slug := lower(regexp_replace(p_tenant_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := regexp_replace(v_slug, '^-|-$', '', 'g');
  v_slug := v_slug || '-' || generate_short_id(6);
  
  -- Get plan limits
  SELECT * INTO v_limits FROM get_plan_limits(p_plan);
  
  -- Create tenant
  INSERT INTO tenants (
    name, slug, plan,
    events_limit, webhooks_limit, api_keys_limit,
    retention_days, replay_enabled, websocket_enabled, raw_events_enabled
  ) VALUES (
    p_tenant_name, v_slug, p_plan,
    v_limits.events_limit, v_limits.webhooks_limit, v_limits.api_keys_limit,
    v_limits.retention_days, v_limits.replay_enabled, 
    v_limits.websocket_enabled, v_limits.raw_events_enabled
  )
  RETURNING id INTO v_tenant_id;
  
  -- Create user as owner
  INSERT INTO users (
    tenant_id, email, name, password_hash, role
  ) VALUES (
    v_tenant_id, lower(p_user_email), p_user_name, p_password_hash, 'owner'
  )
  RETURNING id INTO v_user_id;
  
  RETURN QUERY SELECT v_tenant_id, v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Get plan limits
CREATE OR REPLACE FUNCTION get_plan_limits(p_plan plan_type)
RETURNS TABLE (
  events_limit BIGINT,
  webhooks_limit INTEGER,
  api_keys_limit INTEGER,
  retention_days INTEGER,
  replay_enabled BOOLEAN,
  websocket_enabled BOOLEAN,
  raw_events_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE p_plan
      WHEN 'free' THEN 10000::BIGINT
      WHEN 'starter' THEN 100000::BIGINT
      WHEN 'pro' THEN 1000000::BIGINT
      WHEN 'enterprise' THEN 0::BIGINT -- 0 = unlimited
    END,
    CASE p_plan
      WHEN 'free' THEN 3
      WHEN 'starter' THEN 10
      WHEN 'pro' THEN 50
      WHEN 'enterprise' THEN 0 -- 0 = unlimited
    END,
    CASE p_plan
      WHEN 'free' THEN 2
      WHEN 'starter' THEN 5
      WHEN 'pro' THEN 20
      WHEN 'enterprise' THEN 0 -- 0 = unlimited
    END,
    CASE p_plan
      WHEN 'free' THEN 7
      WHEN 'starter' THEN 30
      WHEN 'pro' THEN 90
      WHEN 'enterprise' THEN 365
    END,
    CASE p_plan
      WHEN 'free' THEN FALSE
      ELSE TRUE
    END,
    CASE p_plan
      WHEN 'free' THEN FALSE
      WHEN 'starter' THEN FALSE
      ELSE TRUE
    END,
    CASE p_plan
      WHEN 'free' THEN FALSE
      WHEN 'starter' THEN FALSE
      ELSE TRUE
    END;
END;
$$ LANGUAGE plpgsql;

-- Update tenant plan
CREATE OR REPLACE FUNCTION update_tenant_plan(
  p_tenant_id UUID,
  p_new_plan plan_type
)
RETURNS VOID AS $$
DECLARE
  v_limits RECORD;
BEGIN
  SELECT * INTO v_limits FROM get_plan_limits(p_new_plan);
  
  UPDATE tenants SET
    plan = p_new_plan,
    events_limit = v_limits.events_limit,
    webhooks_limit = v_limits.webhooks_limit,
    api_keys_limit = v_limits.api_keys_limit,
    retention_days = v_limits.retention_days,
    replay_enabled = v_limits.replay_enabled,
    websocket_enabled = v_limits.websocket_enabled,
    raw_events_enabled = v_limits.raw_events_enabled,
    updated_at = NOW()
  WHERE id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Increment event count for tenant
CREATE OR REPLACE FUNCTION increment_tenant_events(
  p_tenant_id UUID,
  p_count INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tenant RECORD;
  v_allowed BOOLEAN;
BEGIN
  -- Get tenant with lock
  SELECT events_this_period, events_limit, billing_period_end
  INTO v_tenant
  FROM tenants
  WHERE id = p_tenant_id
  FOR UPDATE;
  
  -- Check if billing period has ended
  IF v_tenant.billing_period_end < NOW() THEN
    -- Reset counter for new period
    UPDATE tenants SET
      events_this_period = p_count,
      billing_period_start = date_trunc('month', NOW()),
      billing_period_end = date_trunc('month', NOW()) + INTERVAL '1 month',
      updated_at = NOW()
    WHERE id = p_tenant_id;
    
    RETURN TRUE;
  END IF;
  
  -- Check limit (0 = unlimited)
  IF v_tenant.events_limit > 0 AND 
     v_tenant.events_this_period + p_count > v_tenant.events_limit THEN
    RETURN FALSE;
  END IF;
  
  -- Increment counter
  UPDATE tenants SET
    events_this_period = events_this_period + p_count,
    updated_at = NOW()
  WHERE id = p_tenant_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Record daily usage
CREATE OR REPLACE FUNCTION record_daily_usage(
  p_tenant_id UUID,
  p_events INTEGER DEFAULT 0,
  p_deliveries_total INTEGER DEFAULT 0,
  p_deliveries_success INTEGER DEFAULT 0,
  p_deliveries_failed INTEGER DEFAULT 0,
  p_api_requests INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO usage_daily (
    tenant_id, date,
    events_received, deliveries_total, deliveries_successful, 
    deliveries_failed, api_requests
  ) VALUES (
    p_tenant_id, CURRENT_DATE,
    p_events, p_deliveries_total, p_deliveries_success,
    p_deliveries_failed, p_api_requests
  )
  ON CONFLICT (tenant_id, date) DO UPDATE SET
    events_received = usage_daily.events_received + p_events,
    deliveries_total = usage_daily.deliveries_total + p_deliveries_total,
    deliveries_successful = usage_daily.deliveries_successful + p_deliveries_success,
    deliveries_failed = usage_daily.deliveries_failed + p_deliveries_failed,
    api_requests = usage_daily.api_requests + p_api_requests,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Check resource limits
CREATE OR REPLACE FUNCTION check_tenant_limit(
  p_tenant_id UUID,
  p_resource TEXT
)
RETURNS TABLE (
  current_count INTEGER,
  limit_count INTEGER,
  allowed BOOLEAN
) AS $$
DECLARE
  v_current INTEGER;
  v_limit INTEGER;
BEGIN
  -- Get current count and limit based on resource type
  IF p_resource = 'webhooks' THEN
    SELECT COUNT(*)::INTEGER INTO v_current
    FROM webhooks WHERE tenant_id = p_tenant_id AND active = TRUE;
    
    SELECT webhooks_limit INTO v_limit
    FROM tenants WHERE id = p_tenant_id;
    
  ELSIF p_resource = 'api_keys' THEN
    SELECT COUNT(*)::INTEGER INTO v_current
    FROM api_keys WHERE tenant_id = p_tenant_id 
      AND revoked = FALSE 
      AND (expires_at IS NULL OR expires_at > NOW());
    
    SELECT api_keys_limit INTO v_limit
    FROM tenants WHERE id = p_tenant_id;
    
  ELSE
    RAISE EXCEPTION 'Unknown resource type: %', p_resource;
  END IF;
  
  -- 0 = unlimited
  RETURN QUERY SELECT 
    v_current,
    v_limit,
    (v_limit = 0 OR v_current < v_limit);
END;
$$ LANGUAGE plpgsql;

-- Create session
CREATE OR REPLACE FUNCTION create_session(
  p_user_id UUID,
  p_token_hash TEXT,
  p_refresh_token_hash TEXT DEFAULT NULL,
  p_expires_in_seconds INTEGER DEFAULT 86400,
  p_refresh_expires_in_seconds INTEGER DEFAULT 604800,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Get tenant_id from user
  SELECT tenant_id INTO v_tenant_id
  FROM users WHERE id = p_user_id;
  
  -- Create session
  INSERT INTO sessions (
    user_id, tenant_id, token_hash,
    refresh_token_hash, refresh_token_expires_at,
    user_agent, ip_address,
    expires_at
  ) VALUES (
    p_user_id, v_tenant_id, p_token_hash,
    p_refresh_token_hash, 
    CASE WHEN p_refresh_token_hash IS NOT NULL 
         THEN NOW() + (p_refresh_expires_in_seconds || ' seconds')::INTERVAL 
         ELSE NULL END,
    p_user_agent, p_ip_address,
    NOW() + (p_expires_in_seconds || ' seconds')::INTERVAL
  )
  RETURNING id INTO v_session_id;
  
  -- Update user last login
  UPDATE users SET
    last_login_at = NOW(),
    last_login_ip = p_ip_address,
    failed_login_attempts = 0,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- Validate session
CREATE OR REPLACE FUNCTION validate_session(
  p_token_hash TEXT
)
RETURNS TABLE (
  session_id UUID,
  user_id UUID,
  tenant_id UUID,
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  user_role TEXT,
  is_valid BOOLEAN,
  invalid_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    s.tenant_id,
    u.email,
    u.name,
    u.role,
    CASE 
      WHEN s.revoked THEN FALSE
      WHEN s.expires_at < NOW() THEN FALSE
      WHEN NOT u.active THEN FALSE
      WHEN NOT t.active THEN FALSE
      ELSE TRUE
    END,
    CASE 
      WHEN s.revoked THEN 'session_revoked'
      WHEN s.expires_at < NOW() THEN 'session_expired'
      WHEN NOT u.active THEN 'user_inactive'
      WHEN NOT t.active THEN 'tenant_inactive'
      ELSE NULL
    END
  FROM sessions s
  JOIN users u ON u.id = s.user_id
  JOIN tenants t ON t.id = s.tenant_id
  WHERE s.token_hash = p_token_hash;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Views
-- =============================================================================

-- Tenant overview
CREATE OR REPLACE VIEW tenant_overview AS
SELECT 
  t.id,
  t.name,
  t.slug,
  t.plan,
  t.active,
  t.events_this_period,
  t.events_limit,
  CASE 
    WHEN t.events_limit = 0 THEN 0
    ELSE ROUND((t.events_this_period::NUMERIC / t.events_limit) * 100, 2)
  END as events_usage_percent,
  (SELECT COUNT(*) FROM users WHERE tenant_id = t.id AND active = TRUE) as user_count,
  (SELECT COUNT(*) FROM webhooks WHERE tenant_id = t.id AND active = TRUE) as webhook_count,
  (SELECT COUNT(*) FROM api_keys WHERE tenant_id = t.id AND revoked = FALSE) as api_key_count,
  t.created_at
FROM tenants t;

-- User activity
CREATE OR REPLACE VIEW user_activity AS
SELECT 
  u.id,
  u.tenant_id,
  u.email,
  u.name,
  u.role,
  u.last_login_at,
  u.created_at,
  (SELECT COUNT(*) FROM sessions s 
   WHERE s.user_id = u.id 
     AND s.revoked = FALSE 
     AND s.expires_at > NOW()) as active_sessions,
  (SELECT COUNT(*) FROM api_keys ak 
   WHERE ak.created_by_user_id = u.id 
     AND ak.revoked = FALSE) as api_keys_created
FROM users u
WHERE u.active = TRUE;

-- =============================================================================
-- Cleanup Functions
-- =============================================================================

-- Clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS BIGINT AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  WITH deleted AS (
    DELETE FROM sessions
    WHERE expires_at < NOW() - INTERVAL '7 days'
       OR (revoked = TRUE AND revoked_at < NOW() - INTERVAL '1 day')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS BIGINT AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  WITH deleted AS (
    DELETE FROM invitations
    WHERE expires_at < NOW() AND status = 'pending'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Add Foreign Keys to Existing Tables
-- =============================================================================

-- Add tenant_id foreign key to webhooks
DO $$ BEGIN
  ALTER TABLE webhooks
    ADD CONSTRAINT fk_webhooks_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add tenant_id foreign key to api_keys
DO $$ BEGIN
  ALTER TABLE api_keys
    ADD CONSTRAINT fk_api_keys_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add tenant_id foreign key to deliveries
DO $$ BEGIN
  ALTER TABLE deliveries
    ADD CONSTRAINT fk_deliveries_tenant
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE tenants IS 'Multi-tenant accounts with billing and usage tracking';
COMMENT ON TABLE users IS 'User accounts belonging to tenants';
COMMENT ON TABLE sessions IS 'User sessions for dashboard authentication';
COMMENT ON TABLE invitations IS 'Pending invitations to join tenants';
COMMENT ON TABLE billing_events IS 'Billing event history from Stripe';
COMMENT ON TABLE usage_daily IS 'Daily usage aggregates per tenant';

COMMENT ON COLUMN tenants.events_limit IS '0 = unlimited';
COMMENT ON COLUMN tenants.webhooks_limit IS '0 = unlimited';
COMMENT ON COLUMN tenants.api_keys_limit IS '0 = unlimited';

COMMENT ON FUNCTION create_tenant_with_user IS 'Create tenant with initial owner user';
COMMENT ON FUNCTION get_plan_limits IS 'Get resource limits for a plan type';
COMMENT ON FUNCTION increment_tenant_events IS 'Increment event counter with limit check';
COMMENT ON FUNCTION check_tenant_limit IS 'Check if tenant can create more resources';
