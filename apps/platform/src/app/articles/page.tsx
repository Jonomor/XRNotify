import Link from 'next/link';
import type { Metadata } from 'next';
import { CONTENT_CLUSTER } from '@/lib/schema';
import { SiteNavbar } from '@/components/SiteNavbar';
import { getCurrentSession } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Articles & Guides',
  description:
    'Technical articles, how-to guides, and FAQs about XRNotify, XRPL webhooks, and real-time blockchain monitoring.',
  alternates: {
    canonical: 'https://www.xrnotify.io/articles',
  },
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  definition: 'Guide',
  faq: 'FAQ',
  'how-to': 'How-To',
  comparison: 'Comparison',
};

export default async function ArticlesPage() {
  const session = await getCurrentSession();
  const pillar = CONTENT_CLUSTER.find((a) => a.isPillar);
  const supporting = CONTENT_CLUSTER.filter((a) => !a.isPillar);

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
          Articles & Guides
        </h1>
        <p className="mt-4 text-lg text-zinc-400">
          Technical deep dives into XRNotify, XRPL webhooks, and real-time
          blockchain monitoring.
        </p>

        {/* Pillar Article */}
        {pillar && (
          <Link
            href={`/articles/${pillar.slug}`}
            className="group mt-12 block rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 no-underline transition-all hover:border-emerald-500/40"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                Pillar
              </span>
              <span className="text-sm text-zinc-500">
                {Math.ceil(pillar.wordCount / 200)} min read
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white transition-colors group-hover:text-emerald-400">
              {pillar.title}
            </h2>
            <p className="mt-3 text-zinc-400">{pillar.description}</p>
          </Link>
        )}

        {/* Supporting Articles */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {supporting.map((article) => (
            <Link
              key={article.slug}
              href={`/articles/${article.slug}`}
              className="group rounded-xl border border-white/5 bg-zinc-900/50 p-6 no-underline transition-all hover:border-emerald-500/30 hover:bg-zinc-900"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
                  {CONTENT_TYPE_LABELS[article.contentType] ?? article.contentType}
                </span>
                <span className="text-xs text-zinc-600">
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

        {/* Back to homepage */}
        <div className="mt-16 text-center">
          <Link
            href={session ? "/dashboard" : "/"}
            className="text-sm text-zinc-500 no-underline transition-colors hover:text-white"
          >
            &larr; {session ? "Back to Dashboard" : "Back to XRNotify"}
          </Link>
        </div>
      </main>
    </div>
  );
}
