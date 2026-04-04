import Link from 'next/link';
import {
  CANONICAL_URLS,
  CONTENT_CLUSTER,
  getTechArticleSchema,
} from '@/lib/schema';
import type { ArticleDefinition } from '@/lib/schema';

interface ArticleLayoutProps {
  article: ArticleDefinition;
  children: React.ReactNode;
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  definition: 'Guide',
  faq: 'FAQ',
  'how-to': 'How-To',
  comparison: 'Comparison',
};

export function ArticleLayout({ article, children }: ArticleLayoutProps) {
  const readingTime = Math.ceil(article.wordCount / 200);
  const pillar = CONTENT_CLUSTER.find((a) => a.isPillar);
  const relatedArticles = CONTENT_CLUSTER.filter((a) => a.slug !== article.slug);
  const jsonLd = getTechArticleSchema(article);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Navigation */}
      <nav className="border-b border-white/5">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link
            href="/"
            className="text-lg font-semibold text-white no-underline"
          >
            XRNotify
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/articles"
              className="text-sm text-zinc-400 no-underline transition-colors hover:text-white"
            >
              Articles
            </Link>
            <Link
              href="/docs"
              className="text-sm text-zinc-400 no-underline transition-colors hover:text-white"
            >
              Docs
            </Link>
          </div>
        </div>
      </nav>

      <article className="mx-auto max-w-4xl px-6 py-16">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8 text-sm text-zinc-500">
          <ol className="flex items-center gap-2">
            <li>
              <Link href="/" className="text-zinc-500 no-underline transition-colors hover:text-white">
                XRNotify
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/articles" className="text-zinc-500 no-underline transition-colors hover:text-white">
                Articles
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-zinc-400">{article.title}</li>
          </ol>
        </nav>

        {/* Header */}
        <header className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              {CONTENT_TYPE_LABELS[article.contentType] ?? article.contentType}
            </span>
            <span className="text-sm text-zinc-500">{readingTime} min read</span>
          </div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            {article.title}
          </h1>
          <p className="mt-4 text-lg text-zinc-400">{article.description}</p>
          <div className="mt-6 flex items-center gap-2 text-sm text-zinc-500">
            <span>By</span>
            <a
              href={CANONICAL_URLS.aliMorgan}
              className="text-emerald-400 no-underline transition-colors hover:text-emerald-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ali Morgan
            </a>
            <span className="mx-1">·</span>
            <time dateTime={article.datePublished}>
              {new Date(article.datePublished).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </div>
        </header>

        {/* Back-link to pillar (if not the pillar) */}
        {!article.isPillar && pillar && (
          <div className="mb-10 rounded-lg border border-white/5 bg-zinc-900/50 p-4">
            <p className="text-sm text-zinc-400">
              Part of the XRNotify knowledge base.{' '}
              <Link
                href={`/articles/${pillar.slug}`}
                className="text-emerald-400 no-underline transition-colors hover:text-emerald-300"
              >
                Start with: {pillar.title}
              </Link>
            </p>
          </div>
        )}

        {/* Article Content */}
        <div className="prose prose-invert prose-zinc max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h2:mt-12 prose-h2:text-2xl prose-h3:mt-8 prose-h3:text-xl prose-p:leading-relaxed prose-p:text-zinc-300 prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:text-emerald-300 prose-strong:text-white prose-code:rounded prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-emerald-300 prose-pre:border prose-pre:border-white/5 prose-pre:bg-zinc-950 prose-li:text-zinc-300 prose-table:border-collapse prose-th:border prose-th:border-white/10 prose-th:bg-zinc-900/50 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:text-white prose-td:border prose-td:border-white/10 prose-td:px-4 prose-td:py-2 prose-td:text-zinc-300">
          {children}
        </div>

        {/* CTA */}
        <section className="mt-16 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
          <h2 className="text-2xl font-bold text-white">
            Start monitoring XRPL events
          </h2>
          <p className="mt-3 text-zinc-400">
            Create your free XRNotify account and receive real-time webhook
            notifications in minutes.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-block rounded-full bg-blue-600 border border-blue-500 px-8 py-3 text-sm font-bold text-white no-underline shadow-md transition-all hover:bg-blue-700 hover:shadow-lg"
          >
            Get Started Free
          </Link>
        </section>

        {/* Related Articles */}
        <section className="mt-16">
          <h2 className="mb-6 text-xl font-semibold text-white">
            Related Articles
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {relatedArticles.map((related) => (
              <Link
                key={related.slug}
                href={`/articles/${related.slug}`}
                className="group rounded-xl border border-white/5 bg-zinc-900/50 p-5 no-underline transition-all hover:border-emerald-500/30 hover:bg-zinc-900"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                    {CONTENT_TYPE_LABELS[related.contentType] ?? related.contentType}
                  </span>
                  <span className="text-xs text-zinc-600">
                    {Math.ceil(related.wordCount / 200)} min
                  </span>
                </div>
                <h3 className="text-base font-medium text-white transition-colors group-hover:text-emerald-400">
                  {related.title}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
}
