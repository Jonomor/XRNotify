import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Licensing',
  description:
    'License XRNotify governed monitoring infrastructure for white-label deployment, OEM integration, or framework reference implementation.',
  alternates: { canonical: 'https://www.xrnotify.io/licensing' },
};

export default function LicensingPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-5">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white no-underline transition-colors">
            <span>Home</span>
          </Link>
          <Link href="/pricing" className="text-sm text-zinc-400 hover:text-white no-underline transition-colors">
            Pricing
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Enterprise Licensing
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
            Deploy XRNotify's governed monitoring infrastructure under your own
            brand. Nine layers of institutional security, compliance-ready for
            the GENIUS Act, built for exchanges, wallet providers, and fintech
            platforms that need XRPL monitoring without building it from scratch.
          </p>
        </div>
      </section>

      {/* License Types */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-3">
            {/* White-Label */}
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-8 flex flex-col">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 7.5h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white">White-Label License</h3>
              <p className="mt-3 text-sm text-zinc-400 flex-1">
                Run the full XRNotify monitoring engine under your own brand.
                Your customers see your name, your dashboard, your domain.
                Built for exchanges and wallet providers that need
                institutional-grade XRPL monitoring as a core product feature.
              </p>
            </div>

            {/* OEM */}
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-8 flex flex-col">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.546 3.187 1.079 4.686M6 21h12M6 21H3m3 0l1.5-7.5M18 21h3m-3 0l-1.5-7.5m0 0H9m4.5 0V3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V9.75" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white">OEM Integration</h3>
              <p className="mt-3 text-sm text-zinc-400 flex-1">
                Embed XRNotify webhook delivery as a hidden infrastructure
                layer inside your existing platform. Your users never see
                XRNotify directly. Built for fintech platforms and payment
                processors that need XRPL event streaming as a backend service.
              </p>
            </div>

            {/* Framework */}
            <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-8 flex flex-col">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white">Framework License</h3>
              <p className="mt-3 text-sm text-zinc-400 flex-1">
                License the nine-layer institutional architecture as a
                reference implementation for other blockchains. NemoClaw
                governance, Langfuse observability, AI classification,
                and audit trail export. Built for infrastructure companies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* All Licenses Include */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-12 text-center text-2xl font-bold text-white">All licenses include</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              'NemoClaw execution governance',
              'Continuous audit trail export',
              'AI anomaly classification',
              'Langfuse observability',
              'HMAC-SHA256 signed delivery',
              'Dedicated integration support',
              '23 XRPL event types',
              'Custom SLA guarantees',
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

      {/* CTA */}
      <section className="border-t border-white/5 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white">Ready to license?</h2>
          <p className="mt-4 text-zinc-400">
            Tell us about your use case. We will scope the right license
            for your deployment model and volume requirements.
          </p>
          <a
            href="mailto:licensing@xrnotify.io"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 text-base font-bold !text-white no-underline shadow-lg transition-all hover:from-emerald-400 hover:to-teal-400 hover:!text-white hover:no-underline"
          >
            Contact Licensing
          </a>
        </div>
      </section>

      {/* Legal + Footer */}
      <section className="border-t border-white/5 py-12">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="text-sm text-zinc-500">
            <a href="/terms" className="text-zinc-400 underline hover:text-white">Terms of Service</a>
            {' · '}
            <a href="/privacy" className="text-zinc-400 underline hover:text-white">Privacy Policy</a>
          </div>
          <p className="mt-6 text-sm text-zinc-600">
            Built by{' '}
            <a href="https://www.jonomor.com/ali-morgan" className="text-zinc-500 no-underline hover:text-zinc-400" target="_blank" rel="noopener noreferrer">
              Ali Morgan
            </a>
            . Part of the{' '}
            <a href="https://www.jonomor.com" className="text-zinc-500 no-underline hover:text-zinc-400" target="_blank" rel="noopener noreferrer">
              Jonomor Ecosystem
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
