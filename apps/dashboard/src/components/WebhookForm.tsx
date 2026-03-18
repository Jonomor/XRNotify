"use client";

import { useState, useCallback, useEffect } from "react";
import type { Webhook, WebhookCreatePayload, WebhookUpdatePayload } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

export const ALL_EVENT_TYPES = [
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

export type EventType = (typeof ALL_EVENT_TYPES)[number];

const EVENT_TYPE_LABELS: Record<string, string> = {
  payment: "Payment",
  trustset: "TrustSet",
  "nft.mint": "NFT Mint",
  "nft.burn": "NFT Burn",
  "nft.accept_offer": "NFT Accept Offer",
  "offer.create": "DEX Offer Create",
  "offer.cancel": "DEX Offer Cancel",
  "account.set": "Account Set",
  "account.delete": "Account Delete",
};

const EVENT_TYPE_GROUPS: { label: string; types: string[] }[] = [
  { label: "Payments", types: ["payment"] },
  { label: "Trust Lines", types: ["trustset"] },
  { label: "NFTs", types: ["nft.mint", "nft.burn", "nft.accept_offer"] },
  { label: "DEX", types: ["offer.create", "offer.cancel"] },
  { label: "Account", types: ["account.set", "account.delete"] },
];

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface WebhookFormValues {
  url: string;
  description: string;
  event_types: string[];
  active: boolean;
  metadata: Record<string, string>;
}

export interface WebhookFormProps {
  /** Pass existing webhook to pre-populate for editing; null for create */
  existing?: Webhook | null;
  /** Called with validated form values */
  onSubmit: (values: WebhookCreatePayload | WebhookUpdatePayload) => Promise<void>;
  /** Called when user cancels */
  onCancel: () => void;
  /** External saving state */
  saving?: boolean;
  /** External error message */
  error?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Metadata Key-Value Editor                                          */
/* ------------------------------------------------------------------ */

interface MetaEntry {
  id: string;
  key: string;
  value: string;
}

function MetadataEditor({
  entries,
  onChange,
}: {
  entries: MetaEntry[];
  onChange: (entries: MetaEntry[]) => void;
}) {
  const addRow = () => {
    onChange([...entries, { id: crypto.randomUUID(), key: "", value: "" }]);
  };

  const removeRow = (id: string) => {
    onChange(entries.filter((e) => e.id !== id));
  };

  const updateRow = (id: string, field: "key" | "value", val: string) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, [field]: val } : e)));
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-300">
          Metadata <span className="text-gray-600">(optional)</span>
        </span>
        <button
          type="button"
          onClick={addRow}
          className="text-xs text-cyan-400 transition hover:text-cyan-300"
        >
          + Add field
        </button>
      </div>

      {entries.length === 0 && (
        <p className="text-xs text-gray-600">
          Add key-value pairs to include with every delivery payload.
        </p>
      )}

      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="key"
                value={entry.key}
                onChange={(e) => updateRow(entry.id, "key", e.target.value)}
                className="w-1/3 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <input
                type="text"
                placeholder="value"
                value={entry.value}
                onChange={(e) => updateRow(entry.id, "value", e.target.value)}
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => removeRow(entry.id)}
                className="rounded p-1 text-gray-600 transition hover:text-red-400"
                aria-label="Remove metadata field"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  warnings: string[];
}

