// =============================================================================
// XRNotify Robots.txt
// =============================================================================
// Dynamic robots.txt generation
// =============================================================================

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/dashboard/*',
          '/api/',
          '/api/*',
        ],
      },
    ],
    sitemap: 'https://xrnotify.io/sitemap.xml',
  };
}
