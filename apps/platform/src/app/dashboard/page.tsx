// =============================================================================
// XRNotify Platform - Dashboard Home Page
// =============================================================================
// Overview page with metrics, recent deliveries, and webhook health
// =============================================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentSession } from '@/lib/auth/session';
import { getDeliveryStats, listDeliveries } from '@/lib/deliveries/service';
import { listWebhooks } from '@/lib/webhooks/service';
import { listApiKeys } from '@/lib/auth/apiKey';
import { getUsageTracker } from '@/lib/rate-limit/tokenBucket';
import { queryOne } from '@/lib/db';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  href?: string;
}

interface DeliveryRow {
  id: string;
  event_type: string;
  status: string;
  created_at: Date;
  webhook_id: string;
}

interface WebhookRow {
  id: string;
  url: string;
  is_active: boolean;
  consecutive_failures: number;
  last_success_at: Date | null;
}

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

function MetricCard({ title, value, subtitle, trend, href }: MetricCardProps) {
  const content = (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {title}
        </h3>
        {trend && (
          <span className={`text-sm ${
            trend === 'up' ? 'text-green-500' : 
            trend === 'down' ? 'text-red-500' : 
            'text-gray-400'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    retrying: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    dead_letter: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-800'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function WebhookHealthBadge({ failures }: { failures: number }) {
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
        Degraded
      </span>
    );
  }
  if (failures < 10) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
        Unhealthy
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
      Critical
    </span>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function truncateUrl(url: string, maxLength = 40): string {
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

// -----------------------------------------------------------------------------
// Page Component
// -----------------------------------------------------------------------------

export default async function DashboardPage() {
  // Check authentication
  const session = await getCurrentSession();
  
  if (!session) {
    redirect('/login');
  }

  const tenantId = session.tenantId;

  // Fetch dashboard data in parallel
  const [
    deliveryStats,
    recentDeliveries,
    webhooks,
    apiKeys,
    currentUsage,
    tenant,
  ] = await Promise.all([
    getDeliveryStats(tenantId),
    listDeliveries({ tenantId, limit: 10, offset: 0 }),
    listWebhooks(tenantId, { limit: 100 }),
    listApiKeys(tenantId),
    getUsageTracker().getUsage(tenantId),
    queryOne<{ events_per_month: number; webhook_limit: number }>(
      'SELECT events_per_month, webhook_limit FROM tenants WHERE id = $1',
      [tenantId]
    ),
  ]);

  const activeWebhooks = webhooks.webhooks.filter(w => w.is_active);
  const unhealthyWebhooks = webhooks.webhooks.filter(w => w.consecutive_failures > 0);
  const eventsLimit = tenant?.events_per_month ?? 1000;
  const usagePercent = Math.round((currentUsage / eventsLimit) * 100);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Welcome back, {session.name ?? session.email}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/webhooks/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                + New Webhook
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Active Webhooks"
            value={activeWebhooks.length}
            subtitle={`of ${tenant?.webhook_limit ?? 0} limit`}
            href="/dashboard/webhooks"
          />
          <MetricCard
            title="Deliveries (24h)"
            value={deliveryStats.total.toLocaleString()}
            subtitle={`${deliveryStats.successRate.toFixed(1)}% success rate`}
            trend={deliveryStats.successRate >= 95 ? 'up' : deliveryStats.successRate < 80 ? 'down' : 'neutral'}
            href="/dashboard/deliveries"
          />
          <MetricCard
            title="Events This Month"
            value={currentUsage.toLocaleString()}
            subtitle={`${usagePercent}% of ${eventsLimit.toLocaleString()} limit`}
            trend={usagePercent > 90 ? 'down' : 'neutral'}
          />
          <MetricCard
            title="API Keys"
            value={apiKeys.length}
            subtitle={`${apiKeys.filter(k => k.is_active).length} active`}
            href="/dashboard/api-keys"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Deliveries */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Recent Deliveries
                </h2>
                <Link
                  href="/dashboard/deliveries"
                  className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  View all →
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentDeliveries.deliveries.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  <p>No deliveries yet</p>
                  <p className="mt-1 text-sm">Create a webhook to start receiving events</p>
                </div>
              ) : (
                recentDeliveries.deliveries.slice(0, 5).map((delivery) => (
                  <Link
                    key={delivery.id}
                    href={`/dashboard/deliveries/${delivery.id}`}
                    className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {delivery.event_type}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTimeAgo(new Date(delivery.created_at))}
                        </p>
                      </div>
                      <StatusBadge status={delivery.status} />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Webhook Health */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Webhook Health
                </h2>
                <Link
                  href="/dashboard/webhooks"
                  className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  Manage →
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {webhooks.webhooks.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  <p>No webhooks configured</p>
                  <Link
                    href="/dashboard/webhooks/new"
                    className="mt-2 inline-block text-sm text-indigo-600 hover:text-indigo-500"
                  >
                    Create your first webhook →
                  </Link>
                </div>
              ) : (
                webhooks.webhooks.slice(0, 5).map((webhook) => (
                  <Link
                    key={webhook.id}
                    href={`/dashboard/webhooks/${webhook.id}`}
                    className="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {truncateUrl(webhook.url)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {webhook.last_success_at
                            ? `Last success: ${formatTimeAgo(new Date(webhook.last_success_at))}`
                            : 'No deliveries yet'}
                        </p>
                      </div>
                      <WebhookHealthBadge failures={webhook.consecutive_failures} />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        {unhealthyWebhooks.length > 0 && (
          <div className="mt-8">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    {unhealthyWebhooks.length} webhook{unhealthyWebhooks.length > 1 ? 's' : ''} experiencing failures
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>
                      Check your endpoint URLs and ensure they are returning 2xx responses.
                    </p>
                  </div>
                  <div className="mt-4">
                    <Link
                      href="/dashboard/webhooks?filter=unhealthy"
                      className="text-sm font-medium text-red-800 dark:text-red-200 hover:text-red-600"
                    >
                      View affected webhooks →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Usage Warning */}
        {usagePercent >= 80 && (
          <div className="mt-8">
            <div className={`border rounded-lg p-4 ${
              usagePercent >= 100 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className={`h-5 w-5 ${usagePercent >= 100 ? 'text-red-400' : 'text-yellow-400'}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${
                    usagePercent >= 100 
                      ? 'text-red-800 dark:text-red-200'
                      : 'text-yellow-800 dark:text-yellow-200'
                  }`}>
                    {usagePercent >= 100 
                      ? 'Event limit exceeded' 
                      : `Approaching event limit (${usagePercent}%)`}
                  </h3>
                  <div className={`mt-2 text-sm ${
                    usagePercent >= 100 
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-yellow-700 dark:text-yellow-300'
                  }`}>
                    <p>
                      {usagePercent >= 100
                        ? 'You have exceeded your monthly event limit. Upgrade your plan to continue receiving events.'
                        : 'Consider upgrading your plan to avoid service interruption.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