function validate(values: WebhookFormValues): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  /* URL */
  const url = values.url.trim();
  if (!url) {
    errors.url = "Endpoint URL is required.";
  } else {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        errors.url = "URL must use http:// or https://.";
      } else if (parsed.protocol === "http:") {
        warnings.push(
          "HTTP endpoints are only allowed in development. Production requires HTTPS.",
        );
      }
      /* Basic SSRF hint — server enforces this, but warn early */
      const host = parsed.hostname;
      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "0.0.0.0" ||
        host.startsWith("10.") ||
        host.startsWith("192.168.") ||
        host.startsWith("172.") ||
        host === "::1"
      ) {
        warnings.push(
          "Private/localhost URLs are blocked in production (SSRF protection).",
        );
      }
    } catch {
      errors.url = "Enter a valid URL.";
    }
  }

  /* Event types */
  if (values.event_types.length === 0) {
    errors.event_types = "Select at least one event type.";
  }

  /* Metadata keys */
  const metaKeys = Object.keys(values.metadata);
  const seenKeys = new Set<string>();
  for (const k of metaKeys) {
    if (!k.trim()) {
      errors.metadata = "Metadata keys cannot be empty.";
      break;
    }
    if (seenKeys.has(k.trim())) {
      errors.metadata = `Duplicate metadata key: "${k.trim()}"`;
      break;
    }
    seenKeys.add(k.trim());
  }

  return { valid: Object.keys(errors).length === 0, errors, warnings };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function WebhookForm({
  existing = null,
  onSubmit,
  onCancel,
  saving = false,
  error: externalError = null,
}: WebhookFormProps) {
  const isEdit = existing !== null;

  /* ---- Form state ---- */
  const [url, setUrl] = useState(existing?.url ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    existing?.event_types ?? [...ALL_EVENT_TYPES],
  );
  const [active, setActive] = useState(existing?.active ?? true);
  const [metaEntries, setMetaEntries] = useState<MetaEntry[]>(() => {
    if (!existing?.metadata) return [];
    return Object.entries(existing.metadata).map(([key, value]) => ({
      id: crypto.randomUUID(),
      key,
      value,
    }));
  });

  /* ---- Local validation ---- */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);

  /* Re-validate on meaningful changes (debounced feel) */
  useEffect(() => {
    const metadata: Record<string, string> = {};
    for (const e of metaEntries) {
      if (e.key.trim()) metadata[e.key.trim()] = e.value;
    }
    const result = validate({ url, description, event_types: selectedTypes, active, metadata });
    setWarnings(result.warnings);
    /* Only show field errors after initial interaction — don't flash on mount */
  }, [url, selectedTypes, metaEntries, description, active]);

  /* ---- Event type helpers ---- */
  const toggleType = (t: string) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  };

  const toggleGroup = (types: string[]) => {
    const allSelected = types.every((t) => selectedTypes.includes(t));
    if (allSelected) {
      setSelectedTypes((prev) => prev.filter((t) => !types.includes(t)));
    } else {
      setSelectedTypes((prev) => [...new Set([...prev, ...types])]);
    }
  };

  const selectAll = () => setSelectedTypes([...ALL_EVENT_TYPES]);
  const selectNone = () => setSelectedTypes([]);

  /* ---- Submit ---- */
  const handleSubmit = useCallback(async () => {
    const metadata: Record<string, string> = {};
    for (const e of metaEntries) {
      if (e.key.trim()) metadata[e.key.trim()] = e.value;
    }

    const values: WebhookFormValues = {
      url: url.trim(),
      description: description.trim(),
      event_types: selectedTypes,
      active,
      metadata,
    };

    const result = validate(values);
    setFieldErrors(result.errors);
    if (!result.valid) return;

    const payload: WebhookCreatePayload = {
      url: values.url,
      description: values.description || undefined,
      event_types: values.event_types,
      active: values.active,
      metadata: Object.keys(values.metadata).length > 0 ? values.metadata : undefined,
    };

    await onSubmit(payload);
  }, [url, description, selectedTypes, active, metaEntries, onSubmit]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-5">
      {/* External error */}
      {externalError && (
        <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {externalError}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-sm text-amber-400">
          {warnings.map((w, i) => (
            <p key={i} className="flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              {w}
            </p>
          ))}
        </div>
      )}

      {/* URL */}
      <div>
        <label htmlFor="wf-url" className="mb-1 block text-sm font-medium text-gray-300">
          Endpoint URL
        </label>
        <input
          id="wf-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.yourapp.com/webhooks/xrpl"
          className={`block w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 ${
            fieldErrors.url
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : "border-gray-700 focus:border-cyan-500 focus:ring-cyan-500"
          }`}
        />
        {fieldErrors.url && (
          <p className="mt-1 text-xs text-red-400">{fieldErrors.url}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="wf-desc" className="mb-1 block text-sm font-medium text-gray-300">
          Description <span className="text-gray-600">(optional)</span>
        </label>
        <input
          id="wf-desc"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Production payment listener"
          maxLength={200}
          className="block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
        <p className="mt-1 text-right text-xs text-gray-600">{description.length}/200</p>
      </div>

      {/* Event types — grouped */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-300">Event Types</span>
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={selectAll} className="text-cyan-400 transition hover:text-cyan-300">All</button>
            <span className="text-gray-600">|</span>
            <button type="button" onClick={selectNone} className="text-cyan-400 transition hover:text-cyan-300">None</button>
          </div>
        </div>

        <div className="space-y-3">
          {EVENT_TYPE_GROUPS.map((group) => {
            const allSelected = group.types.every((t) => selectedTypes.includes(t));
            const someSelected = group.types.some((t) => selectedTypes.includes(t));
            return (
              <div key={group.label}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.types)}
                  className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 transition hover:text-gray-300"
                >
                  <span
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${
                      allSelected
                        ? "border-cyan-500 bg-cyan-500"
                        : someSelected
                          ? "border-cyan-500/50 bg-cyan-500/30"
                          : "border-gray-600 bg-gray-800"
                    }`}
                  >
                    {(allSelected || someSelected) && (
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        {allSelected ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                        )}
                      </svg>
                    )}
                  </span>
                  {group.label}
                </button>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {group.types.map((t) => (
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
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          selectedTypes.includes(t)
                            ? "border-cyan-500 bg-cyan-500"
                            : "border-gray-600 bg-gray-800"
                        }`}
                      >
                        {selectedTypes.includes(t) && (
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      {EVENT_TYPE_LABELS[t] ?? t}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {fieldErrors.event_types && (
          <p className="mt-1.5 text-xs text-red-400">{fieldErrors.event_types}</p>
        )}
      </div>

      {/* Active toggle */}
      <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3">
        <div>
          <span className="text-sm font-medium text-gray-300">Active</span>
          <p className="text-xs text-gray-500">
            {active ? "Webhook will receive events immediately." : "Webhook is paused — no deliveries."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          onClick={() => setActive((v) => !v)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
            active ? "bg-cyan-500" : "bg-gray-600"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
              active ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Metadata */}
      <MetadataEditor entries={metaEntries} onChange={setMetaEntries} />
      {fieldErrors.metadata && (
        <p className="text-xs text-red-400">{fieldErrors.metadata}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition hover:bg-gray-800"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving
            ? "Saving…"
            : isEdit
              ? "Update Webhook"
              : "Create Webhook"}
        </button>
      </div>
    </div>
  );
}
