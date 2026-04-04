import Link from 'next/link';
import { CANONICAL_URLS } from '@/lib/schema';

export function EcosystemFooter() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-[#0a0a0f]">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
          <Link
            href="/docs"
            className="text-zinc-500 no-underline transition-colors hover:text-white"
          >
            Docs
          </Link>
          <Link
            href="/pricing"
            className="text-zinc-500 no-underline transition-colors hover:text-white"
          >
            Pricing
          </Link>
          <Link
            href="/about"
            className="text-zinc-500 no-underline transition-colors hover:text-white"
          >
            About
          </Link>
          <Link
            href="/ecosystem"
            className="text-zinc-500 no-underline transition-colors hover:text-white"
          >
            Ecosystem
          </Link>
          <a
            href={CANONICAL_URLS.ecosystem}
            className="text-zinc-500 no-underline transition-colors hover:text-white"
            target="_blank"
            rel="noopener noreferrer"
          >
            Jonomor Ecosystem
          </a>
        </div>

        {/* Attribution */}
        <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-6 sm:flex-row">
          <p className="text-xs text-zinc-500">
            &copy; {new Date().getFullYear()} XRNotify
          </p>
          <p className="text-xs text-zinc-500">
            Built by{' '}
            <a
              href={CANONICAL_URLS.aliMorgan}
              className="text-white no-underline transition-colors hover:text-emerald-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ali Morgan
            </a>
            {' · '}
            Part of the{' '}
            <a
              href={CANONICAL_URLS.ecosystem}
              className="text-white no-underline transition-colors hover:text-emerald-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              Jonomor Ecosystem
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
