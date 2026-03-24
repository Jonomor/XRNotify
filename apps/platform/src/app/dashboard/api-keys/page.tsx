// =============================================================================
// XRNotify Platform - API Keys Management Page
// =============================================================================
// List, create, and manage API keys
// =============================================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentSession } from '@/lib/auth/session';
import { listApiKeys, revokeApiKey } from '@/lib/auth/apiKey';
import { ALL_API_KEY_SCOPES } from '@xrnotify/shared';

export const dynamic = 'force-dynamic';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: Date | null;
  expires_at: Date | null;
  is_active: boolean;
  created_at: Date;
}

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

function StatusBadge({ isActive, expiresAt }: { isActive: boolean; expiresAt: string | Date | null | undefined }) {
  if (!isActive) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900 text-red-200">
        Revoked
      </span>
    );
  }
  
  if (expiresAt && new Date(expiresAt) < new Date()) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300">
        Expired
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-200">
      Active
    </span>
  );
}

function ScopeBadge({ scope }: { scope: string }) {
  const colors: Record<string, string> = {
    'webhooks:read': 'bg-blue-900 text-blue-200',
    'webhooks:write': 'bg-blue-900 text-blue-200',
    'deliveries:read': 'bg-green-900 text-green-200',
    'deliveries:write': 'bg-green-900 text-green-200',
    'events:read': 'bg-purple-900 text-purple-200',
    'api_keys:read': 'bg-yellow-900 text-yellow-200',
    'api_keys:write': 'bg-yellow-900 text-yellow-200',
    'admin': 'bg-red-900 text-red-200',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[scope] ?? 'bg-zinc-800 text-zinc-300'}`}>
      {scope}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <svg
        className="mx-auto h-12 w-12 text-zinc-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
        />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-white">No API keys</h3>
      <p className="mt-1 text-sm text-zinc-500">
        Create an API key to start using the XRNotify API.
      </p>
      <div className="mt-6">
        <Link
          href="/dashboard/api-keys/new"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold text-white bg-blue-600 border border-blue-500 rounded-lg shadow-md hover:bg-blue-700 hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]"
        >
          + Create API Key
        </Link>
      </div>
    </div>
  );
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimeAgo(date: string | Date | null | undefined): string {
  if (!date) return 'Never';
  
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(date);
}

function CreateKeyModal() {
  // This would be a client component in a real app
  // For now, we'll link to a separate page
  return null;
}

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------

async function revokeKeyAction(formData: FormData) {
  'use server';
  const session = await getCurrentSession();
  if (!session) return;
  const keyId = formData.get('key_id') as string;
  if (keyId) {
    await revokeApiKey(keyId, session.tenantId);
  }
  redirect('/dashboard/api-keys');
}

// -----------------------------------------------------------------------------

export default async function ApiKeysPage() {
  // Check authentication
  const session = await getCurrentSession();
  
  if (!session) {
    redirect('/login');
  }

  // Fetch API keys
  const apiKeys = await listApiKeys(session.tenantId);

  // Separate active and revoked keys
  const activeKeys = apiKeys.filter(k => k.is_active);
  const revokedKeys = apiKeys.filter(k => !k.is_active);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <nav className="flex items-center space-x-2 text-sm text-zinc-500">
                <Link href="/dashboard" className="hover:text-zinc-300">
                  Dashboard
                </Link>
                <span>/</span>
                <span className="text-white">API Keys</span>
              </nav>
              <h1 className="mt-2 text-2xl font-bold text-white">
                API Keys
              </h1>
            </div>
            <Link
              href="/dashboard/api-keys/new"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold text-white bg-blue-600 border border-blue-500 rounded-lg shadow-md hover:bg-blue-700 hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#0a0a0f]"
            >
              + Create API Key
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Security Notice */}
        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-200">
                Keep your API keys secure
              </h3>
              <div className="mt-2 text-sm text-yellow-300">
                <p>
                  API keys grant access to your XRNotify account. Never share them publicly or commit them to version control.
                  Use environment variables to store keys in your applications.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Keys */}
        <div className="bg-zinc-900 rounded-lg overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="text-lg font-medium text-white">
              Active Keys ({activeKeys.length})
            </h2>
          </div>

          {activeKeys.length === 0 ? (
            <EmptyState />
          ) : (
            <table className="min-w-full divide-y divide-zinc-800">
              <thead className="bg-zinc-950">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Scopes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-zinc-900 divide-y divide-zinc-800">
                {activeKeys.map((apiKey) => (
                  <tr key={apiKey.id} className="hover:bg-zinc-800/30">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">
                          {apiKey.name}
                        </span>
                        <span className="text-xs text-zinc-500">
                          Created {formatDate(apiKey.created_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm font-mono bg-zinc-800 px-2 py-1 rounded">
                        {apiKey.key_prefix}••••••••
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {apiKey.scopes.length > 3 ? (
                          <>
                            {apiKey.scopes.slice(0, 2).map((scope) => (
                              <ScopeBadge key={scope} scope={scope} />
                            ))}
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-400">
                              +{apiKey.scopes.length - 2} more
                            </span>
                          </>
                        ) : (
                          apiKey.scopes.map((scope) => (
                            <ScopeBadge key={scope} scope={scope} />
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {formatTimeAgo(apiKey.last_used_at)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge isActive={apiKey.is_active} expiresAt={apiKey.expires_at} />
                      {apiKey.expires_at && (
                        <p className="text-xs text-zinc-500 mt-1">
                          Expires {formatDate(apiKey.expires_at)}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        <Link
                          href={`/dashboard/api-keys/${apiKey.id}`}
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          View
                        </Link>
                        <form action={revokeKeyAction}>
                          <input type="hidden" name="key_id" value={apiKey.id} />
                          <button
                            type="submit"
                            className="text-red-400 hover:text-red-300"
                          >
                            Revoke
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Revoked Keys (if any) */}
        {revokedKeys.length > 0 && (
          <div className="bg-zinc-900 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h2 className="text-lg font-medium text-zinc-500">
                Revoked Keys ({revokedKeys.length})
              </h2>
            </div>
            <table className="min-w-full divide-y divide-zinc-800">
              <thead className="bg-zinc-950">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-zinc-900 divide-y divide-zinc-800 opacity-60">
                {revokedKeys.map((apiKey) => (
                  <tr key={apiKey.id}>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {apiKey.name}
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm font-mono text-zinc-400">
                        {apiKey.key_prefix}••••••••
                      </code>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {formatDate(apiKey.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge isActive={apiKey.is_active} expiresAt={apiKey.expires_at} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 bg-zinc-900 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">
            Using API Keys
          </h3>
          <div className="prose prose-sm prose-invert max-w-none">
            <p className="text-zinc-400">
              Include your API key in requests using the <code>X-XRNotify-Key</code> header:
            </p>
            <pre className="bg-zinc-950 text-zinc-100 rounded-lg p-4 overflow-x-auto mt-4">
              <code>{`curl -X GET https://api.xrnotify.io/v1/webhooks \\
  -H "X-XRNotify-Key: xrn_your_api_key_here"`}</code>
            </pre>
            <p className="text-zinc-400 mt-4">
              <Link href="/docs/authentication" className="text-emerald-400 hover:text-emerald-300">
                Learn more about authentication →
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
