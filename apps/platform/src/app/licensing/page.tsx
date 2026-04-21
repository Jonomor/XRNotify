import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNavbar } from '@/components/SiteNavbar';
import { getCurrentSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Enterprise Licensing',
  description: 'License XRNotify governed XRPL monitoring infrastructure for white-label deployment, OEM integration, or framework reference implementation.',
  alternates: { canonical: 'https://www.xrnotify.io/licensing' },
};

export default async function LicensingPage() {
  const session = await getCurrentSession();
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <SiteNavbar />
      {session && (
        <div className="border-b border-white/5 px-6 py-3">
          <div className="mx-auto max-w-7xl">
            <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-white no-underline transition-colors">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 mb-8">
            Institutional Infrastructure
          </div>
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            License the Monitoring Infrastructure Behind XRNotify
          </h1>
          <p className="mt-6 text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            XRNotify is the only XRPL monitoring platform with
            NVIDIA NemoClaw governance, AI-powered anomaly
            classification, persistent ecosystem memory, and
            compliance-grade audit trail export. License the
            full stack for deployment under your own brand.
          </p>
        </div>
      </section>

      {/* Why License */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-white text-center mb-12">
            Why License Instead of Subscribe
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
              <h3 className="font-semibold text-white mb-2">Brand Control</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Your customers interact with your brand, not ours.
                White-label deployment means XRNotify's engine
                powers your product invisibly. Your name, your
                dashboard, your customer relationship.
              </p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
              <h3 className="font-semibold text-white mb-2">Regulatory Independence</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Stablecoin issuers and exchanges operating under
                GENIUS Act requirements need monitoring
                infrastructure they control. A licensed deployment
                means your compliance team owns the audit trail
                end to end.
              </p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
              <h3 className="font-semibold text-white mb-2">Custom Integration</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Connect XRNotify's event pipeline directly to your
                internal systems. Custom event types, proprietary
                classification models, and dedicated infrastructure
                sized to your transaction volume.
              </p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
              <h3 className="font-semibold text-white mb-2">No Vendor Dependency</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                A licensed deployment runs on your infrastructure.
                Your uptime, your SLA, your ops team. Jonomor
                provides the architecture, integration support,
                and ongoing updates. You own the deployment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Three License Types */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-white text-center mb-12">
            License Options
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8 flex flex-col">
              <h3 className="text-xl font-bold text-white">
                White-Label
              </h3>
              <p className="mt-2 text-sm text-emerald-400">
                For exchanges and wallet providers
              </p>
              <p className="mt-4 text-sm text-zinc-400 leading-relaxed flex-1">
                Deploy XRNotify's complete monitoring engine under
                your own brand. Full dashboard, API, webhook
                delivery, NemoClaw governance, and AI classification.
                Your customers see your product. XRNotify's
                architecture powers it. Includes dedicated
                onboarding, custom branding integration, and
                quarterly architecture reviews.
              </p>
              <div className="mt-6 pt-6 border-t border-white/5">
                <p className="text-xs text-zinc-500">Includes</p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                  <li>Full platform deployment</li>
                  <li>Custom branding</li>
                  <li>Dedicated infrastructure</li>
                  <li>Onboarding + training</li>
                  <li>Quarterly architecture reviews</li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8 flex flex-col">
              <h3 className="text-xl font-bold text-white">
                OEM Integration
              </h3>
              <p className="mt-2 text-sm text-emerald-400">
                For fintech platforms and payment processors
              </p>
              <p className="mt-4 text-sm text-zinc-400 leading-relaxed flex-1">
                Embed XRNotify's webhook delivery engine as a
                hidden infrastructure layer inside your product.
                Your customers subscribe to XRPL events through
                your interface. XRNotify handles event capture,
                normalization, signing, delivery, and retry logic
                behind the scenes. Per-event pricing scales with
                your growth.
              </p>
              <div className="mt-6 pt-6 border-t border-white/5">
                <p className="text-xs text-zinc-500">Includes</p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                  <li>Embedded delivery pipeline</li>
                  <li>Per-event usage pricing</li>
                  <li>API integration support</li>
                  <li>Shared infrastructure option</li>
                  <li>Volume-based discounts</li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8 flex flex-col">
              <h3 className="text-xl font-bold text-white">
                Framework License
              </h3>
              <p className="mt-2 text-sm text-emerald-400">
                For infrastructure companies on other chains
              </p>
              <p className="mt-4 text-sm text-zinc-400 leading-relaxed flex-1">
                License the institutional monitoring architecture
                as a reference implementation for any blockchain.
                NemoClaw governance, persistent memory via
                H.U.N.I.E., AI anomaly classification, Bifrost
                gateway observability, and compliance audit trail export.
                Adapt the architecture to Solana, Ethereum L2s,
                or any chain your business requires.
              </p>
              <div className="mt-6 pt-6 border-t border-white/5">
                <p className="text-xs text-zinc-500">Includes</p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                  <li>Full architecture documentation</li>
                  <li>Reference implementation</li>
                  <li>Chain adaptation support</li>
                  <li>Annual maintenance + updates</li>
                  <li>Architecture consulting</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Every License Includes */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-3xl rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-10 text-center">
          <h3 className="text-xl font-bold text-white">
            Every License Includes
          </h3>
          <div className="mt-8 grid grid-cols-2 gap-y-4 gap-x-8 text-sm text-zinc-400 max-w-lg mx-auto text-left">
            <div>NemoClaw execution governance</div>
            <div>Continuous audit trail export</div>
            <div>AI anomaly classification</div>
            <div>Full delivery observability</div>
            <div>HMAC-SHA256 signed delivery</div>
            <div>Dedicated integration engineer</div>
            <div>23 XRPL event types</div>
            <div>Custom SLA guarantees</div>
            <div>Persistent intelligence memory</div>
            <div>Enterprise security controls</div>
            <div>Dead-letter queue + replay</div>
            <div>Usage governance and rate controls</div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-white mb-12">
            Licensing Process
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <div className="text-3xl font-bold text-emerald-400 mb-3">01</div>
              <h4 className="font-semibold text-white mb-2">Discovery</h4>
              <p className="text-sm text-zinc-400">
                We assess your transaction volume, compliance
                requirements, infrastructure environment, and
                integration timeline.
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-emerald-400 mb-3">02</div>
              <h4 className="font-semibold text-white mb-2">Architecture</h4>
              <p className="text-sm text-zinc-400">
                We deliver a custom deployment plan covering
                infrastructure sizing, governance configuration,
                and integration specifications.
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-emerald-400 mb-3">03</div>
              <h4 className="font-semibold text-white mb-2">Deployment</h4>
              <p className="text-sm text-zinc-400">
                We deploy, configure, and validate the licensed
                infrastructure with your engineering team.
                Ongoing support and updates included.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Ready to Deploy Institutional-Grade Monitoring
          </h2>
          <p className="text-zinc-400 mb-8">
            Tell us about your requirements. We respond within
            24 hours.
          </p>
          <a
            href="mailto:licensing@xrnotify.io"
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 text-base font-bold !text-white no-underline shadow-lg transition-all hover:from-emerald-400 hover:to-teal-400 hover:!text-white hover:no-underline"
          >
            Contact Licensing
          </a>
        </div>
      </section>

      {/* Legal */}
      <div className="px-6 pb-12 text-center text-sm text-zinc-500">
        By engaging licensing services, you agree to our{' '}
        <a href="/terms" className="text-zinc-400 underline hover:text-white">
          Terms of Service
        </a>
        {' '}and{' '}
        <a href="/privacy" className="text-zinc-400 underline hover:text-white">
          Privacy Policy
        </a>
        .
      </div>

      <footer className="border-t border-white/5 px-6 py-8 text-center text-xs text-zinc-600">
        Built by Ali Morgan. Part of the Jonomor Ecosystem.
      </footer>
    </main>
  );
}
