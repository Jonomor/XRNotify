// =============================================================================
// XRNotify Platform - Stripe Webhook Handler
// =============================================================================
// Handles Stripe billing events: subscription lifecycle + invoice updates
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { query } from '@/lib/db';
import { createModuleLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const logger = createModuleLogger('billing-webhook');

// -----------------------------------------------------------------------------
// Stripe event → plan_type mapping
// -----------------------------------------------------------------------------

function getPlanFromPriceId(priceId: string): string {
  const builderPrice = process.env['STRIPE_PRICE_BUILDER'];
  const professionalPrice = process.env['STRIPE_PRICE_PROFESSIONAL'];
  const compliancePrice = process.env['STRIPE_PRICE_COMPLIANCE'];
  const enterprisePrice = process.env['STRIPE_PRICE_ENTERPRISE'];
  const starterPrice = process.env['STRIPE_PRICE_STARTER'];
  const proPrice = process.env['STRIPE_PRICE_PRO'];

  if (priceId === builderPrice) return 'builder';
  if (priceId === professionalPrice) return 'professional';
  if (priceId === compliancePrice) return 'compliance';
  if (priceId === enterprisePrice) return 'enterprise';
  // Legacy fallbacks
  if (priceId === starterPrice) return 'starter';
  if (priceId === proPrice) return 'pro';
  return 'free';
}

// -----------------------------------------------------------------------------
// Event handlers
// -----------------------------------------------------------------------------

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const tenantId = session.metadata?.['tenant_id'];

  if (!tenantId) {
    logger.error({ sessionId: session.id }, 'No tenant_id in checkout session metadata');
    return;
  }

  await query(
    `UPDATE tenants
     SET stripe_customer_id = $1,
         stripe_subscription_id = $2,
         subscription_status = 'trialing',
         updated_at = NOW()
     WHERE id = $3`,
    [customerId, subscriptionId, tenantId]
  );

  logger.info({ tenantId, customerId, subscriptionId }, 'Checkout session completed');
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;
  const status = subscription.status;
  const priceId = subscription.items.data[0]?.price.id;
  const plan = priceId ? getPlanFromPriceId(priceId) : 'free';

  await query(
    `UPDATE tenants
     SET stripe_subscription_id = $1,
         subscription_status = $2,
         plan = $3,
         updated_at = NOW()
     WHERE stripe_customer_id = $4`,
    [subscription.id, status, plan, customerId]
  );

  logger.info({ customerId, status, plan }, 'Subscription updated');
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;

  await query(
    `UPDATE tenants
     SET stripe_subscription_id = NULL,
         subscription_status = 'canceled',
         plan = 'free',
         updated_at = NOW()
     WHERE stripe_customer_id = $1`,
    [customerId]
  );

  logger.info({ customerId }, 'Subscription canceled');
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  await query(
    `UPDATE tenants
     SET subscription_status = 'active',
         updated_at = NOW()
     WHERE stripe_customer_id = $1`,
    [customerId]
  );

  logger.info({ customerId }, 'Invoice payment succeeded');
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  await query(
    `UPDATE tenants
     SET subscription_status = 'past_due',
         updated_at = NOW()
     WHERE stripe_customer_id = $1`,
    [customerId]
  );

  logger.warn({ customerId }, 'Invoice payment failed');
}

// -----------------------------------------------------------------------------
// Route Handler
// -----------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];

  if (!sig || !webhookSecret) {
    logger.error('Missing stripe-signature header or STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    logger.error({ err }, 'Stripe webhook signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  logger.info({ type: event.type, id: event.id }, 'Stripe webhook received');

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        logger.debug({ type: event.type }, 'Unhandled Stripe event type');
    }
  } catch (err) {
    logger.error({ err, type: event.type }, 'Error processing Stripe webhook event');
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
