"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getToken, clearSession } from "../login/page";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Webhook {
  id: string;
  url: string;
  description: string;
  event_types: string[];
  active: boolean;
  secret_last4: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, string>;
}

interface WebhooksListResponse {
  webhooks: Webhook[];
  total: number;
  page: number;
  per_page: number;
}

interface WebhookCreatePayload {
  url: string;
  description?: string;
  event_types: string[];
  active?: boolean;
  metadata?: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4400";

const ALL_EVENT_TYPES = [
  "payment",
  "trustset",
  "nft.mint",
  "nft.burn",
  "nft.accept_offer",
  "offer.create",
  "offer.cancel",
  "account.set",
  "account.delete",
] as const;

/* ------------------------------------------------------------------ */
/*  API helpers                                                        */
/* ------------------------------------------------------------------ */

async function apiFetch<T>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
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
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "danger" }) {
  const colors: Record<string, string> = {
    default: "bg-gray-700/60 text-gray-300",
    success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
    warning: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
    danger: "bg-red-500/15 text-red-400 border border-red-500/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[variant]}`}>
      {children}
    </span>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 py-20">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-800">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.388a4.5 4.5 0 0 0-1.242-7.244l-4.5-4.5a4.5 4.5 0 0 0-6.364 6.364L4.25 8.81" />
        </svg>
      </div>
      <p className="mb-1 text-sm font-medium text-white">No webhooks yet</p>
      <p className="mb-6 text-sm text-gray-500">Create your first webhook endpoint to start receiving XRPL events.</p>
      <button onClick={onAdd} className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-500">
        + Add Webhook
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create / Edit Modal                                                */
/* ------------------------------------------------------------------ */

function WebhookModal({
  existing,
  onClose,
  onSaved,
}: {
  existing: Webhook | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = existing !== null;

  const [url, setUrl] = useState(existing?.url ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(existing?.event_types ?? [...ALL_EVENT_TYPES]);
  const [active, setActive] = useState(existing?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleType = (t: string) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const selectAll = () => setSelectedTypes([...ALL_EVENT_TYPES]);
  const selectNone = () => setSelectedTypes([]);

  const handleSave = async () => {
    setError(null);

    if (!url.trim()) {
      setError("URL is required.");
      return;
    }
    if (selectedTypes.length === 0) {
      setError("Select at least one event type.");
      return;
    }

    setSaving(true);
    try {
      const payload: WebhookCreatePayload = {
        url: url.trim(),
        description: description.trim(),
        event_types: selectedTypes,
        active,
      };

      if (isEdit) {
        await apiFetch(`/v1/webhooks/${existing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/v1/webhooks", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      if (msg === "SESSION_EXPIRED") {
        window.location.href = "/login";
        return;
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{isEdit ? "Edit Webhook" : "New Webhook"}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* URL */}
          <div>
            <label htmlFor="wh-url" className="mb-1 block text-sm font-medium text-gray-300">Endpoint URL</label>
            <input
              id="wh-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.yourapp.com/webhooks/xrpl"
              className="block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="wh-desc" className="mb-1 block text-sm font-medium text-gray-300">Description <span className="text-gray-600">(optional)</span></label>
            <input
              id="wh-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Production payment listener"
              className="block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Event types */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Event Types</span>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={selectAll} className="text-cyan-400 hover:text-cyan-300 transition-colors">All</button>
                <span className="text-gray-600">|</span>
                <button type="button" onClick={selectNone} className="text-cyan-400 hover:text-cyan-300 transition-colors">None</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ALL_EVENT_TYPES.map((t) => (
                <label
                  key={t}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                    selectedTypes.includes(t)
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                      : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(t)}
                    onChange={() => toggleType(t)}
                    className="sr-only"
                  />
                  <span className={`flex h-4 w-4 items-center justify-center rounded border ${
                    selectedTypes.includes(t)
                      ? "border-cyan-500 bg-cyan-500"
                      : "border-gray-600 bg-gray-800"
                  }`}>
                    {selectedTypes.includes(t) && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  {t}
                </label>
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3">
            <span className="text-sm text-gray-300">Active</span>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              onClick={() => setActive((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${active ? "bg-cyan-500" : "bg-gray-600"}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${active ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-800">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : isEdit ? "Update" : "Create Webhook"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete Confirmation Modal                                          */
/* ------------------------------------------------------------------ */

function DeleteModal({
  webhook,
  onClose,
  onConfirm,
}: {
  webhook: Webhook;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiFetch(`/v1/webhooks/${webhook.id}`, { method: "DELETE" });
      onConfirm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "SESSION_EXPIRED") {
        window.location.href = "/login";
      }
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
        <h3 className="mb-2 text-lg font-bold text-white">Delete Webhook</h3>
        <p className="mb-1 text-sm text-gray-400">
          Are you sure you want to delete this webhook?
        </p>
        <p className="mb-5 truncate text-sm font-mono text-gray-500">{webhook.url}</p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-800">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function WebhooksPage() {
  const router = useRouter();

  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Modal state */
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Webhook | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null);

  /* ------ Fetch webhooks ------ */
  const fetchWebhooks = useCallback(async () => {
    try {
      const data = await apiFetch<WebhooksListResponse>("/v1/webhooks?per_page=100");
      setWebhooks(data.webhooks);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load webhooks.";
      if (msg === "SESSION_EXPIRED") {
        router.replace("/login");
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    fetchWebhooks();
  }, [router, fetchWebhooks]);

  /* ------ Toggle active ------ */
  const toggleActive = async (wh: Webhook) => {
    try {
      await apiFetch(`/v1/webhooks/${wh.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !wh.active }),
      });
      await fetchWebhooks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "SESSION_EXPIRED") {
        router.replace("/login");
      }
    }
  };

  /* ------ Render helpers ------ */
  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Webhooks</h1>
            <p className="mt-1 text-sm text-gray-500">Manage your XRPL event webhook endpoints.</p>
          </div>
          {webhooks.length > 0 && (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-500"
            >
              + Add Webhook
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <svg className="h-8 w-8 animate-spin text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        {/* Empty */}
        {!loading && webhooks.length === 0 && !error && (
          <EmptyState onAdd={() => setShowCreate(true)} />
        )}

        {/* Webhook list */}
        {!loading && webhooks.length > 0 && (
          <div className="space-y-4">
            {webhooks.map((wh) => (
              <div
                key={wh.id}
                className="group rounded-xl border border-gray-800 bg-gray-900 p-5 transition hover:border-gray-700"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="truncate font-mono text-sm text-white">{wh.url}</span>
                      <Badge variant={wh.active ? "success" : "warning"}>
                        {wh.active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    {wh.description && (
                      <p className="mt-1 text-sm text-gray-500">{wh.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleActive(wh)}
                      title={wh.active ? "Pause" : "Activate"}
                      className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-800 hover:text-gray-300"
                    >
                      {wh.active ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                        </svg>
                      )}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => setEditTarget(wh)}
                      title="Edit"
                      className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-800 hover:text-gray-300"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => setDeleteTarget(wh)}
                      title="Delete"
                      className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-800 hover:text-red-400"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Event types row */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {wh.event_types.map((et) => (
                    <span
                      key={et}
                      className="rounded-md bg-gray-800 px-2 py-0.5 text-xs font-mono text-gray-400"
                    >
                      {et}
                    </span>
                  ))}
                </div>

                {/* Footer row */}
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
                  <span>ID: {wh.id.slice(0, 8)}…</span>
                  <span>Secret: …{wh.secret_last4}</span>
                  <span>Created {formatDate(wh.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Modals ---- */}
      {showCreate && (
        <WebhookModal
          existing={null}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            fetchWebhooks();
          }}
        />
      )}

      {editTarget && (
        <WebhookModal
          existing={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            fetchWebhooks();
          }}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          webhook={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            setDeleteTarget(null);
            fetchWebhooks();
          }}
        />
      )}
    </div>
  );
}
