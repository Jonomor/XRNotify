-- Migration: events
-- Created at: 2024-01-01T00:00:00.000Z
-- Description: XRPL events storage with normalized payloads

-- =============================================================================
-- Events Table
-- =============================================================================

CREATE TABLE events (
  -- Deterministic ID format: xrpl:<ledger_index>:<tx_hash>:<event_type>[:<sub_index>]
  id VARCHAR(255) PRIMARY KEY,
  
  -- Event classification
  event_type event_type NOT NULL,
  
  -- XRPL context
  ledger_index BIGINT NOT NULL,
  tx_hash VARCHAR(64) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  
  -- Accounts involved (for filtering)
  accounts VARCHAR(50)[] NOT NULL DEFAULT ARRAY[]::VARCHAR[],
  
  -- Normalized payload (event-specific fields)
  payload JSONB NOT NULL,
  
  -- Optional raw transaction (gated by plan)
  raw_tx JSONB,
  
  -- Processing metadata
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Primary lookups
CREATE INDEX idx_events_ledger ON events(ledger_index DESC);
CREATE INDEX idx_events_tx_hash ON events(tx_hash);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);

-- Account filtering (GIN for array containment)
CREATE INDEX idx_events_accounts ON events USING GIN(accounts);

-- Composite for common queries
CREATE INDEX idx_events_type_timestamp ON events(event_type, timestamp DESC);
CREATE INDEX idx_events_ledger_type ON events(ledger_index DESC, event_type);

-- JSONB payload queries (if needed)
CREATE INDEX idx_events_payload ON events USING GIN(payload jsonb_path_ops);

-- =============================================================================
-- Ledger Cursor Table (for resumable processing)
-- =============================================================================

CREATE TABLE ledger_cursor (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'main',
  
  -- Last processed ledger
  ledger_index BIGINT NOT NULL,
  ledger_hash VARCHAR(64),
  
  -- Processing state
  last_processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Statistics
  events_processed BIGINT NOT NULL DEFAULT 0,
  transactions_processed BIGINT NOT NULL DEFAULT 0,
  
  -- Health
  is_healthy BOOLEAN NOT NULL DEFAULT true,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER update_ledger_cursor_updated_at
  BEFORE UPDATE ON ledger_cursor
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Event Queue Table (for reliable delivery)
-- =============================================================================
-- Note: Primary queue is Redis Streams, this is for persistence/replay

CREATE TABLE event_queue (
  id BIGSERIAL PRIMARY KEY,
  
  -- Event reference
  event_id VARCHAR(255) NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  
  -- Queue metadata
  stream_id VARCHAR(100), -- Redis stream ID if queued
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  
  -- Timestamps
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Index for processing
CREATE INDEX idx_event_queue_status ON event_queue(status) WHERE status = 'pending';
CREATE INDEX idx_event_queue_event ON event_queue(event_id);

-- =============================================================================
-- Partitioning Setup (for future scaling)
-- =============================================================================
-- Note: Events table can be partitioned by timestamp for better performance
-- This is a placeholder for when data volume requires it

-- Example partition by month:
-- CREATE TABLE events_2024_01 PARTITION OF events
--   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- =============================================================================
-- Maintenance Functions
-- =============================================================================

-- Function to clean up old events based on retention policy
CREATE OR REPLACE FUNCTION cleanup_old_events(retention_days INTEGER)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM events
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get event statistics
CREATE OR REPLACE FUNCTION get_event_stats(
  start_time TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
  end_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  event_type event_type,
  count BIGINT,
  earliest TIMESTAMPTZ,
  latest TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.event_type,
    COUNT(*)::BIGINT,
    MIN(e.timestamp),
    MAX(e.timestamp)
  FROM events e
  WHERE e.timestamp BETWEEN start_time AND end_time
  GROUP BY e.event_type
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE events IS 'Normalized XRPL events for delivery and replay';
COMMENT ON COLUMN events.id IS 'Deterministic ID: xrpl:<ledger>:<hash>:<type>[:<sub>]';
COMMENT ON COLUMN events.accounts IS 'All XRPL accounts involved, for subscription matching';
COMMENT ON COLUMN events.payload IS 'Normalized, event-type-specific fields';
COMMENT ON COLUMN events.raw_tx IS 'Original transaction, only stored for Pro/Enterprise';

COMMENT ON TABLE ledger_cursor IS 'Tracks last processed ledger for resumable ingestion';
COMMENT ON TABLE event_queue IS 'Persistent queue for reliable delivery, mirrors Redis Streams';

-- DOWN

DROP FUNCTION IF EXISTS get_event_stats(TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS cleanup_old_events(INTEGER);
DROP TABLE IF EXISTS event_queue;
DROP TRIGGER IF EXISTS update_ledger_cursor_updated_at ON ledger_cursor;
DROP TABLE IF EXISTS ledger_cursor;
DROP TABLE IF EXISTS events;
