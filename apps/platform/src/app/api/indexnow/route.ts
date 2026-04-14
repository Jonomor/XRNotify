import { NextResponse } from 'next/server';

const INDEXNOW_KEY = '25ba64ef0c784aeda47f24f2e39ce32d';
const HOST = 'www.xrnotify.io';
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

const ALL_URLS = [
  '/',
  '/pricing',
  '/licensing',
  '/about',
  '/ecosystem',
  '/articles',
  '/articles/what-is-xrnotify',
  '/articles/xrpl-webhook-faq',
  '/articles/how-to-monitor-xrpl-wallets',
  '/articles/xrnotify-vs-polling',
  '/articles/webhook-delivery-reliability',
  '/docs',
  '/docs/quickstart',
  '/docs/create-webhook',
  '/docs/verify-signatures',
  '/docs/api',
  '/docs/api/authentication',
  '/docs/api/webhooks',
  '/docs/api/deliveries',
  '/docs/api/events',
  '/docs/api/replay',
  '/docs/events',
  '/docs/events/payments',
  '/docs/events/nft',
  '/docs/events/dex',
  '/docs/events/trustlines',
  '/docs/sdks/nodejs',
  '/docs/sdks/python',
  '/docs/sdks/go',
  '/docs/sdks/signature-helpers',
  '/docs/guides/payment-notifications',
  '/docs/guides/nft-marketplace',
  '/docs/guides/realtime-balance',
  '/docs/guides/handling-failures',
  '/docs/reference/event-schema',
  '/docs/reference/error-codes',
  '/docs/reference/rate-limits',
  '/docs/reference/retry-policy',
  '/login',
  '/signup',
  '/privacy',
  '/terms',
  '/contact',
];

export async function POST() {
  try {
    const urlList = ALL_URLS.map(
      (path) => `https://${HOST}${path}`
    );

    const response = await fetch(
      'https://api.indexnow.org/IndexNow',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          host: HOST,
          key: INDEXNOW_KEY,
          keyLocation: KEY_LOCATION,
          urlList,
        }),
      }
    );

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      urlsSubmitted: urlList.length,
    });
  } catch {
    return NextResponse.json(
      { error: 'IndexNow submission failed' },
      { status: 500 }
    );
  }
}
