// =============================================================================
// XRNotify Platform - Delivery Table Component
// =============================================================================
// Reusable table for displaying webhook deliveries with status and actions
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface Delivery {
  id: string;
  webhook_id: string;
  event_id: string;
  event_type: string;
  status: string;
  attempt_count: number;
  max_attempts: number;
  response_status: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  delivered_at: Date | null;
  next_retry_at: Date | null;
  created_at: Date;
}

interface Webhook {
  id: string;
  url: string;
}

interface DeliveryTableProps {
  deliveries: Delivery[];
  webhooks?: Map<string, Webhook>;
  showWebhook?: boolean;
  showActions?: boolean;
  emptyMessage?: string;
}

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; dot: string; label: string }> = {
    delivered: {
      bg: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      dot: 'bg-green-500',
      label: 'Delivered',
    },
    failed: {
      bg: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      dot: 'bg-red-500',
      label: 'Failed',
    },
    pending: {
      bg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      dot: 'bg-yellow-500 animate-pulse',
      label: 'Pending',
    },
    retrying: {
      bg: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      dot: 'bg-orange-500 animate-pulse',
      label: 'Retrying',
    },
    dead_letter: {
      bg: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      dot: 'bg-purple-500',
      label: 'Dead Letter',
    },
    cancelled: {
      bg: 'bg-zinc-800 text-zinc-300',
      dot: 'bg-zinc-400',
      label: 'Cancelled',
    },
  };

  const style = config[status] ?? config['pending'];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style!.bg}`}>
      <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${style!.dot}`} />
      {style!.label}
    </span>
  );
}

