"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Delivery } from "@/lib/api";
import { apiGet, apiPost, ApiError } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DeliveryTableProps {
  /** Pre-filter by webhook ID (e.g. when embedded in webhook detail) */
  webhookId?: string;
  /** Pre-filter by status */
  status?: string;
  /** Pre-filter by event type */
  eventType?: string;
  /** Rows per page */
  perPage?: number;
  /** Enable auto-refresh polling (ms). 0 = disabled */
  pollInterval?: number;
  /** Show the filter bar */
  showFilters?: boolean;
  /** Compact mode — fewer columns for embedding */
  compact?: boolean;
  /** Callback when a delivery is retried */
  onRetried?: () => void;
}

interface DeliveriesResponse {
  deliveries: Delivery[];
  total: number;
  page: number;
  per_page: number;
}

/* ------------------------------------------------------------------ */
/*  Status config                                                      */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  success:     { label: "Success",     dot: "bg-emerald-400", bg: "bg-emerald-500/10", text: "text-emerald-400" },
  failed:      { label: "Failed",      dot: "bg-red-400",     bg: "bg-red-500/10",     text: "text-red-400" },
  pending:     { label: "Pending",     dot: "bg-gray-400",    bg: "bg-gray-500/10",    text: "text-gray-400" },
  retrying:    { label: "Retrying",    dot: "bg-amber-400",   bg: "bg-amber-500/10",   text: "text-amber-400" },
  dead_letter: { label: "Dead Letter", dot: "bg-red-500",     bg: "bg-red-500/15",     text: "text-red-300" },
};

/* ------------------------------------------------------------------ */
/*  Micro-components                                                   */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function HttpCode({ code }: { code: number | null }) {
  if (code === null) return <span className="text-xs text-gray-600">—</span>;
  let color = "text-gray-400";
  if (code >= 200 && code < 300) color = "text-emerald-400";
  else if (code >= 400 && code < 500) color = "text-amber-400";
  else if (code >= 500) color = "text-red-400";
  return <span className={`font-mono text-xs font-medium ${color}`}>{code}</span>;
}

