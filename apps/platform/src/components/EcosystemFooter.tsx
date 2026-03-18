import Link from "next/link";

export function EcosystemFooter() {
  return (
    <footer className="border-t border-stone-800 mt-20">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-stone-500">
          Built by{" "}
          <Link
            href="https://jonomor.com/ali-morgan"
            className="text-stone-400 hover:text-stone-200 transition-colors"
          >
            Ali Morgan
          </Link>
          {" · "}
          Part of the{" "}
          <Link
            href="https://jonomor.com/ecosystem"
            className="text-stone-400 hover:text-stone-200 transition-colors"
          >
            Jonomor Ecosystem
          </Link>
        </p>
      </div>
    </footer>
  );
}
