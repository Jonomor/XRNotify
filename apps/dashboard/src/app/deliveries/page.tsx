"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getToken, clearSession } from "../login/page";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Delivery {
  id: string;
  webhook_id: string;
  webhook_url: string;
  event_id: string;
  event_type: string;
  status: "success" | "failed" | "pending" | "retrying" | "dead_letter";
  http_status: number | null;
  attempt: number;
  max_attempts: number;
  latency_ms: number | null;
  next_retry_at: string | null;
  error_message: string | null;
  request_headers: Record<string, string> | null;
  response_body: string | null;
  created_at: string;
  completed_at: string | null;
}

interface DeliveriesListResponse {
  deliveries: Delivery[];
  total: number;
  page: number;
  per_page: number;
}

interface WebhookOption {
  id: string;
  url: string;
  description: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4400";
const PER_PAGE = 25;

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  success:     { label: "Success",     dot: "bg-emerald-400", bg: "bg-emerald-500/10", text: "text-emerald-400" },
  failed:      { label: "Failed",      dot: "bg-red-400",     bg: "bg-red-500/10",     text: "text-red-400" },
  pending:     { label: "Pending",     dot: "bg-gray-400",    bg: "bg-gray-500/10",    text: "text-gray-400" },
  retrying:    { label: "Retrying",    dot: "bg-amber-400",   bg: "bg-amber-500/10",   text: "text-amber-400" },
  dead_letter: { label: "Dead Letter", dot: "bg-red-500",     bg: "bg-red-500/15",     text: "text-red-300" },
};

