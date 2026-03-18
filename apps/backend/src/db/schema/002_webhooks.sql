-- Migration: 002_webhooks.sql
-- Created: 2024-01-01T00:00:00.000Z
-- Description: Webhook configuration and management tables

-- =============================================================================
-- Webhooks Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS webhooks (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  tenant_id UUID NOT NULL,
  
  -- Configuration
  url TEXT NOT NULL,
  description TEXT,
  
  -- Event subscription (array of event_type)
  events event_type[] NOT NULL DEFAULT '{}',
  
  -- Filters (optional)
  filter_accounts TEXT[] DEFAULT NULL,
  filter_network xrpl_network DEFAULT NULL,
  filter_min_xrp_amount NUMERIC(20, 6) DEFAULT NULL,
  filter_expression TEXT DEFAULT NULL,
  
  -- Security
  secret_hash TEXT NOT NULL,
  secret_prefix TEXT NOT NULL,
  secret_rotated_at TIMESTAMPTZ,
  previous_secret_hash TEXT,
  previous_secret_valid_until TIMESTAMPTZ,
  
  -- Status
  active BOOLEAN NOT NULL DEFAULT TRUE,
  disabled_reason TEXT,
  disabled_at TIMESTAMPTZ,
  
  -- Delivery configuration
  retry_max_attempts INTEGER NOT NULL DEFAULT 5,
  timeout_ms INTEGER NOT NULL DEFAULT 10000,
  
  -- Statistics (denormalized for performance)
  total_deliveries BIGINT NOT NULL DEFAULT 0,
  successful_deliveries BIGINT NOT NULL DEFAULT 0,
  failed_deliveries BIGINT NOT NULL DEFAULT 0,
  last_delivery_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_failure_reason TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for webhooks
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant_id ON webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_webhooks_events ON webhooks USING GIN(events);
CREATE INDEX IF NOT EXISTS idx_webhooks_filter_accounts ON webhooks USING GIN(filter_accounts) 
  WHERE filter_accounts IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhooks_filter_network ON webhooks(filter_network) 
  WHERE filter_network IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhooks_created_at ON webhooks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhooks_last_delivery ON webhooks(last_delivery_at DESC NULLS LAST);

-- Composite index for active webhook lookup
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant_active 
  ON webhooks(tenant_id, active) 
  WHERE active = TRUE;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_webhooks_updated_at ON webhooks;
CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Webhook Event Subscriptions (Normalized lookup table)
-- =============================================================================

-- This table provides fast lookup of webhooks by event type
-- It's maintained alongside the webhooks.events array for query performance

CREATE TABLE IF NOT EXISTS webhook_event_subscriptions (
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type event_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (webhook_id, event_type)
);

-- Index for finding webhooks by event type
CREATE INDEX IF NOT EXISTS idx_webhook_event_subs_event_type 
  ON webhook_event_subscriptions(event_type);

-- =============================================================================
-- Webhook Statistics History (hourly aggregates)
-- =============================================================================

CREATE TABLE IF NOT EXISTS webhook_stats_hourly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  
  -- Time bucket (truncated to hour)
  hour TIMESTAMPTZ NOT NULL,
  
  -- Counts
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  successful_deliveries INTEGER NOT NULL DEFAULT 0,
  failed_deliveries INTEGER NOT NULL DEFAULT 0,
  retried_deliveries INTEGER NOT NULL DEFAULT 0,
  
  -- Latency statistics (in milliseconds)
  latency_min INTEGER,
  latency_max INTEGER,
  latency_avg INTEGER,
  latency_p50 INTEGER,
  latency_p95 INTEGER,
  latency_p99 INTEGER,
  
  -- Error breakdown
  errors_timeout INTEGER NOT NULL DEFAULT 0,
  errors_connection INTEGER NOT NULL DEFAULT 0,
  errors_http_4xx INTEGER NOT NULL DEFAULT 0,
  errors_http_5xx INTEGER NOT NULL DEFAULT 0,
  errors_other INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_webhook_hour UNIQUE (webhook_id, hour)
);

