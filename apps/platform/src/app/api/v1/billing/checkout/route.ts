// =============================================================================
// XRNotify Platform - Create Checkout Session
// =============================================================================
// Creates a Stripe Checkout session with 14-day free trial
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_PRICES, TRIAL_PERIOD_DAYS } from '@/lib/stripe';
import { getCurrentSession } from '@/lib/auth/session';
import { queryOne } from '@/lib/db';
import { createModuleLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const logger = createModuleLogger('billing-checkout');

interface CheckoutBody {
  plan: 'builder' | 'professional' | 'compliance' | 'enterprise';
}

interface TenantRow {
  id: string;
  email: string;
  stripe_customer_id: string | null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: CheckoutBody;

  try {
    body = await req.json() as CheckoutBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { plan } = body;

  const priceId = plan ? STRIPE_PRICES[plan] : undefined;

  if (!plan || !priceId) {
    return NextResponse.json({ error: 'Invalid plan or pricing not configured' }, { status: 400 });
  }

  if (!process.env['STRIPE_SECRET_KEY']) {
    return NextResponse.json({ error: 'Billing is not configured. Please contact support.' }, { status: 503 });
  }

  const tenant = await queryOne<TenantRow>(
    `SELECT id, email, stripe_customer_id FROM tenants WHERE id = $1`,
    [session.tenantId]
  );

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://www.xrnotify.io';

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: tenant.stripe_customer_id ?? undefined,
      customer_email: tenant.stripe_customer_id ? undefined : tenant.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: TRIAL_PERIOD_DAYS,
        metadata: {
          tenant_id: tenant.id,
        },
      },
      metadata: {
        tenant_id: tenant.id,
      },
      success_url: `${appUrl}/dashboard?billing=success`,
      cancel_url: `${appUrl}/pricing?billing=canceled`,
    });

    logger.info({ tenantId: tenant.id, plan, sessionId: checkoutSession.id }, 'Checkout session created');

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    logger.error({ err, tenantId: tenant.id, plan }, 'Failed to create checkout session');
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
