// =============================================================================
// XRNotify Dashboard - Event Detail Page
// =============================================================================

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentSession } from '@/lib/auth/session';
import { queryOne, queryAll } from '@/lib/db';

export const dynamic = 'force-dynamic';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>;
}

interface EventRecord {
  id: string;
  event_type: string;
  ledger_index: string;
  tx_hash: string;
  timestamp: Date;
  accounts: string[];
  payload: Record<string, unknown>;
  created_at: Date;
}

interface DeliveryRow {
  id: string;
  webhook_id: string;
  event_type: string;
  status: string;
  attempt_count: number;
  max_attempts: number;
  created_at: Date;
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

const EVENT_CATEGORY_COLORS: Record<string, string> = {
  payment: 'bg-blue-900/50 text-blue-300',
  nft: 'bg-purple-900/50 text-purple-300',
  dex: 'bg-green-900/50 text-green-300',
  trustline: 'bg-yellow-900/50 text-yellow-300',
  account: 'bg-zinc-800 text-zinc-300',
  escrow: 'bg-emerald-500/10 text-emerald-400',
  check: 'bg-pink-900/50 text-pink-300',
};

const STATUS_COLORS: Record<string, string> = {
  delivered: 'bg-green-900/50 text-green-300',
  failed: 'bg-red-900/50 text-red-300',
  pending: 'bg-yellow-900/50 text-yellow-300',
  retrying: 'bg-orange-900/50 text-orange-300',
  dead_letter: 'bg-purple-900/50 text-purple-300',
};

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------

export default async function EventDetailPage({ params }: PageProps) {
  const session = await getCurrentSession();
  if (!session) redirect('/login');

  const { id } = await params;

  const event = await queryOne<EventRecord>(`
    SELECT id, event_type, ledger_index, tx_hash, timestamp, accounts, payload, created_at
    FROM events WHERE id = $1
  `, [id]);

  if (!event) notFound();

  // Get deliveries for this event
  const deliveries = await queryAll<DeliveryRow>(`
    SELECT d.id, d.webhook_id, d.event_type, d.status, d.attempt_count, d.max_attempts, d.created_at
    FROM deliveries d
    WHERE d.event_id = $1 AND d.tenant_id = $2
    ORDER BY d.created_at DESC
  `, [id, session.tenantId]);

  const category = event.event_type.split('.')[0] ?? '';
  const badgeColor = EVENT_CATEGORY_COLORS[category] ?? 'bg-zinc-800 text-zinc-300';

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <nav className="flex items-center space-x-2 text-sm text-zinc-500 mb-2">
            <Link href="/dashboard" className="hover:text-zinc-300">Dashboard</Link>
            <span>/</span>
            <Link href="/dashboard/events" className="hover:text-zinc-300">Events</Link>
            <span>/</span>
            <span className="text-white font-mono text-xs">{id.slice(0, 8)}...</span>
          </nav>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                Event Detail
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${badgeColor}`}>
                  {event.event_type}
                </span>
              </h1>
              <p className="mt-1 text-sm text-zinc-500 font-mono">{id}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-500 mb-1">Ledger Index</p>
            <p className="text-sm font-semibold text-white">{Number(event.ledger_index).toLocaleString()}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-500 mb-1">Timestamp</p>
            <p className="text-sm font-semibold text-white">{formatTimeAgo(event.timestamp)}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-500 mb-1">Accounts</p>
            <p className="text-sm font-semibold text-white">{event.accounts.length}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <p className="text-xs text-zinc-500 mb-1">Deliveries</p>
            <p className="text-sm font-semibold text-white">{deliveries.length}</p>
          </div>
        </div>

        {/* Transaction Info */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold text-white">Transaction</h2>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <p className="text-zinc-500">Transaction Hash</p>
              <p className="text-zinc-300 font-mono text-xs break-all">{event.tx_hash}</p>
            </div>
            <div>
              <p className="text-zinc-500">Accounts Involved</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {event.accounts.map((addr) => (
                  <code key={addr} className="text-xs font-mono text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">
                    {addr}
                  </code>
                ))}
              </div>
            </div>
            <div>
              <p className="text-zinc-500">Event Time</p>
              <p className="text-zinc-300">{formatDate(event.timestamp)}</p>
            </div>
          </div>
        </div>

        {/* Full Payload */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="text-base font-semibold text-white">Payload</h2>
          </div>
          <div className="p-4 overflow-x-auto">
            <pre className="text-sm text-zinc-300 font-mono whitespace-pre">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          </div>
        </div>

        {/* Related Deliveries */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="text-base font-semibold text-white">Related Deliveries</h2>
          </div>

          {deliveries.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-zinc-500">
              No deliveries for this event.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80">
                  <th className="text-left px-6 py-3 font-medium text-zinc-400">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-zinc-400">Attempts</th>
                  <th className="text-left px-6 py-3 font-medium text-zinc-400">Time</th>
                  <th className="text-right px-6 py-3 font-medium text-zinc-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {deliveries.map((d) => {
                  const statusColor = STATUS_COLORS[d.status] ?? 'bg-zinc-800 text-zinc-300';
                  return (
                    <tr key={d.id} className="hover:bg-zinc-800/30">
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}>
                          {d.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-zinc-500">{d.attempt_count} / {d.max_attempts}</td>
                      <td className="px-6 py-3 text-zinc-500">{formatTimeAgo(d.created_at)}</td>
                      <td className="px-6 py-3 text-right">
                        <Link href={`/dashboard/deliveries/${d.id}`} className="text-emerald-400 hover:text-emerald-300">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </main>
    </div>
  );
}
