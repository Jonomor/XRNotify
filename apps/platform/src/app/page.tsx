// =============================================================================
// XRNotify Platform - Landing Page
// =============================================================================
// Premium marketing landing page - Dark theme, sophisticated blockchain aesthetic
// =============================================================================

import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { HeroAnimation } from '@/components/HeroAnimation';
import { CONTENT_CLUSTER, FAQ_ITEMS } from '@/lib/schema';

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'XRNotify — Real-Time XRPL Webhook Infrastructure | Jonomor',
  description:
    'Enterprise-grade webhook infrastructure for the XRP Ledger. Real-time event streaming, guaranteed delivery, and developer-first APIs.',
  openGraph: {
    title: 'XRNotify — Real-Time XRPL Webhook Infrastructure | Jonomor',
    description: 'Enterprise-grade webhook infrastructure for the XRP Ledger.',
    type: 'website',
    url: 'https://www.xrnotify.io',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XRNotify — Real-Time XRPL Webhook Infrastructure | Jonomor',
    description: 'Enterprise-grade webhook infrastructure for the XRP Ledger.',
  },
};

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------

const CONTENT_TYPE_LABELS: Record<string, string> = {
  definition: 'Guide',
  faq: 'FAQ',
  'how-to': 'How-To',
  comparison: 'Comparison',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
{/* FAQPage JSON-LD is now in layout.tsx */}

      {/* Animated Background Grid */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute left-1/4 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-gradient-to-bl from-blue-500/10 via-cyan-500/5 to-transparent blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/5">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-3 no-underline">
            <div className="relative flex h-10 w-10 items-center justify-center">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 opacity-30 blur-sm transition-all group-hover:opacity-60" />
              <Image src="/logo.svg" alt="XRNotify" width={40} height={40} className="relative" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-white">XRNotify</span>
          </Link>

          <div className="hidden items-center gap-10 md:flex">
            <Link href="#features" className="text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white">Features</Link>
            <Link href="#events" className="text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white">Events</Link>
            <Link href="#pricing" className="text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white">Pricing</Link>
            <Link href="/about" className="text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white">About</Link>
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
              <span className="relative z-10">Get Started</span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pb-24 pt-20 lg:px-8 lg:pb-32 lg:pt-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            {/* Status Badge */}
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-5 py-2 backdrop-blur-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-sm font-medium text-emerald-400">Live on XRPL Mainnet</span>
            </div>

            <h1 className="text-5xl font-bold leading-[1.1] tracking-tight sm:text-7xl">
              <span className="text-white">Webhook Infrastructure</span>
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                for the XRP Ledger
              </span>
            </h1>

            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
              Stop polling. Start building. Get instant HTTP notifications when
              transactions confirm — payments, NFTs, DEX trades, and more.
              Enterprise reliability with sub-second delivery.
            </p>

            {/* CTA Buttons */}
            <div className="mt-12 flex flex-col items-center justify-center gap-5 sm:flex-row">
              <Link
                href="/signup"
                className="group relative w-full overflow-hidden rounded-full bg-blue-600 border border-blue-500 px-8 py-4 text-base font-bold text-white no-underline shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-500/30 sm:w-auto"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Start Free
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
              <Link
                href="/docs"
                className="group flex w-full items-center justify-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/50 px-8 py-4 text-base font-semibold text-white no-underline backdrop-blur-sm transition-all hover:border-zinc-600 hover:bg-zinc-800/50 sm:w-auto"
              >
                <svg className="h-5 w-5 text-zinc-500 transition-colors group-hover:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
                Documentation
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-zinc-500">
              {['500 free events/month', 'No credit card required', 'Setup in 30 seconds'].map((text) => (
                <div key={text} className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Code Terminal */}
          <div className="mx-auto mt-20 max-w-4xl">
            <div className="relative">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 blur-lg" />
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 shadow-2xl backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      <div className="h-3 w-3 rounded-full bg-zinc-700" />
                      <div className="h-3 w-3 rounded-full bg-zinc-700" />
                      <div className="h-3 w-3 rounded-full bg-zinc-700" />
                    </div>
                    <span className="ml-2 text-sm text-zinc-500">Create a webhook in one API call</span>
                  </div>
                  <button className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white">
                    Copy
                  </button>
                </div>
                <div className="overflow-x-auto p-6">
                  <pre className="text-sm leading-relaxed sm:text-base"><code><span className="text-emerald-400">curl</span><span className="text-zinc-300"> -X POST https://api.xrnotify.io/v1/webhooks \</span>{'\n'}<span className="text-zinc-300">  -H </span><span className="text-amber-300">&quot;X-XRNotify-Key: xrn_live_k3y...&quot;</span><span className="text-zinc-300"> \</span>{'\n'}<span className="text-zinc-300">  -H </span><span className="text-amber-300">&quot;Content-Type: application/json&quot;</span><span className="text-zinc-300"> \</span>{'\n'}<span className="text-zinc-300">  -d </span><span className="text-cyan-300">&apos;{'{'}</span>{'\n'}<span className="text-zinc-500">    </span><span className="text-cyan-200">&quot;url&quot;</span><span className="text-zinc-300">: </span><span className="text-emerald-300">&quot;https://yourapp.com/webhooks/xrpl&quot;</span><span className="text-zinc-300">,</span>{'\n'}<span className="text-zinc-500">    </span><span className="text-cyan-200">&quot;event_types&quot;</span><span className="text-zinc-300">: [</span><span className="text-emerald-300">&quot;payment.*&quot;</span><span className="text-zinc-300">, </span><span className="text-emerald-300">&quot;nft.minted&quot;</span><span className="text-zinc-300">],</span>{'\n'}<span className="text-zinc-500">    </span><span className="text-cyan-200">&quot;account_filters&quot;</span><span className="text-zinc-300">: [</span><span className="text-emerald-300">&quot;rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe&quot;</span><span className="text-zinc-300">]</span>{'\n'}<span className="text-cyan-300">&apos;{'}'}</span></code></pre>
                </div>
                <div className="border-t border-white/5 bg-zinc-900/50 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 items-center rounded-full bg-emerald-500/10 px-2 text-xs font-medium text-emerald-400">
                      201 Created
                    </span>
                    <span className="text-sm text-zinc-500">
                      Webhook active — you&apos;ll receive events instantly
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Animation */}
          <div className="mx-auto mt-16 max-w-4xl">
            <HeroAnimation />
          </div>
        </div>
      </section>

      {/* Metrics Bar */}
      <section className="border-y border-white/5 bg-zinc-900/30">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { value: '<1s', label: 'Avg Delivery Time' },
              { value: '99.9%', label: 'Uptime SLA' },
              { value: '10M+', label: 'Events Delivered' },
              { value: '24/7', label: 'Mainnet Monitoring' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-white sm:text-4xl">{stat.value}</div>
                <div className="mt-2 text-sm text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative px-6 py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Built for production.
              <br />
              <span className="text-zinc-500">Designed for developers.</span>
            </h2>
            <p className="mt-6 text-lg text-zinc-400">
              Everything you need to build reactive applications on the XRP Ledger,
              without managing infrastructure.
            </p>
          </div>

          <div className="mx-auto mt-20 grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-b from-zinc-900/50 to-zinc-900/0 p-8 transition-all hover:border-white/10 hover:bg-zinc-900/50"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{feature.description}</p>
                <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-emerald-500/5 opacity-0 blur-3xl transition-opacity group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Event Types Section */}
      <section id="events" className="relative border-y border-white/5 bg-zinc-900/30 px-6 py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Every transaction type.
              <br />
              <span className="text-zinc-500">One unified schema.</span>
            </h2>
            <p className="mt-6 text-lg text-zinc-400">
              We parse the raw XRPL transaction format and normalize it into clean,
              typed JSON. No blockchain expertise required.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-5xl">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {eventTypes.map((type) => (
                <div
                  key={type.name}
                  className="group relative overflow-hidden rounded-xl border border-white/5 bg-zinc-900/50 p-5 transition-all hover:border-emerald-500/30 hover:bg-zinc-900"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-800 text-xl transition-transform group-hover:scale-110">
                      {type.emoji}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{type.name}</p>
                      <p className="text-sm text-zinc-500">
                        {type.count} event {type.count === 1 ? 'type' : 'types'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 rounded-2xl border border-white/5 bg-zinc-950/50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-400">Example: Payment Event</span>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                  payment.xrp
                </span>
              </div>
              <pre className="overflow-x-auto text-sm">
                <code className="text-zinc-400">{`{
  "event_id": "xrpl:85432109:ABC123...DEF:payment.xrp",
  "event_type": "payment.xrp",
  "timestamp": "2024-01-15T10:30:00Z",
  "ledger_index": 85432109,
  "tx_hash": "ABC123...DEF",
  "payload": {
    "sender": "rSenderAddress...",
    "receiver": "rReceiverAddress...",
    "amount": "1000000",
    "delivered_amount": "1000000"
  }
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative px-6 py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Three steps to real-time.
            </h2>
            <p className="mt-6 text-lg text-zinc-400">
              From zero to production-ready webhooks in under a minute.
            </p>
          </div>

          <div className="mx-auto mt-20 max-w-5xl">
            <div className="grid gap-12 md:grid-cols-3">
              {[
                {
                  step: '01',
                  title: 'Create your webhook',
                  description: 'Specify your endpoint URL and the events you want to receive. Filter by account or event type.',
                },
                {
                  step: '02',
                  title: 'Get your secret',
                  description: 'We generate a unique signing secret. Use it to verify webhook authenticity in your app.',
                },
                {
                  step: '03',
                  title: 'Receive events',
                  description: 'When matching transactions confirm on XRPL, we deliver signed JSON to your endpoint instantly.',
                },
              ].map((item) => (
                <div key={item.step}>
                  <div className="mb-6 text-5xl font-bold text-zinc-800">{item.step}</div>
                  <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-3 text-zinc-400">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative border-y border-white/5 bg-zinc-900/30 px-6 py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Simple, predictable pricing.
            </h2>
            <p className="mt-6 text-lg text-zinc-400">
              Start free. Scale as you grow. No surprises.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-6xl gap-8 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative overflow-hidden rounded-2xl border p-8 ${
                  plan.featured
                    ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-500/10 to-transparent'
                    : 'border-white/5 bg-zinc-900/50'
                }`}
              >
                {plan.featured && (
                  <div className="absolute right-6 top-6">
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                      Popular
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                <p className="mt-2 text-sm text-zinc-400">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-zinc-500">{plan.period}</span>}
                </div>
                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-zinc-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-8 block w-full rounded-full py-3 text-center text-sm font-semibold no-underline transition-all ${
                    plan.featured
                      ? 'bg-blue-600 border border-blue-500 text-white font-bold shadow-md hover:bg-blue-700 hover:shadow-lg'
                      : 'border border-zinc-700 bg-zinc-800/50 text-white hover:bg-zinc-800'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-12 text-center text-sm text-zinc-500">
            Need more?{' '}
            <Link href="/contact" className="text-emerald-400 no-underline hover:underline">Contact us</Link>
            {' '}for enterprise pricing with custom SLAs, dedicated support, and on-premise options.
          </p>
        </div>
      </section>

      {/* Quick Answers (FAQ) */}
      <section id="faq" className="relative px-6 py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-6 text-lg text-zinc-400">
              Common questions about XRNotify and how it works.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-3xl divide-y divide-white/5">
            {FAQ_ITEMS.map((item) => (
              <div key={item.question} className="py-8">
                <h3 className="text-lg font-semibold text-white">{item.question}</h3>
                <p className="mt-3 text-zinc-400 leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Articles & Guides */}
      <section className="border-y border-white/5 bg-zinc-900/30 px-6 py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Articles & Guides
            </h2>
            <p className="mt-6 text-lg text-zinc-400">
              Technical deep dives into XRNotify, XRPL webhooks, and real-time blockchain monitoring.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-4xl grid gap-4 sm:grid-cols-2">
            {CONTENT_CLUSTER.map((article) => (
              <Link
                key={article.slug}
                href={`/articles/${article.slug}`}
                className={`group rounded-xl border p-6 no-underline transition-all ${
                  article.isPillar
                    ? 'sm:col-span-2 border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40'
                    : 'border-white/5 bg-zinc-900/50 hover:border-white/10 hover:bg-zinc-900'
                }`}
              >
                <div className="mb-2 flex items-center gap-3">
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                    {CONTENT_TYPE_LABELS[article.contentType] ?? article.contentType}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {Math.ceil(article.wordCount / 200)} min read
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white transition-colors group-hover:text-emerald-400">
                  {article.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-500">{article.description}</p>
              </Link>
            ))}
          </div>

          <div className="mx-auto mt-10 flex max-w-3xl flex-col items-center justify-center gap-6 text-center sm:flex-row sm:gap-10">
            <Link href="/about" className="text-base font-medium text-emerald-400 no-underline transition-colors hover:text-emerald-300">
              Learn more about XRNotify
            </Link>
            <Link href="/ecosystem" className="text-base font-medium text-emerald-400 no-underline transition-colors hover:text-emerald-300">
              Explore the Jonomor Ecosystem
            </Link>
          </div>
        </div>
      </section>

      {/* Author Byline */}
      <section className="px-6 py-12 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm text-zinc-500">
            Built by{' '}
            <a
              href="https://www.jonomor.com/ali-morgan"
              className="text-emerald-400 no-underline transition-colors hover:text-emerald-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ali Morgan
            </a>
            {' · '}
            Part of the{' '}
            <a
              href="https://www.jonomor.com"
              className="text-emerald-400 no-underline transition-colors hover:text-emerald-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              Jonomor
            </a>
            {' ecosystem'}
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden px-6 py-24 lg:px-8 lg:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Ready to stop polling?
          </h2>
          <p className="mt-6 text-lg text-zinc-400">
            Join developers building the next generation of XRPL applications.
            Get started in minutes.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="group relative w-full overflow-hidden rounded-full bg-blue-600 border border-blue-500 px-8 py-4 text-base font-bold text-white no-underline shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-500/30 sm:w-auto"
            >
              <span className="relative z-10">Create Free Account</span>
            </Link>
            <Link href="/docs" className="text-sm font-medium text-zinc-400 no-underline transition-colors hover:text-white">
              Read the docs →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex items-center gap-3">
              <Image src="/logo.svg" alt="XRNotify" width={36} height={36} />
              <span className="text-lg font-semibold text-white">XRNotify</span>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-sm">
              {[
                { href: '/docs', label: 'Docs' },
                { href: '/pricing', label: 'Pricing' },
                { href: '/about', label: 'About' },
                { href: '/articles', label: 'Articles' },
                { href: '/ecosystem', label: 'Ecosystem' },
                { href: '/privacy', label: 'Privacy' },
                { href: '/terms', label: 'Terms' },
              ].map((link) => (
                <Link key={link.href} href={link.href} className="text-zinc-500 no-underline transition-colors hover:text-white">
                  {link.label}
                </Link>
              ))}
              <a href="mailto:hello@xrnotify.io" className="text-zinc-500 no-underline transition-colors hover:text-white">Contact</a>
            </div>

            <p className="text-sm text-zinc-600">&copy; {new Date().getFullYear()} XRNotify</p>
          </div>

        </div>
      </footer>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Data
// -----------------------------------------------------------------------------

const features = [
  {
    title: 'Sub-Second Delivery',
    description:
      'Events delivered within 500ms of ledger close. Persistent WebSocket connections to multiple XRPL nodes ensure zero lag.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    title: 'Guaranteed Delivery',
    description:
      'Automatic retries with exponential backoff. Dead-letter queues for failed deliveries. Full replay capability for recovery.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    title: 'HMAC Signatures',
    description:
      'Every webhook is cryptographically signed with your secret. Verify authenticity and prevent forgery with one line of code.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    title: 'Event Replay',
    description:
      'Missed something? Replay any event from the last 30 days with one click. Perfect for debugging and backfilling data.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    ),
  },
  {
    title: 'Full Delivery Logs',
    description:
      'Complete visibility into every delivery attempt. Request payloads, response codes, response bodies, and latency metrics.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
  },
  {
    title: 'Account Filtering',
    description:
      'Subscribe to events for specific accounts only. Track exactly what matters to your application, nothing more.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
      </svg>
    ),
  },
];

const eventTypes = [
  { name: 'Payments', emoji: '💸', count: 3 },
  { name: 'NFTs', emoji: '🖼️', count: 6 },
  { name: 'DEX', emoji: '📈', count: 4 },
  { name: 'Trust Lines', emoji: '🔗', count: 3 },
  { name: 'Escrow', emoji: '🔒', count: 3 },
  { name: 'Checks', emoji: '📋', count: 3 },
  { name: 'Accounts', emoji: '👤', count: 2 },
  { name: 'AMM', emoji: '🌊', count: 4 },
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
      '500 events per month',
      '1 webhook endpoint',
      'Core event types',
      '3-day delivery logs',
      'Community support',
    ],
  },
  {
    name: 'Starter',
    description: 'For indie developers and small teams.',
    price: '$29',
    period: '/mo',
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
    description: 'For production applications.',
    price: '$99',
    period: '/mo',
    cta: 'Start Free Trial',
    featured: false,
    features: [
      '500,000 events per month',
      '50 webhook endpoints',
      'Priority delivery queue',
      '90-day delivery logs',
      'Custom retry policies',
      'Raw transaction data',
      'Priority support',
    ],
  },
];
