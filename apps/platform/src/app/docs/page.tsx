// =============================================================================
// XRNotify Documentation Hub
// =============================================================================
// Server-side rendered documentation landing page
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'Learn how to integrate XRNotify into your application. API reference, event types, SDKs, and guides.',
  alternates: { canonical: 'https://www.xrnotify.io/docs' },
};

// -----------------------------------------------------------------------------
// Documentation Sections
// -----------------------------------------------------------------------------

const sections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Set up XRNotify in under 5 minutes',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    links: [
      { title: 'Quick Start Guide', href: '/docs/quickstart' },
      { title: 'Create Your First Webhook', href: '/docs/create-webhook' },
      { title: 'Verify Webhook Signatures', href: '/docs/verify-signatures' },
    ],
  },
  {
    id: 'api',
    title: 'API Reference',
    description: 'Complete REST API documentation',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    links: [
      { title: 'Authentication', href: '/docs/api/authentication' },
      { title: 'Webhooks API', href: '/docs/api/webhooks' },
      { title: 'Deliveries API', href: '/docs/api/deliveries' },
      { title: 'Events API', href: '/docs/api/events' },
      { title: 'Replay API', href: '/docs/api/replay' },
    ],
  },
  {
    id: 'events',
    title: 'Event Types',
    description: 'All supported XRPL event types',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
      </svg>
    ),
    links: [
      { title: 'Payment Events', href: '/docs/events/payments' },
      { title: 'NFT Events', href: '/docs/events/nft' },
      { title: 'DEX Events', href: '/docs/events/dex' },
      { title: 'Trustline Events', href: '/docs/events/trustlines' },
      { title: 'All Event Types', href: '/docs/events' },
    ],
  },
  {
    id: 'sdks',
    title: 'SDKs & Libraries',
    description: 'Official client libraries',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
    links: [
      { title: 'Node.js SDK', href: '/docs/sdks/nodejs' },
      { title: 'Python SDK', href: '/docs/sdks/python' },
      { title: 'Go SDK', href: '/docs/sdks/go' },
      { title: 'Webhook Signature Helpers', href: '/docs/sdks/signature-helpers' },
    ],
  },
  {
    id: 'guides',
    title: 'Guides',
    description: 'Step-by-step tutorials',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    links: [
      { title: 'Building a Payment Notification System', href: '/docs/guides/payment-notifications' },
      { title: 'NFT Marketplace Integration', href: '/docs/guides/nft-marketplace' },
      { title: 'Real-time Balance Updates', href: '/docs/guides/realtime-balance' },
      { title: 'Handling Webhook Failures', href: '/docs/guides/handling-failures' },
    ],
  },
  {
    id: 'reference',
    title: 'Reference',
    description: 'Technical specifications',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    links: [
      { title: 'Event Schema', href: '/docs/reference/event-schema' },
      { title: 'Error Codes', href: '/docs/reference/error-codes' },
      { title: 'Rate Limits', href: '/docs/reference/rate-limits' },
      { title: 'Retry Policy', href: '/docs/reference/retry-policy' },
    ],
  },
];

// -----------------------------------------------------------------------------
// Quick Start Code Example
// -----------------------------------------------------------------------------

const quickStartCode = `# 1. Create a webhook
curl -X POST https://api.xrnotify.io/v1/webhooks \\
  -H "X-XRNotify-Key: your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://yourapp.com/webhook",
    "event_types": ["payment.xrp", "nft.minted"],
    "accounts": ["rYourWalletAddress"]
  }'

# 2. Receive events at your endpoint
# XRNotify sends POST requests with:
# - X-XRNotify-Signature header (HMAC-SHA256)
# - JSON payload with normalized event data

# 3. Verify the signature
const isValid = verifySignature(
  payload,
  signature,
  webhookSecret
);`;

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-5 lg:px-8">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-400 no-underline transition-colors hover:text-white">
            ← Back to Home
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section className="border-b border-white/5 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Documentation
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-zinc-400">
            Everything you need to integrate XRNotify into your application.
            From quick starts to API reference.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/docs/quickstart"
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-bold text-white bg-blue-600 border border-blue-500 rounded-lg shadow-md hover:bg-blue-700 hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]"
            >
              Quick Start Guide
              <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/docs/api"
              className="inline-flex items-center justify-center rounded-lg border border-white/10 px-6 py-3 font-semibold text-zinc-300 transition-colors hover:border-stone-600 hover:text-white"
            >
              API Reference
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="border-b border-white/5 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-6 text-xl font-semibold text-white">
            Get started in 30 seconds
          </h2>
          <div className="overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-white/5">
            <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2">
              <span className="h-3 w-3 rounded-full bg-red-500" />
              <span className="h-3 w-3 rounded-full bg-yellow-500" />
              <span className="h-3 w-3 rounded-full bg-green-500" />
              <span className="ml-2 text-xs text-zinc-500">terminal</span>
            </div>
            <pre className="overflow-x-auto p-4 text-sm text-zinc-300">
              <code>{quickStartCode}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Documentation Sections */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {sections.map((section) => (
              <div
                key={section.title}
                id={section.id}
                className="rounded-xl bg-zinc-900 p-6 ring-1 ring-white/5"
              >
                <div className="mb-4 inline-flex rounded-lg bg-emerald-600/10 p-2 text-emerald-500">
                  {section.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  {section.title}
                </h3>
                <p className="mb-4 text-sm text-zinc-400">
                  {section.description}
                </p>
                <ul className="space-y-2">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-emerald-400 hover:text-emerald-300"
                      >
                        {link.title}
                        <span className="ml-1">→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Support CTA */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white">
            Need help?
          </h2>
          <p className="mt-4 text-zinc-400">
            Can&apos;t find what you&apos;re looking for? Our team is here to help.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="mailto:support@xrnotify.io"
              className="rounded-lg bg-zinc-800 px-6 py-3 font-semibold text-white transition-colors hover:bg-zinc-700"
            >
              Email Support
            </a>
            <a
              href="/contact"
              className="rounded-lg border border-white/10 px-6 py-3 font-semibold text-zinc-300 no-underline transition-colors hover:border-stone-600 hover:text-white"
            >
              Join the Community
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
