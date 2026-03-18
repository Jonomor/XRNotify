-- Migration: webhooks
-- Created at: 2024-01-01T00:00:00.000Z
-- Description: Webhook subscriptions table

-- =============================================================================
-- Event Type Enum
-- =============================================================================

CREATE TYPE event_type AS ENUM (
  -- Payments
  'payment.xrp',
  'payment.issued',
  
  -- Trust Lines
  'trustline.created',
  'trustline.modified',
  'trustline.deleted',
  
  -- NFTs
  'nft.minted',
  'nft.burned',
  'nft.offer_created',
  'nft.offer_accepted',
  'nft.offer_cancelled',
  'nft.transfer',
  
  -- DEX
  'dex.offer_created',
  'dex.offer_cancelled',
  'dex.offer_filled',
  'dex.offer_partial',
  
  -- Account
  'account.created',
  'account.deleted',
  'account.settings_changed',
  
  -- Escrow
  'escrow.created',
  'escrow.finished',
  'escrow.cancelled',
  
  -- Checks
  'check.created',
  'check.cashed',
  'check.cancelled'
);

-- =============================================================================
-- Webhooks Table
-- =============================================================================

CREATE TABLE webhooks (
  id VARCHAR(36) PRIMARY KEY DEFAULT 'wh_' || replace(uuid_generate_v4()::text, '-', ''),
  tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Endpoint configuration
  url TEXT NOT NULL,
  description VARCHAR(500),
  
  -- Secret for HMAC signing (encrypted at rest)
  secret_encrypted TEXT NOT NULL,
  
  -- Event filtering
  event_types event_type[] NOT NULL DEFAULT ARRAY[]::event_type[],
  
  -- Account filtering (empty = all accounts)
  account_filters VARCHAR(50)[] NOT NULL DEFAULT ARRAY[]::VARCHAR[],
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Health tracking
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_success_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  last_failure_reason TEXT,
  
  -- Rate limiting (per-webhook)
  rate_limit_per_second INTEGER DEFAULT 100,
  
  -- Custom retry policy (if enabled for tenant)
  custom_retry_enabled BOOLEAN NOT NULL DEFAULT false,
  max_retries INTEGER NOT NULL DEFAULT 10,
  retry_backoff_base INTEGER NOT NULL DEFAULT 1, -- seconds
  retry_backoff_max INTEGER NOT NULL DEFAULT 3600, -- 1 hour max
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Lookup by tenant
CREATE INDEX idx_webhooks_tenant ON webhooks(tenant_id);

-- Active webhooks for matching
CREATE INDEX idx_webhooks_active ON webhooks(is_active) WHERE is_active = true;

-- Event type filtering (GIN for array containment)
CREATE INDEX idx_webhooks_event_types ON webhooks USING GIN(event_types);

-- Account filtering (GIN for array containment)
CREATE INDEX idx_webhooks_accounts ON webhooks USING GIN(account_filters);

-- Health monitoring
CREATE INDEX idx_webhooks_failures ON webhooks(consecutive_failures) 
  WHERE consecutive_failures > 0;

-- Combined index for webhook matching query
CREATE INDEX idx_webhooks_matching ON webhooks(tenant_id, is_active) 
  WHERE is_active = true;

-- =============================================================================
-- Constraints
-- =============================================================================

-- Ensure URL is not empty
ALTER TABLE webhooks ADD CONSTRAINT webhooks_url_not_empty 
  CHECK (length(trim(url)) > 0);

-- Ensure max_retries is reasonable
ALTER TABLE webhooks ADD CONSTRAINT webhooks_max_retries_range 
  CHECK (max_retries >= 1 AND max_retries <= 20);

-- Ensure retry backoff base is positive
ALTER TABLE webhooks ADD CONSTRAINT webhooks_retry_backoff_positive 
  CHECK (retry_backoff_base >= 1);

-- Ensure retry backoff max is greater than base
ALTER TABLE webhooks ADD CONSTRAINT webhooks_retry_backoff_order 
  CHECK (retry_backoff_max >= retry_backoff_base);

-- =============================================================================
-- Trigger for updated_at
-- =============================================================================

CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Function to check if a webhook matches an event
CREATE OR REPLACE FUNCTION webhook_matches_event(
  webhook_event_types event_type[],
  webhook_account_filters VARCHAR[],
  event_type_param event_type,
  event_accounts VARCHAR[]
) RETURNS BOOLEAN AS $$
BEGIN
  -- Check event type match (empty array = match all)
  IF array_length(webhook_event_types, 1) > 0 THEN
    IF NOT (event_type_param = ANY(webhook_event_types)) THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Check account match (empty array = match all)
  IF array_length(webhook_account_filters, 1) > 0 THEN
    IF NOT (webhook_account_filters && event_accounts) THEN
      RETURN false;
    END IF;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to find matching webhooks for an event
CREATE OR REPLACE FUNCTION find_matching_webhooks(
  event_type_param event_type,
  event_accounts VARCHAR[]
) RETURNS TABLE(webhook_id VARCHAR(36), tenant_id VARCHAR(36)) AS $$
BEGIN
  RETURN QUERY
  SELECT w.id, w.tenant_id
  FROM webhooks w
  WHERE w.is_active = true
    AND webhook_matches_event(
      w.event_types,
      w.account_filters,
      event_type_param,
      event_accounts
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE webhooks IS 'Webhook subscription configurations';
COMMENT ON COLUMN webhooks.secret_encrypted IS 'HMAC secret for signing payloads, encrypted with app key';
COMMENT ON COLUMN webhooks.event_types IS 'Filter: empty array matches all event types';
COMMENT ON COLUMN webhooks.account_filters IS 'Filter: empty array matches all accounts';
COMMENT ON COLUMN webhooks.consecutive_failures IS 'Counter for circuit breaker pattern';

-- DOWN

DROP FUNCTION IF EXISTS find_matching_webhooks(event_type, VARCHAR[]);
DROP FUNCTION IF EXISTS webhook_matches_event(event_type[], VARCHAR[], event_type, VARCHAR[]);
DROP TRIGGER IF EXISTS update_webhooks_updated_at ON webhooks;
DROP TABLE IF EXISTS webhooks;
DROP TYPE IF EXISTS event_type;
