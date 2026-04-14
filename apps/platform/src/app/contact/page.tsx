import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact - XRNotify',
  description: 'Get in touch with the XRNotify team.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-white/5 px-6 py-5 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link href="/" className="text-sm text-zinc-400 no-underline transition-colors hover:text-white">
            ← Back to XRNotify
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-20 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 mb-8">
          Get in touch
        </div>
        <h1 className="mb-6 text-4xl font-bold tracking-tight">Contact Us</h1>
        <p className="mb-12 text-zinc-400 text-lg max-w-xl mx-auto">
          Have a question, feature request, or want to discuss enterprise pricing?
          We&apos;d love to hear from you.
        </p>

        <a
          href="mailto:hello@xrnotify.io"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 text-base font-semibold text-white no-underline transition-opacity hover:opacity-90"
        >
          hello@xrnotify.io
        </a>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
            <h3 className="mb-2 font-semibold text-white">General</h3>
            <a href="mailto:hello@xrnotify.io" className="text-sm text-zinc-400 no-underline hover:text-white transition-colors">
              hello@xrnotify.io
            </a>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
            <h3 className="mb-2 font-semibold text-white">Support</h3>
            <a href="mailto:support@xrnotify.io" className="text-sm text-zinc-400 no-underline hover:text-white transition-colors">
              support@xrnotify.io
            </a>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
            <h3 className="mb-2 font-semibold text-white">Legal</h3>
            <a href="mailto:legal@xrnotify.io" className="text-sm text-zinc-400 no-underline hover:text-white transition-colors">
              legal@xrnotify.io
            </a>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/5 px-6 py-8 text-center text-xs text-zinc-600">
        © 2026 XRNotify. Built by{' '}
        <a href="https://www.jonomor.com/ali-morgan" className="text-zinc-500 no-underline hover:text-white" target="_blank" rel="noopener noreferrer">
          Ali Morgan
        </a>
        {' · '}
        <a href="https://www.jonomor.com/ecosystem" className="text-zinc-500 no-underline hover:text-white" target="_blank" rel="noopener noreferrer">
          Part of the Jonomor Ecosystem
        </a>
      </footer>
    </div>
  );
}
