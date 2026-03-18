-- Migration: indexes
-- Created at: 2024-01-01T00:00:00.000Z
-- Description: Additional indexes, views, and performance optimizations

-- =============================================================================
-- Composite Indexes for Common Query Patterns
-- =============================================================================

-- Dashboard: Recent deliveries by tenant with status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deliveries_dashboard 
  ON deliveries(tenant_id, status, created_at DESC);

-- Webhook health: Find unhealthy webhooks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhooks_unhealthy 
  ON webhooks(tenant_id, consecutive_failures DESC) 
  WHERE consecutive_failures > 0;

-- Event search: Type + account + time
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_search 
  ON events(event_type, timestamp DESC);

-- API key lookup optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_keys_lookup 
  ON api_keys(key_hash) 
  WHERE is_active = true;

-- Session cleanup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_cleanup 
  ON sessions(expires_at) 
  WHERE expires_at < NOW();

-- =============================================================================
-- Partial Indexes for Specific Queries
-- =============================================================================

-- Active webhooks only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_webhooks_active_tenant 
  ON webhooks(tenant_id) 
  WHERE is_active = true;

-- Failed deliveries for retry
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deliveries_for_retry 
  ON deliveries(next_retry_at, attempt_count) 
  WHERE status = 'retrying';

-- Dead letter queue items
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deliveries_dlq 
  ON deliveries(tenant_id, created_at DESC) 
  WHERE status = 'dead_letter';

-- Pending deliveries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deliveries_pending_queue 
  ON deliveries(created_at ASC) 
  WHERE status = 'pending';

-- =============================================================================
-- Views for Common Queries
-- =============================================================================

-- Webhook health summary
CREATE OR REPLACE VIEW webhook_health AS
SELECT 
  w.id,
  w.tenant_id,
  w.url,
  w.is_active,
  w.consecutive_failures,
  w.last_success_at,
  w.last_failure_at,
  w.last_failure_reason,
  CASE 
    WHEN w.consecutive_failures = 0 THEN 'healthy'
    WHEN w.consecutive_failures < 3 THEN 'degraded'
    WHEN w.consecutive_failures < 10 THEN 'unhealthy'
    ELSE 'critical'
  END as health_status,
  (SELECT COUNT(*) FROM deliveries d WHERE d.webhook_id = w.id AND d.status = 'delivered') as total_delivered,
  (SELECT COUNT(*) FROM deliveries d WHERE d.webhook_id = w.id AND d.status = 'failed') as total_failed
FROM webhooks w;

-- Tenant overview
CREATE OR REPLACE VIEW tenant_overview AS
SELECT 
  t.id,
  t.name,
  t.plan,
  t.is_active,
  t.webhook_limit,
  t.events_per_month,
  (SELECT COUNT(*) FROM webhooks w WHERE w.tenant_id = t.id AND w.is_active = true) as active_webhooks,
  (SELECT COUNT(*) FROM api_keys ak WHERE ak.tenant_id = t.id AND ak.is_active = true) as active_api_keys,
  (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id AND u.is_active = true) as active_users,
  mu.events_count as current_month_events,
  mu.deliveries_count as current_month_deliveries,
  ROUND(COALESCE(mu.events_count, 0)::NUMERIC / NULLIF(t.events_per_month, 0) * 100, 2) as usage_percentage
FROM tenants t
LEFT JOIN monthly_usage mu ON mu.tenant_id = t.id 
  AND mu.year = EXTRACT(YEAR FROM NOW())
  AND mu.month = EXTRACT(MONTH FROM NOW());

-- Delivery summary by webhook
CREATE OR REPLACE VIEW webhook_delivery_summary AS
SELECT 
  w.id as webhook_id,
  w.tenant_id,
  w.url,
  COUNT(d.id) as total_deliveries,
  COUNT(d.id) FILTER (WHERE d.status = 'delivered') as delivered,
  COUNT(d.id) FILTER (WHERE d.status = 'failed') as failed,
  COUNT(d.id) FILTER (WHERE d.status = 'retrying') as retrying,
  COUNT(d.id) FILTER (WHERE d.status = 'pending') as pending,
  COUNT(d.id) FILTER (WHERE d.status = 'dead_letter') as dead_letter,
  AVG(d.response_time_ms) FILTER (WHERE d.status = 'delivered') as avg_response_time_ms,
  MAX(d.delivered_at) as last_delivered_at,
  MAX(d.created_at) as last_delivery_created_at
FROM webhooks w
LEFT JOIN deliveries d ON d.webhook_id = w.id
GROUP BY w.id, w.tenant_id, w.url;

-- Recent events summary
CREATE OR REPLACE VIEW recent_events_summary AS
SELECT 
  event_type,
  COUNT(*) as count,
  MIN(timestamp) as earliest,
  MAX(timestamp) as latest,
  COUNT(DISTINCT UNNEST(accounts)) as unique_accounts
FROM events
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY count DESC;

-- =============================================================================
-- Materialized Views for Dashboard Performance
-- =============================================================================