function EventTypeBadge({ type }: { type: string }) {
  const category = type.split('.')[0] ?? '';
  const colors: Record<string, string> = {
    payment: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    nft: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    dex: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    trustline: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
    escrow: 'bg-emerald-500/10 text-emerald-400',
    check: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[category] ?? 'bg-zinc-800 text-zinc-300'}`}>
      {type}
    </span>
  );
}

function ResponseBadge({ status, timeMs }: { status: number | null; timeMs: number | null }) {
  if (status === null) {
    return <span className="text-zinc-500 text-sm">—</span>;
  }

  const isSuccess = status >= 200 && status < 300;
  const colorClass = isSuccess
    ? 'text-green-400'
    : 'text-red-400';

  return (
    <div className="flex flex-col">
      <span className={`text-sm font-medium ${colorClass}`}>{status}</span>
      {timeMs !== null && (
        <span className="text-xs text-zinc-500">{timeMs}ms</span>
      )}
    </div>
  );
}

function AttemptsBadge({ current, max }: { current: number; max: number }) {
  const percentage = (current / max) * 100;
  const colorClass =
    percentage >= 100 ? 'text-red-400' :
    percentage >= 75 ? 'text-orange-400' :
    percentage >= 50 ? 'text-yellow-400' :
    'text-zinc-400';

  return (
    <span className={`text-sm ${colorClass}`}>
      {current}/{max}
    </span>
  );
}

function ReplayButton({ 
  deliveryId, 
  disabled,
  onReplay,
}: { 
  deliveryId: string;
  disabled: boolean;
  onReplay: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onReplay(deliveryId)}
      disabled={disabled}
      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-emerald-400 hover:bg-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Replay this delivery"
    >
      <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Replay
    </button>
  );
}

function formatTimeAgo(date: Date | null): string {
  if (!date) return '—';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 0) return 'scheduled';
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

function formatNextRetry(date: Date | null): string {
  if (!date) return '—';
  const seconds = Math.floor((new Date(date).getTime() - Date.now()) / 1000);

  if (seconds < 0) return 'now';
  if (seconds < 60) return `in ${seconds}s`;
  if (seconds < 3600) return `in ${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `in ${Math.floor(seconds / 3600)}h`;
  return new Date(date).toLocaleDateString();
}

function truncateEventId(eventId: string, maxLength = 24): string {
  if (eventId.length <= maxLength) return eventId;
  // Keep the prefix (xrpl:) and truncate the middle
  const prefix = eventId.slice(0, 5);
  const suffix = eventId.slice(-12);
  return `${prefix}...${suffix}`;
}

function truncateUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url.slice(0, 20);
  }
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function DeliveryTable({
  deliveries,
  webhooks = new Map(),
  showWebhook = true,
  showActions = true,
  emptyMessage = 'No deliveries found',
}: DeliveryTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [replayingId, setReplayingId] = useState<string | null>(null);

  const handleReplay = async (deliveryId: string) => {
    setReplayingId(deliveryId);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/v1/deliveries/${deliveryId}?action=replay`, {
          method: 'POST',
        });

        if (response.ok) {
          router.refresh();
        } else {
          const data = await response.json();
          console.error('Replay failed:', data.error);
        }
      } catch (error) {
        console.error('Replay failed:', error);
      } finally {
        setReplayingId(null);
      }
    });
  };

  if (deliveries.length === 0) {
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
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p className="mt-2 text-sm text-zinc-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-800">
        <thead className="bg-zinc-950">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Event
            </th>
            {showWebhook && (
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Webhook
              </th>
            )}
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Response
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Attempts
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Time
            </th>
            {showActions && (
              <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-zinc-900 divide-y divide-zinc-800">
          {deliveries.map((delivery) => {
            const webhook = webhooks.get(delivery.webhook_id);
            const canReplay = ['failed', 'dead_letter'].includes(delivery.status);
            const isReplaying = replayingId === delivery.id;

            return (
              <tr
                key={delivery.id}
                className={`hover:bg-zinc-800/30 ${isPending && isReplaying ? 'opacity-50' : ''}`}
              >
                {/* Event */}
                <td className="px-4 py-3">
                  <div className="flex flex-col space-y-1">
                    <EventTypeBadge type={delivery.event_type} />
                    <Link
                      href={`/dashboard/deliveries/${delivery.id}`}
                      className="text-xs font-mono text-zinc-500 hover:text-emerald-400"
                      title={delivery.event_id}
                    >
                      {truncateEventId(delivery.event_id)}
                    </Link>
                  </div>
                </td>

                {/* Webhook */}
                {showWebhook && (
                  <td className="px-4 py-3">
                    {webhook ? (
                      <Link
                        href={`/dashboard/webhooks/${webhook.id}`}
                        className="text-sm text-emerald-400 hover:underline"
                      >
                        {truncateUrl(webhook.url)}
                      </Link>
                    ) : (
                      <span className="text-sm text-zinc-500">Unknown</span>
                    )}
                  </td>
                )}

                {/* Status */}
                <td className="px-4 py-3">
                  <StatusBadge status={delivery.status} />
                  {delivery.status === 'retrying' && delivery.next_retry_at && (
                    <p className="text-xs text-zinc-500 mt-1">
                      Next: {formatNextRetry(delivery.next_retry_at)}
                    </p>
                  )}
                  {delivery.error_message && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1 truncate max-w-[150px]" title={delivery.error_message}>
                      {delivery.error_message}
                    </p>
                  )}
                </td>

                {/* Response */}
                <td className="px-4 py-3">
                  <ResponseBadge status={delivery.response_status} timeMs={delivery.response_time_ms} />
                </td>

                {/* Attempts */}
                <td className="px-4 py-3">
                  <AttemptsBadge current={delivery.attempt_count} max={delivery.max_attempts} />
                </td>

                {/* Time */}
                <td className="px-4 py-3 text-sm text-zinc-500">
                  {delivery.delivered_at
                    ? formatTimeAgo(delivery.delivered_at)
                    : formatTimeAgo(delivery.created_at)}
                </td>

                {/* Actions */}
                {showActions && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        href={`/dashboard/deliveries/${delivery.id}`}
                        className="text-xs text-zinc-400 hover:text-emerald-400"
                      >
                        View
                      </Link>
                      {canReplay && (
                        <ReplayButton
                          deliveryId={delivery.id}
                          disabled={isReplaying}
                          onReplay={handleReplay}
                        />
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export { DeliveryTable, StatusBadge, EventTypeBadge, ResponseBadge };
