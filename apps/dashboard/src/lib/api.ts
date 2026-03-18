/**
 * XRNotify Dashboard — Shared API Client
 *
 * Centralised, typed HTTP client for all backend interactions.
 * Handles JWT auth, automatic 401 redirect, request/response typing,
 * and provides convenience methods for every API resource.
 */

/* ------------------------------------------------------------------ */
/*  Session helpers (canonical source: login/page.tsx re-exports)      */
/* ------------------------------------------------------------------ */

const TOKEN_KEY = "xrnotify_token";
const TENANT_KEY = "xrnotify_tenant";

export interface Tenant {
  id: string;
  name: string;
  plan: string;
}

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getTenant(): Tenant | null {
  try {
    const raw = sessionStorage.getItem(TENANT_KEY);
    return raw ? (JSON.parse(raw) as Tenant) : null;
  } catch {
    return null;
  }
}

export function storeSession(token: string, tenant: Tenant): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(TENANT_KEY, JSON.stringify(tenant));
  } catch {
    /* storage unavailable */
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TENANT_KEY);
  } catch {
    /* noop */
  }
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4400";

/* ------------------------------------------------------------------ */
/*  Error class                                                        */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

/* ------------------------------------------------------------------ */
/*  Core fetch wrapper                                                 */
/* ------------------------------------------------------------------ */

interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Skip automatic redirect on 401 */
  skipAuthRedirect?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  opts: FetchOptions = {},
): Promise<T> {
  const { body, skipAuthRedirect, ...init } = opts;
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  /* Merge any caller-supplied headers */
  if (init.headers) {
    const extra =
      init.headers instanceof Headers
        ? Object.fromEntries(init.headers.entries())
        : Array.isArray(init.headers)
          ? Object.fromEntries(init.headers)
          : init.headers;
    Object.assign(headers, extra);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  /* 401 → clear session & redirect */
  if (res.status === 401 && !skipAuthRedirect) {
    clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError(401, "unauthorized", "Session expired");
  }

  /* 204 No Content */
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  /* Parse body */
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const errBody = data as Record<string, string>;
    throw new ApiError(
      res.status,
      errBody.code ?? errBody.error ?? "unknown",
      errBody.message ?? errBody.error ?? `HTTP ${res.status}`,
    );
  }

  return data as T;
}

/* ------------------------------------------------------------------ */
/*  Convenience: HTTP verbs                                            */
/* ------------------------------------------------------------------ */