/* ------------------------------------------------------------------ */
/*  API helper                                                         */
/* ------------------------------------------------------------------ */

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });

  if (res.status === 401) {
    clearSession();
    throw new Error("SESSION_EXPIRED");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as Record<string, string>).message ??
        (body as Record<string, string>).error ??
        `Error ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}

/* ------------------------------------------------------------------ */
/*  Status Badge                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  HTTP Status Badge                                                  */
/* ------------------------------------------------------------------ */

function HttpBadge({ code }: { code: number | null }) {
  if (code === null) return <span className="text-xs text-gray-600">—</span>;
  let color = "text-gray-400";
  if (code >= 200 && code < 300) color = "text-emerald-400";
  else if (code >= 400 && code < 500) color = "text-amber-400";
  else if (code >= 500) color = "text-red-400";
  return <span className={`font-mono text-xs font-medium ${color}`}>{code}</span>;
}

/* ------------------------------------------------------------------ */
/*  Expanded Detail Row                                                */
/* ------------------------------------------------------------------ */

function DeliveryDetail({ delivery }: { delivery: Delivery }) {
  return (
    <div className="border-t border-gray-800 bg-gray-950/50 px-5 py-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* IDs */}
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

        {/* Timing */}
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Created</p>
          <p className="text-xs text-gray-300">{formatDateTime(delivery.created_at)}</p>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Completed</p>
          <p className="text-xs text-gray-300">{delivery.completed_at ? formatDateTime(delivery.completed_at) : "—"}</p>
        </div>
        {delivery.next_retry_at && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Next Retry</p>
            <p className="text-xs text-amber-400">{formatDateTime(delivery.next_retry_at)}</p>
          </div>
        )}

        {/* Error */}
        {delivery.error_message && (
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Error</p>
            <pre className="max-h-24 overflow-auto rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
              {delivery.error_message}
            </pre>
          </div>
        )}

        {/* Response body */}
        {delivery.response_body && (
          <div className="sm:col-span-2 lg:col-span-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">Response Body</p>
            <pre className="max-h-32 overflow-auto rounded-lg border border-gray-700 bg-gray-800 p-3 text-xs text-gray-300">
              {delivery.response_body}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
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
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function DeliveriesPage() {
  const router = useRouter();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Filters */
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterWebhook, setFilterWebhook] = useState<string>("all");
  const [filterEvent, setFilterEvent] = useState<string>("");
  const [webhookOptions, setWebhookOptions] = useState<WebhookOption[]>([]);

  /* Expanded row */
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ------ Fetch webhook options for filter ------ */
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<{ webhooks: WebhookOption[] }>("/v1/webhooks?per_page=100");
        setWebhookOptions(data.webhooks);
      } catch {
        /* silent — filter just won't populate */
      }
    })();
  }, []);

  /* ------ Fetch deliveries ------ */
  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(PER_PAGE),
      });
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterWebhook !== "all") params.set("webhook_id", filterWebhook);
      if (filterEvent.trim()) params.set("event_type", filterEvent.trim());

      const data = await apiFetch<DeliveriesListResponse>(`/v1/deliveries?${params}`);
      setDeliveries(data.deliveries);
      setTotal(data.total);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load deliveries.";
      if (msg === "SESSION_EXPIRED") {
        router.replace("/login");
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterWebhook, filterEvent, router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    fetchDeliveries();
  }, [router, fetchDeliveries]);

  /* ------ Retry a delivery ------ */
  const retryDelivery = async (id: string) => {
    try {
      await apiFetch(`/v1/deliveries/${id}/retry`, { method: "POST" });
      await fetchDeliveries();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "SESSION_EXPIRED") router.replace("/login");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">Delivery Logs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor webhook delivery attempts, statuses, and response details.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-end gap-3">
          {/* Status */}
          <div>
            <label htmlFor="f-status" className="mb-1 block text-xs font-medium text-gray-400">Status</label>
            <select
              id="f-status"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
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

          {/* Webhook */}
          <div>
            <label htmlFor="f-webhook" className="mb-1 block text-xs font-medium text-gray-400">Webhook</label>
            <select
              id="f-webhook"
              value={filterWebhook}
              onChange={(e) => { setFilterWebhook(e.target.value); setPage(1); }}
              className="max-w-[220px] truncate rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="all">All Webhooks</option>
              {webhookOptions.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.description || wh.url}
                </option>
              ))}
            </select>
          </div>

          {/* Event type search */}
          <div>
            <label htmlFor="f-event" className="mb-1 block text-xs font-medium text-gray-400">Event Type</label>
            <input
              id="f-event"
              type="text"
              value={filterEvent}
              onChange={(e) => { setFilterEvent(e.target.value); setPage(1); }}
              placeholder="e.g. payment"
              className="w-40 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={fetchDeliveries}
            className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-400 transition hover:bg-gray-800 hover:text-white"
            title="Refresh"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-800">
          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_60px_80px_70px_60px_40px] gap-2 border-b border-gray-800 bg-gray-900/80 px-5 py-3 text-xs font-medium uppercase tracking-wider text-gray-500">
            <span>Event</span>
            <span>Status</span>
            <span>HTTP</span>
            <span>Latency</span>
            <span>Attempt</span>
            <span>Time</span>
            <span />
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <svg className="h-7 w-7 animate-spin text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}

          {/* Empty */}
          {!loading && deliveries.length === 0 && (
            <div className="py-16 text-center text-sm text-gray-500">
              No deliveries found{filterStatus !== "all" || filterWebhook !== "all" || filterEvent ? " matching your filters" : ""}.
            </div>
          )}

          {/* Rows */}
          {!loading && deliveries.map((d) => (
            <div key={d.id}>
              {/* Main row */}
              <div
                onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                className="grid cursor-pointer grid-cols-[1fr_100px_60px_80px_70px_60px_40px] items-center gap-2 border-b border-gray-800/60 bg-gray-900 px-5 py-3 transition hover:bg-gray-800/50"
              >
                {/* Event */}
                <div className="min-w-0">
                  <span className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-xs text-cyan-400">{d.event_type}</span>
                  <p className="mt-0.5 truncate font-mono text-xs text-gray-500">{d.webhook_url}</p>
                </div>

                {/* Status */}
                <div>
                  <StatusBadge status={d.status} />
                </div>

                {/* HTTP */}
                <div>
                  <HttpBadge code={d.http_status} />
                </div>

                {/* Latency */}
                <div className="text-xs text-gray-400">
                  {formatLatency(d.latency_ms)}
                </div>

                {/* Attempt */}
                <div className="text-xs text-gray-400">
                  {d.attempt}/{d.max_attempts}
                </div>

                {/* Time */}
                <div className="text-xs text-gray-500">
                  {formatDateTime(d.created_at).split(",")[0]}
                </div>

                {/* Expand chevron */}
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

              {/* Expanded detail */}
              {expandedId === d.id && (
                <div className="border-b border-gray-800/60">
                  <DeliveryDetail delivery={d} />
                  {/* Retry button for failed / dead_letter */}
                  {(d.status === "failed" || d.status === "dead_letter") && (
                    <div className="border-t border-gray-800 bg-gray-950/50 px-5 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          retryDelivery(d.id);
                        }}
                        className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-400 transition hover:bg-cyan-500/20"
                      >
                        ↻ Retry Delivery
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {total.toLocaleString()} total deliveries — Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Prev
              </button>

              {/* Page numbers — show up to 5 centered around current */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      pageNum === page
                        ? "bg-cyan-500/20 text-cyan-400"
                        : "text-gray-500 hover:bg-gray-800 hover:text-gray-300"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
