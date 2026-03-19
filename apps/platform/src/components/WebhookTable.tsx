// =============================================================================
// XRNotify Platform - Webhook Table Component
// =============================================================================
// Reusable table for displaying webhooks with inline actions
// =============================================================================

'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface Webhook {
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

interface WebhookTableProps {
  webhooks: Webhook[];
  showActions?: boolean;
  onRefresh?: () => void;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function truncateUrl(url: string, maxLength = 45): string {
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

function formatTimeAgo(date: Date | null): string {
  if (!date) return 'Never';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function HealthBadge({ isActive, failures }: { isActive: boolean; failures: number }) {
  if (!isActive) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-gray-400" />
        Disabled
      </span>
    );
  }
  
  if (failures === 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-green-500 animate-pulse" />
        Healthy
      </span>
    );
  }
  
  if (failures < 3) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-yellow-500" />
        Degraded
      </span>
    );
  }
  
  if (failures < 10) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-orange-500" />
        Unhealthy
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-red-500" />
      Critical
    </span>
  );
}

function EventTypeBadges({ types }: { types: string[] }) {
  if (types.length === 0) {
    return (
      <span className="text-sm text-gray-500 dark:text-gray-400 italic">
        All events
      </span>
    );
  }

  const displayTypes = types.slice(0, 2);
  const remaining = types.length - 2;

  const getColor = (type: string) => {
    const category = type.split('.')[0] ?? '';
    const colors: Record<string, string> = {
      payment: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
      nft: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200',
      dex: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
      trustline: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
      escrow: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200',
      check: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-200',
    };
    return colors[category] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  return (
    <div className="flex flex-wrap gap-1">
      {displayTypes.map((type) => (
        <span
          key={type}
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getColor(type)}`}
        >
          {type}
        </span>
      ))}
      {remaining > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
          +{remaining} more
        </span>
      )}
    </div>
  );
}

function ActionMenu({ 
  webhook, 
  onToggle, 
  onDelete,
  isLoading,
}: { 
  webhook: Webhook; 
  onToggle: () => void;
  onDelete: () => void;
  isLoading: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={isLoading}
        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
      >
        <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {open && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setOpen(false)} 
          />
          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1">
              <Link
                href={`/dashboard/webhooks/${webhook.id}`}
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setOpen(false)}
              >
                View Details
              </Link>
              <Link
                href={`/dashboard/webhooks/${webhook.id}/edit`}
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setOpen(false)}
              >
                Edit
              </Link>
              <Link
                href={`/dashboard/webhooks/${webhook.id}/deliveries`}
                className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setOpen(false)}
              >
                View Deliveries
              </Link>
              <hr className="my-1 border-gray-200 dark:border-gray-700" />
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onToggle();
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {webhook.is_active ? 'Disable' : 'Enable'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onDelete();
                }}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  isLoading,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  if (!open) return null;

  const confirmColors = confirmVariant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onCancel} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
                confirmVariant === 'danger' ? 'bg-red-100 dark:bg-red-900' : 'bg-indigo-100 dark:bg-indigo-900'
              }`}>
                {confirmVariant === 'danger' ? (
                  <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {message}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto disabled:opacity-50 ${confirmColors}`}
            >
              {isLoading ? 'Processing...' : confirmLabel}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-600 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 sm:mt-0 sm:w-auto"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------------------

export default function WebhookTable({ webhooks, showActions = true, onRefresh }: WebhookTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionWebhook, setActionWebhook] = useState<Webhook | null>(null);
  const [dialogType, setDialogType] = useState<'delete' | 'toggle' | null>(null);

  const handleToggle = async (webhook: Webhook) => {
    startTransition(async () => {
      try {
        await fetch(`/api/v1/webhooks/${webhook.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: !webhook.is_active }),
        });
        setDialogType(null);
        setActionWebhook(null);
        router.refresh();
        onRefresh?.();
      } catch (error) {
        console.error('Failed to toggle webhook:', error);
      }
    });
  };

  const handleDelete = async (webhook: Webhook) => {
    startTransition(async () => {
      try {
        await fetch(`/api/v1/webhooks/${webhook.id}`, {
          method: 'DELETE',
        });
        setDialogType(null);
        setActionWebhook(null);
        router.refresh();
        onRefresh?.();
      } catch (error) {
        console.error('Failed to delete webhook:', error);
      }
    });
  };

  if (webhooks.length === 0) {
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
          Get started by creating a new webhook.
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard/webhooks/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            + New Webhook
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
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
                Last Activity
              </th>
              {showActions && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {webhooks.map((webhook) => (
              <tr key={webhook.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4">
                  <Link
                    href={`/dashboard/webhooks/${webhook.id}`}
                    className="block"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400">
                      {truncateUrl(webhook.url)}
                    </p>
                    {webhook.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {webhook.description}
                      </p>
                    )}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <EventTypeBadges types={webhook.event_types} />
                </td>
                <td className="px-6 py-4">
                  <HealthBadge isActive={webhook.is_active} failures={webhook.consecutive_failures} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {webhook.last_success_at 
                    ? formatTimeAgo(webhook.last_success_at)
                    : webhook.last_failure_at
                      ? `Failed ${formatTimeAgo(webhook.last_failure_at)}`
                      : 'No activity'}
                </td>
                {showActions && (
                  <td className="px-6 py-4 text-right">
                    <ActionMenu
                      webhook={webhook}
                      isLoading={isPending && actionWebhook?.id === webhook.id}
                      onToggle={() => {
                        setActionWebhook(webhook);
                        setDialogType('toggle');
                      }}
                      onDelete={() => {
                        setActionWebhook(webhook);
                        setDialogType('delete');
                      }}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={dialogType === 'delete' && !!actionWebhook}
        title="Delete Webhook"
        message={`Are you sure you want to delete this webhook? This action cannot be undone. All delivery history will be preserved.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={isPending}
        onConfirm={() => actionWebhook && handleDelete(actionWebhook)}
        onCancel={() => {
          setDialogType(null);
          setActionWebhook(null);
        }}
      />

      <ConfirmDialog
        open={dialogType === 'toggle' && !!actionWebhook}
        title={actionWebhook?.is_active ? 'Disable Webhook' : 'Enable Webhook'}
        message={actionWebhook?.is_active
          ? 'This webhook will stop receiving events. You can re-enable it at any time.'
          : 'This webhook will start receiving events immediately.'}
        confirmLabel={actionWebhook?.is_active ? 'Disable' : 'Enable'}
        confirmVariant={actionWebhook?.is_active ? 'danger' : 'primary'}
        isLoading={isPending}
        onConfirm={() => actionWebhook && handleToggle(actionWebhook)}
        onCancel={() => {
          setDialogType(null);
          setActionWebhook(null);
        }}
      />
    </>
  );
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export { WebhookTable, HealthBadge, EventTypeBadges };