export function apiGet<T>(path: string, opts?: FetchOptions): Promise<T> {
  return apiFetch<T>(path, { ...opts, method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown, opts?: FetchOptions): Promise<T> {
  return apiFetch<T>(path, { ...opts, method: "POST", body });
}

export function apiPatch<T>(path: string, body?: unknown, opts?: FetchOptions): Promise<T> {
  return apiFetch<T>(path, { ...opts, method: "PATCH", body });
}

export function apiDelete<T = void>(path: string, opts?: FetchOptions): Promise<T> {
  return apiFetch<T>(path, { ...opts, method: "DELETE" });
}

/* ------------------------------------------------------------------ */
/*  Shared response / payload types                                    */
/* ------------------------------------------------------------------ */

/* ---- Auth ---- */

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expires_at: string;
  tenant: Tenant;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

/* ---- Webhooks ---- */

export interface Webhook {
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

export interface WebhooksListResponse {
  webhooks: Webhook[];
  total: number;
  page: number;
  per_page: number;
}

export interface WebhookCreatePayload {
  url: string;
  description?: string;
  event_types: string[];
  active?: boolean;
  metadata?: Record<string, string>;
}

export interface WebhookUpdatePayload {
  url?: string;
  description?: string;
  event_types?: string[];
  active?: boolean;
  metadata?: Record<string, string>;
}

/* ---- Deliveries ---- */

export interface Delivery {
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

export interface DeliveriesListResponse {
  deliveries: Delivery[];
  total: number;
  page: number;
  per_page: number;
}

export interface DeliveriesFilter {
  page?: number;
  per_page?: number;
  status?: string;
  webhook_id?: string;
  event_type?: string;
}

/* ---- API Keys ---- */

export interface ApiKey {
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

export interface ApiKeysListResponse {
  api_keys: ApiKey[];
  total: number;
}

export interface ApiKeyCreatePayload {
  name: string;
  scopes: string[];
  expires_at?: string;
}

export interface ApiKeyCreateResponse {
  id: string;
  name: string;
  key: string;
  prefix: string;
  last4: string;
  scopes: string[];
  created_at: string;
}

/* ---- Events ---- */

export interface XrplEvent {
  event_id: string;
  ledger_index: number;
  tx_hash: string;
  event_type: string;
  timestamp: string;
  account_context: string[];
  payload: Record<string, unknown>;
}

export interface EventsListResponse {
  events: XrplEvent[];
  total: number;
  page: number;
  per_page: number;
}

/* ---- Metrics ---- */

export interface MetricsSummary {
  total_events: number;
  total_deliveries: number;
  success_rate: number;
  avg_latency_ms: number;
  active_webhooks: number;
  failed_24h: number;
  dead_letter_count: number;
  events_by_type: Record<string, number>;
  deliveries_by_status: Record<string, number>;
  latency_p50_ms: number;
  latency_p95_ms: number;
  latency_p99_ms: number;
}

/* ------------------------------------------------------------------ */
/*  Resource methods                                                   */
/* ------------------------------------------------------------------ */

export const auth = {
  login: (payload: LoginPayload) =>
    apiPost<LoginResponse>("/v1/auth/login", payload, { skipAuthRedirect: true }),

  register: (payload: RegisterPayload) =>
    apiPost<LoginResponse>("/v1/auth/register", payload, { skipAuthRedirect: true }),

  logout: () => {
    clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  },
};

export const webhooks = {
  list: (page = 1, perPage = 50) =>
    apiGet<WebhooksListResponse>(`/v1/webhooks?page=${page}&per_page=${perPage}`),

  get: (id: string) =>
    apiGet<Webhook>(`/v1/webhooks/${id}`),

  create: (payload: WebhookCreatePayload) =>
    apiPost<Webhook>("/v1/webhooks", payload),

  update: (id: string, payload: WebhookUpdatePayload) =>
    apiPatch<Webhook>(`/v1/webhooks/${id}`, payload),

  delete: (id: string) =>
    apiDelete(`/v1/webhooks/${id}`),

  toggleActive: (id: string, active: boolean) =>
    apiPatch<Webhook>(`/v1/webhooks/${id}`, { active }),
};

export const deliveries = {
  list: (filters: DeliveriesFilter = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.per_page) params.set("per_page", String(filters.per_page));
    if (filters.status) params.set("status", filters.status);
    if (filters.webhook_id) params.set("webhook_id", filters.webhook_id);
    if (filters.event_type) params.set("event_type", filters.event_type);
    const qs = params.toString();
    return apiGet<DeliveriesListResponse>(`/v1/deliveries${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) =>
    apiGet<Delivery>(`/v1/deliveries/${id}`),

  retry: (id: string) =>
    apiPost<void>(`/v1/deliveries/${id}/retry`),
};

export const apiKeys = {
  list: () =>
    apiGet<ApiKeysListResponse>("/v1/api-keys"),

  create: (payload: ApiKeyCreatePayload) =>
    apiPost<ApiKeyCreateResponse>("/v1/api-keys", payload),

  revoke: (id: string) =>
    apiDelete(`/v1/api-keys/${id}`),
};

export const events = {
  list: (page = 1, perPage = 50, eventType?: string) => {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (eventType) params.set("event_type", eventType);
    return apiGet<EventsListResponse>(`/v1/events?${params}`);
  },

  get: (eventId: string) =>
    apiGet<XrplEvent>(`/v1/events/${encodeURIComponent(eventId)}`),

  replay: (eventId: string, webhookId?: string) =>
    apiPost<void>("/v1/events/replay", { event_id: eventId, webhook_id: webhookId }),
};

export const metrics = {
  summary: (range: "1h" | "24h" | "7d" | "30d" = "24h") =>
    apiGet<MetricsSummary>(`/v1/metrics/summary?range=${range}`),
};

/* ------------------------------------------------------------------ */
/*  URL builder (for external links / docs)                            */
/* ------------------------------------------------------------------ */

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/* ------------------------------------------------------------------ */
/*  Default export for convenience                                     */
/* ------------------------------------------------------------------ */

const api = {
  fetch: apiFetch,
  get: apiGet,
  post: apiPost,
  patch: apiPatch,
  delete: apiDelete,
  auth,
  webhooks,
  deliveries,
  apiKeys,
  events,
  metrics,
  /* session */
  getToken,
  getTenant,
  storeSession,
  clearSession,
  isAuthenticated,
  apiUrl,
};

export default api;
