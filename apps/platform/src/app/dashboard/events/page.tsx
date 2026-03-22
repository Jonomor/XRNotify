// =============================================================================
// XRNotify Dashboard - Events Page
// =============================================================================
// Recent XRPL events processed by the platform
// =============================================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentSession } from '@/lib/auth/session';
import { queryAll } from '@/lib/db';

export const dynamic = 'force-dynamic';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface EventRow {
  id: string;
  event_type: string;
  ledger_index: string;
  tx_hash: string;
  timestamp: Date;
  accounts: string[];
  payload: Record<string, unknown>;
}

interface PageProps {
  searchParams: Promise<{
    type?: string;
    account?: string;
    page?: string;
  }>;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatTimeAgo(date: Date | string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
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

function EventTypeBadge({ type }: { type: string }) {
  const category = type.split('.')[0] ?? '';
  const color = EVENT_CATEGORY_COLORS[category] ?? 'bg-zinc-800 text-zinc-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {type}
    </span>
  );
}

function truncateTx(hash: string) {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

const PAGE_SIZE = 50;

const ALL_EVENT_TYPES = [
  'payment.xrp', 'payment.issued',
  'nft.minted', 'nft.burned', 'nft.offer_created', 'nft.offer_accepted', 'nft.offer_cancelled', 'nft.transfer',
  'dex.offer_created', 'dex.offer_cancelled', 'dex.offer_filled', 'dex.offer_partial',
  'trustline.created', 'trustline.modified', 'trustline.deleted',
  'account.created', 'account.deleted', 'account.settings_changed',
  'escrow.created', 'escrow.finished', 'escrow.cancelled',
  'check.created', 'check.cashed', 'check.cancelled',
];

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------

export default async function EventsPage({ searchParams }: PageProps) {
  const session = await getCurrentSession();
  if (!session) redirect('/login');

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const typeFilter = params.type ?? '';
  const accountFilter = params.account?.trim() ?? '';
  const offset = (page - 1) * PAGE_SIZE;

  // Build query dynamically
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (typeFilter) {
    conditions.push(`event_type = $${idx++}::event_type`);
    values.push(typeFilter);
  }
  if (accountFilter) {
    conditions.push(`$${idx++} = ANY(accounts)`);
    values.push(accountFilter);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  values.push(PAGE_SIZE, offset);
  const limitIdx = idx;
  const offsetIdx = idx + 1;

  const events = await queryAll<EventRow>(`
    SELECT id, event_type, ledger_index, tx_hash, timestamp, accounts, payload
    FROM events
    ${where}
    ORDER BY timestamp DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `, values);

  // Count for pagination
  const countValues = conditions.length > 0 ? values.slice(0, conditions.length) : [];
  const countResult = await queryAll<{ count: string }>(`
    SELECT COUNT(*)::text as count FROM events ${where}
  `, countValues);
  const total = parseInt(countResult[0]?.count ?? '0', 10);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <nav className="flex items-center space-x-2 text-sm text-zinc-500 mb-2">
            <Link href="/dashboard" className="hover:text-zinc-300">Dashboard</Link>
            <span>/</span>
            <span className="text-white">Events</span>
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">XRPL Events</h1>
              <p className="text-sm text-zinc-500 mt-1">
                Recent blockchain events processed by XRNotify
              </p>
            </div>
            <span className="text-sm text-zinc-500">
              {total.toLocaleString()} total
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Filters */}
        <form method="GET" className="flex flex-wrap gap-3 mb-6">
          <select
            name="type"
            defaultValue={typeFilter}
            className="px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">All event types</option>
            {ALL_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            name="account"
            type="text"
            defaultValue={accountFilter}
            placeholder="Filter by XRPL address…"
            className="px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 w-64"
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 transition-colors"
          >
            Filter
          </button>
          {(typeFilter || accountFilter) && (
            <Link
              href="/dashboard/events"
              className="px-4 py-2 text-sm font-medium rounded-lg text-zinc-400 hover:text-white transition-colors no-underline"
            >
              Clear
            </Link>
          )}
        </form>

        {/* Table */}
        {events.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            <svg className="mx-auto h-12 w-12 text-zinc-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {typeFilter || accountFilter ? (
              <p className="text-zinc-400 text-sm">No events match your filters.</p>
            ) : (
              <>
                <h3 className="text-white font-medium mb-2">No events yet</h3>
                <p className="text-zinc-400 text-sm max-w-md mx-auto mb-2">
                  Events will appear here once the XRPL listener processes transactions that match your webhook subscriptions.
                </p>
                <p className="text-zinc-500 text-xs max-w-md mx-auto mb-6">
                  Make sure you have at least one active webhook configured. The listener monitors the XRP Ledger in real-time and routes matching events to your endpoints.
                </p>
                <Link
                  href="/dashboard/webhooks/new"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 no-underline transition-colors"
                >
                  + Create a Webhook
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80">
                    <th className="text-left px-4 py-3 font-medium text-zinc-400">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-400">Tx Hash</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-400">Ledger</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-400">Accounts</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-400">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <EventTypeBadge type={event.event_type} />
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-300 text-xs">
                        {truncateTx(event.tx_hash)}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {Number(event.ledger_index).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {event.accounts.slice(0, 2).map((a) => (
                            <span key={a} className="font-mono text-xs text-zinc-400 truncate max-w-[120px]">
                              {a.slice(0, 8)}…
                            </span>
                          ))}
                          {event.accounts.length > 2 && (
                            <span className="text-xs text-zinc-600">+{event.accounts.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                        {formatTimeAgo(event.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-zinc-800 px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-zinc-500">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link
                      href={`/dashboard/events?${new URLSearchParams({ ...(typeFilter ? { type: typeFilter } : {}), ...(accountFilter ? { account: accountFilter } : {}), page: String(page - 1) })}`}
                      className="px-3 py-1.5 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 no-underline transition-colors"
                    >
                      ← Prev
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      href={`/dashboard/events?${new URLSearchParams({ ...(typeFilter ? { type: typeFilter } : {}), ...(accountFilter ? { account: accountFilter } : {}), page: String(page + 1) })}`}
                      className="px-3 py-1.5 text-sm rounded-lg bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 no-underline transition-colors"
                    >
                      Next →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
