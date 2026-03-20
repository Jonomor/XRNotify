export function EcosystemFooter() {
  return (
    <footer className="border-t border-white/5 mt-20">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-zinc-500">
          Built by{" "}
          <a
            href="https://www.jonomor.com/ali-morgan"
            className="text-zinc-400 hover:text-white transition-colors no-underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ali Morgan
          </a>
          {" · "}
          Part of the{" "}
          <a
            href="https://www.jonomor.com"
            className="text-zinc-400 hover:text-white transition-colors no-underline"
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