-- Hourly delivery stats (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_delivery_stats AS
SELECT 
  tenant_id,
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(response_time_ms) FILTER (WHERE status = 'delivered') as avg_response_ms
FROM deliveries
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY tenant_id, DATE_TRUNC('hour', created_at);

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_hourly_delivery_stats_pk 
  ON hourly_delivery_stats(tenant_id, hour);

-- Event type distribution (refresh periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS event_type_distribution AS
SELECT 
  event_type,
  DATE_TRUNC('day', timestamp) as day,
  COUNT(*) as count
FROM events
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY event_type, DATE_TRUNC('day', timestamp);

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_type_distribution_pk 
  ON event_type_distribution(event_type, day);

-- =============================================================================
-- Functions for Materialized View Refresh
-- =============================================================================

CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY hourly_delivery_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY event_type_distribution;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Database Maintenance Functions
-- =============================================================================

-- Vacuum analyze all tables
CREATE OR REPLACE FUNCTION maintenance_vacuum_analyze()
RETURNS VOID AS $$
BEGIN
  ANALYZE tenants;
  ANALYZE users;
  ANALYZE api_keys;
  ANALYZE sessions;
  ANALYZE webhooks;
  ANALYZE events;
  ANALYZE deliveries;
  ANALYZE delivery_attempts;
  ANALYZE monthly_usage;
  ANALYZE daily_usage;
  ANALYZE audit_logs;
END;
$$ LANGUAGE plpgsql;

-- Get table sizes
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(
  table_name TEXT,
  row_count BIGINT,
  total_size TEXT,
  index_size TEXT,
  toast_size TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.relname::TEXT,
    t.n_live_tup::BIGINT,
    pg_size_pretty(pg_total_relation_size(t.relid))::TEXT,
    pg_size_pretty(pg_indexes_size(t.relid))::TEXT,
    pg_size_pretty(pg_total_relation_size(t.relid) - pg_relation_size(t.relid) - pg_indexes_size(t.relid))::TEXT
  FROM pg_stat_user_tables t
  WHERE t.schemaname = 'public'
  ORDER BY pg_total_relation_size(t.relid) DESC;
END;
$$ LANGUAGE plpgsql;

-- Get index usage stats
CREATE OR REPLACE FUNCTION get_index_usage()
RETURNS TABLE(
  table_name TEXT,
  index_name TEXT,
  index_size TEXT,
  idx_scan BIGINT,
  idx_tup_read BIGINT,
  idx_tup_fetch BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.relname::TEXT,
    i.relname::TEXT,
    pg_size_pretty(pg_relation_size(i.oid))::TEXT,
    s.idx_scan,
    s.idx_tup_read,
    s.idx_tup_fetch
  FROM pg_stat_user_indexes s
  JOIN pg_class t ON s.relid = t.oid
  JOIN pg_class i ON s.indexrelid = i.oid
  WHERE s.schemaname = 'public'
  ORDER BY s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON VIEW webhook_health IS 'Webhook health status with delivery counts';
COMMENT ON VIEW tenant_overview IS 'Tenant dashboard summary data';
COMMENT ON VIEW webhook_delivery_summary IS 'Delivery statistics per webhook';
COMMENT ON MATERIALIZED VIEW hourly_delivery_stats IS 'Cached hourly delivery stats, refresh with refresh_dashboard_stats()';
COMMENT ON MATERIALIZED VIEW event_type_distribution IS 'Cached event type counts by day';

-- DOWN

DROP FUNCTION IF EXISTS get_index_usage();
DROP FUNCTION IF EXISTS get_table_sizes();
DROP FUNCTION IF EXISTS maintenance_vacuum_analyze();
DROP FUNCTION IF EXISTS refresh_dashboard_stats();

DROP MATERIALIZED VIEW IF EXISTS event_type_distribution;
DROP MATERIALIZED VIEW IF EXISTS hourly_delivery_stats;

DROP VIEW IF EXISTS recent_events_summary;
DROP VIEW IF EXISTS webhook_delivery_summary;
DROP VIEW IF EXISTS tenant_overview;
DROP VIEW IF EXISTS webhook_health;

DROP INDEX CONCURRENTLY IF EXISTS idx_deliveries_pending_queue;
DROP INDEX CONCURRENTLY IF EXISTS idx_deliveries_dlq;
DROP INDEX CONCURRENTLY IF EXISTS idx_deliveries_for_retry;
DROP INDEX CONCURRENTLY IF EXISTS idx_webhooks_active_tenant;
DROP INDEX CONCURRENTLY IF EXISTS idx_sessions_cleanup;
DROP INDEX CONCURRENTLY IF EXISTS idx_api_keys_lookup;
DROP INDEX CONCURRENTLY IF EXISTS idx_events_search;
DROP INDEX CONCURRENTLY IF EXISTS idx_webhooks_unhealthy;
DROP INDEX CONCURRENTLY IF EXISTS idx_deliveries_dashboard;
