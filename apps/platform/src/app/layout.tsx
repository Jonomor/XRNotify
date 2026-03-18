// =============================================================================
// XRNotify Platform - Root Layout
// =============================================================================
// HTML structure, fonts, metadata, providers, and global styles
// =============================================================================

import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import '@/styles/globals.css';
import { EcosystemFooter } from '@/components/EcosystemFooter';

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
// JSON-LD Schema (Jonomor Ecosystem Integration)
// -----------------------------------------------------------------------------

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://xrnotify.io/#app',
      name: 'XRNotify',
      description:
        'Real-time webhook notification platform for the XRP Ledger — instant event delivery for developers building on XRPL.',
      url: 'https://xrnotify.io',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Web',
      creator: { '@id': 'https://jonomor.com/ali-morgan#person' },
      publisher: { '@id': 'https://jonomor.com/#organization' },
      isPartOf: { '@id': 'https://jonomor.com/#organization' },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://xrnotify.io/#website',
      name: 'XRNotify',
      url: 'https://xrnotify.io',
      publisher: { '@id': 'https://jonomor.com/#organization' },
    },
  ],
};

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: 'XRNotify — Real-Time Webhook Notifications for the XRP Ledger',
    template: '%s — XRNotify',
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
  authors: [{ name: 'Ali Morgan', url: 'https://jonomor.com/ali-morgan' }],
  creator: 'Ali Morgan',
  publisher: 'Jonomor',
  metadataBase: new URL(
    process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://xrnotify.io'
  ),
  alternates: {
    canonical: 'https://xrnotify.io',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://xrnotify.io',
    siteName: 'XRNotify',
    title: 'XRNotify — Real-Time Webhook Notifications for the XRP Ledger',
    description:
      'Real-time webhook notification platform for the XRP Ledger. Subscribe to blockchain events and receive instant HTTP callbacks.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'XRNotify — XRPL Webhook Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XRNotify — Real-Time Webhook Notifications for the XRP Ledger',
    description:
      'Real-time webhook notification platform for the XRP Ledger. Subscribe to blockchain events and receive instant HTTP callbacks.',
    images: ['/og-image.png'],
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
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* JSON-LD Schema for Jonomor Ecosystem */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
      <body className="min-h-screen bg-white font-sans text-slate-900 antialiased dark:bg-slate-900 dark:text-slate-50">
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
