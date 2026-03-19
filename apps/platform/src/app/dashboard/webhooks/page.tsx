// =============================================================================
// XRNotify Platform - Webhooks Management Page
// =============================================================================
// List, filter, and manage webhook subscriptions
// =============================================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentSession } from '@/lib/auth/session';
import { listWebhooks } from '@/lib/webhooks/service';
import { EVENT_TYPES } from '@xrnotify/shared';

export const dynamic = 'force-dynamic';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface WebhookRow {
  id: string;
  url: string;
  description: string | null;
  event_types: string[];
  is_active: boolean;
  consecutive_failures: number;
  last_success_at: Date | null;
  last_failure_at: Date | null;
  created_at: Date;
}

interface PageProps {
  searchParams: Promise<{
    filter?: string;
    page?: string;
  }>;
}

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

function StatusBadge({ isActive, failures }: { isActive: boolean; failures: number }) {
  if (!isActive) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
        Disabled
      </span>
    );
  }
  
  if (failures === 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        Healthy
      </span>
    );
  }
  
  if (failures < 3) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
        Degraded ({failures})
      </span>
    );
  }
  
  if (failures < 10) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
        Unhealthy ({failures})
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
      Critical ({failures})
    </span>
  );
}

function EventTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    payment: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    nft: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    dex: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    trustline: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    account: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    escrow: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    check: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  };

  const category = type.split('.')[0] ?? '';
  const colorClass = colors[category] ?? 'bg-gray-100 text-gray-800';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      {type}
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
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
        />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No webhooks</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Get started by creating a new webhook endpoint.
      </p>
      <div className="mt-6">
        <Link
          href="/dashboard/webhooks/new"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          + New Webhook
        </Link>
      </div>
    </div>
  );
}

function FilterTabs({ currentFilter }: { currentFilter: string }) {
  const filters = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'unhealthy', label: 'Unhealthy' },
    { id: 'disabled', label: 'Disabled' },
  ];

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-8">
        {filters.map((filter) => (
          <Link
            key={filter.id}
            href={`/dashboard/webhooks${filter.id === 'all' ? '' : `?filter=${filter.id}`}`}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              currentFilter === filter.id
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function truncateUrl(url: string, maxLength = 50): string {
  if (url.length <= maxLength) return url;
  try {
    const parsed = new URL(url);
    const display = `${parsed.hostname}${parsed.pathname}`;
    if (display.length <= maxLength) return display;
    return display.slice(0, maxLength - 3) + '...';
  } catch {
    return url.slice(0, maxLength - 3) + '...';
  }
}

function formatDate(date: Date | null): string {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------

export default async function WebhooksPage({ searchParams }: PageProps) {
  // Check authentication
  const session = await getCurrentSession();
  
  if (!session) {
    redirect('/login');
  }

  const params = await searchParams;
  const filter = params.filter ?? 'all';
  const page = parseInt(params.page ?? '1', 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  // Fetch webhooks
  const { webhooks, total } = await listWebhooks({
    tenantId: session.tenantId,
    limit,
    offset,
    isActive: filter === 'active' ? true : filter === 'disabled' ? false : undefined,
  });

  // Apply additional filtering
  let filteredWebhooks = webhooks;
  if (filter === 'unhealthy') {
    filteredWebhooks = webhooks.filter(w => (w.consecutive_failures ?? 0) > 0);
  }

  const totalPages = Math.ceil(total / limit);

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
                <span className="text-gray-900 dark:text-white">Webhooks</span>
              </nav>
              <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                Webhooks
              </h1>
            </div>
            <Link
              href="/dashboard/webhooks/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              + New Webhook
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <FilterTabs currentFilter={filter} />

        {/* Webhooks List */}
        <div className="mt-6 bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          {filteredWebhooks.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Endpoint
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Events
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Last Success
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredWebhooks.map((webhook) => (
                    <tr key={webhook.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <Link
                            href={`/dashboard/webhooks/${webhook.id}`}
                            className="text-sm font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            {truncateUrl(webhook.url)}
                          </Link>
                          {webhook.description && (
                            <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                              {webhook.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {webhook.event_types.length === 0 ? (
                            <span className="text-sm text-gray-500 dark:text-gray-400">All events</span>
                          ) : webhook.event_types.length > 3 ? (
                            <>
                              {webhook.event_types.slice(0, 2).map((type) => (
                                <EventTypeBadge key={type} type={type} />
                              ))}
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                +{webhook.event_types.length - 2} more
                              </span>
                            </>
                          ) : (
                            webhook.event_types.map((type) => (
                              <EventTypeBadge key={type} type={type} />
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge 
                          isActive={webhook.is_active} 
                          failures={webhook.consecutive_failures ?? 0}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(webhook.last_success_at ? new Date(webhook.last_success_at) : null)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/dashboard/webhooks/${webhook.id}`}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            View
                          </Link>
                          <Link
                            href={`/dashboard/webhooks/${webhook.id}/edit`}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                          >
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    {page > 1 && (
                      <Link
                        href={`/dashboard/webhooks?${filter !== 'all' ? `filter=${filter}&` : ''}page=${page - 1}`}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Previous
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link
                        href={`/dashboard/webhooks?${filter !== 'all' ? `filter=${filter}&` : ''}page=${page + 1}`}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Next
                      </Link>
                    )}
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Showing <span className="font-medium">{offset + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(offset + limit, total)}</span> of{' '}
                        <span className="font-medium">{total}</span> webhooks
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        {page > 1 && (
                          <Link
                            href={`/dashboard/webhooks?${filter !== 'all' ? `filter=${filter}&` : ''}page=${page - 1}`}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            ← Previous
                          </Link>
                        )}
                        {page < totalPages && (
                          <Link
                            href={`/dashboard/webhooks?${filter !== 'all' ? `filter=${filter}&` : ''}page=${page + 1}`}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            Next →
                          </Link>
                        )}
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          <p>
            Webhooks allow you to receive real-time notifications when events occur on the XRP Ledger.{' '}
            <Link href="/docs/webhooks" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
              Learn more →
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
