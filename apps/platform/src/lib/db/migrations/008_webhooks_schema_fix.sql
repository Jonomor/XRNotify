-- =============================================================================
-- Migration 008: Fix webhooks table column mismatches
-- =============================================================================
-- The webhooks service references columns that don't match the schema in 002:
--   secret_encrypted → secret (service stores/reads as "secret")
--   secret_prefix    → missing (stores first chars of secret for UI display)
--   last_delivery_at → missing (tracks last delivery attempt timestamp)
-- =============================================================================

-- Rename secret_encrypted → secret to match what the service layer expects
ALTER TABLE webhooks RENAME COLUMN secret_encrypted TO secret;

-- Add secret_prefix: first ~20 chars of the secret shown in the dashboard
-- so users can identify which secret is in use without revealing the full value
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS secret_prefix VARCHAR(20);

-- Add last_delivery_at: timestamp of most recent delivery attempt
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS last_delivery_at TIMESTAMPTZ;

-- Index for dashboard queries that order by last delivery
CREATE INDEX IF NOT EXISTS idx_webhooks_last_delivery
  ON webhooks (last_delivery_at DESC NULLS LAST);

-- DOWN

-- ALTER TABLE webhooks RENAME COLUMN secret TO secret_encrypted;
-- ALTER TABLE webhooks DROP COLUMN IF EXISTS secret_prefix;
-- ALTER TABLE webhooks DROP COLUMN IF EXISTS last_delivery_at;
-- DROP INDEX IF EXISTS idx_webhooks_last_delivery;
