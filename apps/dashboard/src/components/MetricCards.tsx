"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiGet, ApiError } from "@/lib/api";
import type { MetricsSummary } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MetricCardsProps {
  /** Auto-refresh interval in ms. 0 = disabled */
  pollInterval?: number;
  /** Default time range */
  defaultRange?: TimeRange;
  /** Compact layout — single row of top-level cards only */
  compact?: boolean;
}

type TimeRange = "1h" | "24h" | "7d" | "30d";

const RANGE_LABELS: Record<TimeRange, string> = {
  "1h": "1 Hour",
  "24h": "24 Hours",
  "7d": "7 Days",
  "30d": "30 Days",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatMs(ms: number): string {
  if (ms < 1) return "<1ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function pctColor(pct: number): string {
  if (pct >= 99) return "text-emerald-400";
  if (pct >= 95) return "text-cyan-400";
  if (pct >= 90) return "text-amber-400";
  return "text-red-400";
}

/* ------------------------------------------------------------------ */
/*  Mini horizontal bar chart                                          */
/* ------------------------------------------------------------------ */

function MiniBar({
  data,
  colorFn,
}: {
  data: { label: string; value: number }[];
  colorFn: (label: string) => string;
}) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-xs text-gray-400">{d.label}</span>
          <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-gray-800">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${colorFn(d.label)}`}
              style={{ width: `${Math.max((d.value / maxVal) * 100, 2)}%` }}
            />
          </div>
          <span className="w-12 shrink-0 text-right font-mono text-xs text-gray-300">
            {formatNum(d.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  sub,
  icon,
  accent = "text-white",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 transition hover:border-gray-700">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</span>
        <span className="text-gray-600">{icon}</span>
      </div>
      <p className={`text-2xl font-bold tracking-tight ${accent}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status color mapping                                               */
/* ------------------------------------------------------------------ */

const STATUS_BAR_COLORS: Record<string, string> = {
  success: "bg-emerald-500",
  failed: "bg-red-500",
  retrying: "bg-amber-500",
  pending: "bg-gray-500",
  dead_letter: "bg-red-700",
};

const EVENT_BAR_COLORS: Record<string, string> = {
  payment: "bg-cyan-500",
  trustset: "bg-blue-500",
  "nft.mint": "bg-violet-500",
  "nft.burn": "bg-rose-500",
  "nft.accept_offer": "bg-purple-500",
  "offer.create": "bg-amber-500",
  "offer.cancel": "bg-orange-500",
  "account.set": "bg-teal-500",
  "account.delete": "bg-gray-500",
};

function statusBarColor(label: string): string {
  return STATUS_BAR_COLORS[label] ?? "bg-gray-600";
}

function eventBarColor(label: string): string {
  return EVENT_BAR_COLORS[label] ?? "bg-gray-600";
}

/* ------------------------------------------------------------------ */
/*  Icons (inline SVG)                                                 */
/* ------------------------------------------------------------------ */

const Icons = {
  events: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  ),
  deliveries: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
    </svg>
  ),
  success: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  latency: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  webhooks: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.388a4.5 4.5 0 0 0-1.242-7.244l-4.5-4.5a4.5 4.5 0 0 0-6.364 6.364L4.25 8.81" />
    </svg>
  ),
  failed: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
  deadLetter: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m6 4.125 2.25 2.25m0 0 2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  ),
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function MetricCards({
  pollInterval = 0,
  defaultRange = "24h",
  compact = false,
}: MetricCardsProps) {
  const [range, setRange] = useState<TimeRange>(defaultRange);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---- Fetch ---- */
  const fetchMetrics = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await apiGet<MetricsSummary>(`/v1/metrics/summary?range=${range}`);
        setMetrics(data);
        setError(null);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.isUnauthorized) return;
        setError(err instanceof Error ? err.message : "Failed to load metrics.");
      } finally {
        setLoading(false);
      }
    },
    [range],
  );

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  /* ---- Polling ---- */
  useEffect(() => {
    if (pollInterval > 0) {
      pollRef.current = setInterval(() => fetchMetrics(true), pollInterval);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pollInterval, fetchMetrics]);

  /* ---- Loading / Error states ---- */
  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="h-7 w-7 animate-spin text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (!metrics) return null;

  const successRate = metrics.success_rate * 100;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div>
      {/* Range selector */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {pollInterval > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Live
            </span>
          )}
        </div>
        <div className="flex rounded-lg border border-gray-800 bg-gray-900 p-0.5">
          {(Object.keys(RANGE_LABELS) as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                range === r
                  ? "bg-gray-800 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Top cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Events"
          value={formatNum(metrics.total_events)}
          sub={`in last ${RANGE_LABELS[range].toLowerCase()}`}
          icon={Icons.events}
          accent="text-white"
        />
        <StatCard
          label="Deliveries"
          value={formatNum(metrics.total_deliveries)}
          sub={`in last ${RANGE_LABELS[range].toLowerCase()}`}
          icon={Icons.deliveries}
          accent="text-white"
        />
        <StatCard
          label="Success Rate"
          value={`${successRate.toFixed(1)}%`}
          sub={successRate >= 99 ? "Healthy" : successRate >= 95 ? "Degraded" : "Attention needed"}
          icon={Icons.success}
          accent={pctColor(successRate)}
        />
        <StatCard
          label="Avg Latency"
          value={formatMs(metrics.avg_latency_ms)}
          sub={`p50 ${formatMs(metrics.latency_p50_ms)} · p95 ${formatMs(metrics.latency_p95_ms)} · p99 ${formatMs(metrics.latency_p99_ms)}`}
          icon={Icons.latency}
          accent="text-white"
        />
      </div>

      {/* Second row */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Active Webhooks"
          value={String(metrics.active_webhooks)}
          icon={Icons.webhooks}
          accent="text-cyan-400"
        />
        <StatCard
          label="Failed (24h)"
          value={formatNum(metrics.failed_24h)}
          icon={Icons.failed}
          accent={metrics.failed_24h > 0 ? "text-red-400" : "text-emerald-400"}
        />
        <StatCard
          label="Dead Letter"
          value={formatNum(metrics.dead_letter_count)}
          sub={metrics.dead_letter_count > 0 ? "Requires attention" : "All clear"}
          icon={Icons.deadLetter}
          accent={metrics.dead_letter_count > 0 ? "text-red-400" : "text-emerald-400"}
        />
      </div>

      {/* Breakdown charts (hidden in compact mode) */}
      {!compact && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Events by type */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Events by Type</h3>
            {Object.keys(metrics.events_by_type).length > 0 ? (
              <MiniBar
                data={Object.entries(metrics.events_by_type)
                  .sort(([, a], [, b]) => b - a)
                  .map(([label, value]) => ({ label, value }))}
                colorFn={eventBarColor}
              />
            ) : (
              <p className="text-sm text-gray-500">No events in this period.</p>
            )}
          </div>

          {/* Deliveries by status */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Deliveries by Status</h3>
            {Object.keys(metrics.deliveries_by_status).length > 0 ? (
              <MiniBar
                data={Object.entries(metrics.deliveries_by_status)
                  .sort(([, a], [, b]) => b - a)
                  .map(([label, value]) => ({ label, value }))}
                colorFn={statusBarColor}
              />
            ) : (
              <p className="text-sm text-gray-500">No deliveries in this period.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
