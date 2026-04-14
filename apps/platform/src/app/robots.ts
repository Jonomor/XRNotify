// =============================================================================
// XRNotify Robots.txt
// =============================================================================
// Dynamic robots.txt generation with AI crawler protection
// =============================================================================

import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Block AI training crawlers
      { userAgent: 'GPTBot', disallow: '/' },
      { userAgent: 'ChatGPT-User', disallow: '/' },
      { userAgent: 'CCBot', disallow: '/' },
      { userAgent: 'anthropic-ai', disallow: '/' },
      { userAgent: 'Claude-Web', disallow: '/' },
      { userAgent: 'Google-Extended', disallow: '/' },
      { userAgent: 'FacebookBot', disallow: '/' },
      { userAgent: 'Bytespider', disallow: '/' },
      // Allow all other crawlers with restrictions
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/api/',
          '/login',
          '/signup',
        ],
      },
    ],
    sitemap: 'https://www.xrnotify.io/sitemap.xml',
  };
}
