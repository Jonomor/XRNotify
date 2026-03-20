import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Documentation - Coming Soon',
  description: 'This documentation page is coming soon.',
};

export default function DocsSlugPage({
  params,
}: {
  params: { slug: string[] };
}) {
  const path = params.slug.join('/');
  const title = params.slug[params.slug.length - 1]
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase()) ?? 'Documentation';

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased flex flex-col">
      <nav className="border-b border-white/5 px-6 py-5 lg:px-8">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Link href="/docs" className="text-sm text-zinc-400 no-underline transition-colors hover:text-white">
            ← Back to Docs
          </Link>
          <Link href="/" className="text-sm text-zinc-500 no-underline transition-colors hover:text-white">
            XRNotify
          </Link>
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-20 text-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 mb-8">
            Coming Soon
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">{title}</h1>
          <p className="text-zinc-400 text-lg max-w-md mx-auto mb-4">
            This documentation page is currently being written.
          </p>
          <p className="text-zinc-600 text-sm font-mono mb-10">
            /docs/{path}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/docs"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold text-zinc-300 no-underline transition-colors hover:border-white/20 hover:text-white"
            >
              Browse all docs
            </Link>
            <a
              href="mailto:support@xrnotify.io"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white no-underline transition-opacity hover:opacity-90"
            >
              Contact support
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
