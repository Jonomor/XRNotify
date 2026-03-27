// =============================================================================
// XRNotify About Page
// =============================================================================
// Server-side rendered - ecosystem context and company info
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description:
    'XRNotify is enterprise-grade webhook infrastructure for the XRP Ledger, built by Ali Morgan as part of the Jonomor ecosystem.',
  alternates: { canonical: 'https://www.xrnotify.io/about' },
};

const aboutJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://www.xrnotify.io/about#webpage',
  name: 'About XRNotify',
  url: 'https://www.xrnotify.io/about',
  description:
    'XRNotify is enterprise-grade webhook infrastructure for the XRP Ledger, built by Ali Morgan as part of the Jonomor ecosystem.',
  publisher: { '@id': 'https://www.jonomor.com/#organization' },
  isPartOf: { '@id': 'https://www.xrnotify.io/#website' },
};

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/5">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-3 no-underline">
            <span className="text-xl font-semibold tracking-tight text-white">XRNotify</span>
          </Link>
          <div className="hidden items-center gap-10 md:flex">
            <Link href="/#features" className="text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white">Features</Link>
            <Link href="/#pricing" className="text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white">Pricing</Link>
            <Link href="/about" className="text-sm font-medium text-white no-underline">About</Link>
            <Link href="/docs" className="text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white">Docs</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white sm:block">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="group relative overflow-hidden rounded-full bg-blue-600 border border-blue-500 px-5 py-2.5 text-sm font-bold text-white no-underline shadow-md transition-all hover:bg-blue-700 hover:shadow-lg"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="border-b border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            About XRNotify
          </h1>
          <p className="mt-6 text-xl text-zinc-400">
            Enterprise-grade webhook infrastructure for the XRP Ledger.
          </p>
        </div>
      </section>

      {/* What XRNotify Is */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-6 text-2xl font-bold text-white">What XRNotify is</h2>
          <div className="space-y-5 text-zinc-400 leading-relaxed">
            <p className="text-lg text-zinc-300">
              XRNotify is enterprise-grade webhook infrastructure purpose-built for the XRP
              Ledger. It gives developers, platforms, and enterprises a reliable way to
              receive real-time notifications whenever something happens on-chain — without
              running their own node infrastructure or building custom blockchain monitoring
              pipelines.
            </p>
            <p>
              At its core, XRNotify continuously monitors the XRP Ledger for on-chain
              activity and delivers structured event payloads to your HTTP endpoints the
              moment transactions confirm. Whether you are tracking wallet balances, NFT
              transfers, DEX trades, escrow releases, trustline changes, or AMM liquidity
              events, XRNotify normalizes every transaction into a clean, typed JSON schema
              and pushes it to you in real time with sub-second latency.
            </p>
            <p>
              The platform supports granular event filtering so you can subscribe only to
              the transaction types and accounts that matter to your application. Every
              webhook delivery is cryptographically signed with HMAC-SHA256, giving you a
              simple way to verify authenticity and reject forgeries. If a delivery fails,
              XRNotify retries automatically with exponential backoff and maintains a
              complete audit trail of every attempt — request payloads, response codes,
              latency metrics, and response bodies — so you always know what happened and
              why.
            </p>
          </div>
        </div>
      </section>

      {/* What It Does */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-6 text-2xl font-bold text-white">Real-time event detection</h2>
          <div className="space-y-5 text-zinc-400 leading-relaxed">
            <p>
              XRNotify provides real-time event detection for XRPL wallet activity,
              transaction events, token movements, and ledger signals. The system maintains
              persistent WebSocket connections to multiple XRPL nodes, ensuring zero-lag
              awareness of every validated ledger. When a transaction matches your
              configured filters — whether it is an XRP payment, an NFT mint, a DEX offer
              create, or a trustline authorization — XRNotify captures the event, enriches
              it with contextual metadata, and dispatches a structured payload to your
              registered endpoint.
            </p>
            <p>
              The technical approach centers on webhooks and streaming delivery. Webhooks
              are the primary integration pattern: you register an HTTPS endpoint, choose
              your event types and account filters, and XRNotify handles the rest.
              Deliveries happen within milliseconds of ledger close. For higher-throughput
              use cases, XRNotify also supports WebSocket streaming, allowing your
              application to maintain a persistent connection and receive events as a
              continuous stream rather than discrete HTTP calls. Both delivery methods
              include the same payload schema, signing guarantees, and retry semantics.
            </p>
          </div>
        </div>
      </section>

      {/* Who Built It */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-6 text-2xl font-bold text-white">Who built XRNotify</h2>
          <div className="space-y-5 text-zinc-400 leading-relaxed">
            <p>
              XRNotify was created by{' '}
              <a
                href="https://www.jonomor.com/ali-morgan"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 no-underline transition-colors hover:text-emerald-300"
              >
                Ali Morgan
              </a>
              , founder of Jonomor — a systems architecture studio focused on AI Visibility
              and real-time infrastructure intelligence. Ali brings deep experience in
              distributed systems, event-driven architecture, and developer tooling to the
              XRPL ecosystem, with a focus on building production-grade infrastructure that
              developers can rely on at scale.
            </p>
            <p>
              Jonomor operates at the intersection of observability, automation, and
              intelligent systems. The studio builds products that detect signals, interpret
              context, and drive operational outcomes — and XRNotify is where that pipeline
              begins.
            </p>
          </div>
        </div>
      </section>

      {/* Ecosystem Fit */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-6 text-2xl font-bold text-white">Part of the Jonomor ecosystem</h2>
          <div className="space-y-5 text-zinc-400 leading-relaxed">
            <p>
              XRNotify is the instrumentation layer of the{' '}
              <a
                href="https://www.jonomor.com/ecosystem"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 no-underline transition-colors hover:text-emerald-300"
              >
                Jonomor ecosystem
              </a>
              {' '}— the Observe stage that detects events at the point of origin before
              they flow through interpretation and operational layers. In the Jonomor
              architecture, every system begins with sensing: capturing the raw signals
              that downstream intelligence depends on. XRNotify fulfills this role for the
              XRP Ledger, transforming on-chain activity into structured, deliverable events
              that other systems can act on.
            </p>
            <p>
              This positioning means XRNotify is not just a notification service — it is the
              foundational data capture layer that feeds analytics, automation, compliance
              monitoring, and AI-driven decision systems. By providing reliable, real-time
              event streams with guaranteed delivery and complete audit trails, XRNotify
              ensures that every downstream system operates on accurate, timely data
              rather than stale snapshots or incomplete polling results.
            </p>
          </div>
        </div>
      </section>

      {/* Built For */}
      <section className="border-t border-white/5 py-20">
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
              <div key={item.title} className="rounded-2xl border border-white/5 bg-zinc-900/50 p-6">
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Foundation */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-8 text-2xl font-bold text-white">Technical foundation</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { stat: '99.9%', label: 'Uptime SLA', description: 'Enterprise-grade reliability' },
              { stat: '<1s', label: 'Delivery latency', description: 'From ledger close to webhook' },
              { stat: '10', label: 'Retry attempts', description: 'With exponential backoff' },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-4xl font-bold text-emerald-400">{item.stat}</div>
                <div className="mt-2 font-semibold text-white">{item.label}</div>
                <div className="text-sm text-zinc-400">{item.description}</div>
              </div>
            ))}
          </div>
          <div className="mt-12 rounded-2xl border border-white/5 bg-zinc-900/50 p-6">
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
                  className="rounded-full border border-white/5 bg-zinc-800 px-3 py-1 text-sm text-zinc-300"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white">Ready to build?</h2>
          <p className="mt-4 text-zinc-400">
            Start with the free plan. No credit card required.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="group relative overflow-hidden rounded-full bg-blue-600 border border-blue-500 px-8 py-4 text-base font-bold text-white no-underline shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-500/30"
            >
              Get started for free
            </Link>
            <Link
              href="/docs"
              className="rounded-full border border-zinc-700 bg-zinc-900/50 px-8 py-4 text-base font-semibold text-white no-underline transition-all hover:border-zinc-600 hover:bg-zinc-800/50"
            >
              Read the documentation
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
