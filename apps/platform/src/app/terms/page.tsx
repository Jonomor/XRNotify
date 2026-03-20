import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service - XRNotify',
  description: 'Terms of service for XRNotify webhook infrastructure.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white antialiased">
      <nav className="border-b border-white/5 px-6 py-5 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Link href="/" className="text-sm text-zinc-400 no-underline transition-colors hover:text-white">
            ← Back to XRNotify
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-20 lg:px-8">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mb-12 text-zinc-500">Last updated: March 2026</p>

        <div className="space-y-10 text-zinc-300 leading-relaxed">
          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">Acceptance of Terms</h2>
            <p>
              By accessing or using XRNotify, you agree to be bound by these Terms of Service. If you
              do not agree to these terms, do not use the service.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">Use of Service</h2>
            <p>
              XRNotify provides webhook infrastructure for the XRP Ledger. You may use the service for
              lawful purposes only. You are responsible for maintaining the security of your API keys
              and account credentials.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">Service Availability</h2>
            <p>
              We strive to maintain high availability but do not guarantee uninterrupted service.
              Scheduled maintenance, infrastructure events, or circumstances beyond our control may
              cause temporary downtime.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">Limitation of Liability</h2>
            <p>
              XRNotify is provided &quot;as is&quot; without warranties of any kind. We are not liable for any
              indirect, incidental, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">Changes to Terms</h2>
            <p>
              We may update these terms at any time. Continued use of the service after changes
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">Contact</h2>
            <p>
              For terms-related inquiries, contact us at{' '}
              <a href="mailto:legal@xrnotify.io" className="text-emerald-400 no-underline hover:text-emerald-300">
                legal@xrnotify.io
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/5 px-6 py-8 text-center text-xs text-zinc-600">
        © 2026 XRNotify. Built by{' '}
        <a href="https://www.jonomor.com/ali-morgan" className="text-zinc-500 no-underline hover:text-white" target="_blank" rel="noopener noreferrer">
          Ali Morgan
        </a>
        {' · '}
        <a href="https://www.jonomor.com" className="text-zinc-500 no-underline hover:text-white" target="_blank" rel="noopener noreferrer">
          Jonomor Ecosystem
        </a>
      </footer>
    </div>
  );
}
