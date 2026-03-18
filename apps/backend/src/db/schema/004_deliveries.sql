-- Migration: 004_deliveries.sql
-- Created: 2024-01-01T00:00:00.000Z
-- Description: Webhook delivery tracking and dead letter queue

-- =============================================================================
-- Deliveries Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS deliveries (
  -- Primary key (deterministic: webhook_id + event_id)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Idempotency key (unique constraint for deduplication)
  idempotency_key TEXT NOT NULL UNIQUE,
  
  -- References
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  
  -- Event info (denormalized for query performance)
  event_type event_type NOT NULL,
  
  -- Delivery status
  status delivery_status NOT NULL DEFAULT 'pending',
  
  -- Attempt tracking
  attempt INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  
  -- Request details
  request_url TEXT NOT NULL,
  request_headers JSONB,
  request_body_hash TEXT,
  request_body_size INTEGER,
  
  -- Response details (from last attempt)
  response_status INTEGER,
  response_headers JSONB,
  response_body TEXT,
  response_body_truncated BOOLEAN DEFAULT FALSE,
  
  -- Timing
  duration_ms INTEGER,
  
  -- Error information
  error_code TEXT,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for deliveries
CREATE INDEX IF NOT EXISTS idx_deliveries_webhook_id ON deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_event_id ON deliveries(event_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_tenant_id ON deliveries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_event_type ON deliveries(event_type);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON deliveries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_delivered_at ON deliveries(delivered_at DESC NULLS LAST);

-- Index for pending retries (worker query)
CREATE INDEX IF NOT EXISTS idx_deliveries_pending_retry 
  ON deliveries(next_retry_at ASC NULLS LAST)
  WHERE status = 'retrying' AND next_retry_at IS NOT NULL;

-- Index for recent failures (dashboard query)
CREATE INDEX IF NOT EXISTS idx_deliveries_recent_failures
  ON deliveries(webhook_id, failed_at DESC)
  WHERE status = 'failed';

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_deliveries_webhook_status 
  ON deliveries(webhook_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_tenant_status 
  ON deliveries(tenant_id, status, created_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_deliveries_updated_at ON deliveries;
CREATE TRIGGER update_deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Delivery Attempts Table (detailed history per attempt)
-- =============================================================================

CREATE TABLE IF NOT EXISTS delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  
  -- Attempt info
  attempt_number INTEGER NOT NULL,
  
  -- Request (at time of attempt)
  request_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Response
  response_status INTEGER,
  response_headers JSONB,
  response_body TEXT,
  
  -- Timing
  duration_ms INTEGER,
  
  -- Result
  success BOOLEAN NOT NULL,
  error_code TEXT,
  error_message TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_delivery_attempt UNIQUE (delivery_id, attempt_number)
);

-- Indexes for delivery attempts
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_delivery_id ON delivery_attempts(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_created_at ON delivery_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_success ON delivery_attempts(delivery_id, success);

-- =============================================================================
-- Dead Letter Queue Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS delivery_dlq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Original delivery reference
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  tenant_id UUID NOT NULL,
  
  -- Event info
  event_type event_type NOT NULL,
  event_payload JSONB NOT NULL,
  
  -- Failure info
  final_status INTEGER,
  final_error_code TEXT,
  final_error_message TEXT,
  total_attempts INTEGER NOT NULL,
  
  -- DLQ status
  dlq_status TEXT NOT NULL DEFAULT 'pending',
  requeued_at TIMESTAMPTZ,
  requeued_delivery_id UUID,
  discarded_at TIMESTAMPTZ,
  discard_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- Indexes for DLQ
CREATE INDEX IF NOT EXISTS idx_delivery_dlq_webhook_id ON delivery_dlq(webhook_id);
CREATE INDEX IF NOT EXISTS idx_delivery_dlq_tenant_id ON delivery_dlq(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_dlq_status ON delivery_dlq(dlq_status);
CREATE INDEX IF NOT EXISTS idx_delivery_dlq_created_at ON delivery_dlq(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_dlq_expires_at ON delivery_dlq(expires_at);

-- Composite for pending DLQ items
CREATE INDEX IF NOT EXISTS idx_delivery_dlq_pending
  ON delivery_dlq(webhook_id, created_at DESC)
  WHERE dlq_status = 'pending';

-- =============================================================================
-- Replay Jobs Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS replay_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  tenant_id UUID NOT NULL,
  created_by_user_id UUID,
  created_by_api_key_id UUID,
  
  -- Replay configuration
  webhook_ids UUID[],
  event_types event_type[],
  accounts TEXT[],
  from_time TIMESTAMPTZ NOT NULL,
  to_time TIMESTAMPTZ NOT NULL,
  event_ids TEXT[],
  max_events INTEGER NOT NULL DEFAULT 10000,
  dry_run BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'queued',
  
  -- Progress
  events_total INTEGER NOT NULL DEFAULT 0,
  events_processed INTEGER NOT NULL DEFAULT 0,
  deliveries_queued INTEGER NOT NULL DEFAULT 0,
  deliveries_sent INTEGER NOT NULL DEFAULT 0,
  deliveries_failed INTEGER NOT NULL DEFAULT 0,
  
  -- Error
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Indexes for replay jobs
CREATE INDEX IF NOT EXISTS idx_replay_jobs_tenant_id ON replay_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_replay_jobs_status ON replay_jobs(status);
CREATE INDEX IF NOT EXISTS idx_replay_jobs_created_at ON replay_jobs(created_at DESC);

-- =============================================================================
-- Functions
-- =============================================================================

-- Create a new delivery record
CREATE OR REPLACE FUNCTION create_delivery(
  p_webhook_id UUID,
  p_event_id TEXT,
  p_tenant_id UUID,
  p_event_type event_type,
  p_request_url TEXT,
  p_max_attempts INTEGER DEFAULT 5
)
RETURNS UUID AS $$
DECLARE
  v_delivery_id UUID;
  v_idempotency_key TEXT;
BEGIN
  v_idempotency_key := p_webhook_id::TEXT || ':' || p_event_id;
  
  INSERT INTO deliveries (
    webhook_id, event_id, tenant_id, event_type,
    request_url, max_attempts, idempotency_key,
    status, attempt
  ) VALUES (
    p_webhook_id, p_event_id, p_tenant_id, p_event_type,
    p_request_url, p_max_attempts, v_idempotency_key,
    'pending', 0
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_delivery_id;
  
  RETURN v_delivery_id;
END;
$$ LANGUAGE plpgsql;

-- Record a delivery attempt
CREATE OR REPLACE FUNCTION record_delivery_attempt(
  p_delivery_id UUID,
  p_attempt_number INTEGER,
  p_success BOOLEAN,
  p_response_status INTEGER DEFAULT NULL,
  p_response_headers JSONB DEFAULT NULL,
  p_response_body TEXT DEFAULT NULL,
  p_duration_ms INTEGER DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_max_attempts INTEGER;
  v_new_status delivery_status;
  v_next_retry TIMESTAMPTZ;
BEGIN
  -- Get max attempts
  SELECT max_attempts INTO v_max_attempts
  FROM deliveries WHERE id = p_delivery_id;
  
  -- Determine new status
  IF p_success THEN
    v_new_status := 'delivered';
    v_next_retry := NULL;
  ELSIF p_attempt_number >= v_max_attempts THEN
    v_new_status := 'failed';
    v_next_retry := NULL;
  ELSE
    v_new_status := 'retrying';
    -- Exponential backoff with jitter: base * 2^attempt + random(0-25%)
    v_next_retry := NOW() + (
      (1000 * power(2, p_attempt_number)) * (0.75 + random() * 0.5) || ' milliseconds'
    )::INTERVAL;
    -- Cap at 5 minutes
    IF v_next_retry > NOW() + INTERVAL '5 minutes' THEN
      v_next_retry := NOW() + INTERVAL '5 minutes';
    END IF;
  END IF;
  
  -- Insert attempt record
  INSERT INTO delivery_attempts (
    delivery_id, attempt_number, success,
    response_status, response_headers, response_body,
    duration_ms, error_code, error_message
  ) VALUES (
    p_delivery_id, p_attempt_number, p_success,
    p_response_status, p_response_headers, 
    LEFT(p_response_body, 10000), -- Truncate long responses
    p_duration_ms, p_error_code, p_error_message
  );
  
  -- Update delivery record
  UPDATE deliveries SET
    status = v_new_status,
    attempt = p_attempt_number,
    next_retry_at = v_next_retry,
    response_status = p_response_status,
    response_headers = p_response_headers,
    response_body = LEFT(p_response_body, 1000),
    response_body_truncated = (LENGTH(p_response_body) > 1000),
    duration_ms = p_duration_ms,
    error_code = p_error_code,
    error_message = p_error_message,
    delivered_at = CASE WHEN p_success THEN NOW() ELSE delivered_at END,
    failed_at = CASE WHEN NOT p_success AND p_attempt_number >= v_max_attempts THEN NOW() ELSE failed_at END,
    updated_at = NOW()
  WHERE id = p_delivery_id;
  
  -- Update webhook statistics
  PERFORM update_webhook_stats(
    (SELECT webhook_id FROM deliveries WHERE id = p_delivery_id),
    p_success,
    p_duration_ms,
    p_error_code
  );
END;
$$ LANGUAGE plpgsql;

-- Move failed delivery to DLQ
CREATE OR REPLACE FUNCTION move_to_dlq(
  p_delivery_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_dlq_id UUID;
  v_delivery RECORD;
  v_event_payload JSONB;
BEGIN
  -- Get delivery info
  SELECT d.*, e.payload as event_payload
  INTO v_delivery
  FROM deliveries d
  JOIN events e ON e.id = d.event_id
  WHERE d.id = p_delivery_id;
  
  IF v_delivery IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Insert into DLQ
  INSERT INTO delivery_dlq (
    delivery_id, webhook_id, event_id, tenant_id,
    event_type, event_payload,
    final_status, final_error_code, final_error_message,
    total_attempts
  ) VALUES (
    v_delivery.id, v_delivery.webhook_id, v_delivery.event_id, v_delivery.tenant_id,
    v_delivery.event_type, v_delivery.event_payload,
    v_delivery.response_status, v_delivery.error_code, v_delivery.error_message,
    v_delivery.attempt
  )
  RETURNING id INTO v_dlq_id;
  
  RETURN v_dlq_id;
END;
$$ LANGUAGE plpgsql;

-- Requeue from DLQ
CREATE OR REPLACE FUNCTION requeue_from_dlq(
  p_dlq_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_dlq RECORD;
  v_new_delivery_id UUID;
BEGIN
  -- Get DLQ entry
  SELECT * INTO v_dlq
  FROM delivery_dlq
  WHERE id = p_dlq_id AND dlq_status = 'pending';
  
  IF v_dlq IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Create new delivery
  INSERT INTO deliveries (
    webhook_id, event_id, tenant_id, event_type,
    request_url, max_attempts, idempotency_key,
    status, attempt
  )
  SELECT 
    v_dlq.webhook_id, v_dlq.event_id, v_dlq.tenant_id, v_dlq.event_type,
    w.url, w.retry_max_attempts, 
    v_dlq.webhook_id::TEXT || ':' || v_dlq.event_id || ':requeue:' || gen_random_uuid()::TEXT,
    'pending', 0
  FROM webhooks w
  WHERE w.id = v_dlq.webhook_id
  RETURNING id INTO v_new_delivery_id;
  
  -- Update DLQ entry
  UPDATE delivery_dlq SET
    dlq_status = 'requeued',
    requeued_at = NOW(),
    requeued_delivery_id = v_new_delivery_id
  WHERE id = p_dlq_id;
  
  RETURN v_new_delivery_id;
END;
$$ LANGUAGE plpgsql;

-- Get pending retries for worker
CREATE OR REPLACE FUNCTION get_pending_retries(
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  delivery_id UUID,
  webhook_id UUID,
  event_id TEXT,
  attempt INTEGER,
  request_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.webhook_id,
    d.event_id,
    d.attempt,
    d.request_url
  FROM deliveries d
  WHERE d.status = 'retrying'
    AND d.next_retry_at <= NOW()
  ORDER BY d.next_retry_at ASC
  LIMIT p_limit
  FOR UPDATE SKIP LOCKED;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Views
-- =============================================================================

-- Recent deliveries view
CREATE OR REPLACE VIEW recent_deliveries AS
SELECT 
  d.id,
  d.webhook_id,
  d.event_id,
  d.tenant_id,
  d.event_type,
  d.status,
  d.attempt,
  d.max_attempts,
  d.response_status,
  d.duration_ms,
  d.error_code,
  d.error_message,
  d.created_at,
  d.delivered_at,
  d.failed_at,
  w.url as webhook_url
FROM deliveries d
JOIN webhooks w ON w.id = d.webhook_id
ORDER BY d.created_at DESC;

-- Delivery statistics per webhook
CREATE OR REPLACE VIEW delivery_stats_per_webhook AS
SELECT 
  webhook_id,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'retrying') as retrying,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'delivered')::NUMERIC / 
    NULLIF(COUNT(*) FILTER (WHERE status IN ('delivered', 'failed')), 0) * 100,
    2
  ) as success_rate,
  AVG(duration_ms) FILTER (WHERE duration_ms IS NOT NULL) as avg_latency_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) 
    FILTER (WHERE duration_ms IS NOT NULL) as p50_latency_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) 
    FILTER (WHERE duration_ms IS NOT NULL) as p95_latency_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) 
    FILTER (WHERE duration_ms IS NOT NULL) as p99_latency_ms,
  MAX(created_at) as last_delivery_at
FROM deliveries
GROUP BY webhook_id;

-- DLQ summary
CREATE OR REPLACE VIEW dlq_summary AS
SELECT 
  tenant_id,
  webhook_id,
  COUNT(*) FILTER (WHERE dlq_status = 'pending') as pending,
  COUNT(*) FILTER (WHERE dlq_status = 'requeued') as requeued,
  COUNT(*) FILTER (WHERE dlq_status = 'discarded') as discarded,
  COUNT(*) as total,
  MIN(created_at) FILTER (WHERE dlq_status = 'pending') as oldest_pending,
  MAX(created_at) as newest
FROM delivery_dlq
GROUP BY tenant_id, webhook_id;

-- =============================================================================
-- Cleanup Functions
-- =============================================================================

-- Clean up old deliveries
CREATE OR REPLACE FUNCTION cleanup_old_deliveries(
  retention_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  deliveries_deleted BIGINT,
  attempts_deleted BIGINT
) AS $$
DECLARE
  v_deliveries BIGINT;
  v_attempts BIGINT;
BEGIN
  -- Delete old attempts (cascades from deliveries)
  WITH deleted_deliveries AS (
    DELETE FROM deliveries
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
      AND status IN ('delivered', 'failed')
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deliveries FROM deleted_deliveries;
  
  -- Count attempts deleted (via cascade)
  -- This is approximate since we can't count cascaded deletes
  v_attempts := 0;
  
  RETURN QUERY SELECT v_deliveries, v_attempts;
END;
$$ LANGUAGE plpgsql;

-- Clean up expired DLQ entries
CREATE OR REPLACE FUNCTION cleanup_expired_dlq()
RETURNS BIGINT AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  WITH deleted AS (
    DELETE FROM delivery_dlq
    WHERE expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE deliveries IS 'Webhook delivery records with status tracking';
COMMENT ON TABLE delivery_attempts IS 'Detailed history of each delivery attempt';
COMMENT ON TABLE delivery_dlq IS 'Dead letter queue for failed deliveries';
COMMENT ON TABLE replay_jobs IS 'Event replay job tracking';

COMMENT ON COLUMN deliveries.idempotency_key IS 'Unique key (webhook_id:event_id) to prevent duplicate deliveries';
COMMENT ON COLUMN deliveries.next_retry_at IS 'When to retry (NULL if not retrying)';
COMMENT ON COLUMN deliveries.response_body IS 'Truncated response body (first 1000 chars)';

COMMENT ON COLUMN delivery_dlq.dlq_status IS 'pending, requeued, or discarded';
COMMENT ON COLUMN delivery_dlq.expires_at IS 'Auto-cleanup after this time';

COMMENT ON FUNCTION create_delivery IS 'Create delivery with idempotency check';
COMMENT ON FUNCTION record_delivery_attempt IS 'Record attempt and update delivery status';
COMMENT ON FUNCTION move_to_dlq IS 'Move failed delivery to dead letter queue';
COMMENT ON FUNCTION requeue_from_dlq IS 'Requeue a DLQ entry for retry';
COMMENT ON FUNCTION get_pending_retries IS 'Get deliveries ready for retry (with row locking)';
