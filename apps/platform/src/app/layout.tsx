// =============================================================================
// XRNotify Platform - Root Layout
// =============================================================================
// HTML structure, fonts, metadata, providers, and global styles
// =============================================================================

import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Inter, JetBrains_Mono } from 'next/font/google';
import '@/styles/globals.css';
import { EcosystemFooter } from '@/components/EcosystemFooter';
import {
  CANONICAL_IDS,
  CANONICAL_URLS,
  CANONICAL_COPY,
  SAME_AS,
  FAQ_ITEMS,
  getFAQPageSchema,
} from '@/lib/schema';

// -----------------------------------------------------------------------------
// Fonts
// -----------------------------------------------------------------------------

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

// -----------------------------------------------------------------------------
// JSON-LD Schema Blocks (6 separate blocks for scanner compatibility)
// -----------------------------------------------------------------------------

const jonomorOrgSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': CANONICAL_IDS.jonomor,
  name: 'Jonomor',
  url: CANONICAL_URLS.jonomor,
  founder: { '@id': CANONICAL_IDS.aliMorgan },
  sameAs: [...SAME_AS.jonomor],
  hasPart: [
    {
      '@type': 'SoftwareApplication',
      '@id': CANONICAL_IDS.app,
      name: 'XRNotify',
    },
  ],
};

const aliMorganSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': CANONICAL_IDS.aliMorgan,
  name: 'Ali Morgan',
  url: CANONICAL_URLS.aliMorgan,
  jobTitle: 'Founder',
  worksFor: { '@id': CANONICAL_IDS.jonomor },
  sameAs: [...SAME_AS.aliMorgan],
};

const xrnotifyOrgSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': CANONICAL_IDS.organization,
  name: 'XRNotify',
  url: CANONICAL_URLS.xrnotify,
  parentOrganization: { '@id': CANONICAL_IDS.jonomor },
  founder: { '@id': CANONICAL_IDS.aliMorgan },
  hasPart: [{ '@id': CANONICAL_IDS.app }],
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': CANONICAL_IDS.website,
  name: 'XRNotify',
  url: CANONICAL_URLS.xrnotify,
  publisher: { '@id': CANONICAL_IDS.jonomor },
};

const softwareAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': CANONICAL_IDS.app,
  name: 'XRNotify',
  description: CANONICAL_COPY.tagline,
  url: CANONICAL_URLS.xrnotify,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  offers: [
    {
      '@type': 'Offer',
      name: 'Free',
      price: '0',
      priceCurrency: 'USD',
      description: '1,000 events/month, 2 webhooks',
    },
    {
      '@type': 'Offer',
      name: 'Starter',
      price: '29.00',
      priceCurrency: 'USD',
      description: '50,000 events/month, 10 webhooks, WebSocket access',
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '99.00',
      priceCurrency: 'USD',
      description: '500,000 events/month, 50 webhooks, priority delivery',
    },
  ],
  creator: { '@id': CANONICAL_IDS.aliMorgan },
  publisher: { '@id': CANONICAL_IDS.jonomor },
  isPartOf: { '@id': CANONICAL_IDS.jonomor },
  featureList: [
    'Real-time XRPL event ingestion',
    'HMAC-SHA256 signed webhook delivery',
    'Automatic retries with exponential backoff',
    'Dead-letter queue for failed deliveries',
    'Event replay and reprocessing',
    '23+ XRPL event types supported',
    'Developer dashboard with delivery logs',
    'Per-webhook filtering by event type and account',
  ],
};

const faqPageSchema = getFAQPageSchema(FAQ_ITEMS);

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export const metadata: Metadata = {
  verification: {
    google: 'YhuIdV0Jy5-29A_vLZOuL9jcVsq0x11cOs0DcbszKlI',
    other: {
      'msvalidate.01': 'D4B9CF4C2CB35389E3E96D762B457221',
    },
  },
  title: {
    default: CANONICAL_COPY.pageTitle,
    template: '%s | XRNotify',
  },
  description:
    'Real-time webhook notification platform for the XRP Ledger. Subscribe to blockchain events and receive instant HTTP callbacks without running your own node infrastructure.',
  keywords: [
    'XRPL',
    'XRP Ledger',
    'webhooks',
    'notifications',
    'blockchain',
    'API',
    'developer tools',
    'NFT',
    'payments',
    'DEX',
    'real-time events',
    'blockchain infrastructure',
  ],
  authors: [{ name: 'Ali Morgan', url: CANONICAL_URLS.aliMorgan }],
  creator: 'Ali Morgan',
  publisher: 'Jonomor',
  metadataBase: new URL(
    process.env['NEXT_PUBLIC_APP_URL'] ?? CANONICAL_URLS.xrnotify
  ),
  alternates: {
    canonical: CANONICAL_URLS.xrnotify,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: CANONICAL_URLS.xrnotify,
    siteName: 'XRNotify',
    title: CANONICAL_COPY.pageTitle,
    description:
      'Real-time webhook notification platform for the XRP Ledger. Subscribe to blockchain events and receive instant HTTP callbacks.',
  },
  twitter: {
    card: 'summary_large_image',
    title: CANONICAL_COPY.pageTitle,
    description:
      'Real-time webhook notification platform for the XRP Ledger. Subscribe to blockchain events and receive instant HTTP callbacks.',
    creator: '@xrnotify',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

// -----------------------------------------------------------------------------
// Root Layout
// -----------------------------------------------------------------------------

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Block 1 - Jonomor Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jonomorOrgSchema) }}
        />
        {/* Block 2 - Ali Morgan Person */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(aliMorganSchema) }}
        />
        {/* Block 3 - XRNotify Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(xrnotifyOrgSchema) }}
        />
        {/* Block 4 - WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        {/* Block 5 - SoftwareApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
        />
        {/* Block 6 - FAQPage */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchema) }}
        />

        {/* Preconnect to external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* DNS prefetch for API endpoints */}
        <link rel="dns-prefetch" href="https://api.xrnotify.io" />
      </head>
      <body className="min-h-screen bg-[#0a0a0f] font-sans text-white antialiased">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-6JSBF4CQS6"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-6JSBF4CQS6');
          `}
        </Script>
        {/* Skip to content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white focus:outline-none"
        >
          Skip to main content
        </a>

        {/* Main content */}
        <div id="main-content" className="flex min-h-screen flex-col">
          {children}

          {/* Jonomor Ecosystem Footer */}
          <EcosystemFooter />
        </div>

        {/* Toast notifications container */}
        <div
          id="toast-container"
          className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
          aria-live="polite"
          aria-atomic="true"
        />
      </body>
    </html>
  );
}
