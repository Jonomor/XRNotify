// =============================================================================
// XRNotify Pricing Page
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckoutButton } from '@/components/CheckoutButton';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for XRNotify. Start free, scale as you grow. From hobbyist to enterprise.',
  alternates: { canonical: 'https://www.xrnotify.io/pricing' },
};

// -----------------------------------------------------------------------------
// Pricing Tiers
// -----------------------------------------------------------------------------

const tiers = [
  {
    name: 'Developer',
    plan: null as null | 'builder' | 'professional' | 'compliance' | 'enterprise',
    price: '$0',
    period: 'forever',
    description: 'For testing and evaluation',
    trial: false,
    features: [
      '500 events/month',
      '1 webhook endpoint',
      'Core event types',
      '3-day delivery logs',
      'Community support',
    ],
    cta: 'Get Started',
    ctaHref: '/signup',
    highlighted: false,
  },
  {
    name: 'Builder',
    plan: 'builder' as const,
    price: '$79',
    period: '/month',
    description: 'For developers building on XRPL',
    trial: true,
    features: [
      '50,000 events/month',
      '5 webhook endpoints',
      'WebSocket streaming',
      'Event replay',
      '30-day delivery logs',
      'Email support',
    ],
    cta: 'Start Free Trial',
    ctaHref: null,
    highlighted: false,
  },
  {
    name: 'Professional',
    plan: 'professional' as const,
    price: '$249',
    period: '/month',
    description: 'For production applications',
    trial: true,
    features: [
      '500,000 events/month',
      '25 webhook endpoints',
      'Priority delivery queue',
      'Custom retry policies',
      'Event replay with filtering',
      '90-day delivery logs',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    ctaHref: null,
    highlighted: false,
  },
  {
    name: 'Compliance',
    plan: 'compliance' as const,
    price: '$599',
    period: '/month',
    description: 'GENIUS Act ready. For regulated institutions.',
    trial: false,
    features: [
      '2,000,000 events/month',
      '100 webhook endpoints',
      'NemoClaw governance layer',
      'Continuous audit trail',
      'Anomaly detection alerts',
      'Privacy-preserving monitoring',
      '1-year delivery logs',
      'Dedicated support channel',
    ],
    cta: 'Get Started',
    ctaHref: null,
    highlighted: true,
  },
  {
    name: 'Enterprise',
    plan: null as null | 'builder' | 'professional' | 'compliance' | 'enterprise',
    price: 'Custom',
    period: '',
    description: 'For exchanges and stablecoin issuers',
    trial: false,
    features: [
      'Unlimited events',
      'Unlimited webhooks',
      'Dedicated infrastructure',
      '99.99% SLA guarantee',
      'Full NemoClaw governance suite',
      'Custom retention policies',
      'Dedicated support engineer',
      'SOC 2 compliance roadmap',
    ],
    cta: 'Contact Sales',
    ctaHref: 'mailto:enterprise@xrnotify.io',
    highlighted: false,
  },
];

// -----------------------------------------------------------------------------
// Pricing Card
// -----------------------------------------------------------------------------

function PricingCard({ tier }: { tier: (typeof tiers)[number] }) {
  return (
    <div
      className={`relative rounded-2xl p-6 flex flex-col min-h-[560px] ${
        tier.highlighted
          ? 'bg-gradient-to-b from-emerald-500/15 to-zinc-900/50 border border-emerald-500/40 ring-1 ring-emerald-500/20'
          : 'bg-zinc-900/60 border border-zinc-800/60'
      }`}
    >
      {tier.highlighted && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white shadow-lg shadow-emerald-500/25">
          Most Popular
        </span>
      )}

      {tier.trial && (
        <span className="inline-flex self-start mb-4 rounded-full bg-zinc-800 border border-zinc-700 px-2.5 py-0.5 text-[11px] font-medium text-zinc-400">
          14-day free trial
        </span>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
        <p className="mt-1 text-sm text-zinc-400">{tier.description}</p>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold text-white">{tier.price}</span>
        <span className="text-sm text-zinc-500">{tier.period}</span>
      </div>

      <ul className="mb-8 space-y-3 flex-1">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <svg
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span className="text-zinc-300">{feature}</span>
          </li>
        ))}
      </ul>

      {tier.plan ? (
        <CheckoutButton
          plan={tier.plan}
          label={tier.cta}
          className={`block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors ${
            tier.highlighted
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400'
              : 'bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600'
          }`}
        />
      ) : (
        <Link
          href={tier.ctaHref!}
          className={`block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors no-underline ${
            tier.highlighted
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400'
              : 'bg-zinc-800 text-white border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600'
          }`}
        >
          {tier.cta}
        </Link>
      )}

      {tier.trial ? (
        <p className="mt-3 text-center text-xs text-zinc-500">
          14-day free trial · No credit card required
        </p>
      ) : (
        <div className="h-[44px]" />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// FAQ
// -----------------------------------------------------------------------------

const faqs = [
  {
    question: 'What counts as an event?',
    answer:
      "An event is a single XRPL transaction that matches your webhook subscription. If you subscribe to payments for account rXYZ and that account receives 100 payments, that's 100 events.",
  },
  {
    question: 'What happens if I exceed my event limit?',
    answer:
      'Overage events are billed at $0.40 per 1,000 events on Builder, $0.30 on Professional, and $0.20 on Compliance. On the free Developer tier, delivery pauses until the next billing cycle.',
  },
  {
    question: 'Can I change plans anytime?',
    answer:
      'Yes! Upgrade instantly, downgrade at the end of your billing cycle. No long-term contracts.',
  },
  {
    question: 'Do you offer annual billing?',
    answer:
      'Yes, annual billing saves 20%. Contact us for annual pricing on Builder and Professional plans.',
  },
  {
    question: "What's the SLA for Enterprise?",
    answer:
      'Enterprise and Compliance customers receive uptime SLA guarantees with financial credits for any downtime. Enterprise includes 99.99% SLA with custom terms available.',
  },
];

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-5">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white no-underline transition-colors">
            <span>←</span>
            <span>Back to Home</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white no-underline transition-colors">
            Dashboard →
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section className="border-b border-white/5 py-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            Start free, scale as you grow. No hidden fees, no surprises.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
            {tiers.map((tier) => (
              <PricingCard key={tier.name} tier={tier} />
            ))}
          </div>
        </div>
      </section>

      {/* All Plans Include */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-12 text-center text-2xl font-bold text-white">All plans include</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              'HMAC webhook signatures',
              'Automatic retries with backoff',
              'Dead letter queue',
              'Delivery logs & debugging',
              'Real-time event streaming',
              'All XRPL event types',
              'REST API access',
              'Dashboard & analytics',
              'Email support',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 flex-shrink-0 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span className="text-zinc-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-12 text-center text-2xl font-bold text-white">
            Frequently asked questions
          </h2>
          <div className="space-y-8">
            {faqs.map((faq) => (
              <div key={faq.question} className="border-b border-white/5 pb-8 last:border-0">
                <h3 className="text-lg font-semibold text-white">{faq.question}</h3>
                <p className="mt-2 text-zinc-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white">Ready to get started?</h2>
          <p className="mt-4 text-zinc-400">
            Start with the free plan and upgrade when you need more.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 font-semibold text-white no-underline transition-all hover:from-emerald-400 hover:to-teal-400"
            >
              Start for free
            </Link>
            <Link
              href="/docs"
              className="rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 no-underline transition-colors hover:border-zinc-600 hover:text-white"
            >
              Read the docs
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
