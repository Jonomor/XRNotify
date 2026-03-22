'use client';

// =============================================================================
// XRNotify Dashboard - Edit Webhook Page
// =============================================================================

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
// Types
// -----------------------------------------------------------------------------

interface WebhookData {
  id: string;
  url: string;
  description?: string;
  event_types: string[];
  account_filters: string[];
  is_active: boolean;
}

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------

export default function EditWebhookPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const webhookId = params.id;
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [accountFilters, setAccountFilters] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/webhooks/${webhookId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((json) => {
        const w = (json.data?.webhook ?? json.data) as WebhookData;
        setUrl(w.url);
        setDescription(w.description ?? '');
        setSelectedTypes(new Set(w.event_types));
        setAccountFilters(w.account_filters.join(', '));
        setIsActive(w.is_active);
      })
      .catch(() => setError('Failed to load webhook.'))
      .finally(() => setLoading(false));
  }, [webhookId]);

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
    setSuccess('');

    if (!url.trim()) {
      setError('URL is required.');
      return;
    }

    const accounts = accountFilters
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    startTransition(async () => {
      const res = await fetch(`/api/v1/webhooks/${webhookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          description: description.trim() || undefined,
          event_types: Array.from(selectedTypes),
          account_filters: accounts,
          is_active: isActive,
        }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: { message?: string } };
        setError(data.error?.message ?? 'Failed to update webhook.');
        return;
      }

      setSuccess('Webhook updated successfully.');
      setTimeout(() => router.push(`/dashboard/webhooks/${webhookId}`), 1000);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
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
            <Link href={`/dashboard/webhooks/${webhookId}`} className="hover:text-zinc-300">Detail</Link>
            <span>/</span>
            <span className="text-white">Edit</span>
          </nav>
          <h1 className="text-2xl font-bold text-white">Edit Webhook</h1>
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

          {/* Status toggle */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Status</h2>
                <p className="text-sm text-zinc-500">Enable or disable this webhook.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  isActive ? 'bg-emerald-500' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
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
          {success && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-sm text-emerald-300">{success}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="px-6 py-2.5 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-60"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
            <Link
              href={`/dashboard/webhooks/${webhookId}`}
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
