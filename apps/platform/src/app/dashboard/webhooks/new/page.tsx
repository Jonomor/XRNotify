'use client';

// =============================================================================
// XRNotify Dashboard - New Webhook Page
// =============================================================================

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const EVENT_TYPES = [
  { value: 'payment.xrp', label: 'XRP Payment' },
  { value: 'payment.issued', label: 'Issued Asset Payment' },
  { value: 'nft.minted', label: 'NFT Minted' },
  { value: 'nft.burned', label: 'NFT Burned' },
  { value: 'nft.offer_created', label: 'NFT Offer Created' },
  { value: 'nft.offer_accepted', label: 'NFT Offer Accepted' },
  { value: 'nft.offer_cancelled', label: 'NFT Offer Cancelled' },
  { value: 'nft.transfer', label: 'NFT Transfer' },
  { value: 'dex.offer_created', label: 'DEX Offer Created' },
  { value: 'dex.offer_cancelled', label: 'DEX Offer Cancelled' },
  { value: 'dex.offer_filled', label: 'DEX Offer Filled' },
  { value: 'dex.offer_partial', label: 'DEX Offer Partial' },
  { value: 'trustline.created', label: 'Trust Line Created' },
  { value: 'trustline.modified', label: 'Trust Line Modified' },
  { value: 'trustline.deleted', label: 'Trust Line Deleted' },
  { value: 'account.created', label: 'Account Created' },
  { value: 'account.deleted', label: 'Account Deleted' },
  { value: 'account.settings_changed', label: 'Account Settings Changed' },
  { value: 'escrow.created', label: 'Escrow Created' },
  { value: 'escrow.finished', label: 'Escrow Finished' },
  { value: 'escrow.cancelled', label: 'Escrow Cancelled' },
  { value: 'check.created', label: 'Check Created' },
  { value: 'check.cashed', label: 'Check Cashed' },
  { value: 'check.cancelled', label: 'Check Cancelled' },
];

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm transition-colors';

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------

export default function NewWebhookPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [accountFilters, setAccountFilters] = useState('');

  // After creation — show secret once
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleType = (type: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('URL is required.');
      return;
    }

    const accounts = accountFilters
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    startTransition(async () => {
      const res = await fetch('/api/v1/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          description: description.trim() || undefined,
          event_types: Array.from(selectedTypes),
          account_filters: accounts,
        }),
      });

      const data = await res.json() as { data?: { webhook?: { id: string }; secret?: string }; error?: { message?: string } };

      if (!res.ok) {
        setError(data.error?.message ?? 'Failed to create webhook.');
        return;
      }

      const secret = data.data?.secret;
      if (secret) {
        setCreatedSecret(secret);
      } else {
        router.push('/dashboard/webhooks');
      }
    });
  };

  const handleCopy = () => {
    if (createdSecret) {
      navigator.clipboard.writeText(createdSecret).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  if (createdSecret) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <header className="bg-zinc-900 border-b border-zinc-800">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-2xl font-bold text-white">Webhook Created</h1>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">Webhook created!</p>
                <p className="text-sm text-zinc-400">Save the secret below — it will only be shown once.</p>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-700 rounded-lg p-4">
              <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wide">Webhook Secret</p>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm text-emerald-300 flex-1 break-all">{createdSecret}</code>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <p className="text-xs text-zinc-500">
              Use this secret to verify HMAC signatures on incoming webhook payloads.
              Store it securely — it cannot be retrieved again.
            </p>

            <Link
              href="/dashboard/webhooks"
              className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white no-underline transition-colors"
            >
              Go to Webhooks →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <nav className="flex items-center space-x-2 text-sm text-zinc-500 mb-2">
            <Link href="/dashboard" className="hover:text-zinc-300">Dashboard</Link>
            <span>/</span>
            <Link href="/dashboard/webhooks" className="hover:text-zinc-300">Webhooks</Link>
            <span>/</span>
            <span className="text-white">New</span>
          </nav>
          <h1 className="text-2xl font-bold text-white">Create Webhook</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* URL */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Endpoint</h2>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">URL <span className="text-red-400">*</span></label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={inputClass}
                placeholder="https://your-server.com/webhooks"
                required
              />
              <p className="mt-1 text-xs text-zinc-500">Must be a publicly accessible HTTPS URL.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
                placeholder="Optional description"
                maxLength={500}
              />
            </div>
          </div>

          {/* Event Types */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-base font-semibold text-white mb-1">Event Types</h2>
            <p className="text-sm text-zinc-500 mb-4">Select which events to receive. Leave all unchecked to receive all events.</p>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPES.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedTypes.has(value)}
                    onChange={() => toggleType(value)}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/40"
                  />
                  <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Account Filters */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-3">
            <h2 className="text-base font-semibold text-white">Account Filters</h2>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">XRPL addresses</label>
              <textarea
                value={accountFilters}
                onChange={(e) => setAccountFilters(e.target.value)}
                className={`${inputClass} resize-none h-20`}
                placeholder="rXXXXXX..., rYYYYYY... (comma-separated, leave blank for all accounts)"
              />
              <p className="mt-1 text-xs text-zinc-500">Leave blank to receive events for all accounts.</p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-60"
            >
              {isPending ? 'Creating…' : 'Create Webhook'}
            </button>
            <Link
              href="/dashboard/webhooks"
              className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 no-underline transition-colors"
            >
              Cancel
            </Link>
          </div>

        </form>
      </main>
    </div>
  );
}
