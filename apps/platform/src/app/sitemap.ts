// =============================================================================
// XRNotify Sitemap
// =============================================================================
// Dynamic sitemap generation for SEO
// =============================================================================

import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.xrnotify.io';

  // Static pages
  const staticPages = [
    '',           // Home
    '/pricing',
    '/docs',
    '/about',
    '/login',
    '/signup',
  ];

  const staticEntries = staticPages.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1.0 : 0.8,
  }));

  // Documentation pages
  const docPages = [
    '/docs/api',
    '/docs/quickstart',
    '/docs/create-webhook',
    '/docs/verify-signatures',
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
  ];

  const docEntries = docPages.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...docEntries];
}
