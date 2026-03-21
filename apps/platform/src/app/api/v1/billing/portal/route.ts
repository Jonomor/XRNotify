// =============================================================================
// XRNotify Platform - Customer Portal Session
// =============================================================================
// Creates a Stripe Customer Portal session for subscription management
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getCurrentSession } from '@/lib/auth/session';
import { queryOne } from '@/lib/db';
import { createModuleLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const logger = createModuleLogger('billing-portal');

interface TenantRow {
  stripe_customer_id: string | null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenant = await queryOne<TenantRow>(
    `SELECT stripe_customer_id FROM tenants WHERE id = $1`,
    [session.tenantId]
  );

  if (!tenant?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No billing account found. Please subscribe to a plan first.' },
      { status: 404 }
    );
  }

  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://www.xrnotify.io';

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${appUrl}/dashboard`,
    });

    logger.info({ tenantId: session.tenantId }, 'Customer portal session created');

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    logger.error({ err, tenantId: session.tenantId }, 'Failed to create portal session');
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
