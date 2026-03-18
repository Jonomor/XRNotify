-- Migration: 003_api_keys.sql
-- Created: 2024-01-01T00:00:00.000Z
-- Description: API keys for authentication and authorization

-- =============================================================================
-- API Keys Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ownership
  tenant_id UUID NOT NULL,
  created_by_user_id UUID,
  
  -- Identification
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Key storage (never store plaintext!)
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix VARCHAR(16) NOT NULL,
  
  -- Permissions
  scopes api_key_scope[] NOT NULL DEFAULT ARRAY[
    'webhooks:read'::api_key_scope,
    'webhooks:write'::api_key_scope,
    'deliveries:read'::api_key_scope,
    'deliveries:replay'::api_key_scope,
    'api_keys:read'::api_key_scope
  ],
  
  -- Expiration
  expires_at TIMESTAMPTZ,
  
  -- Revocation
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  revoked_by_user_id UUID,
  revoke_reason TEXT,
  
  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  last_used_ip INET,
  use_count BIGINT NOT NULL DEFAULT 0,
  
  -- Rate limiting (per-key limits, NULL = use defaults)
  rate_limit_max INTEGER,
  rate_limit_window_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for API keys
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(tenant_id) 
  WHERE revoked = FALSE AND (expires_at IS NULL OR expires_at > NOW());
CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used ON api_keys(last_used_at DESC NULLS LAST);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- API Key Usage Log (for audit and rate limiting)
-- =============================================================================

CREATE TABLE IF NOT EXISTS api_key_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Key reference
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  
  -- Request info
  endpoint TEXT NOT NULL,
  method VARCHAR(10) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  request_id TEXT,
  
  -- Response info
  status_code INTEGER,
  duration_ms INTEGER,
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for usage log
CREATE INDEX IF NOT EXISTS idx_api_key_usage_key_id ON api_key_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_tenant_id ON api_key_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_created_at ON api_key_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_endpoint ON api_key_usage(endpoint, created_at DESC);

-- Partition by time for efficient cleanup (optional, can be added later)
-- Note: Requires PostgreSQL 11+ for native partitioning

-- =============================================================================
-- Functions
-- =============================================================================

-- Validate API key and return key info
CREATE OR REPLACE FUNCTION validate_api_key(
  p_key_hash TEXT
)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  name VARCHAR(255),
  scopes api_key_scope[],
  rate_limit_max INTEGER,
  rate_limit_window_ms INTEGER,
  is_valid BOOLEAN,
  invalid_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ak.id,
    ak.tenant_id,
    ak.name,
    ak.scopes,
    ak.rate_limit_max,
    ak.rate_limit_window_ms,
    CASE 
      WHEN ak.revoked THEN FALSE
      WHEN ak.expires_at IS NOT NULL AND ak.expires_at < NOW() THEN FALSE
      ELSE TRUE
    END as is_valid,
    CASE 
      WHEN ak.revoked THEN 'revoked'
      WHEN ak.expires_at IS NOT NULL AND ak.expires_at < NOW() THEN 'expired'
      ELSE NULL
    END as invalid_reason
  FROM api_keys ak
  WHERE ak.key_hash = p_key_hash;
END;
$$ LANGUAGE plpgsql;

