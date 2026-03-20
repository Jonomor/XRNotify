// =============================================================================
// XRNotify Platform - Metric Cards Component
// =============================================================================
// Reusable metric/stat cards for dashboard displays
// =============================================================================

'use client';

import Link from 'next/link';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
  };
  href?: string;
  color?: 'default' | 'green' | 'red' | 'yellow' | 'blue' | 'purple';
}

interface MetricCardsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
}

interface ProgressCardProps {
  title: string;
  current: number;
  max: number;
  unit?: string;
  showPercentage?: boolean;
  warningThreshold?: number;
  dangerThreshold?: number;
  href?: string;
}

interface SparklineCardProps {
  title: string;
  value: string | number;
  data: number[];
  color?: 'green' | 'blue' | 'purple';
  href?: string;
}

// -----------------------------------------------------------------------------
// Icons
// -----------------------------------------------------------------------------

const TrendUpIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TrendDownIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

const TrendNeutralIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
  </svg>
);

// -----------------------------------------------------------------------------
// Helper Components
// -----------------------------------------------------------------------------

function CardWrapper({ 
  href, 
  children, 
  className = '' 
}: { 
  href?: string; 
  children: React.ReactNode;
  className?: string;
}) {
  const baseClass = `bg-zinc-900 rounded-lg p-6 ${className}`;

  if (href) {
    return (
      <Link href={href} className={`${baseClass} transition-shadow cursor-pointer`}>
        {children}
      </Link>
    );
  }

  return <div className={baseClass}>{children}</div>;
}

function TrendIndicator({ trend }: { trend: MetricCardProps['trend'] }) {
  if (!trend) return null;

  const config = {
    up: {
      icon: <TrendUpIcon />,
      color: 'text-green-400',
      bg: 'bg-green-900/30',
    },
    down: {
      icon: <TrendDownIcon />,
      color: 'text-red-400',
      bg: 'bg-red-900/30',
    },
    neutral: {
      icon: <TrendNeutralIcon />,
      color: 'text-zinc-500',
      bg: 'bg-zinc-800',
    },
  };

  const style = config[trend.direction];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.color}`}>
      {style.icon}
      <span className="ml-1">{trend.value}</span>
    </span>
  );
}

// -----------------------------------------------------------------------------
// Main Components
// -----------------------------------------------------------------------------

/**
 * Single metric card with optional trend indicator and icon
 */
export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  href,
  color = 'default',
}: MetricCardProps) {
  const colorClasses = {
    default: 'border-l-gray-400',
    green: 'border-l-green-500',
    red: 'border-l-red-500',
    yellow: 'border-l-yellow-500',
    blue: 'border-l-blue-500',
    purple: 'border-l-purple-500',
  };

  return (
    <CardWrapper href={href} className={`border-l-4 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-500 truncate">
            {title}
          </p>
          <div className="mt-1 flex items-baseline">
            <p className="text-2xl font-semibold text-white">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {trend && (
              <div className="ml-2">
                <TrendIndicator trend={trend} />
              </div>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-zinc-500">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-4">
            <div className="p-3 bg-zinc-800 rounded-lg text-zinc-300">
              {icon}
            </div>
          </div>
        )}
      </div>
    </CardWrapper>
  );
}

/**
 * Progress bar card for usage/quota displays
 */
export function ProgressCard({
  title,
  current,
  max,
  unit = '',
  showPercentage = true,
  warningThreshold = 75,
  dangerThreshold = 90,
  href,
}: ProgressCardProps) {
  const percentage = Math.min(Math.round((current / max) * 100), 100);
  
  const getBarColor = () => {
    if (percentage >= dangerThreshold) return 'bg-red-500';
    if (percentage >= warningThreshold) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getTextColor = () => {
    if (percentage >= dangerThreshold) return 'text-red-400';
    if (percentage >= warningThreshold) return 'text-yellow-400';
    return 'text-zinc-400';
  };

  return (
    <CardWrapper href={href}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-zinc-500">
          {title}
        </p>
        {showPercentage && (
          <span className={`text-sm font-medium ${getTextColor()}`}>
            {percentage}%
          </span>
        )}
      </div>

      <div className="flex items-baseline mb-2">
        <span className="text-2xl font-semibold text-white">
          {current.toLocaleString()}
        </span>
        <span className="ml-1 text-sm text-zinc-500">
          / {max.toLocaleString()} {unit}
        </span>
      </div>

      <div className="w-full bg-zinc-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {percentage >= dangerThreshold && (
        <p className="mt-2 text-xs text-red-400">
          ⚠️ Approaching limit
        </p>
      )}
    </CardWrapper>
  );
}