-- Index for querying stats
CREATE INDEX IF NOT EXISTS idx_webhook_stats_webhook_hour 
  ON webhook_stats_hourly(webhook_id, hour DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_stats_hour 
  ON webhook_stats_hourly(hour DESC);

-- =============================================================================
-- Functions for Webhook Management
-- =============================================================================

-- Sync webhook_event_subscriptions from webhooks.events array
CREATE OR REPLACE FUNCTION sync_webhook_subscriptions()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete existing subscriptions
  DELETE FROM webhook_event_subscriptions WHERE webhook_id = NEW.id;
  
  -- Insert new subscriptions
  INSERT INTO webhook_event_subscriptions (webhook_id, event_type)
  SELECT NEW.id, unnest(NEW.events);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync subscriptions on insert/update
DROP TRIGGER IF EXISTS sync_webhook_subscriptions_trigger ON webhooks;
CREATE TRIGGER sync_webhook_subscriptions_trigger
  AFTER INSERT OR UPDATE OF events ON webhooks
  FOR EACH ROW
  EXECUTE FUNCTION sync_webhook_subscriptions();

-- Find webhooks matching an event
CREATE OR REPLACE FUNCTION find_matching_webhooks(
  p_event_type event_type,
  p_accounts TEXT[],
  p_network xrpl_network,
  p_xrp_amount NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  webhook_id UUID,
  url TEXT,
  secret_hash TEXT,
  tenant_id UUID,
  retry_max_attempts INTEGER,
  timeout_ms INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.url,
    w.secret_hash,
    w.tenant_id,
    w.retry_max_attempts,
    w.timeout_ms
  FROM webhooks w
  INNER JOIN webhook_event_subscriptions wes ON wes.webhook_id = w.id
  WHERE 
    w.active = TRUE
    AND wes.event_type = p_event_type
    -- Network filter (NULL means all networks)
    AND (w.filter_network IS NULL OR w.filter_network = p_network)
    -- Account filter (NULL means all accounts, otherwise check overlap)
    AND (w.filter_accounts IS NULL OR w.filter_accounts && p_accounts)
    -- Min XRP amount filter
    AND (
      w.filter_min_xrp_amount IS NULL 
      OR p_xrp_amount IS NULL 
      OR p_xrp_amount >= w.filter_min_xrp_amount
    )
    -- Not disabled due to consecutive failures
    AND w.consecutive_failures < 100;
END;
$$ LANGUAGE plpgsql;

-- Update webhook delivery statistics
CREATE OR REPLACE FUNCTION update_webhook_stats(
  p_webhook_id UUID,
  p_success BOOLEAN,
  p_latency_ms INTEGER,
  p_error_type TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE webhooks
  SET
    total_deliveries = total_deliveries + 1,
    successful_deliveries = successful_deliveries + CASE WHEN p_success THEN 1 ELSE 0 END,
    failed_deliveries = failed_deliveries + CASE WHEN NOT p_success THEN 1 ELSE 0 END,
    last_delivery_at = NOW(),
    last_success_at = CASE WHEN p_success THEN NOW() ELSE last_success_at END,
    last_failure_at = CASE WHEN NOT p_success THEN NOW() ELSE last_failure_at END,
    last_failure_reason = CASE WHEN NOT p_success THEN p_error_type ELSE last_failure_reason END,
    consecutive_failures = CASE 
      WHEN p_success THEN 0 
      ELSE consecutive_failures + 1 
    END,
    -- Auto-disable after 100 consecutive failures
    active = CASE 
      WHEN NOT p_success AND consecutive_failures >= 99 THEN FALSE 
      ELSE active 
    END,
    disabled_reason = CASE 
      WHEN NOT p_success AND consecutive_failures >= 99 THEN 'auto_disabled_consecutive_failures' 
      ELSE disabled_reason 
    END,
    disabled_at = CASE 
      WHEN NOT p_success AND consecutive_failures >= 99 THEN NOW() 
      ELSE disabled_at 
    END,
    updated_at = NOW()
  WHERE id = p_webhook_id;
END;
$$ LANGUAGE plpgsql;

-- Aggregate hourly statistics
CREATE OR REPLACE FUNCTION aggregate_webhook_stats_hourly(
  p_webhook_id UUID,
  p_hour TIMESTAMPTZ,
  p_success BOOLEAN,
  p_latency_ms INTEGER,
  p_error_type TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_hour TIMESTAMPTZ := date_trunc('hour', p_hour);
BEGIN
  INSERT INTO webhook_stats_hourly (
    webhook_id, hour,
    total_deliveries, successful_deliveries, failed_deliveries,
    latency_min, latency_max, latency_avg,
    errors_timeout, errors_connection, errors_http_4xx, errors_http_5xx, errors_other
  ) VALUES (
    p_webhook_id, v_hour,
    1,
    CASE WHEN p_success THEN 1 ELSE 0 END,
    CASE WHEN NOT p_success THEN 1 ELSE 0 END,
    p_latency_ms, p_latency_ms, p_latency_ms,
    CASE WHEN p_error_type = 'timeout' THEN 1 ELSE 0 END,
    CASE WHEN p_error_type = 'connection' THEN 1 ELSE 0 END,
    CASE WHEN p_error_type = 'http_4xx' THEN 1 ELSE 0 END,
    CASE WHEN p_error_type = 'http_5xx' THEN 1 ELSE 0 END,
    CASE WHEN p_error_type IS NOT NULL AND p_error_type NOT IN ('timeout', 'connection', 'http_4xx', 'http_5xx') THEN 1 ELSE 0 END
  )
  ON CONFLICT (webhook_id, hour) DO UPDATE SET
    total_deliveries = webhook_stats_hourly.total_deliveries + 1,
    successful_deliveries = webhook_stats_hourly.successful_deliveries + CASE WHEN p_success THEN 1 ELSE 0 END,
    failed_deliveries = webhook_stats_hourly.failed_deliveries + CASE WHEN NOT p_success THEN 1 ELSE 0 END,
    latency_min = LEAST(webhook_stats_hourly.latency_min, p_latency_ms),
    latency_max = GREATEST(webhook_stats_hourly.latency_max, p_latency_ms),
    latency_avg = (webhook_stats_hourly.latency_avg * webhook_stats_hourly.total_deliveries + p_latency_ms) / (webhook_stats_hourly.total_deliveries + 1),
    errors_timeout = webhook_stats_hourly.errors_timeout + CASE WHEN p_error_type = 'timeout' THEN 1 ELSE 0 END,
    errors_connection = webhook_stats_hourly.errors_connection + CASE WHEN p_error_type = 'connection' THEN 1 ELSE 0 END,
    errors_http_4xx = webhook_stats_hourly.errors_http_4xx + CASE WHEN p_error_type = 'http_4xx' THEN 1 ELSE 0 END,
    errors_http_5xx = webhook_stats_hourly.errors_http_5xx + CASE WHEN p_error_type = 'http_5xx' THEN 1 ELSE 0 END,
    errors_other = webhook_stats_hourly.errors_other + CASE WHEN p_error_type IS NOT NULL AND p_error_type NOT IN ('timeout', 'connection', 'http_4xx', 'http_5xx') THEN 1 ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Views
-- =============================================================================

-- Active webhooks with subscription counts
CREATE OR REPLACE VIEW active_webhooks_summary AS
SELECT 
  w.id,
  w.tenant_id,
  w.url,
  w.description,
  w.active,
  array_length(w.events, 1) as event_count,
  w.total_deliveries,
  w.successful_deliveries,
  w.failed_deliveries,
  CASE 
    WHEN w.total_deliveries > 0 
    THEN ROUND((w.successful_deliveries::NUMERIC / w.total_deliveries) * 100, 2)
    ELSE 100
  END as success_rate,
  w.consecutive_failures,
  w.last_delivery_at,
  w.last_success_at,
  w.last_failure_at,
  w.created_at
FROM webhooks w
WHERE w.active = TRUE;

-- Webhook health summary (for monitoring)
CREATE OR REPLACE VIEW webhook_health AS
SELECT 
  w.id,
  w.tenant_id,
  w.url,
  CASE 
    WHEN w.consecutive_failures >= 50 THEN 'critical'
    WHEN w.consecutive_failures >= 10 THEN 'warning'
    WHEN w.consecutive_failures >= 1 THEN 'degraded'
    ELSE 'healthy'
  END as health_status,
  w.consecutive_failures,
  w.last_success_at,
  w.last_failure_at,
  w.last_failure_reason,
  CASE 
    WHEN w.total_deliveries > 0 
    THEN ROUND((w.successful_deliveries::NUMERIC / w.total_deliveries) * 100, 2)
    ELSE 100
  END as success_rate_all_time,
  w.active,
  w.disabled_reason
FROM webhooks w;

-- =============================================================================
-- Cleanup Function
-- =============================================================================

-- Clean up old webhook statistics
CREATE OR REPLACE FUNCTION cleanup_webhook_stats(
  retention_days INTEGER DEFAULT 30
)
RETURNS BIGINT AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  WITH deleted AS (
    DELETE FROM webhook_stats_hourly
    WHERE hour < NOW() - (retention_days || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE webhooks IS 'Webhook endpoint configurations';
COMMENT ON TABLE webhook_event_subscriptions IS 'Normalized webhook-to-event-type mapping for fast lookups';
COMMENT ON TABLE webhook_stats_hourly IS 'Hourly aggregated delivery statistics per webhook';

COMMENT ON COLUMN webhooks.secret_hash IS 'SHA-256 hash of the webhook signing secret';
COMMENT ON COLUMN webhooks.secret_prefix IS 'First 8 characters of the secret for identification';
COMMENT ON COLUMN webhooks.previous_secret_hash IS 'Previous secret hash during rotation grace period';
COMMENT ON COLUMN webhooks.consecutive_failures IS 'Count of consecutive failed deliveries (resets on success)';
COMMENT ON COLUMN webhooks.filter_accounts IS 'Only trigger for events involving these XRPL accounts';
COMMENT ON COLUMN webhooks.filter_expression IS 'Custom filter expression (future feature)';

COMMENT ON FUNCTION find_matching_webhooks IS 'Find all active webhooks matching an event';
COMMENT ON FUNCTION update_webhook_stats IS 'Update webhook delivery statistics after a delivery attempt';
COMMENT ON FUNCTION aggregate_webhook_stats_hourly IS 'Aggregate delivery stats into hourly buckets';
