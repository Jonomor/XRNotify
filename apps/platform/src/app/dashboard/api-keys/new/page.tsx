'use client';

// =============================================================================
// XRNotify Dashboard - New API Key Page
// =============================================================================

import { useState, useTransition } from 'react';
import Link from 'next/link';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const SCOPES = [
  { value: 'webhooks:read', label: 'Webhooks: Read', description: 'List and view webhooks' },
  { value: 'webhooks:write', label: 'Webhooks: Write', description: 'Create, update, and delete webhooks' },
  { value: 'deliveries:read', label: 'Deliveries: Read', description: 'View delivery logs and history' },
  { value: 'deliveries:write', label: 'Deliveries: Write', description: 'Trigger replays and retries' },
  { value: 'events:read', label: 'Events: Read', description: 'Access XRPL event data' },
  { value: 'api_keys:read', label: 'API Keys: Read', description: 'List API keys' },
  { value: 'api_keys:write', label: 'API Keys: Write', description: 'Create and revoke API keys' },
];

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 text-sm transition-colors';

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------

export default function NewApiKeyPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(
    new Set(['webhooks:read', 'webhooks:write', 'deliveries:read', 'events:read'])
  );

  // After creation
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) next.delete(scope);
      else next.add(scope);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (selectedScopes.size === 0) {
      setError('Select at least one scope.');
      return;
    }

    startTransition(async () => {
      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          scopes: Array.from(selectedScopes),
        }),
      });

      const data = await res.json() as { data?: { key?: string }; error?: { message?: string } };

      if (!res.ok) {
        setError(data.error?.message ?? 'Failed to create API key.');
        return;
      }

      const key = data.data?.key;
      if (key) {
        setCreatedKey(key);
      }
    });
  };

  const handleCopy = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  if (createdKey) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <header className="bg-zinc-900 border-b border-zinc-800">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-2xl font-bold text-white">API Key Created</h1>
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
                <p className="font-semibold text-white">API key created!</p>
                <p className="text-sm text-zinc-400">Copy it now — it will not be shown again.</p>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-700 rounded-lg p-4">
              <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wide">Your API Key</p>
              <div className="flex items-center gap-2">
                <code className="font-mono text-sm text-emerald-300 flex-1 break-all">{createdKey}</code>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-lg p-3">
              <p className="text-xs text-yellow-300">
                Store this key securely. For security, it cannot be retrieved after leaving this page.
                Pass it in the <code className="font-mono">X-XRNotify-Key</code> header.
              </p>
            </div>

            <Link
              href="/dashboard/api-keys"
              className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white no-underline transition-colors"
            >
              Back to API Keys →
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
            <Link href="/dashboard/api-keys" className="hover:text-zinc-300">API Keys</Link>
            <span>/</span>
            <span className="text-white">New</span>
          </nav>
          <h1 className="text-2xl font-bold text-white">Create API Key</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Name */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Details</h2>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="e.g. Production Server, CI Pipeline"
                maxLength={255}
                required
              />
            </div>
          </div>

          {/* Scopes */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-base font-semibold text-white mb-1">Permissions</h2>
            <p className="text-sm text-zinc-500 mb-4">Select the scopes this key can access.</p>
            <div className="space-y-3">
              {SCOPES.map(({ value, label, description }) => (
                <label key={value} className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedScopes.has(value)}
                    onChange={() => toggleScope(value)}
                    className="mt-0.5 w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/40"
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{label}</p>
                    <p className="text-xs text-zinc-500">{description}</p>
                  </div>
                </label>
              ))}
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
              {isPending ? 'Creating…' : 'Create API Key'}
            </button>
            <Link
              href="/dashboard/api-keys"
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
