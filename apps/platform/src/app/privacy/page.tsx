import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy - XRNotify',
  description: 'Privacy policy for XRNotify webhook infrastructure.',
};

export default function PrivacyPage() {
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
        <h1 className="mb-4 text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mb-12 text-zinc-500">Last updated: March 2026</p>

        <div className="space-y-10 text-zinc-300 leading-relaxed">
          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">Information We Collect</h2>
            <p>
              We collect information you provide when creating an account, including your email address
              and password. We also collect usage data such as webhook delivery logs, API request
              metadata, and account activity to provide and improve our services.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">How We Use Your Information</h2>
            <p>
              Your information is used to operate XRNotify, process webhook deliveries, send service
              notifications, and improve our platform. We do not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">Data Retention</h2>
            <p>
              Webhook delivery logs are retained for 30 days. Account data is retained for the duration
              of your account and for a reasonable period after deletion as required by applicable law.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">Security</h2>
            <p>
              We use industry-standard encryption and security practices to protect your data. API keys
              are hashed and never stored in plain text. Sessions are secured with signed JWT tokens.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold text-white">Contact</h2>
            <p>
              For privacy-related inquiries, contact us at{' '}
              <a href="mailto:privacy@xrnotify.io" className="text-emerald-400 no-underline hover:text-emerald-300">
                privacy@xrnotify.io
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
        <a href="https://www.jonomor.com/ecosystem" className="text-zinc-500 no-underline hover:text-white" target="_blank" rel="noopener noreferrer">
          Part of the Jonomor Ecosystem
        </a>
      </footer>
    </div>
  );
}
