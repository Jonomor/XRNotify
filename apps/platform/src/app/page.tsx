// =============================================================================
// XRNotify Platform - Landing Page
// =============================================================================
// Marketing landing page with hero, features, pricing, and CTAs
// =============================================================================

import Link from 'next/link';
import type { Metadata } from 'next';

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'XRNotify - Real-Time XRPL Webhook Notifications',
  description:
    'Stop polling the blockchain. Get instant webhook notifications for XRP Ledger events. Payments, NFTs, DEX trades, and more.',
};

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <>
      {/* Navigation */}
      <nav className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <span className="text-lg font-bold text-white">X</span>
            </div>
            <span className="text-xl font-semibold text-slate-900 dark:text-white">
              XRNotify
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="#features"
              className="text-sm font-medium text-slate-600 no-underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-slate-600 no-underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Pricing
            </Link>
            <Link
              href="https://docs.xrnotify.dev"
              className="text-sm font-medium text-slate-600 no-underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Docs
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 no-underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white no-underline transition-colors hover:bg-brand-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white px-4 pb-20 pt-16 dark:from-slate-900 dark:to-slate-800 sm:px-6 sm:pb-32 sm:pt-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
              </span>
              Now tracking mainnet in real-time
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
              Webhooks for the{' '}
              <span className="bg-gradient-to-r from-brand-600 to-xrpl-500 bg-clip-text text-transparent">
                XRP Ledger
              </span>
            </h1>

            <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-400">
              Stop polling the blockchain. Get instant HTTP notifications when
              payments arrive, NFTs mint, or DEX orders fill. Enterprise-grade
              reliability with automatic retries.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="w-full rounded-lg bg-brand-600 px-6 py-3 text-base font-semibold text-white no-underline shadow-lg shadow-brand-600/25 transition-all hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-600/30 sm:w-auto"
              >
                Start Free — 1,000 events/mo
              </Link>
              <Link
                href="https://docs.xrnotify.dev"
                className="w-full rounded-lg border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-900 no-underline transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 sm:w-auto"
              >
                Read the Docs
              </Link>
            </div>
          </div>

          {/* Code Example */}
          <div className="mx-auto mt-16 max-w-3xl">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-2xl dark:border-slate-700">
              <div className="flex items-center gap-2 border-b border-slate-700 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="ml-2 text-sm text-slate-400">
                  Create a webhook in one API call
                </span>
              </div>
              <pre className="overflow-x-auto p-4 text-sm">
                <code className="text-slate-300">
                  <span className="text-green-400">curl</span> -X POST
                  https://api.xrnotify.io/v1/webhooks \{'\n'}
                  {'  '}-H{' '}
                  <span className="text-yellow-300">
                    &quot;X-XRNotify-Key: YOUR_API_KEY&quot;
                  </span>{' '}
                  \{'\n'}
                  {'  '}-H{' '}
                  <span className="text-yellow-300">
                    &quot;Content-Type: application/json&quot;
                  </span>{' '}
                  \{'\n'}
                  {'  '}-d{' '}
                  <span className="text-blue-300">
                    &apos;{'{'}&quot;url&quot;:
                    &quot;https://yourapp.com/webhook&quot;,
                    &quot;event_types&quot;: [&quot;payment.xrp&quot;,
                    &quot;nft.minted&quot;]{'}'}&apos;
                  </span>
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="border-t border-slate-200 bg-white px-4 py-20 dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:py-32 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Everything you need to build reactive XRPL apps
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Focus on your product, not blockchain infrastructure.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-slate-200 bg-slate-50 p-6 transition-all hover:border-brand-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-600"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Event Types Section */}
      <section className="border-t border-slate-200 bg-slate-50 px-4 py-20 dark:border-slate-800 dark:bg-slate-800 sm:px-6 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Track any event on the XRP Ledger
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Subscribe to exactly the events you need. Filter by account.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {eventTypes.map((type) => (
              <div
                key={type.name}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-lg dark:bg-slate-800">
                  {type.emoji}
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {type.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {type.count} event types
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        className="border-t border-slate-200 bg-white px-4 py-20 dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:py-32 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Start free. Scale as you grow. No surprises.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-8 ${
                  plan.featured
                    ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500 dark:border-brand-400 dark:bg-brand-900/20 dark:ring-brand-400'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
                }`}
              >
                {plan.featured && (
                  <p className="mb-4 text-sm font-semibold text-brand-600 dark:text-brand-400">
                    Most Popular
                  </p>
                )}
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                  {plan.name}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {plan.description}
                </p>
                <p className="mt-6">
                  <span className="text-4xl font-bold text-slate-900 dark:text-white">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-slate-600 dark:text-slate-400">
                      {plan.period}
                    </span>
                  )}
                </p>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400"
                    >
                      <svg
                        className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-8 block w-full rounded-lg py-3 text-center text-sm font-semibold no-underline transition-colors ${
                    plan.featured
                      ? 'bg-brand-600 text-white hover:bg-brand-700'
                      : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-slate-200 bg-slate-900 px-4 py-20 dark:border-slate-700 sm:px-6 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to stop polling?
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Get started in minutes. No credit card required.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-lg bg-brand-600 px-8 py-4 text-lg font-semibold text-white no-underline shadow-lg shadow-brand-600/25 transition-all hover:bg-brand-500 hover:shadow-xl hover:shadow-brand-600/30"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-4 py-12 dark:border-slate-800 dark:bg-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                <span className="text-lg font-bold text-white">X</span>
              </div>
              <span className="text-lg font-semibold text-slate-900 dark:text-white">
                XRNotify
              </span>
            </div>
            <div className="flex gap-6 text-sm text-slate-600 dark:text-slate-400">
              <Link
                href="https://docs.xrnotify.dev"
                className="no-underline hover:text-slate-900 dark:hover:text-white"
              >
                Docs
              </Link>
              <Link
                href="/privacy"
                className="no-underline hover:text-slate-900 dark:hover:text-white"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="no-underline hover:text-slate-900 dark:hover:text-white"
              >
                Terms
              </Link>
              <a
                href="https://twitter.com/xrnotify"
                className="no-underline hover:text-slate-900 dark:hover:text-white"
                target="_blank"
                rel="noopener noreferrer"
              >
                Twitter
              </a>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              © {new Date().getFullYear()} XRNotify. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

// -----------------------------------------------------------------------------
// Data
// -----------------------------------------------------------------------------

const features = [
  {
    title: 'Real-Time Delivery',
    description:
      'Events delivered within seconds of ledger close. No more polling or missed transactions.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Guaranteed Delivery',
    description:
      'Automatic retries with exponential backoff. Dead letter queues. Never miss an event.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'HMAC Signatures',
    description:
      'Every webhook is signed with your secret key. Verify authenticity with one line of code.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: 'Event Replay',
    description:
      'Missed something? Replay any event from the last 30 days with one click.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    title: 'Delivery Logs',
    description:
      'Full visibility into every delivery attempt. Status codes, response bodies, latency.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: 'Account Filtering',
    description:
      'Subscribe to events for specific accounts. Track only what matters to your app.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
    ),
  },
];

const eventTypes = [
  { name: 'Payments', emoji: '💰', count: 3 },
  { name: 'NFTs', emoji: '🎨', count: 6 },
  { name: 'DEX', emoji: '📈', count: 4 },
  { name: 'Trust Lines', emoji: '🔗', count: 3 },
  { name: 'Escrow', emoji: '🔒', count: 3 },
  { name: 'Checks', emoji: '📝', count: 3 },
  { name: 'Accounts', emoji: '👤', count: 2 },
  { name: 'More...', emoji: '✨', count: 99 },
];

const pricingPlans = [
  {
    name: 'Free',
    description: 'Perfect for testing and hobby projects.',
    price: '$0',
    period: '',
    cta: 'Get Started',
    featured: false,
    features: [
      '1,000 events per month',
      '2 webhook endpoints',
      'Basic event types',
      '7-day delivery logs',
      'Community support',
    ],
  },
  {
    name: 'Starter',
    description: 'For indie developers and small teams.',
    price: '$29',
    period: '/month',
    cta: 'Start Free Trial',
    featured: true,
    features: [
      '50,000 events per month',
      '10 webhook endpoints',
      'All event types',
      'WebSocket streaming',
      '30-day delivery logs',
      'Event replay',
      'Email support',
    ],
  },
  {
    name: 'Pro',
    description: 'For growing applications.',
    price: '$99',
    period: '/month',
    cta: 'Start Free Trial',
    featured: false,
    features: [
      '500,000 events per month',
      '50 webhook endpoints',
      'All event types',
      'Priority delivery queue',
      '90-day delivery logs',
      'Custom retry policies',
      'Raw transaction data',
      'Priority support',
    ],
  },
];
