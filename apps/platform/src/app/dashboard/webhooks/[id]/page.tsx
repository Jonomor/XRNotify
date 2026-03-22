// =============================================================================
// XRNotify Dashboard - Webhook Detail Page
// =============================================================================

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentSession } from '@/lib/auth/session';
import { getWebhook, deleteWebhook, updateWebhook } from '@/lib/webhooks/service';
import { listDeliveries } from '@/lib/deliveries/service';
import { TestWebhookButton } from '@/components/TestWebhookButton';

export const dynamic = 'force-dynamic';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>;
}

// -----------------------------------------------------------------------------
// Server Actions
// -----------------------------------------------------------------------------

async function deleteWebhookAction(formData: FormData) {
  'use server';
  const session = await getCurrentSession();
  if (!session) return;
  const webhookId = formData.get('webhook_id') as string;
  await deleteWebhook(webhookId, session.tenantId);
  redirect('/dashboard/webhooks');
}

async function toggleWebhookAction(formData: FormData) {
  'use server';
  const session = await getCurrentSession();
  if (!session) return;
  const webhookId = formData.get('webhook_id') as string;
  const isActive = formData.get('is_active') === 'true';
  await updateWebhook(webhookId, session.tenantId, { is_active: !isActive });
  redirect(`/dashboard/webhooks/${webhookId}`);
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatDate(value: unknown): string {
  if (!value) return 'Never';
  return new Date(value as string).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

export default async function WebhookDetailPage({ params }: PageProps) {
  const session = await getCurrentSession();
  if (!session) redirect('/login');

  const { id } = await params;

  const [webhook, deliveryResult] = await Promise.all([
    getWebhook(id, session.tenantId),
    listDeliveries({ tenantId: session.tenantId, webhookId: id, limit: 10, offset: 0 }),
  ]);

  if (!webhook) notFound();

  const recentDeliveries = deliveryResult.deliveries;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <nav className="flex items-center space-x-2 text-sm text-zinc-500 mb-2">
            <Link href="/dashboard" className="hover:text-zinc-300">Dashboard</Link>
            <span>/</span>
            <Link href="/dashboard/webhooks" className="hover:text-zinc-300">Webhooks</Link>
            <span>/</span>
            <span className="text-white truncate max-w-xs">{new URL(webhook.url).hostname}</span>
          </nav>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white break-all">{webhook.url}</h1>
              {webhook.description && (
                <p className="mt-1 text-sm text-zinc-400">{webhook.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Test */}
              <TestWebhookButton webhookId={webhook.id} />
              {/* Edit */}
              <Link
                href={`/dashboard/webhooks/${webhook.id}/edit`}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 no-underline transition-colors"
              >
                Edit
              </Link>
              {/* Toggle active */}
              <form action={toggleWebhookAction}>
                <input type="hidden" name="webhook_id" value={webhook.id} />
                <input type="hidden" name="is_active" value={String(webhook.is_active)} />
                <button
                  type="submit"
                  className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    webhook.is_active
                      ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      : 'border-emerald-700 bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50'
                  }`}
                >
                  {webhook.is_active ? 'Disable' : 'Enable'}
                </button>
              </form>
              {/* Delete */}
              <form action={deleteWebhookAction}>
                <input type="hidden" name="webhook_id" value={webhook.id} />
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-red-900/50 bg-red-900/20 text-red-400 hover:bg-red-900/40 transition-colors"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Status + Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: 'Status',
              value: webhook.is_active ? 'Active' : 'Disabled',
              valueClass: webhook.is_active ? 'text-emerald-400' : 'text-zinc-400',
            },
            {
              label: 'Failures',
              value: String(webhook.consecutive_failures ?? 0),
              valueClass: (webhook.consecutive_failures ?? 0) > 0 ? 'text-red-400' : 'text-white',
            },
            {
              label: 'Last Success',
              value: formatTimeAgo(webhook.last_success_at),
              valueClass: 'text-white',
            },
            {
              label: 'Created',
              value: formatDate(webhook.created_at),
              valueClass: 'text-white',
            },
          ].map(({ label, value, valueClass }) => (
            <div key={label} className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <p className="text-xs text-zinc-500 mb-1">{label}</p>
              <p className={`text-sm font-semibold ${valueClass}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Details */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold text-white">Configuration</h2>

          {/* Secret prefix */}
          <div>
            <p className="text-xs text-zinc-500 mb-1">Secret prefix</p>
            <code className="font-mono text-sm text-zinc-300">
              {webhook.secret_prefix ?? 'N/A'}…
            </code>
            <p className="text-xs text-zinc-600 mt-0.5">Full secret was shown once at creation</p>
          </div>

          {/* Event types */}
          <div>
            <p className="text-xs text-zinc-500 mb-2">Event types</p>
            {webhook.event_types.length === 0 ? (
              <span className="text-sm text-zinc-400">All events</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {webhook.event_types.map((type) => {
                  const category = type.split('.')[0] ?? '';
                  const color = EVENT_CATEGORY_COLORS[category] ?? 'bg-zinc-800 text-zinc-300';
                  return (
                    <span key={type} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
                      {type}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Account filters */}
          <div>
            <p className="text-xs text-zinc-500 mb-2">Account filters</p>
            {webhook.account_filters.length === 0 ? (
              <span className="text-sm text-zinc-400">All accounts</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {webhook.account_filters.map((addr) => (
                  <code key={addr} className="text-xs font-mono text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">
                    {addr}
                  </code>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Deliveries */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Recent Deliveries</h2>
            <Link
              href={`/dashboard/deliveries?webhook_id=${webhook.id}`}
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              View all →
            </Link>
          </div>

          {recentDeliveries.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-zinc-500">
              No deliveries yet for this webhook.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80">
                  <th className="text-left px-6 py-3 font-medium text-zinc-400">Event</th>
                  <th className="text-left px-6 py-3 font-medium text-zinc-400">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-zinc-400">Attempts</th>
                  <th className="text-left px-6 py-3 font-medium text-zinc-400">Time</th>
                  <th className="text-right px-6 py-3 font-medium text-zinc-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {recentDeliveries.map((d) => {
                  const statusColor = STATUS_COLORS[d.status as string] ?? 'bg-zinc-800 text-zinc-300';
                  return (
                    <tr key={d.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-3 text-zinc-300">{d.event_type}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}>
                          {(d.status as string).replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-zinc-500">
                        {d.attempt_count} / {d.max_attempts}
                      </td>
                      <td className="px-6 py-3 text-zinc-500 whitespace-nowrap">
                        {formatTimeAgo(d.created_at)}
                      </td>
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
