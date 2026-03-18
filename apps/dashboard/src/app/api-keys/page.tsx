"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getToken, clearSession } from "../login/page";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  last4: string;
  scopes: string[];
  active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface ApiKeysListResponse {
  api_keys: ApiKey[];
  total: number;
}

interface ApiKeyCreateResponse {
  id: string;
  name: string;
  key: string; /* full key — shown only once */
  prefix: string;
  last4: string;
  scopes: string[];
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4400";

const AVAILABLE_SCOPES = [
  { value: "webhooks:read", label: "Webhooks Read" },
  { value: "webhooks:write", label: "Webhooks Write" },
  { value: "deliveries:read", label: "Deliveries Read" },
  { value: "deliveries:write", label: "Deliveries Write" },
  { value: "events:read", label: "Events Read" },
  { value: "metrics:read", label: "Metrics Read" },
] as const;

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
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

/* ------------------------------------------------------------------ */
/*  Copy Button                                                        */
/* ------------------------------------------------------------------ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback: select text */
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="rounded-md border border-gray-700 px-2.5 py-1 text-xs text-gray-400 transition hover:bg-gray-800 hover:text-white"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Key Reveal Banner (shown once after creation)                      */
/* ------------------------------------------------------------------ */

function KeyRevealBanner({
  name,
  fullKey,
  onDismiss,
}: {
  name: string;
  fullKey: string;
  onDismiss: () => void;
}) {
  return (
    <div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-cyan-300">API Key Created: {name}</h3>
          <p className="mt-0.5 text-xs text-gray-400">
            Copy this key now — it will <strong className="text-white">not</strong> be shown again.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-500 hover:text-gray-300 transition-colors"
          aria-label="Dismiss"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex items-center gap-3">
        <code className="flex-1 overflow-x-auto rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 font-mono text-sm text-white">
          {fullKey}
        </code>
        <CopyButton text={fullKey} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Modal                                                       */
/* ------------------------------------------------------------------ */

function CreateKeyModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (result: ApiKeyCreateResponse) => void;
}) {
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(
    AVAILABLE_SCOPES.map((s) => s.value),
  );
  const [expiresIn, setExpiresIn] = useState<string>("never");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const handleCreate = async () => {
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (selectedScopes.length === 0) {
      setError("Select at least one scope.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        scopes: selectedScopes,
      };

      if (expiresIn !== "never") {
        const days = parseInt(expiresIn, 10);
        const dt = new Date();
        dt.setDate(dt.getDate() + days);
        payload.expires_at = dt.toISOString();
      }

      const result = await apiFetch<ApiKeyCreateResponse>("/v1/api-keys", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      onCreated(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Create failed.";
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
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Create API Key</h2>
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
          {/* Name */}
          <div>
            <label htmlFor="key-name" className="mb-1 block text-sm font-medium text-gray-300">Key Name</label>
            <input
              id="key-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production Backend"
              className="block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          {/* Scopes */}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-gray-300">Scopes</span>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_SCOPES.map((s) => (
                <label
                  key={s.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                    selectedScopes.includes(s.value)
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                      : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(s.value)}
                    onChange={() => toggleScope(s.value)}
                    className="sr-only"
                  />
                  <span className={`flex h-4 w-4 items-center justify-center rounded border ${
                    selectedScopes.includes(s.value)
                      ? "border-cyan-500 bg-cyan-500"
                      : "border-gray-600 bg-gray-800"
                  }`}>
                    {selectedScopes.includes(s.value) && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          {/* Expiration */}
          <div>
            <label htmlFor="key-exp" className="mb-1 block text-sm font-medium text-gray-300">Expiration</label>
            <select
              id="key-exp"
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              className="block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="never">Never</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">1 year</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-800">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? "Creating…" : "Create Key"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Revoke Confirmation Modal                                          */
/* ------------------------------------------------------------------ */

function RevokeModal({
  apiKey,
  onClose,
  onConfirm,
}: {
  apiKey: ApiKey;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [revoking, setRevoking] = useState(false);

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      await apiFetch(`/v1/api-keys/${apiKey.id}`, { method: "DELETE" });
      onConfirm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "SESSION_EXPIRED") window.location.href = "/login";
      setRevoking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
        <h3 className="mb-2 text-lg font-bold text-white">Revoke API Key</h3>
        <p className="mb-1 text-sm text-gray-400">
          Are you sure? Any services using this key will immediately lose access.
        </p>
        <p className="mb-5 font-mono text-sm text-gray-500">
          {apiKey.name} ({apiKey.prefix}…{apiKey.last4})
        </p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-800">
            Cancel
          </button>
          <button
            onClick={handleRevoke}
            disabled={revoking}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
          >
            {revoking ? "Revoking…" : "Revoke Key"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function ApiKeysPage() {
  const router = useRouter();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Modal state */
  const [showCreate, setShowCreate] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);

  /* Newly created key reveal */
  const [revealKey, setRevealKey] = useState<{ name: string; key: string } | null>(null);

  /* ------ Fetch keys ------ */
  const fetchKeys = useCallback(async () => {
    try {
      const data = await apiFetch<ApiKeysListResponse>("/v1/api-keys");
      setKeys(data.api_keys);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load API keys.";
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
    fetchKeys();
  }, [router, fetchKeys]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">API Keys</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage keys for authenticating with the XRNotify API.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-500"
          >
            + Create Key
          </button>
        </div>

        {/* Reveal banner */}
        {revealKey && (
          <KeyRevealBanner
            name={revealKey.name}
            fullKey={revealKey.key}
            onDismiss={() => setRevealKey(null)}
          />
        )}

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
        {!loading && keys.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 py-20">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
              </svg>
            </div>
            <p className="mb-1 text-sm font-medium text-white">No API keys</p>
            <p className="mb-6 text-sm text-gray-500">Create your first API key to integrate with XRNotify.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-500"
            >
              + Create Key
            </button>
          </div>
        )}

        {/* Key list */}
        {!loading && keys.length > 0 && (
          <div className="space-y-3">
            {keys.map((k) => {
              const isExpired = k.expires_at && new Date(k.expires_at) < new Date();
              return (
                <div
                  key={k.id}
                  className={`rounded-xl border bg-gray-900 p-5 transition ${
                    !k.active || isExpired
                      ? "border-gray-800/60 opacity-60"
                      : "border-gray-800 hover:border-gray-700"
                  }`}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-semibold text-white">{k.name}</span>
                        {k.active && !isExpired && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        )}
                        {!k.active && (
                          <span className="inline-flex items-center rounded-full bg-gray-500/10 px-2 py-0.5 text-xs font-medium text-gray-400">
                            Revoked
                          </span>
                        )}
                        {isExpired && k.active && (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                            Expired
                          </span>
                        )}
                      </div>
                      <p className="mt-1 font-mono text-sm text-gray-500">
                        {k.prefix}…{k.last4}
                      </p>
                    </div>

                    {/* Revoke */}
                    {k.active && (
                      <button
                        onClick={() => setRevokeTarget(k)}
                        className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                      >
                        Revoke
                      </button>
                    )}
                  </div>

                  {/* Scopes */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {k.scopes.map((s) => (
                      <span
                        key={s}
                        className="rounded-md bg-gray-800 px-2 py-0.5 text-xs font-mono text-gray-400"
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-600">
                    <span>Created {formatDate(k.created_at)}</span>
                    <span>Last used: {timeAgo(k.last_used_at)}</span>
                    {k.expires_at && (
                      <span className={isExpired ? "text-amber-500" : ""}>
                        {isExpired ? "Expired" : "Expires"} {formatDate(k.expires_at)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Usage hint */}
        {!loading && keys.length > 0 && (
          <div className="mt-6 rounded-lg border border-gray-800 bg-gray-900/50 p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">Usage</p>
            <pre className="overflow-x-auto text-xs text-gray-400">
{`curl -H "X-XRNotify-Key: xrn_your_key_here" \\
     ${API_BASE}/v1/webhooks`}
            </pre>
          </div>
        )}
      </div>

      {/* ---- Modals ---- */}
      {showCreate && (
        <CreateKeyModal
          onClose={() => setShowCreate(false)}
          onCreated={(result) => {
            setShowCreate(false);
            setRevealKey({ name: result.name, key: result.key });
            fetchKeys();
          }}
        />
      )}

      {revokeTarget && (
        <RevokeModal
          apiKey={revokeTarget}
          onClose={() => setRevokeTarget(null)}
          onConfirm={() => {
            setRevokeTarget(null);
            fetchKeys();
          }}
        />
      )}
    </div>
  );
}
