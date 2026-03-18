-- Migration: usage
-- Created at: 2024-01-01T00:00:00.000Z
-- Description: Usage tracking, billing events, and audit logs

-- =============================================================================
-- Monthly Usage Table
-- =============================================================================

CREATE TABLE monthly_usage (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Period
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  
  -- Usage counters
  events_count BIGINT NOT NULL DEFAULT 0,
  deliveries_count BIGINT NOT NULL DEFAULT 0,
  deliveries_success BIGINT NOT NULL DEFAULT 0,
  deliveries_failed BIGINT NOT NULL DEFAULT 0,
  
  -- API usage
  api_requests BIGINT NOT NULL DEFAULT 0,
  
  -- Webhook stats
  webhooks_active INTEGER NOT NULL DEFAULT 0,
  
  -- Bandwidth (bytes)
  bandwidth_in BIGINT NOT NULL DEFAULT 0,
  bandwidth_out BIGINT NOT NULL DEFAULT 0,
  
  -- Billing
  overage_events BIGINT NOT NULL DEFAULT 0,
  overage_billed BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint
  CONSTRAINT monthly_usage_tenant_period UNIQUE (tenant_id, year, month)
);

-- Indexes
CREATE INDEX idx_monthly_usage_tenant ON monthly_usage(tenant_id);
CREATE INDEX idx_monthly_usage_period ON monthly_usage(year, month);

-- Trigger
CREATE TRIGGER update_monthly_usage_updated_at
  BEFORE UPDATE ON monthly_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Daily Usage Table (for granular analytics)
-- =============================================================================

CREATE TABLE daily_usage (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Date
  date DATE NOT NULL,
  
  -- Counters
  events_count BIGINT NOT NULL DEFAULT 0,
  deliveries_count BIGINT NOT NULL DEFAULT 0,
  deliveries_success BIGINT NOT NULL DEFAULT 0,
  deliveries_failed BIGINT NOT NULL DEFAULT 0,
  api_requests BIGINT NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint
  CONSTRAINT daily_usage_tenant_date UNIQUE (tenant_id, date)
);

-- Indexes
CREATE INDEX idx_daily_usage_tenant ON daily_usage(tenant_id);
CREATE INDEX idx_daily_usage_date ON daily_usage(date);
CREATE INDEX idx_daily_usage_tenant_date ON daily_usage(tenant_id, date DESC);

-- Trigger
CREATE TRIGGER update_daily_usage_updated_at
  BEFORE UPDATE ON daily_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Billing Events Table
-- =============================================================================

CREATE TABLE billing_events (
  id VARCHAR(36) PRIMARY KEY DEFAULT 'bil_' || replace(uuid_generate_v4()::text, '-', ''),
  tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Stripe references
  stripe_event_id VARCHAR(255) UNIQUE,
  stripe_invoice_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  
  -- Event details
  event_type VARCHAR(100) NOT NULL,
  amount_cents INTEGER,
  currency VARCHAR(3) DEFAULT 'usd',
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Idempotency
  idempotency_key VARCHAR(255) UNIQUE,
  
  -- Timestamps
  event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_billing_events_tenant ON billing_events(tenant_id);
CREATE INDEX idx_billing_events_stripe ON billing_events(stripe_event_id);
CREATE INDEX idx_billing_events_type ON billing_events(event_type);
CREATE INDEX idx_billing_events_status ON billing_events(status);

-- =============================================================================
-- Audit Log Table
-- =============================================================================

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(36) REFERENCES tenants(id) ON DELETE SET NULL,
  user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Action details
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255),
  
  -- Context
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Changes (for update operations)
  old_values JSONB,
  new_values JSONB,
  
  -- Request context
  request_id VARCHAR(36),
  api_key_id VARCHAR(36),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);

-- Partition by time for audit logs (placeholder for future)
-- Can be partitioned monthly for high-volume deployments

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Increment usage counters atomically
CREATE OR REPLACE FUNCTION increment_usage(
  p_tenant_id VARCHAR(36),
  p_events INTEGER DEFAULT 0,
  p_deliveries INTEGER DEFAULT 0,
  p_deliveries_success INTEGER DEFAULT 0,
  p_deliveries_failed INTEGER DEFAULT 0,
  p_api_requests INTEGER DEFAULT 0
) RETURNS VOID AS $$
DECLARE
  v_year INTEGER := EXTRACT(YEAR FROM NOW());
  v_month INTEGER := EXTRACT(MONTH FROM NOW());
  v_date DATE := CURRENT_DATE;
