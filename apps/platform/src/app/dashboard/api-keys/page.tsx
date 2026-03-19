// =============================================================================
// XRNotify Platform - API Keys Management Page
// =============================================================================
// List, create, and manage API keys
// =============================================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentSession } from '@/lib/auth/session';
import { listApiKeys } from '@/lib/auth/apiKey';
import { ALL_API_KEY_SCOPES } from '@xrnotify/shared';

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

function StatusBadge({ isActive, expiresAt }: { isActive: boolean; expiresAt: Date | null }) {
  if (!isActive) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        Revoked
      </span>
    );
  }
  
  if (expiresAt && new Date(expiresAt) < new Date()) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
        Expired
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
      Active
    </span>
  );
}

function ScopeBadge({ scope }: { scope: string }) {
  const colors: Record<string, string> = {
    'webhooks:read': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'webhooks:write': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'deliveries:read': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'deliveries:write': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'events:read': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'api_keys:read': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'api_keys:write': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'admin': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[scope] ?? 'bg-gray-100 text-gray-800'}`}>
      {scope}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
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
      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No API keys</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Create an API key to start using the XRNotify API.
      </p>
      <div className="mt-6">
        <Link
          href="/dashboard/api-keys/new"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <Link href="/dashboard" className="hover:text-gray-700 dark:hover:text-gray-300">
                  Dashboard
                </Link>
                <span>/</span>
                <span className="text-gray-900 dark:text-white">API Keys</span>
              </nav>
              <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                API Keys
              </h1>
            </div>
            <Link
              href="/dashboard/api-keys/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              + Create API Key
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Security Notice */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Keep your API keys secure
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>
                  API keys grant access to your XRNotify account. Never share them publicly or commit them to version control.
                  Use environment variables to store keys in your applications.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Keys */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Active Keys ({activeKeys.length})
            </h2>
          </div>

          {activeKeys.length === 0 ? (
            <EmptyState />
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Scopes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {activeKeys.map((apiKey) => (
                  <tr key={apiKey.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {apiKey.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Created {formatDate(apiKey.created_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
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
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
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
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatTimeAgo(apiKey.last_used_at)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge isActive={apiKey.is_active} expiresAt={apiKey.expires_at} />
                      {apiKey.expires_at && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Expires {formatDate(apiKey.expires_at)}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-3">
                        <Link
                          href={`/dashboard/api-keys/${apiKey.id}`}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          onClick={() => {
                            // This would trigger a confirmation modal in a real app
                            // For server components, we'd use a form action
                          }}
                        >
                          Revoke
                        </button>
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
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-500 dark:text-gray-400">
                Revoked Keys ({revokedKeys.length})
              </h2>
            </div>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 opacity-60">
                {revokedKeys.map((apiKey) => (
                  <tr key={apiKey.id}>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {apiKey.name}
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm font-mono text-gray-400">
                        {apiKey.key_prefix}••••••••
                      </code>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
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
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Using API Keys
          </h3>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="text-gray-600 dark:text-gray-400">
              Include your API key in requests using the <code>X-XRNotify-Key</code> header:
            </p>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto mt-4">
              <code>{`curl -X GET https://api.xrnotify.io/v1/webhooks \\
  -H "X-XRNotify-Key: xrn_your_api_key_here"`}</code>
            </pre>
            <p className="text-gray-600 dark:text-gray-400 mt-4">
              <Link href="/docs/authentication" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                Learn more about authentication →
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