function RelativeTime({ iso }: { iso: string }) {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return <span>just now</span>;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return <span>{mins}m ago</span>;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return <span>{hrs}h ago</span>;
  const days = Math.floor(hrs / 24);
  if (days < 30) return <span>{days}d ago</span>;
  try {
    return (
      <span>
        {new Date(iso).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}
      </span>
    );
  } catch {
    return <span>{iso}</span>;
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function formatLatency(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/* ------------------------------------------------------------------ */
/*  Expanded Detail                                                    */
/* ------------------------------------------------------------------ */

function ExpandedDetail({
  delivery,
  onRetry,
  retrying,
}: {
  delivery: Delivery;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <div className="border-t border-gray-800 bg-gray-950/50 px-5 py-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Delivery ID</p>
          <p className="break-all font-mono text-xs text-gray-300">{delivery.id}</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Event ID</p>
          <p className="break-all font-mono text-xs text-gray-300">{delivery.event_id}</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Webhook ID</p>
          <p className="break-all font-mono text-xs text-gray-300">{delivery.webhook_id}</p>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Created</p>
          <p className="text-xs text-gray-300">{formatDateTime(delivery.created_at)}</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Completed</p>
          <p className="text-xs text-gray-300">
            {delivery.completed_at ? formatDateTime(delivery.completed_at) : "—"}
          </p>
        </div>
        {delivery.next_retry_at && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Next Retry</p>
            <p className="text-xs text-amber-400">{formatDateTime(delivery.next_retry_at)}</p>
          </div>
        )}

        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Latency</p>
          <p className="text-xs text-gray-300">{formatLatency(delivery.latency_ms)}</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Attempts</p>
          <p className="text-xs text-gray-300">{delivery.attempt} / {delivery.max_attempts}</p>
        </div>

        {delivery.error_message && (
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Error</p>
            <pre className="max-h-28 overflow-auto rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
              {delivery.error_message}
            </pre>
          </div>
        )}

        {delivery.response_body && (
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Response Body</p>
            <pre className="max-h-36 overflow-auto rounded-lg border border-gray-700 bg-gray-800 p-3 text-xs text-gray-300">
              {delivery.response_body}
            </pre>
          </div>
        )}

        {delivery.request_headers && Object.keys(delivery.request_headers).length > 0 && (
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Request Headers</p>
            <pre className="max-h-28 overflow-auto rounded-lg border border-gray-700 bg-gray-800 p-3 text-xs text-gray-300">
              {Object.entries(delivery.request_headers)
                .map(([k, v]) => `${k}: ${v}`)
                .join("\n")}
            </pre>
          </div>
        )}
      </div>

      {/* Retry button */}
      {(delivery.status === "failed" || delivery.status === "dead_letter") && (
        <div className="mt-4 border-t border-gray-800 pt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRetry();
            }}
            disabled={retrying}
            className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-400 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {retrying ? "Retrying…" : "↻ Retry Delivery"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function DeliveryTable({
  webhookId,
  status: statusFilter,
  eventType: eventTypeFilter,
  perPage = 20,
  pollInterval = 0,
  showFilters = false,
  compact = false,
  onRetried,
}: DeliveryTableProps) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Expand state */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  /* Filters (only when showFilters is true) */
  const [localStatus, setLocalStatus] = useState(statusFilter ?? "all");
  const [localEventType, setLocalEventType] = useState(eventTypeFilter ?? "");

  /* Polling ref */
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---- Fetch ---- */
  const fetchDeliveries = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          per_page: String(perPage),
        });
        if (webhookId) params.set("webhook_id", webhookId);
        const activeStatus = showFilters ? localStatus : statusFilter;
        if (activeStatus && activeStatus !== "all") params.set("status", activeStatus);
        const activeEvent = showFilters ? localEventType : eventTypeFilter;
        if (activeEvent?.trim()) params.set("event_type", activeEvent.trim());

        const data = await apiGet<DeliveriesResponse>(`/v1/deliveries?${params}`);
        setDeliveries(data.deliveries);
        setTotal(data.total);
        setError(null);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.isUnauthorized) return; /* redirect handled by apiFetch */
        const msg = err instanceof Error ? err.message : "Failed to load deliveries.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [page, perPage, webhookId, localStatus, localEventType, statusFilter, eventTypeFilter, showFilters],
  );

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  /* ---- Polling ---- */
  useEffect(() => {
    if (pollInterval > 0) {
      pollRef.current = setInterval(() => fetchDeliveries(true), pollInterval);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pollInterval, fetchDeliveries]);

  /* ---- Retry ---- */
  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      await apiPost(`/v1/deliveries/${id}/retry`);
      await fetchDeliveries(true);
      onRetried?.();
    } catch {
      /* error already handled */
    } finally {
      setRetryingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div>
      {/* Filters */}
      {showFilters && (
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="dt-status" className="mb-1 block text-xs font-medium text-gray-400">Status</label>
            <select
              id="dt-status"
              value={localStatus}
              onChange={(e) => { setLocalStatus(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="all">All</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="retrying">Retrying</option>
              <option value="pending">Pending</option>
              <option value="dead_letter">Dead Letter</option>
            </select>
          </div>

          <div>
            <label htmlFor="dt-event" className="mb-1 block text-xs font-medium text-gray-400">Event Type</label>
            <input
              id="dt-event"
              type="text"
              value={localEventType}
              onChange={(e) => { setLocalEventType(e.target.value); setPage(1); }}
              placeholder="e.g. payment"
              className="w-36 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <button
            onClick={() => fetchDeliveries()}
            className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-400 transition hover:bg-gray-800 hover:text-white"
            title="Refresh"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
          </button>

          {pollInterval > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Live
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-800">
        {/* Header */}
        <div
          className={`grid gap-2 border-b border-gray-800 bg-gray-900/80 px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 ${
            compact
              ? "grid-cols-[1fr_90px_55px_65px_30px]"
              : "grid-cols-[1fr_100px_55px_75px_65px_65px_30px]"
          }`}
        >
          <span>Event</span>
          <span>Status</span>
          <span>HTTP</span>
          {!compact && <span>Latency</span>}
          <span>{compact ? "Att." : "Attempt"}</span>
          {!compact && <span>Time</span>}
          <span />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-14">
            <svg className="h-6 w-6 animate-spin text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {/* Empty */}
        {!loading && deliveries.length === 0 && (
          <div className="py-14 text-center text-sm text-gray-500">
            No deliveries found.
          </div>
        )}

        {/* Rows */}
        {!loading &&
          deliveries.map((d) => (
            <div key={d.id}>
              {/* Row */}
              <div
                onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                className={`grid cursor-pointer items-center gap-2 border-b border-gray-800/60 bg-gray-900 px-5 py-3 transition hover:bg-gray-800/50 ${
                  compact
                    ? "grid-cols-[1fr_90px_55px_65px_30px]"
                    : "grid-cols-[1fr_100px_55px_75px_65px_65px_30px]"
                }`}
              >
                {/* Event */}
                <div className="min-w-0">
                  <span className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-xs text-cyan-400">
                    {d.event_type}
                  </span>
                  {!compact && (
                    <p className="mt-0.5 truncate font-mono text-xs text-gray-500">
                      {d.webhook_url}
                    </p>
                  )}
                </div>

                {/* Status */}
                <div><StatusBadge status={d.status} /></div>

                {/* HTTP */}
                <div><HttpCode code={d.http_status} /></div>

                {/* Latency (full mode) */}
                {!compact && (
                  <div className="text-xs text-gray-400">{formatLatency(d.latency_ms)}</div>
                )}

                {/* Attempt */}
                <div className="text-xs text-gray-400">
                  {d.attempt}/{d.max_attempts}
                </div>

                {/* Time (full mode) */}
                {!compact && (
                  <div className="text-xs text-gray-500">
                    <RelativeTime iso={d.created_at} />
                  </div>
                )}

                {/* Chevron */}
                <div className="flex justify-end">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 text-gray-600 transition-transform ${expandedId === d.id ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>

              {/* Expanded */}
              {expandedId === d.id && (
                <ExpandedDetail
                  delivery={d}
                  onRetry={() => handleRetry(d.id)}
                  retrying={retryingId === d.id}
                />
              )}
            </div>
          ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {total.toLocaleString()} total — Page {page}/{totalPages}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-gray-700 px-2.5 py-1.5 text-xs text-gray-400 transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ←
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let num: number;
              if (totalPages <= 5) num = i + 1;
              else if (page <= 3) num = i + 1;
              else if (page >= totalPages - 2) num = totalPages - 4 + i;
              else num = page - 2 + i;
              return (
                <button
                  key={num}
                  onClick={() => setPage(num)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                    num === page
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "text-gray-500 hover:bg-gray-800 hover:text-gray-300"
                  }`}
                >
                  {num}
                </button>
              );
            })}

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-gray-700 px-2.5 py-1.5 text-xs text-gray-400 transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
