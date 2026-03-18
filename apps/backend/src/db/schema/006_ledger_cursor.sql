-- Migration: 006_ledger_cursor.sql
-- Created: 2024-01-01T00:00:00.000Z
-- Description: Enhanced ledger cursor tracking for XRPL listener

-- =============================================================================
-- Drop and Recreate Ledger Cursor Table (enhanced version)
-- =============================================================================

-- Drop the simple version from 001_init.sql
DROP TABLE IF EXISTS ledger_cursor CASCADE;

-- Create enhanced ledger cursor table
CREATE TABLE IF NOT EXISTS ledger_cursor (
  -- Primary key (cursor identifier)
  id TEXT PRIMARY KEY,
  
  -- Network
  network xrpl_network NOT NULL,
  
  -- Current position
  ledger_index BIGINT NOT NULL,
  ledger_hash TEXT,
  ledger_close_time TIMESTAMPTZ,
  
  -- Last processed transaction
  last_tx_hash TEXT,
  last_tx_index INTEGER,
  
  -- Processing stats
  transactions_processed BIGINT NOT NULL DEFAULT 0,
  events_emitted BIGINT NOT NULL DEFAULT 0,
  
  -- Health tracking
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  processing_lag_seconds INTEGER DEFAULT 0,
  
  -- Error tracking
  last_error_at TIMESTAMPTZ,
  last_error_message TEXT,
  consecutive_errors INTEGER NOT NULL DEFAULT 0,
  
  -- Checkpoint (for recovery)
  checkpoint_ledger_index BIGINT,
  checkpoint_at TIMESTAMPTZ,
  
  -- Lock for single-writer
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  lock_expires_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for ledger cursor
CREATE INDEX IF NOT EXISTS idx_ledger_cursor_network ON ledger_cursor(network);
CREATE INDEX IF NOT EXISTS idx_ledger_cursor_heartbeat ON ledger_cursor(last_heartbeat_at);
CREATE INDEX IF NOT EXISTS idx_ledger_cursor_locked ON ledger_cursor(locked_by) 
  WHERE locked_by IS NOT NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_ledger_cursor_updated_at ON ledger_cursor;
CREATE TRIGGER update_ledger_cursor_updated_at
  BEFORE UPDATE ON ledger_cursor
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Ledger Processing Log (for debugging and auditing)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ledger_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Cursor reference
  cursor_id TEXT NOT NULL,
  network xrpl_network NOT NULL,
  
  -- Ledger info
  ledger_index BIGINT NOT NULL,
  ledger_hash TEXT,
  ledger_close_time TIMESTAMPTZ,
  
  -- Processing results
  transactions_count INTEGER NOT NULL DEFAULT 0,
  events_emitted INTEGER NOT NULL DEFAULT 0,
  
  -- Timing
  processing_started_at TIMESTAMPTZ NOT NULL,
  processing_completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'processing',
  error_message TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for processing log
CREATE INDEX IF NOT EXISTS idx_ledger_processing_log_cursor 
  ON ledger_processing_log(cursor_id, ledger_index DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_processing_log_network 
  ON ledger_processing_log(network, ledger_index DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_processing_log_created 
  ON ledger_processing_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_processing_log_status 
  ON ledger_processing_log(status) WHERE status != 'completed';

-- Partition hint: Consider partitioning by month for high-volume systems
-- CREATE TABLE ledger_processing_log_2024_01 PARTITION OF ledger_processing_log
--   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- =============================================================================
-- XRPL Node Health Tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS xrpl_node_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Node info
  node_url TEXT NOT NULL,
  network xrpl_network NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'unknown',
  last_check_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  
  -- Metrics
  latency_ms INTEGER,
  ledger_index BIGINT,
  server_state TEXT,
  
  -- Consecutive failures
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  
  -- Priority (for failover)
  priority INTEGER NOT NULL DEFAULT 100,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_node_url UNIQUE (node_url)
);

-- Indexes for node health
CREATE INDEX IF NOT EXISTS idx_xrpl_node_health_network ON xrpl_node_health(network);
CREATE INDEX IF NOT EXISTS idx_xrpl_node_health_status ON xrpl_node_health(status);
CREATE INDEX IF NOT EXISTS idx_xrpl_node_health_priority ON xrpl_node_health(network, priority ASC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_xrpl_node_health_updated_at ON xrpl_node_health;
CREATE TRIGGER update_xrpl_node_health_updated_at
  BEFORE UPDATE ON xrpl_node_health
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Functions
-- =============================================================================

-- Initialize or get cursor
CREATE OR REPLACE FUNCTION get_or_create_cursor(
  p_cursor_id TEXT,
  p_network xrpl_network,
  p_start_ledger_index BIGINT DEFAULT 0
)
RETURNS ledger_cursor AS $$
DECLARE
  v_cursor ledger_cursor;
BEGIN
  -- Try to get existing cursor
  SELECT * INTO v_cursor
  FROM ledger_cursor
  WHERE id = p_cursor_id;
  
  -- Create if not exists
  IF v_cursor IS NULL THEN
    INSERT INTO ledger_cursor (id, network, ledger_index)
    VALUES (p_cursor_id, p_network, p_start_ledger_index)
    RETURNING * INTO v_cursor;
  END IF;
  
  RETURN v_cursor;
END;
$$ LANGUAGE plpgsql;

-- Acquire cursor lock (distributed locking)
CREATE OR REPLACE FUNCTION acquire_cursor_lock(
  p_cursor_id TEXT,
  p_worker_id TEXT,
  p_lock_duration_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  v_acquired BOOLEAN;
BEGIN
  -- Try to acquire lock
  UPDATE ledger_cursor SET
    locked_by = p_worker_id,
    locked_at = NOW(),
    lock_expires_at = NOW() + (p_lock_duration_seconds || ' seconds')::INTERVAL,
    updated_at = NOW()
  WHERE id = p_cursor_id
    AND (
      locked_by IS NULL 
      OR lock_expires_at < NOW()
      OR locked_by = p_worker_id
    );
  
  GET DIAGNOSTICS v_acquired = ROW_COUNT;
  RETURN v_acquired > 0;
END;
$$ LANGUAGE plpgsql;

-- Release cursor lock
CREATE OR REPLACE FUNCTION release_cursor_lock(
  p_cursor_id TEXT,
  p_worker_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_released BOOLEAN;
BEGIN
  UPDATE ledger_cursor SET
    locked_by = NULL,
    locked_at = NULL,
    lock_expires_at = NULL,
    updated_at = NOW()
  WHERE id = p_cursor_id
    AND locked_by = p_worker_id;
  
  GET DIAGNOSTICS v_released = ROW_COUNT;
  RETURN v_released > 0;
END;
$$ LANGUAGE plpgsql;

-- Renew cursor lock (heartbeat)
CREATE OR REPLACE FUNCTION renew_cursor_lock(
  p_cursor_id TEXT,
  p_worker_id TEXT,
  p_lock_duration_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  v_renewed BOOLEAN;
BEGIN
  UPDATE ledger_cursor SET
    lock_expires_at = NOW() + (p_lock_duration_seconds || ' seconds')::INTERVAL,
    last_heartbeat_at = NOW(),
    updated_at = NOW()
  WHERE id = p_cursor_id
    AND locked_by = p_worker_id;
  
  GET DIAGNOSTICS v_renewed = ROW_COUNT;
  RETURN v_renewed > 0;
END;
$$ LANGUAGE plpgsql;

-- Update cursor position after processing a ledger
CREATE OR REPLACE FUNCTION update_cursor_position(
  p_cursor_id TEXT,
  p_ledger_index BIGINT,
  p_ledger_hash TEXT DEFAULT NULL,
  p_ledger_close_time TIMESTAMPTZ DEFAULT NULL,
  p_last_tx_hash TEXT DEFAULT NULL,
  p_last_tx_index INTEGER DEFAULT NULL,
  p_transactions_processed INTEGER DEFAULT 0,
  p_events_emitted INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  UPDATE ledger_cursor SET
    ledger_index = p_ledger_index,
    ledger_hash = COALESCE(p_ledger_hash, ledger_hash),
    ledger_close_time = COALESCE(p_ledger_close_time, ledger_close_time),
    last_tx_hash = COALESCE(p_last_tx_hash, last_tx_hash),
    last_tx_index = COALESCE(p_last_tx_index, last_tx_index),
    transactions_processed = transactions_processed + p_transactions_processed,
    events_emitted = events_emitted + p_events_emitted,
    last_heartbeat_at = NOW(),
    consecutive_errors = 0,
    updated_at = NOW()
  WHERE id = p_cursor_id;
END;
$$ LANGUAGE plpgsql;

-- Record cursor error
CREATE OR REPLACE FUNCTION record_cursor_error(
  p_cursor_id TEXT,
  p_error_message TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE ledger_cursor SET
    last_error_at = NOW(),
    last_error_message = p_error_message,
    consecutive_errors = consecutive_errors + 1,
    last_heartbeat_at = NOW(),
    updated_at = NOW()
  WHERE id = p_cursor_id;
END;
$$ LANGUAGE plpgsql;

-- Create checkpoint
CREATE OR REPLACE FUNCTION create_cursor_checkpoint(
  p_cursor_id TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE ledger_cursor SET
    checkpoint_ledger_index = ledger_index,
    checkpoint_at = NOW(),
    updated_at = NOW()
  WHERE id = p_cursor_id;
END;
$$ LANGUAGE plpgsql;

-- Restore from checkpoint
CREATE OR REPLACE FUNCTION restore_cursor_checkpoint(
  p_cursor_id TEXT
)
RETURNS BIGINT AS $$
DECLARE
  v_checkpoint_index BIGINT;
BEGIN
  SELECT checkpoint_ledger_index INTO v_checkpoint_index
  FROM ledger_cursor
  WHERE id = p_cursor_id;
  
  IF v_checkpoint_index IS NOT NULL THEN
    UPDATE ledger_cursor SET
      ledger_index = checkpoint_ledger_index,
      ledger_hash = NULL,
      last_tx_hash = NULL,
      last_tx_index = NULL,
      consecutive_errors = 0,
      updated_at = NOW()
    WHERE id = p_cursor_id;
  END IF;
  
  RETURN v_checkpoint_index;
END;
$$ LANGUAGE plpgsql;

-- Log ledger processing
CREATE OR REPLACE FUNCTION log_ledger_processing(
  p_cursor_id TEXT,
  p_network xrpl_network,
  p_ledger_index BIGINT,
  p_ledger_hash TEXT DEFAULT NULL,
  p_ledger_close_time TIMESTAMPTZ DEFAULT NULL,
  p_transactions_count INTEGER DEFAULT 0,
  p_events_emitted INTEGER DEFAULT 0,
  p_started_at TIMESTAMPTZ DEFAULT NOW(),
  p_status TEXT DEFAULT 'completed',
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_duration_ms INTEGER;
BEGIN
  v_duration_ms := EXTRACT(MILLISECONDS FROM (NOW() - p_started_at))::INTEGER;
  
  INSERT INTO ledger_processing_log (
    cursor_id, network, ledger_index, ledger_hash, ledger_close_time,
    transactions_count, events_emitted,
    processing_started_at, processing_completed_at, duration_ms,
    status, error_message
  ) VALUES (
    p_cursor_id, p_network, p_ledger_index, p_ledger_hash, p_ledger_close_time,
    p_transactions_count, p_events_emitted,
    p_started_at, NOW(), v_duration_ms,
    p_status, p_error_message
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Update XRPL node health
CREATE OR REPLACE FUNCTION update_node_health(
  p_node_url TEXT,
  p_network xrpl_network,
  p_status TEXT,
  p_latency_ms INTEGER DEFAULT NULL,
  p_ledger_index BIGINT DEFAULT NULL,
  p_server_state TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO xrpl_node_health (
    node_url, network, status, latency_ms, ledger_index, server_state,
    last_check_at, last_success_at, last_failure_at, consecutive_failures
  ) VALUES (
    p_node_url, p_network, p_status, p_latency_ms, p_ledger_index, p_server_state,
    NOW(),
    CASE WHEN p_status = 'healthy' THEN NOW() ELSE NULL END,
    CASE WHEN p_status != 'healthy' THEN NOW() ELSE NULL END,
    CASE WHEN p_status != 'healthy' THEN 1 ELSE 0 END
  )
  ON CONFLICT (node_url) DO UPDATE SET
    status = p_status,
    latency_ms = COALESCE(p_latency_ms, xrpl_node_health.latency_ms),
    ledger_index = COALESCE(p_ledger_index, xrpl_node_health.ledger_index),
    server_state = COALESCE(p_server_state, xrpl_node_health.server_state),
    last_check_at = NOW(),
    last_success_at = CASE 
      WHEN p_status = 'healthy' THEN NOW() 
      ELSE xrpl_node_health.last_success_at 
    END,
    last_failure_at = CASE 
      WHEN p_status != 'healthy' THEN NOW() 
      ELSE xrpl_node_health.last_failure_at 
    END,
    consecutive_failures = CASE 
      WHEN p_status = 'healthy' THEN 0 
      ELSE xrpl_node_health.consecutive_failures + 1 
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Get best available node
CREATE OR REPLACE FUNCTION get_best_node(
  p_network xrpl_network
)
RETURNS TABLE (
  node_url TEXT,
  latency_ms INTEGER,
  ledger_index BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.node_url,
    n.latency_ms,
    n.ledger_index
  FROM xrpl_node_health n
  WHERE n.network = p_network
    AND n.status = 'healthy'
    AND n.last_success_at > NOW() - INTERVAL '5 minutes'
  ORDER BY 
    n.is_primary DESC,
    n.priority ASC,
    n.latency_ms ASC NULLS LAST
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Calculate processing lag
CREATE OR REPLACE FUNCTION calculate_processing_lag(
  p_cursor_id TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_cursor_time TIMESTAMPTZ;
  v_current_time TIMESTAMPTZ;
  v_lag_seconds INTEGER;
BEGIN
  SELECT ledger_close_time INTO v_cursor_time
  FROM ledger_cursor
  WHERE id = p_cursor_id;
  
  IF v_cursor_time IS NULL THEN
    RETURN 0;
  END IF;
  
  v_current_time := NOW();
  v_lag_seconds := EXTRACT(EPOCH FROM (v_current_time - v_cursor_time))::INTEGER;
  
  -- Update the cursor with lag
  UPDATE ledger_cursor SET
    processing_lag_seconds = v_lag_seconds,
    updated_at = NOW()
  WHERE id = p_cursor_id;
  
  RETURN v_lag_seconds;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Views
-- =============================================================================

-- Cursor status view
CREATE OR REPLACE VIEW cursor_status AS
SELECT 
  c.id,
  c.network,
  c.ledger_index,
  c.ledger_close_time,
  c.transactions_processed,
  c.events_emitted,
  c.processing_lag_seconds,
  c.consecutive_errors,
  c.last_error_message,
  c.locked_by,
  c.lock_expires_at,
  CASE 
    WHEN c.locked_by IS NOT NULL AND c.lock_expires_at > NOW() THEN 'processing'
    WHEN c.consecutive_errors > 10 THEN 'error'
    WHEN c.last_heartbeat_at < NOW() - INTERVAL '5 minutes' THEN 'stale'
    ELSE 'idle'
  END as status,
  c.last_heartbeat_at,
  c.updated_at
FROM ledger_cursor c;

-- Node health summary
CREATE OR REPLACE VIEW node_health_summary AS
SELECT 
  network,
  COUNT(*) as total_nodes,
  COUNT(*) FILTER (WHERE status = 'healthy') as healthy_nodes,
  COUNT(*) FILTER (WHERE status != 'healthy') as unhealthy_nodes,
  MIN(latency_ms) FILTER (WHERE status = 'healthy') as min_latency_ms,
  AVG(latency_ms) FILTER (WHERE status = 'healthy') as avg_latency_ms,
  MAX(ledger_index) as latest_ledger_index
FROM xrpl_node_health
GROUP BY network;

-- Recent processing log
CREATE OR REPLACE VIEW recent_processing AS
SELECT 
  cursor_id,
  network,
  ledger_index,
  transactions_count,
  events_emitted,
  duration_ms,
  status,
  error_message,
  processing_started_at,
  processing_completed_at
FROM ledger_processing_log
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY ledger_index DESC;

-- =============================================================================
-- Default Data
-- =============================================================================

-- Insert default cursors
INSERT INTO ledger_cursor (id, network, ledger_index)
VALUES 
  ('mainnet-primary', 'mainnet', 0),
  ('testnet-primary', 'testnet', 0),
  ('devnet-primary', 'devnet', 0)
ON CONFLICT (id) DO NOTHING;

-- Insert default XRPL nodes
INSERT INTO xrpl_node_health (node_url, network, status, priority, is_primary)
VALUES 
  ('wss://s1.ripple.com', 'mainnet', 'unknown', 1, TRUE),
  ('wss://s2.ripple.com', 'mainnet', 'unknown', 2, FALSE),
  ('wss://xrplcluster.com', 'mainnet', 'unknown', 3, FALSE),
  ('wss://s.altnet.rippletest.net:51233', 'testnet', 'unknown', 1, TRUE),
  ('wss://s.devnet.rippletest.net:51233', 'devnet', 'unknown', 1, TRUE)
ON CONFLICT (node_url) DO NOTHING;

-- =============================================================================
-- Cleanup Functions
-- =============================================================================

-- Clean up old processing logs
CREATE OR REPLACE FUNCTION cleanup_processing_logs(
  retention_days INTEGER DEFAULT 7
)
RETURNS BIGINT AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  WITH deleted AS (
    DELETE FROM ledger_processing_log
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Release expired locks
CREATE OR REPLACE FUNCTION release_expired_locks()
RETURNS INTEGER AS $$
DECLARE
  released_count INTEGER;
BEGIN
  UPDATE ledger_cursor SET
    locked_by = NULL,
    locked_at = NULL,
    lock_expires_at = NULL,
    updated_at = NOW()
  WHERE lock_expires_at < NOW();
  
  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE ledger_cursor IS 'Tracks XRPL ledger processing position per network';
COMMENT ON TABLE ledger_processing_log IS 'Log of processed ledgers for debugging';
COMMENT ON TABLE xrpl_node_health IS 'Health status of XRPL WebSocket nodes';

COMMENT ON COLUMN ledger_cursor.locked_by IS 'Worker ID holding the lock (for distributed processing)';
COMMENT ON COLUMN ledger_cursor.checkpoint_ledger_index IS 'Safe rollback point for recovery';
COMMENT ON COLUMN ledger_cursor.processing_lag_seconds IS 'Seconds behind real-time ledger';

COMMENT ON FUNCTION acquire_cursor_lock IS 'Distributed lock for single-writer processing';
COMMENT ON FUNCTION update_cursor_position IS 'Update cursor after processing a ledger';
COMMENT ON FUNCTION get_best_node IS 'Get healthiest XRPL node for connection';
