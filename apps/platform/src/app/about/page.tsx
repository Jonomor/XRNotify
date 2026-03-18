// =============================================================================
// XRNotify About Page
// =============================================================================
// Server-side rendered - ecosystem context and company info
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description: 'XRNotify is a real-time webhook notification platform for the XRP Ledger, built by Ali Morgan as part of the Jonomor ecosystem.',
  alternates: { canonical: 'https://xrnotify.io/about' },
};

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-stone-950">
      {/* Header */}
      <section className="border-b border-stone-800 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            About XRNotify
          </h1>
          <p className="mt-6 text-xl text-stone-400">
            The infrastructure layer the XRP Ledger needs to scale.
          </p>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-6 text-2xl font-bold text-white">What we do</h2>
          <div className="prose prose-invert max-w-none">
            <p className="text-lg text-stone-300">
              XRNotify is a real-time webhook notification platform for the XRP Ledger. 
              We monitor every transaction on the blockchain and deliver instant HTTP 
              callbacks to your application when events match your subscriptions.
            </p>
            <p className="text-stone-400">
              Think of us as the Stripe Webhooks of the XRP Ledger. Instead of building 
              custom infrastructure to monitor the blockchain, poll nodes, parse 
              transactions, and handle delivery reliability — you make one API call to 
              create a webhook, and we handle everything else.
            </p>
            <p className="text-stone-400">
              We support all major XRPL transaction types: payments, NFT mints and 
              transfers, DEX trades, trustline changes, escrows, and more. Every event 
              is normalized into a clean JSON schema, cryptographically signed, and 
              delivered with automatic retries and failure handling.
            </p>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="border-t border-stone-800 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-6 text-2xl font-bold text-white">The problem we solve</h2>
          <div className="prose prose-invert max-w-none">
            <p className="text-stone-400">
              If you&apos;re building on the XRP Ledger today, you have two options for 
              knowing when things happen on-chain:
            </p>
            <ol className="mt-4 space-y-4 text-stone-400">
              <li>
                <strong className="text-stone-200">Poll the blockchain repeatedly</strong> — 
                Slow, expensive, unreliable. You miss events between polls, waste 
                resources checking for changes that haven&apos;t happened, and build up 
                technical debt managing the polling infrastructure.
              </li>
              <li>
                <strong className="text-stone-200">Run your own node and build a custom pipeline</strong> — 
                3-6 months of engineering work, $500-2,000/month in infrastructure, 
                ongoing DevOps burden. Most teams don&apos;t have the resources or expertise.
              </li>
            </ol>
            <p className="mt-6 text-stone-400">
              XRNotify sits in the gap between these options. You get real-time event 
              delivery with enterprise-grade reliability, without the infrastructure 
              complexity.
            </p>
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="border-t border-stone-800 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-8 text-2xl font-bold text-white">Built for</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              {
                title: 'Wallet developers',
                description: 'Update balances instantly when users receive payments or tokens.',
              },
              {
                title: 'NFT marketplaces',
                description: 'Know immediately when sales complete, offers are made, or tokens transfer.',
              },
              {
                title: 'DeFi applications',
                description: 'React to DEX trades, liquidity changes, and trustline updates in real-time.',
              },
              {
                title: 'Payment platforms',
                description: 'Confirm transactions, trigger fulfillment, and update customer records instantly.',
              },
              {
                title: 'Exchanges',
                description: 'Monitor deposits and withdrawals with guaranteed delivery and audit trails.',
              },
              {
                title: 'Compliance teams',
                description: 'Track account activity for AML/KYC monitoring with complete transaction logs.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-lg bg-stone-900 p-6 ring-1 ring-stone-800">
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-stone-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Builder */}
      <section className="border-t border-stone-800 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-6 text-2xl font-bold text-white">Who we are</h2>
          <div className="prose prose-invert max-w-none">
            <p className="text-stone-400">
              XRNotify is built by{' '}
              <Link 
                href="https://jonomor.com/ali-morgan" 
                className="text-indigo-400 hover:text-indigo-300"
              >
                Ali Morgan
              </Link>
              , an independent developer focused on blockchain infrastructure and 
              developer tools.
            </p>
            <p className="text-stone-400">
              XRNotify is part of the{' '}
              <Link 
                href="https://jonomor.com/ecosystem" 
                className="text-indigo-400 hover:text-indigo-300"
              >
                Jonomor ecosystem
              </Link>
              , a collection of products and platforms built to solve real problems 
              with production-grade engineering.
            </p>
          </div>
        </div>
      </section>

      {/* Technical Foundation */}
      <section className="border-t border-stone-800 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-8 text-2xl font-bold text-white">Technical foundation</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                stat: '99.9%',
                label: 'Uptime SLA',
                description: 'Enterprise-grade reliability',
              },
              {
                stat: '<2s',
                label: 'Delivery latency',
                description: 'From ledger close to webhook',
              },
              {
                stat: '10',
                label: 'Retry attempts',
                description: 'With exponential backoff',
              },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-4xl font-bold text-indigo-500">{item.stat}</div>
                <div className="mt-2 font-semibold text-white">{item.label}</div>
                <div className="text-sm text-stone-400">{item.description}</div>
              </div>
            ))}
          </div>
          <div className="mt-12 rounded-lg bg-stone-900 p-6 ring-1 ring-stone-800">
            <h3 className="mb-4 font-semibold text-white">Built with</h3>
            <div className="flex flex-wrap gap-3">
              {[
                'Next.js 14',
                'TypeScript',
                'PostgreSQL',
                'Redis Streams',
                'xrpl.js',
                'HMAC-SHA256',
                'Prometheus',
                'Grafana',
              ].map((tech) => (
                <span
                  key={tech}
                  className="rounded-full bg-stone-800 px-3 py-1 text-sm text-stone-300"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-stone-800 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white">
            Ready to build?
          </h2>
          <p className="mt-4 text-stone-400">
            Start with the free plan. No credit card required.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Get started for free
            </Link>
            <Link
              href="/docs"
              className="rounded-lg border border-stone-700 px-6 py-3 font-semibold text-stone-300 transition-colors hover:border-stone-600 hover:text-white"
            >
              Read the documentation
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
