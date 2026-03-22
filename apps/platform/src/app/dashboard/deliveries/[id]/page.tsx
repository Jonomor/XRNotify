// =============================================================================
// XRNotify Dashboard - Delivery Detail Page
// =============================================================================

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentSession } from '@/lib/auth/session';
import { getDeliveryWithAttempts } from '@/lib/deliveries/service';
import { getWebhook } from '@/lib/webhooks/service';

export const dynamic = 'force-dynamic';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatDate(value: unknown): string {
  if (!value) return 'N/A';
  return new Date(value as string).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatTimeAgo(value: unknown): string {
  if (!value) return 'Never';
  const seconds = Math.floor((Date.now() - new Date(value as string).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  delivered: { bg: 'bg-green-900', text: 'text-green-200', label: 'Delivered' },
  failed: { bg: 'bg-red-900', text: 'text-red-200', label: 'Failed' },
  pending: { bg: 'bg-yellow-900', text: 'text-yellow-200', label: 'Pending' },
  retrying: { bg: 'bg-orange-900', text: 'text-orange-200', label: 'Retrying' },
  dead_letter: { bg: 'bg-purple-900', text: 'text-purple-200', label: 'Dead Letter' },
  cancelled: { bg: 'bg-zinc-800', text: 'text-zinc-300', label: 'Cancelled' },
};

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------

export default async function DeliveryDetailPage({ params }: PageProps) {
  const session = await getCurrentSession();
  if (!session) redirect('/login');

  const { id } = await params;

  const delivery = await getDeliveryWithAttempts(id, session.tenantId);
  if (!delivery) notFound();

  const webhook = await getWebhook(delivery.webhook_id as string, session.tenantId);
  const statusStyle = STATUS_CONFIG[delivery.status as string] ?? { bg: 'bg-yellow-900', text: 'text-yellow-200', label: 'Pending' };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <nav className="flex items-center space-x-2 text-sm text-zinc-500 mb-2">
            <Link href="/dashboard" className="hover:text-zinc-300">Dashboard</Link>
            <span>/</span>
            <Link href="/dashboard/deliveries" className="hover:text-zinc-300">Deliveries</Link>
            <span>/</span>
            <span className="text-white font-mono text-xs">{id.slice(0, 8)}...</span>
          </nav>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Delivery Detail</h1>
              <p className="mt-1 text-sm text-zinc-500 font-mono">{id}</p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.label}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Status + Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Event Type', value: delivery.event_type as string, valueClass: 'text-white' },
            { label: 'Attempts', value: `${delivery.attempt_count} / ${delivery.max_attempts}`, valueClass: 'text-white' },
            { label: 'Delivered At', value: delivery.delivered_at ? formatTimeAgo(delivery.delivered_at) : 'Not yet', valueClass: delivery.delivered_at ? 'text-emerald-400' : 'text-zinc-500' },
            { label: 'Created', value: formatTimeAgo(delivery.created_at), valueClass: 'text-white' },
          ].map(({ label, value, valueClass }) => (
            <div key={label} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <p className="text-xs text-zinc-500 mb-1">{label}</p>
              <p className={`text-sm font-semibold ${valueClass}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Delivery Info */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold text-white">Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-500">Webhook</p>
              {webhook ? (
                <Link href={`/dashboard/webhooks/${webhook.id}`} className="text-emerald-400 hover:text-emerald-300">
                  {webhook.url}
                </Link>
              ) : (
                <p className="text-zinc-400">Deleted webhook</p>
              )}
            </div>
            <div>
              <p className="text-zinc-500">Event ID</p>
              <p className="text-zinc-300 font-mono text-xs break-all">{delivery.event_id as string}</p>
            </div>
            {delivery.last_error && (
              <div className="sm:col-span-2">
                <p className="text-zinc-500">Last Error</p>
                <p className="text-red-400 text-sm">{delivery.last_error as string}</p>
              </div>
            )}
            {delivery.next_attempt_at && (
              <div>
                <p className="text-zinc-500">Next Retry</p>
                <p className="text-zinc-300">{formatDate(delivery.next_attempt_at)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Payload */}
        {delivery.payload && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h2 className="text-base font-semibold text-white">Payload</h2>
            </div>
            <div className="p-4 overflow-x-auto">
              <pre className="text-sm text-zinc-300 font-mono whitespace-pre">
                {JSON.stringify(delivery.payload, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Attempt History */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="text-base font-semibold text-white">Attempt History</h2>
          </div>

          {delivery.attempts.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-zinc-500">
              No attempts recorded yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80">
                  <th className="text-left px-6 py-3 font-medium text-zinc-400">#</th>
                  <th className="text-left px-6 py-3 font-medium text-zinc-400">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-zinc-400">Duration</th>
                  <th className="text-left px-6 py-3 font-medium text-zinc-400">Error</th>
                  <th className="text-left px-6 py-3 font-medium text-zinc-400">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {delivery.attempts.map((attempt) => (
                  <tr key={attempt.attempt_number} className="hover:bg-zinc-800/30">
                    <td className="px-6 py-3 text-zinc-300">{attempt.attempt_number}</td>
                    <td className="px-6 py-3">
                      {attempt.status_code ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          attempt.status_code >= 200 && attempt.status_code < 300
                            ? 'bg-green-900 text-green-200'
                            : 'bg-red-900 text-red-200'
                        }`}>
                          {attempt.status_code}
                        </span>
                      ) : (
                        <span className="text-zinc-500">No response</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-zinc-400">
                      {attempt.duration_ms ? `${attempt.duration_ms}ms` : 'N/A'}
                    </td>
                    <td className="px-6 py-3 text-red-400 text-xs max-w-xs truncate">
                      {attempt.error_message ?? '-'}
                    </td>
                    <td className="px-6 py-3 text-zinc-500 whitespace-nowrap">
                      {formatTimeAgo(attempt.attempted_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Response Body (from last attempt) */}
        {delivery.attempts.length > 0 && delivery.attempts[delivery.attempts.length - 1]?.response_body && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800">
              <h2 className="text-base font-semibold text-white">Last Response Body</h2>
            </div>
            <div className="p-4 overflow-x-auto">
              <pre className="text-sm text-zinc-400 font-mono whitespace-pre">
                {delivery.attempts[delivery.attempts.length - 1]?.response_body}
              </pre>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
