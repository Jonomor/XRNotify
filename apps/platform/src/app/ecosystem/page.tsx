import Link from 'next/link';
import type { Metadata } from 'next';
import { SiteNavbar } from '@/components/SiteNavbar';
import { getCurrentSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Jonomor Ecosystem',
  description:
    'XRNotify is part of the Jonomor ecosystem, a suite of interconnected software products built by Ali Morgan, spanning AI Visibility, contract analysis, property operations, financial research, education, and real-time XRPL infrastructure.',
  alternates: {
    canonical: 'https://www.xrnotify.io/ecosystem',
  },
};

interface EcosystemEntity {
  name: string;
  description: string;
  url: string;
  isCurrent: boolean;
}

const entities: EcosystemEntity[] = [
  {
    name: 'Jonomor',
    description:
      'AI Visibility consulting and systems architecture studio.',
    url: 'https://www.jonomor.com',
    isCurrent: false,
  },
  {
    name: 'Guard-Clause',
    description:
      'AI-powered contract risk analysis with negotiation packs and addendum builders.',
    url: 'https://www.guard-clause.com',
    isCurrent: false,
  },
  {
    name: 'MyPropOps',
    description:
      'Compliance-centered property operations software for landlords and property managers.',
    url: 'https://www.mypropops.com',
    isCurrent: false,
  },
  {
    name: 'XRNotify',
    description:
      'Real-time XRPL webhook infrastructure for the XRP Ledger.',
    url: 'https://www.xrnotify.io',
    isCurrent: true,
  },
  {
    name: 'The Neutral Bridge',
    description: 'Financial infrastructure research and analysis.',
    url: 'https://www.theneutralbridge.com',
    isCurrent: false,
  },
  {
    name: 'Evenfield',
    description: 'AI-powered homeschool education platform.',
    url: 'https://www.evenfield.io',
    isCurrent: false,
  },
  {
    name: 'H.U.N.I.E.',
    description:
      'Persistent confidence-aware memory engine for AI agents.',
    url: 'https://www.hunie.ai',
    isCurrent: false,
  },
  {
    name: 'AI-Presence',
    description:
      'AI Visibility scoring and optimization platform for websites.',
    url: 'https://www.ai-presence.com',
    isCurrent: false,
  },
  {
    name: 'Ali Morgan',
    description: 'Founder and architect of the Jonomor ecosystem.',
    url: 'https://www.jonomor.com/ali-morgan',
    isCurrent: false,
  },
];

export default async function EcosystemPage() {
  const session = await getCurrentSession();
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
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

      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Jonomor Ecosystem
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-zinc-400">
          XRNotify is the instrumentation layer of the Jonomor ecosystem: the
          foundational data capture layer that feeds analytics, automation,
          compliance monitoring, and AI-driven decision systems. Every system
          begins with sensing: capturing the raw signals that downstream
          intelligence depends on. XRNotify fulfills this role for the XRP
          Ledger, transforming on-chain activity into structured, deliverable
          events that other systems can act on.
        </p>
        <p className="mt-4 text-lg text-zinc-400">
          The ecosystem is a suite of interconnected software products built by{' '}
          <a
            href="https://www.jonomor.com/ali-morgan"
            className="text-emerald-400 no-underline transition-colors hover:text-emerald-300"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ali Morgan
          </a>
          .
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {entities.map((entity) => (
            <a
              key={entity.name}
              href={entity.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative rounded-xl border p-6 no-underline transition-all ${
                entity.isCurrent
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-white/5 bg-zinc-900/50 hover:border-white/10 hover:bg-zinc-900'
              }`}
            >
              {entity.isCurrent && (
                <span className="absolute right-4 top-4 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  YOU ARE HERE
                </span>
              )}
              <h2 className="text-lg font-semibold text-white transition-colors group-hover:text-emerald-400">
                {entity.name}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                {entity.description}
              </p>
              <p className="mt-3 text-xs text-zinc-600">{entity.url}</p>
            </a>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
          <Link
            href={session ? "/dashboard" : "/"}
            className="text-sm text-zinc-500 no-underline transition-colors hover:text-white"
          >
            &larr; {session ? "Back to Dashboard" : "Back to XRNotify"}
          </Link>
          <a
            href="https://www.jonomor.com/ecosystem"
            className="text-sm text-emerald-400 no-underline transition-colors hover:text-emerald-300"
            target="_blank"
            rel="noopener noreferrer"
          >
            Full ecosystem overview on Jonomor &rarr;
          </a>
        </div>
      </main>
    </div>
  );
}
