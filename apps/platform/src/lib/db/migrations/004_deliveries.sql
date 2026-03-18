-- Migration: deliveries
-- Created at: 2024-01-01T00:00:00.000Z
-- Description: Webhook delivery tracking with attempts and retry logic

-- =============================================================================
-- Delivery Status Enum
-- =============================================================================

CREATE TYPE delivery_status AS ENUM (
  'pending',      -- Queued, not yet attempted
  'delivering',   -- Currently being delivered
  'delivered',    -- Successfully delivered (2xx response)
  'retrying',     -- Failed, scheduled for retry
  'failed',       -- All retries exhausted
  'dead_letter',  -- Moved to DLQ for manual review
  'cancelled'     -- Cancelled (webhook deleted, etc.)
);

-- =============================================================================
-- Deliveries Table
-- =============================================================================

CREATE TABLE deliveries (
  id VARCHAR(36) PRIMARY KEY DEFAULT 'del_' || replace(uuid_generate_v4()::text, '-', ''),
  
  -- References
  tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  webhook_id VARCHAR(36) NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_id VARCHAR(255) NOT NULL,
  
  -- Event snapshot (denormalized for delivery)
  event_type event_type NOT NULL,
  payload JSONB NOT NULL,
  
  -- Delivery target (snapshot in case webhook URL changes)
  url TEXT NOT NULL,
  
  -- Status
  status delivery_status NOT NULL DEFAULT 'pending',
  
  -- Retry tracking
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 10,
  next_retry_at TIMESTAMPTZ,
  
  -- Error tracking
  error_code VARCHAR(50),
  error_message TEXT,
  
  -- Success tracking
  delivered_at TIMESTAMPTZ,
  response_status INTEGER,
  response_time_ms INTEGER,
  
  -- Idempotency (webhook_id + event_id should be unique for effect)
  idempotency_key VARCHAR(255) GENERATED ALWAYS AS (webhook_id || ':' || event_id) STORED,
  
  -- Queue tracking
  queue_stream_id VARCHAR(100),
  dlq_stream_id VARCHAR(100),
  replay_stream_id VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Delivery Attempts Table
-- =============================================================================

CREATE TABLE delivery_attempts (
  id BIGSERIAL PRIMARY KEY,
  delivery_id VARCHAR(36) NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  
  -- Attempt metadata
  attempt_number INTEGER NOT NULL,
  
  -- Request details
  request_headers JSONB,
  request_body_hash VARCHAR(64), -- SHA256 of payload for verification
  
  -- Response details
  status_code INTEGER,
  response_headers JSONB,
  response_body TEXT, -- Truncated to 10KB
  
  -- Timing
  duration_ms INTEGER NOT NULL,
  
  -- Error details (if failed)
  error_type VARCHAR(50), -- timeout, connection_refused, dns_error, etc.
  error_message TEXT,
  
  -- Timestamps
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Deliveries indexes
CREATE INDEX idx_deliveries_tenant ON deliveries(tenant_id);
CREATE INDEX idx_deliveries_webhook ON deliveries(webhook_id);
CREATE INDEX idx_deliveries_event ON deliveries(event_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_type ON deliveries(event_type);

-- Retry scheduling
CREATE INDEX idx_deliveries_retry ON deliveries(next_retry_at) 
  WHERE status = 'retrying' AND next_retry_at IS NOT NULL;

-- Pending deliveries
CREATE INDEX idx_deliveries_pending ON deliveries(created_at) 
  WHERE status = 'pending';

-- Recent deliveries for dashboard
CREATE INDEX idx_deliveries_recent ON deliveries(tenant_id, created_at DESC);

-- Idempotency check
CREATE UNIQUE INDEX idx_deliveries_idempotency ON deliveries(idempotency_key);

-- Composite for common queries
CREATE INDEX idx_deliveries_tenant_status ON deliveries(tenant_id, status);
CREATE INDEX idx_deliveries_webhook_status ON deliveries(webhook_id, status);
CREATE INDEX idx_deliveries_tenant_created ON deliveries(tenant_id, created_at DESC);

-- Delivery attempts indexes
CREATE INDEX idx_delivery_attempts_delivery ON delivery_attempts(delivery_id);
CREATE INDEX idx_delivery_attempts_time ON delivery_attempts(attempted_at DESC);

-- =============================================================================
-- Trigger for updated_at
-- =============================================================================

CREATE TRIGGER update_deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Calculate next retry time with exponential backoff + jitter
CREATE OR REPLACE FUNCTION calculate_retry_time(
  attempt_count INTEGER,
  base_delay INTEGER DEFAULT 1,
  max_delay INTEGER DEFAULT 3600
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  delay_seconds INTEGER;
  jitter_seconds INTEGER;
BEGIN
  -- Exponential backoff: base * 2^attempt
  delay_seconds := LEAST(base_delay * POWER(2, attempt_count), max_delay);
  
  -- Add jitter (0-25% of delay)
  jitter_seconds := FLOOR(RANDOM() * delay_seconds * 0.25);
  
  RETURN NOW() + ((delay_seconds + jitter_seconds) || ' seconds')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Get delivery statistics for a tenant
CREATE OR REPLACE FUNCTION get_delivery_stats(
  p_tenant_id VARCHAR(36),
  p_start_time TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
  p_end_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  total BIGINT,
  delivered BIGINT,
  failed BIGINT,
  pending BIGINT,
  retrying BIGINT,
  dead_letter BIGINT,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total,
    COUNT(*) FILTER (WHERE d.status = 'delivered')::BIGINT as delivered,
    COUNT(*) FILTER (WHERE d.status = 'failed')::BIGINT as failed,
    COUNT(*) FILTER (WHERE d.status = 'pending')::BIGINT as pending,
    COUNT(*) FILTER (WHERE d.status = 'retrying')::BIGINT as retrying,
    COUNT(*) FILTER (WHERE d.status = 'dead_letter')::BIGINT as dead_letter,
    CASE 
      WHEN COUNT(*) FILTER (WHERE d.status IN ('delivered', 'failed')) = 0 THEN 0
      ELSE ROUND(
        COUNT(*) FILTER (WHERE d.status = 'delivered')::NUMERIC / 
        NULLIF(COUNT(*) FILTER (WHERE d.status IN ('delivered', 'failed')), 0) * 100,
        2
      )
    END as success_rate
  FROM deliveries d
  WHERE d.tenant_id = p_tenant_id
    AND d.created_at BETWEEN p_start_time AND p_end_time;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get pending retries ready for processing
CREATE OR REPLACE FUNCTION get_pending_retries(
  batch_size INTEGER DEFAULT 100
)
RETURNS TABLE(
  delivery_id VARCHAR(36),
  webhook_id VARCHAR(36),
  tenant_id VARCHAR(36),
  url TEXT,
  payload JSONB,
  attempt_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.webhook_id,
    d.tenant_id,
    d.url,
    d.payload,
    d.attempt_count
  FROM deliveries d
  WHERE d.status = 'retrying'
    AND d.next_retry_at <= NOW()
  ORDER BY d.next_retry_at ASC
  LIMIT batch_size
  FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql;

-- Clean up old deliveries based on retention
CREATE OR REPLACE FUNCTION cleanup_old_deliveries(
  retention_days INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- First delete attempts for old deliveries
  DELETE FROM delivery_attempts
  WHERE delivery_id IN (
    SELECT id FROM deliveries
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
  );
  
  -- Then delete deliveries
  WITH deleted AS (
    DELETE FROM deliveries
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

COMMENT ON TABLE deliveries IS 'Webhook delivery tracking with retry support';
COMMENT ON COLUMN deliveries.idempotency_key IS 'Ensures each event is delivered at most once per webhook';
COMMENT ON COLUMN deliveries.payload IS 'Snapshot of event payload at delivery time';
COMMENT ON COLUMN deliveries.url IS 'Snapshot of webhook URL at delivery time';

COMMENT ON TABLE delivery_attempts IS 'Individual delivery attempt history';
COMMENT ON COLUMN delivery_attempts.response_body IS 'Truncated to 10KB for storage efficiency';

-- DOWN

DROP FUNCTION IF EXISTS cleanup_old_deliveries(INTEGER);
DROP FUNCTION IF EXISTS get_pending_retries(INTEGER);
DROP FUNCTION IF EXISTS get_delivery_stats(VARCHAR, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS calculate_retry_time(INTEGER, INTEGER, INTEGER);
DROP TRIGGER IF EXISTS update_deliveries_updated_at ON deliveries;
DROP TABLE IF EXISTS delivery_attempts;
DROP TABLE IF EXISTS deliveries;
DROP TYPE IF EXISTS delivery_status;
