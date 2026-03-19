// =============================================================================
// XRNotify Platform - Deliveries Management Page
// =============================================================================
// List, filter, and view delivery history
// =============================================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentSession } from '@/lib/auth/session';
import { listDeliveries, getDeliveryStats } from '@/lib/deliveries/service';
import { listWebhooks } from '@/lib/webhooks/service';
import type { DeliveryStatus, EventType } from '@xrnotify/shared';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface PageProps {
  searchParams: Promise<{
    status?: string;
    webhook_id?: string;
    event_type?: string;
    page?: string;
  }>;
}

interface DeliveryRow {
  id: string;
  webhook_id: string;
  event_id: string;
  event_type: string;
  status: string;
  attempt_count: number;
  max_attempts: number;
  error_message: string | null;
  delivered_at: Date | null;
  created_at: Date;
}

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    delivered: { 
      bg: 'bg-green-100 dark:bg-green-900', 
      text: 'text-green-800 dark:text-green-200',
      label: 'Delivered'
    },
    failed: { 
      bg: 'bg-red-100 dark:bg-red-900', 
      text: 'text-red-800 dark:text-red-200',
      label: 'Failed'
    },
    pending: { 
      bg: 'bg-yellow-100 dark:bg-yellow-900', 
      text: 'text-yellow-800 dark:text-yellow-200',
      label: 'Pending'
    },
    retrying: { 
      bg: 'bg-orange-100 dark:bg-orange-900', 
      text: 'text-orange-800 dark:text-orange-200',
      label: 'Retrying'
    },
    dead_letter: { 
      bg: 'bg-purple-100 dark:bg-purple-900', 
      text: 'text-purple-800 dark:text-purple-200',
      label: 'Dead Letter'
    },
    cancelled: { 
      bg: 'bg-gray-100 dark:bg-gray-700', 
      text: 'text-gray-800 dark:text-gray-300',
      label: 'Cancelled'
    },
  };

  const defaultStyle = { 
    bg: 'bg-yellow-100 dark:bg-yellow-900', 
    text: 'text-yellow-800 dark:text-yellow-200',
    label: 'Pending'
  };
  const style = config[status] ?? defaultStyle;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function StatsCard({ 
  label, 
  value, 
  color 
}: { 
  label: string; 
  value: number; 
  color: string;
}) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow px-4 py-3 border-l-4 ${color}`}>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-semibold text-gray-900 dark:text-white">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function FilterDropdown({ 
  label, 
  name, 
  value, 
  options,
  baseUrl,
  currentParams,
}: { 
  label: string;
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  baseUrl: string;
  currentParams: Record<string, string>;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <select
        className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        defaultValue={value}
        onChange={(e) => {
          const params = new URLSearchParams(currentParams);
          if (e.target.value) {
            params.set(name, e.target.value);
          } else {
            params.delete(name);
          }
          params.delete('page'); // Reset pagination
          window.location.href = `${baseUrl}?${params.toString()}`;
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
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
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
        {hasFilters ? 'No deliveries match your filters' : 'No deliveries yet'}
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {hasFilters 
          ? 'Try adjusting your filter criteria.'
          : 'Deliveries will appear here when events are sent to your webhooks.'}
      </p>
      {hasFilters && (
        <div className="mt-6">
          <Link
            href="/dashboard/deliveries"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Clear all filters →
          </Link>
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

function truncateEventId(eventId: string, maxLength = 30): string {
  if (eventId.length <= maxLength) return eventId;
  return eventId.slice(0, maxLength - 3) + '...';
}

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------

export default async function DeliveriesPage({ searchParams }: PageProps) {
  // Check authentication
  const session = await getCurrentSession();
  
  if (!session) {
    redirect('/login');
  }

  const params = await searchParams;
  const page = parseInt(params.page ?? '1', 10);
  const limit = 25;
  const offset = (page - 1) * limit;

  // Build filters
  const filters: {
    tenantId: string;
    webhookId?: string;
    eventType?: EventType;
    status?: DeliveryStatus;
    limit: number;
    offset: number;
  } = {
    tenantId: session.tenantId,
    limit,
    offset,
  };

  if (params.webhook_id) {
    filters.webhookId = params.webhook_id;
  }
  if (params.event_type) {
    filters.eventType = params.event_type as EventType;
  }
  if (params.status) {
    filters.status = params.status as DeliveryStatus;
  }

  // Fetch data in parallel
  const [deliveryResult, stats, webhooksResult] = await Promise.all([
    listDeliveries(filters),
    getDeliveryStats(session.tenantId),
    listWebhooks({ tenantId: session.tenantId, limit: 100 }),
  ]);

  const { deliveries, total } = deliveryResult;
  const totalPages = Math.ceil(total / limit);

  // Build webhook lookup
  const webhookMap = new Map(
    webhooksResult.webhooks.map(w => [w.id, w])
  );

  const hasFilters = !!(params.status || params.webhook_id || params.event_type);
  const currentParams: Record<string, string> = {};
  if (params.status) currentParams['status'] = params.status;
  if (params.webhook_id) currentParams['webhook_id'] = params.webhook_id;
  if (params.event_type) currentParams['event_type'] = params.event_type;

  // Event type options
  const eventTypeOptions = [
    { value: '', label: 'All event types' },
    { value: 'payment.xrp', label: 'Payment (XRP)' },
    { value: 'payment.issued', label: 'Payment (Issued)' },
    { value: 'nft.minted', label: 'NFT Minted' },
    { value: 'nft.burned', label: 'NFT Burned' },
    { value: 'nft.offer_accepted', label: 'NFT Sale' },
    { value: 'dex.offer_created', label: 'DEX Offer Created' },
    { value: 'dex.offer_filled', label: 'DEX Offer Filled' },
    { value: 'trustline.created', label: 'Trustline Created' },
  ];

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
                <span className="text-gray-900 dark:text-white">Deliveries</span>
              </nav>
              <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                Deliveries
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatsCard 
            label="Total" 
            value={stats.total} 
            color="border-gray-400"
          />
          <StatsCard 
            label="Delivered" 
            value={stats.delivered} 
            color="border-green-500"
          />
          <StatsCard 
            label="Failed" 
            value={stats.failed} 
            color="border-red-500"
          />
          <StatsCard 
            label="Pending" 
            value={stats.pending} 
            color="border-yellow-500"
          />
          <StatsCard 
            label="Retrying" 
            value={stats.retrying} 
            color="border-orange-500"
          />
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FilterDropdown
              label="Status"
              name="status"
              value={params.status ?? ''}
              baseUrl="/dashboard/deliveries"
              currentParams={currentParams}
              options={[
                { value: '', label: 'All statuses' },
                { value: 'delivered', label: 'Delivered' },
                { value: 'failed', label: 'Failed' },
                { value: 'pending', label: 'Pending' },
                { value: 'retrying', label: 'Retrying' },
                { value: 'dead_letter', label: 'Dead Letter' },
              ]}
            />
            <FilterDropdown
              label="Webhook"
              name="webhook_id"
              value={params.webhook_id ?? ''}
              baseUrl="/dashboard/deliveries"
              currentParams={currentParams}
              options={[
                { value: '', label: 'All webhooks' },
                ...webhooksResult.webhooks.map(w => ({
                  value: w.id,
                  label: new URL(w.url).hostname,
                })),
              ]}
            />
            <FilterDropdown
              label="Event Type"
              name="event_type"
              value={params.event_type ?? ''}
              baseUrl="/dashboard/deliveries"
              currentParams={currentParams}
              options={eventTypeOptions}
            />
            {hasFilters && (
              <div className="flex items-end">
                <Link
                  href="/dashboard/deliveries"
                  className="w-full text-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Clear Filters
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Deliveries Table */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          {deliveries.length === 0 ? (
            <EmptyState hasFilters={hasFilters} />
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Webhook
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Attempts
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {deliveries.map((delivery) => {
                    const webhook = webhookMap.get(delivery.webhook_id as string);
                    return (
                      <tr key={delivery.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {delivery.event_type}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              {truncateEventId(delivery.event_id as string)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {webhook ? (
                            <Link
                              href={`/dashboard/webhooks/${webhook.id}`}
                              className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                            >
                              {new URL(webhook.url).hostname}
                            </Link>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              Unknown
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={delivery.status as string} />
                          {delivery.error_message && (
                            <p className="mt-1 text-xs text-red-500 truncate max-w-xs" title={delivery.error_message as string}>
                              {(delivery.error_message as string).slice(0, 40)}...
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {delivery.attempt_count} / {delivery.max_attempts}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatTimeAgo(delivery.created_at as Date)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <Link
                            href={`/dashboard/deliveries/${delivery.id}`}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    {page > 1 && (
                      <Link
                        href={`/dashboard/deliveries?${new URLSearchParams({ ...currentParams, page: String(page - 1) }).toString()}`}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Previous
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link
                        href={`/dashboard/deliveries?${new URLSearchParams({ ...currentParams, page: String(page + 1) }).toString()}`}
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
                        <span className="font-medium">{total}</span> deliveries
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        {page > 1 && (
                          <Link
                            href={`/dashboard/deliveries?${new URLSearchParams({ ...currentParams, page: String(page - 1) }).toString()}`}
                            className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            ← Previous
                          </Link>
                        )}
                        {page < totalPages && (
                          <Link
                            href={`/dashboard/deliveries?${new URLSearchParams({ ...currentParams, page: String(page + 1) }).toString()}`}
                            className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
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
      </main>
    </div>
  );
}
