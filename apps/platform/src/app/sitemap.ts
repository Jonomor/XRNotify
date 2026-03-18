// =============================================================================
// XRNotify Sitemap
// =============================================================================
// Dynamic sitemap generation for SEO
// =============================================================================

import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://xrnotify.io';

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

  // Documentation pages (add more as you create them)
  const docPages = [
    '/docs/quickstart',
    '/docs/first-webhook',
    '/docs/signatures',
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
    '/docs/sdk/nodejs',
    '/docs/sdk/python',
    '/docs/sdk/go',
    '/docs/reference/event-schema',
    '/docs/reference/errors',
    '/docs/reference/rate-limits',
    '/docs/reference/retries',
  ];

  const docEntries = docPages.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...docEntries];
}
