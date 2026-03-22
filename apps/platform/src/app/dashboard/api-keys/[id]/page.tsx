'use client';

// =============================================================================
// XRNotify Dashboard - API Key Detail Page
// =============================================================================

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ApiKeyData {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatDate(value: string | null): string {
  if (!value) return 'Never';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeAgo(value: string | null): string {
  if (!value) return 'Never';
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(value);
}

const SCOPE_COLORS: Record<string, string> = {
  'webhooks:read': 'bg-blue-900 text-blue-200',
  'webhooks:write': 'bg-blue-900 text-blue-200',
  'deliveries:read': 'bg-green-900 text-green-200',
  'deliveries:write': 'bg-green-900 text-green-200',
  'events:read': 'bg-purple-900 text-purple-200',
  'api_keys:read': 'bg-yellow-900 text-yellow-200',
  'api_keys:write': 'bg-yellow-900 text-yellow-200',
  'admin': 'bg-red-900 text-red-200',
};

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------

export default function ApiKeyDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const keyId = params.id;

  const [apiKey, setApiKey] = useState<ApiKeyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revoking, startRevokeTransition] = useTransition();
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/api-keys/${keyId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((json) => {
        setApiKey((json.data?.api_key ?? json.data) as ApiKeyData);
      })
      .catch(() => setError('API key not found.'))
      .finally(() => setLoading(false));
  }, [keyId]);

  const handleRevoke = () => {
    startRevokeTransition(async () => {
      const res = await fetch(`/api/v1/api-keys/${keyId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/dashboard/api-keys');
      } else {
        const data = await res.json() as { error?: { message?: string } };
        setError(data.error?.message ?? 'Failed to revoke key.');
        setShowRevokeConfirm(false);
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !apiKey) {
    return (
      <div className="min-h-screen bg-[#0a0a0f]">
        <header className="bg-zinc-900 border-b border-zinc-800">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <nav className="flex items-center space-x-2 text-sm text-zinc-500 mb-2">
              <Link href="/dashboard" className="hover:text-zinc-300">Dashboard</Link>
              <span>/</span>
              <Link href="/dashboard/api-keys" className="hover:text-zinc-300">API Keys</Link>
            </nav>
            <h1 className="text-2xl font-bold text-white">API Key Not Found</h1>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            <p className="text-zinc-400 mb-4">{error}</p>
            <Link href="/dashboard/api-keys" className="text-emerald-400 hover:text-emerald-300">
              Back to API Keys
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!apiKey) return null;

  const isExpired = apiKey.expires_at && new Date(apiKey.expires_at) < new Date();

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <nav className="flex items-center space-x-2 text-sm text-zinc-500 mb-2">
            <Link href="/dashboard" className="hover:text-zinc-300">Dashboard</Link>
            <span>/</span>
            <Link href="/dashboard/api-keys" className="hover:text-zinc-300">API Keys</Link>
            <span>/</span>
            <span className="text-white">{apiKey.name}</span>
          </nav>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{apiKey.name}</h1>
              <p className="mt-1 text-sm text-zinc-500">Created {formatDate(apiKey.created_at)}</p>
            </div>
            {apiKey.is_active && (
              <button
                type="button"
                onClick={() => setShowRevokeConfirm(true)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-red-900/50 bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors"
              >
                Revoke
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Status + Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-500 mb-1">Status</p>
            <p className={`text-sm font-semibold ${apiKey.is_active ? (isExpired ? 'text-zinc-400' : 'text-emerald-400') : 'text-red-400'}`}>
              {!apiKey.is_active ? 'Revoked' : isExpired ? 'Expired' : 'Active'}
            </p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-500 mb-1">Last Used</p>
            <p className="text-sm font-semibold text-white">{formatTimeAgo(apiKey.last_used_at)}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-500 mb-1">Expires</p>
            <p className={`text-sm font-semibold ${isExpired ? 'text-red-400' : 'text-white'}`}>
              {apiKey.expires_at ? formatDate(apiKey.expires_at) : 'Never'}
            </p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-500 mb-1">Scopes</p>
            <p className="text-sm font-semibold text-white">{apiKey.scopes.length}</p>
          </div>
        </div>

        {/* Key prefix */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold text-white">Key</h2>
          <div>
            <p className="text-xs text-zinc-500 mb-1">API key prefix</p>
            <code className="font-mono text-sm text-zinc-300 bg-zinc-800 px-3 py-1.5 rounded inline-block">
              {apiKey.key_prefix}••••••••
            </code>
            <p className="text-xs text-zinc-600 mt-1">The full key was shown only once at creation.</p>
          </div>
        </div>

        {/* Scopes */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold text-white">Permissions</h2>
          <div className="flex flex-wrap gap-2">
            {apiKey.scopes.map((scope) => (
              <span
                key={scope}
                className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${SCOPE_COLORS[scope] ?? 'bg-zinc-800 text-zinc-300'}`}
              >
                {scope}
              </span>
            ))}
          </div>
        </div>

        {/* Timestamps */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-3">
          <h2 className="text-base font-semibold text-white">Activity</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-zinc-500">Created</p>
              <p className="text-zinc-300">{formatDate(apiKey.created_at)}</p>
            </div>
            <div>
              <p className="text-zinc-500">Last used</p>
              <p className="text-zinc-300">{apiKey.last_used_at ? formatDate(apiKey.last_used_at) : 'Never'}</p>
            </div>
            <div>
              <p className="text-zinc-500">Updated</p>
              <p className="text-zinc-300">{formatDate(apiKey.updated_at)}</p>
            </div>
            <div>
              <p className="text-zinc-500">Expires</p>
              <p className="text-zinc-300">{apiKey.expires_at ? formatDate(apiKey.expires_at) : 'Never'}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
      </main>

      {/* Revoke confirmation dialog */}
      {showRevokeConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={() => setShowRevokeConfirm(false)} />
            <div className="relative transform overflow-hidden rounded-lg bg-zinc-900 text-left transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-zinc-900 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-white">Revoke API Key</h3>
                    <div className="mt-2">
                      <p className="text-sm text-zinc-400">
                        Are you sure you want to revoke <span className="font-semibold text-white">{apiKey.name}</span>? Any applications using this key will immediately lose access. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-zinc-800 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={handleRevoke}
                  disabled={revoking}
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 sm:ml-3 sm:w-auto disabled:opacity-50"
                >
                  {revoking ? 'Revoking...' : 'Revoke Key'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRevokeConfirm(false)}
                  disabled={revoking}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-zinc-700 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-600 sm:mt-0 sm:w-auto"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