/**
 * Mini sparkline chart card
 */
export function SparklineCard({
  title,
  value,
  data,
  color = 'blue',
  href,
}: SparklineCardProps) {
  const colors = {
    green: 'stroke-green-500',
    blue: 'stroke-blue-500',
    purple: 'stroke-purple-500',
  };

  // Normalize data for SVG
  const maxVal = Math.max(...data, 1);
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (val / maxVal) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <CardWrapper href={href}>
      <p className="text-sm font-medium text-zinc-500">
        {title}
      </p>
      <p className="mt-1 text-2xl font-semibold text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      
      {data.length > 1 && (
        <div className="mt-3 h-10">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            <polyline
              points={points}
              fill="none"
              className={colors[color]}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </CardWrapper>
  );
}

/**
 * Simple stat card (minimal version)
 */
export function StatCard({
  label,
  value,
  color = 'default',
}: {
  label: string;
  value: string | number;
  color?: 'default' | 'green' | 'red' | 'yellow' | 'blue';
}) {
  const colorClasses = {
    default: 'border-zinc-700',
    green: 'border-green-500',
    red: 'border-red-500',
    yellow: 'border-yellow-500',
    blue: 'border-blue-500',
  };

  return (
    <div className={`bg-zinc-900 rounded-lg px-4 py-3 border-l-4 ${colorClasses[color]}`}>
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="text-xl font-semibold text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

/**
 * Grid wrapper for metric cards
 */
export function MetricCardsGrid({ children, columns = 4 }: MetricCardsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 sm:gap-6`}>
      {children}
    </div>
  );
}

/**
 * Stat summary row (compact inline stats)
 */
export function StatSummary({
  stats,
}: {
  stats: Array<{ label: string; value: string | number; color?: string }>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center">
          <span className="text-zinc-500">{stat.label}:</span>
          <span className={`ml-1 font-medium ${stat.color ?? 'text-white'}`}>
            {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Preset Cards
// -----------------------------------------------------------------------------

/**
 * Webhook count card with icon
 */
export function WebhooksCard({
  active,
  total,
  href = '/dashboard/webhooks',
}: {
  active: number;
  total: number;
  href?: string;
}) {
  return (
    <MetricCard
      title="Active Webhooks"
      value={active}
      subtitle={`${total} total`}
      href={href}
      color="blue"
      icon={
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      }
    />
  );
}

/**
 * Deliveries card with success rate
 */
export function DeliveriesCard({
  total,
  successRate,
  href = '/dashboard/deliveries',
}: {
  total: number;
  successRate: number;
  href?: string;
}) {
  const trend: MetricCardProps['trend'] = {
    direction: successRate >= 95 ? 'up' : successRate >= 80 ? 'neutral' : 'down',
    value: `${successRate.toFixed(1)}%`,
  };

  return (
    <MetricCard
      title="Deliveries (24h)"
      value={total}
      subtitle="success rate"
      trend={trend}
      href={href}
      color={successRate >= 95 ? 'green' : successRate >= 80 ? 'yellow' : 'red'}
      icon={
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      }
    />
  );
}

/**
 * Events usage card with progress bar
 */
export function EventsUsageCard({
  current,
  limit,
  href = '/dashboard/billing',
}: {
  current: number;
  limit: number;
  href?: string;
}) {
  return (
    <ProgressCard
      title="Events This Month"
      current={current}
      max={limit}
      unit="events"
      warningThreshold={80}
      dangerThreshold={95}
      href={href}
    />
  );
}

/**
 * API Keys card
 */
export function ApiKeysCard({
  active,
  href = '/dashboard/api-keys',
}: {
  active: number;
  href?: string;
}) {
  return (
    <MetricCard
      title="API Keys"
      value={active}
      subtitle="active"
      href={href}
      color="purple"
      icon={
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      }
    />
  );
}

// -----------------------------------------------------------------------------
// Default Export
// -----------------------------------------------------------------------------

export default MetricCard;