-- Update API key usage
CREATE OR REPLACE FUNCTION record_api_key_usage(
  p_api_key_id UUID,
  p_ip INET DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE api_keys
  SET 
    last_used_at = NOW(),
    last_used_ip = COALESCE(p_ip, last_used_ip),
    use_count = use_count + 1,
    updated_at = NOW()
  WHERE id = p_api_key_id;
END;
$$ LANGUAGE plpgsql;

-- Check if API key has required scope
CREATE OR REPLACE FUNCTION api_key_has_scope(
  p_api_key_id UUID,
  p_required_scope api_key_scope
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_scope BOOLEAN;
BEGIN
  SELECT p_required_scope = ANY(scopes)
  INTO v_has_scope
  FROM api_keys
  WHERE id = p_api_key_id
    AND revoked = FALSE
    AND (expires_at IS NULL OR expires_at > NOW());
    
  RETURN COALESCE(v_has_scope, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Check if API key has any of the required scopes
CREATE OR REPLACE FUNCTION api_key_has_any_scope(
  p_api_key_id UUID,
  p_required_scopes api_key_scope[]
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_scope BOOLEAN;
BEGIN
  SELECT scopes && p_required_scopes
  INTO v_has_scope
  FROM api_keys
  WHERE id = p_api_key_id
    AND revoked = FALSE
    AND (expires_at IS NULL OR expires_at > NOW());
    
  RETURN COALESCE(v_has_scope, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Revoke an API key
CREATE OR REPLACE FUNCTION revoke_api_key(
  p_api_key_id UUID,
  p_revoked_by UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE api_keys
  SET 
    revoked = TRUE,
    revoked_at = NOW(),
    revoked_by_user_id = p_revoked_by,
    revoke_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_api_key_id
    AND revoked = FALSE;
    
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql;

-- Count active API keys for a tenant
CREATE OR REPLACE FUNCTION count_active_api_keys(
  p_tenant_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM api_keys
  WHERE tenant_id = p_tenant_id
    AND revoked = FALSE
    AND (expires_at IS NULL OR expires_at > NOW());
    
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Views
-- =============================================================================

-- Active API keys view
CREATE OR REPLACE VIEW active_api_keys AS
SELECT 
  id,
  tenant_id,
  name,
  description,
  key_prefix,
  scopes,
  expires_at,
  last_used_at,
  use_count,
  created_at
FROM api_keys
WHERE revoked = FALSE
  AND (expires_at IS NULL OR expires_at > NOW());

-- API key summary per tenant
CREATE OR REPLACE VIEW api_keys_per_tenant AS
SELECT 
  tenant_id,
  COUNT(*) FILTER (WHERE revoked = FALSE AND (expires_at IS NULL OR expires_at > NOW())) as active_count,
  COUNT(*) FILTER (WHERE revoked = TRUE) as revoked_count,
  COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at < NOW() AND revoked = FALSE) as expired_count,
  COUNT(*) as total_count,
  MAX(last_used_at) as last_used_at,
  SUM(use_count) as total_usage
FROM api_keys
GROUP BY tenant_id;

-- Recent API key activity
CREATE OR REPLACE VIEW recent_api_key_activity AS
SELECT 
  ak.id,
  ak.tenant_id,
  ak.name,
  ak.key_prefix,
  u.endpoint,
  u.method,
  u.status_code,
  u.ip_address,
  u.created_at as used_at
FROM api_key_usage u
JOIN api_keys ak ON ak.id = u.api_key_id
WHERE u.created_at > NOW() - INTERVAL '24 hours'
ORDER BY u.created_at DESC;

-- =============================================================================
-- Rate Limiting Support
-- =============================================================================

-- Get request count for rate limiting (sliding window)
CREATE OR REPLACE FUNCTION get_api_key_request_count(
  p_api_key_id UUID,
  p_window_ms INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_ms || ' milliseconds')::INTERVAL;
  
  SELECT COUNT(*)::INTEGER
  INTO v_count
  FROM api_key_usage
  WHERE api_key_id = p_api_key_id
    AND created_at >= v_window_start;
    
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Cleanup Functions
-- =============================================================================

-- Clean up old API key usage logs
CREATE OR REPLACE FUNCTION cleanup_api_key_usage(
  retention_days INTEGER DEFAULT 7
)
RETURNS BIGINT AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  WITH deleted AS (
    DELETE FROM api_key_usage
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Clean up expired and long-revoked API keys
CREATE OR REPLACE FUNCTION cleanup_old_api_keys(
  expired_retention_days INTEGER DEFAULT 90,
  revoked_retention_days INTEGER DEFAULT 30
)
RETURNS BIGINT AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  WITH deleted AS (
    DELETE FROM api_keys
    WHERE 
      -- Delete keys expired more than X days ago
      (expires_at IS NOT NULL AND expires_at < NOW() - (expired_retention_days || ' days')::INTERVAL)
      OR
      -- Delete keys revoked more than X days ago
      (revoked = TRUE AND revoked_at < NOW() - (revoked_retention_days || ' days')::INTERVAL)
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Audit Trigger
-- =============================================================================

-- Log API key changes to audit log
CREATE OR REPLACE FUNCTION audit_api_key_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      action, resource_type, resource_id, tenant_id, user_id,
      new_values
    ) VALUES (
      'api_key.created', 'api_key', NEW.id::TEXT, NEW.tenant_id, NEW.created_by_user_id,
      jsonb_build_object(
        'name', NEW.name,
        'scopes', NEW.scopes,
        'expires_at', NEW.expires_at
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log significant changes
    IF OLD.revoked != NEW.revoked THEN
      INSERT INTO audit_logs (
        action, resource_type, resource_id, tenant_id, user_id,
        old_values, new_values
      ) VALUES (
        'api_key.revoked', 'api_key', NEW.id::TEXT, NEW.tenant_id, NEW.revoked_by_user_id,
        jsonb_build_object('revoked', OLD.revoked),
        jsonb_build_object('revoked', NEW.revoked, 'reason', NEW.revoke_reason)
      );
    ELSIF OLD.scopes != NEW.scopes THEN
      INSERT INTO audit_logs (
        action, resource_type, resource_id, tenant_id,
        old_values, new_values
      ) VALUES (
        'api_key.scopes_changed', 'api_key', NEW.id::TEXT, NEW.tenant_id,
        jsonb_build_object('scopes', OLD.scopes),
        jsonb_build_object('scopes', NEW.scopes)
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      action, resource_type, resource_id, tenant_id,
      old_values
    ) VALUES (
      'api_key.deleted', 'api_key', OLD.id::TEXT, OLD.tenant_id,
      jsonb_build_object('name', OLD.name, 'key_prefix', OLD.key_prefix)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for audit logging
DROP TRIGGER IF EXISTS audit_api_key_changes_trigger ON api_keys;
CREATE TRIGGER audit_api_key_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION audit_api_key_changes();

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE api_keys IS 'API keys for authenticating API requests';
COMMENT ON TABLE api_key_usage IS 'Log of API key usage for auditing and rate limiting';

COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the API key (never store plaintext)';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 12 characters of the key for identification (e.g., xrn_a1b2c3d4)';
COMMENT ON COLUMN api_keys.scopes IS 'Array of permission scopes granted to this key';
COMMENT ON COLUMN api_keys.use_count IS 'Total number of API requests made with this key';
COMMENT ON COLUMN api_keys.rate_limit_max IS 'Custom rate limit (NULL = use default)';
COMMENT ON COLUMN api_keys.rate_limit_window_ms IS 'Custom rate limit window (NULL = use default)';

COMMENT ON FUNCTION validate_api_key IS 'Validate an API key hash and return key details';
COMMENT ON FUNCTION record_api_key_usage IS 'Update last_used_at and increment use_count';
COMMENT ON FUNCTION api_key_has_scope IS 'Check if an API key has a specific scope';
COMMENT ON FUNCTION revoke_api_key IS 'Revoke an API key with optional reason';