BEGIN
  -- Update or insert monthly usage
  INSERT INTO monthly_usage (
    tenant_id, year, month,
    events_count, deliveries_count, deliveries_success, deliveries_failed, api_requests
  ) VALUES (
    p_tenant_id, v_year, v_month,
    p_events, p_deliveries, p_deliveries_success, p_deliveries_failed, p_api_requests
  )
  ON CONFLICT (tenant_id, year, month) DO UPDATE SET
    events_count = monthly_usage.events_count + EXCLUDED.events_count,
    deliveries_count = monthly_usage.deliveries_count + EXCLUDED.deliveries_count,
    deliveries_success = monthly_usage.deliveries_success + EXCLUDED.deliveries_success,
    deliveries_failed = monthly_usage.deliveries_failed + EXCLUDED.deliveries_failed,
    api_requests = monthly_usage.api_requests + EXCLUDED.api_requests,
    updated_at = NOW();
  
  -- Update or insert daily usage
  INSERT INTO daily_usage (
    tenant_id, date,
    events_count, deliveries_count, deliveries_success, deliveries_failed, api_requests
  ) VALUES (
    p_tenant_id, v_date,
    p_events, p_deliveries, p_deliveries_success, p_deliveries_failed, p_api_requests
  )
  ON CONFLICT (tenant_id, date) DO UPDATE SET
    events_count = daily_usage.events_count + EXCLUDED.events_count,
    deliveries_count = daily_usage.deliveries_count + EXCLUDED.deliveries_count,
    deliveries_success = daily_usage.deliveries_success + EXCLUDED.deliveries_success,
    deliveries_failed = daily_usage.deliveries_failed + EXCLUDED.deliveries_failed,
    api_requests = daily_usage.api_requests + EXCLUDED.api_requests,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Get current month usage for a tenant
CREATE OR REPLACE FUNCTION get_current_usage(p_tenant_id VARCHAR(36))
RETURNS TABLE(
  events_count BIGINT,
  deliveries_count BIGINT,
  deliveries_success BIGINT,
  deliveries_failed BIGINT,
  api_requests BIGINT,
  events_limit BIGINT,
  events_remaining BIGINT,
  usage_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(mu.events_count, 0)::BIGINT,
    COALESCE(mu.deliveries_count, 0)::BIGINT,
    COALESCE(mu.deliveries_success, 0)::BIGINT,
    COALESCE(mu.deliveries_failed, 0)::BIGINT,
    COALESCE(mu.api_requests, 0)::BIGINT,
    t.events_per_month::BIGINT as events_limit,
    GREATEST(0, t.events_per_month - COALESCE(mu.events_count, 0))::BIGINT as events_remaining,
    ROUND(COALESCE(mu.events_count, 0)::NUMERIC / NULLIF(t.events_per_month, 0) * 100, 2) as usage_percentage
  FROM tenants t
  LEFT JOIN monthly_usage mu ON mu.tenant_id = t.id 
    AND mu.year = EXTRACT(YEAR FROM NOW())
    AND mu.month = EXTRACT(MONTH FROM NOW())
  WHERE t.id = p_tenant_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Record audit log entry
CREATE OR REPLACE FUNCTION record_audit_log(
  p_tenant_id VARCHAR(36),
  p_user_id VARCHAR(36),
  p_action VARCHAR(100),
  p_resource_type VARCHAR(50),
  p_resource_id VARCHAR(255) DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address VARCHAR(45) DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_request_id VARCHAR(36) DEFAULT NULL,
  p_api_key_id VARCHAR(36) DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO audit_logs (
    tenant_id, user_id, action, resource_type, resource_id,
    old_values, new_values, ip_address, user_agent, request_id, api_key_id
  ) VALUES (
    p_tenant_id, p_user_id, p_action, p_resource_type, p_resource_id,
    p_old_values, p_new_values, p_ip_address, p_user_agent, p_request_id, p_api_key_id
  ) RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM audit_logs
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE monthly_usage IS 'Aggregated monthly usage for billing';
COMMENT ON TABLE daily_usage IS 'Daily usage breakdown for analytics';
COMMENT ON TABLE billing_events IS 'Stripe webhook events and billing actions';
COMMENT ON TABLE audit_logs IS 'Security and compliance audit trail';

-- DOWN

DROP FUNCTION IF EXISTS cleanup_old_audit_logs(INTEGER);
DROP FUNCTION IF EXISTS record_audit_log(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, JSONB, JSONB, VARCHAR, TEXT, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS get_current_usage(VARCHAR);
DROP FUNCTION IF EXISTS increment_usage(VARCHAR, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER);

DROP TRIGGER IF EXISTS update_daily_usage_updated_at ON daily_usage;
DROP TRIGGER IF EXISTS update_monthly_usage_updated_at ON monthly_usage;

DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS billing_events;
DROP TABLE IF EXISTS daily_usage;
DROP TABLE IF EXISTS monthly_usage;
