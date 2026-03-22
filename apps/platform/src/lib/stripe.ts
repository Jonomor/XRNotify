// =============================================================================
// XRNotify Platform - Stripe Client
// =============================================================================
// Stripe SDK initialization, price constants, and plan limits
// =============================================================================

import Stripe from 'stripe';

// -----------------------------------------------------------------------------
// Stripe Client
// -----------------------------------------------------------------------------

const stripeKey = process.env['STRIPE_SECRET_KEY'] ?? '';

export const stripe = new Stripe(stripeKey || 'sk_test_placeholder', {
  apiVersion: '2024-06-20',
  typescript: true,
});

// -----------------------------------------------------------------------------
// Plan Types
// -----------------------------------------------------------------------------

export type PlanType = 'free' | 'starter' | 'pro' | 'enterprise';

// -----------------------------------------------------------------------------
// Stripe Price IDs
// -----------------------------------------------------------------------------

export const STRIPE_PRICES: Record<Exclude<PlanType, 'free'>, string> = {
  starter: process.env['STRIPE_PRICE_STARTER'] ?? '',
  pro: process.env['STRIPE_PRICE_PRO'] ?? '',
  enterprise: process.env['STRIPE_PRICE_ENTERPRISE'] ?? '',
};

// -----------------------------------------------------------------------------
// Plan Limits
// -----------------------------------------------------------------------------

export const PLAN_LIMITS: Record<PlanType, { events: number; webhooks: number; retentionDays: number }> = {
  free: {
    events: 500,
    webhooks: 1,
    retentionDays: 3,
  },
  starter: {
    events: 50_000,
    webhooks: 10,
    retentionDays: 30,
  },
  pro: {
    events: 500_000,
    webhooks: 50,
    retentionDays: 90,
  },
  enterprise: {
    events: 10_000_000,
    webhooks: 500,
    retentionDays: 365,
  },
};

// -----------------------------------------------------------------------------
// Trial Period
// -----------------------------------------------------------------------------

export const TRIAL_PERIOD_DAYS = 14;
