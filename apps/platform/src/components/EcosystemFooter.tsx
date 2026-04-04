import { CANONICAL_URLS } from '@/lib/schema';

export function EcosystemFooter() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-[#0a0a0f]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
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
    </footer>
  );
}
