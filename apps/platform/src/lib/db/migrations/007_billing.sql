-- =============================================================================
-- Migration 007: Billing - Add subscription_status column
-- =============================================================================
-- stripe_customer_id, stripe_subscription_id, and plan already exist
-- from migration 001. Only subscription_status is needed.
-- =============================================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive';

-- Index for subscription status lookups
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status
  ON tenants (subscription_status);

COMMENT ON COLUMN tenants.subscription_status IS 'Stripe subscription status: active, trialing, past_due, canceled, inactive';
