/**
 * @fileoverview XRNotify API Types
 * Defines request/response types for the REST API.
 *
 * @packageDocumentation
 * @module @xrnotify/shared/types/api
 */

import type { DeliveryLogEntry, DeliveryStatus, EventType, XRPLEvent, XRPLNetwork } from './event.js';

// =============================================================================
// Common Types
// =============================================================================

/**
 * Standard API error response
 */
export interface APIError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    request_id?: string;
  };
}

/**
 * Standard API success response wrapper
 */
export interface APIResponse<T> {
  data: T;
  meta?: {
    request_id: string;
    timestamp: string;
  };
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
  meta?: {
    request_id: string;
    timestamp: string;
  };
}

/**
 * Pagination query parameters
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Common sort parameters
 */
export interface SortParams {
  sort_by?: string;
  sort_dir?: SortDirection;
}

/**
 * Date range filter
 */
export interface DateRangeFilter {
  from?: string; // ISO 8601
  to?: string; // ISO 8601
}

// =============================================================================
// Health & Status
// =============================================================================

/**
 * Service health status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: HealthStatus;
  timestamp: string;
  version: string;
  uptime_seconds: number;
}

/**
 * Readiness check response
 */
export interface ReadinessCheckResponse {
  status: HealthStatus;
  timestamp: string;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    xrpl?: ServiceStatus;
  };
}

/**
 * Individual service status
 */
export interface ServiceStatus {
  status: 'connected' | 'disconnected' | 'error';
  latency_ms?: number;
  error?: string;
}

// =============================================================================
// Authentication
// =============================================================================

/**
 * API Key representation (public, never contains actual key)
 */
export interface APIKey {
  id: string;
  name: string;
  description?: string;
  key_prefix: string; // First 8 chars of the key
  scopes: APIKeyScope[];
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
  revoked: boolean;
  revoked_at?: string;
}

/**
 * API Key scopes/permissions
 */
export type APIKeyScope =
  | 'webhooks:read'
  | 'webhooks:write'
  | 'deliveries:read'
  | 'deliveries:replay'
  | 'api_keys:read'
  | 'api_keys:write'
  | 'billing:read'
  | 'billing:write';

/**
 * All available scopes
 */
export const ALL_API_KEY_SCOPES: APIKeyScope[] = [
  'webhooks:read',
  'webhooks:write',
  'deliveries:read',
  'deliveries:replay',
  'api_keys:read',
  'api_keys:write',
  'billing:read',
  'billing:write',
];

/**
 * Default scopes for new API keys
 */
export const DEFAULT_API_KEY_SCOPES: APIKeyScope[] = [
  'webhooks:read',
  'webhooks:write',
  'deliveries:read',
  'deliveries:replay',
  'api_keys:read',
];

/**
 * Create API Key request
 */
export interface CreateAPIKeyRequest {
  name: string;
  description?: string;
  scopes?: APIKeyScope[];
  expires_in_days?: number; // null = never expires
}

/**
 * Create API Key response (only time full key is returned)
 */
export interface CreateAPIKeyResponse {
  api_key: APIKey;
  key: string; // Full API key - only returned once!
}

/**
 * List API Keys response
 */
export type ListAPIKeysResponse = PaginatedResponse<APIKey>;

/**
 * Revoke API Key request
 */
export interface RevokeAPIKeyRequest {
  revoke_reason?: string;
}

// =============================================================================
// Sessions (Dashboard Auth)
// =============================================================================

/**
 * Login request
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number; // seconds
  user: UserInfo;
}

/**
 * Refresh token request
 */
export interface RefreshTokenRequest {
  refresh_token: string;
}

/**
 * Refresh token response
 */
export interface RefreshTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

/**
 * User info
 */
export interface UserInfo {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  email_verified: boolean;
}

/**
 * Current user response (GET /v1/me)
 */
export interface CurrentUserResponse {
  user: UserInfo;
  tenant: TenantInfo;
  usage: UsageInfo;
}

/**
 * Tenant info
 */
export interface TenantInfo {
  id: string;
  name: string;
  plan: PlanType;
  created_at: string;
}

/**
 * Usage info
 */
export interface UsageInfo {
  events_this_month: number;
  events_limit: number;
  webhooks_count: number;
  webhooks_limit: number;
  api_keys_count: number;
  api_keys_limit: number;
  billing_period_start: string;
  billing_period_end: string;
}

// =============================================================================
// Webhooks
// =============================================================================

/**
 * Webhook representation
 */
export interface Webhook {
  id: string;
  url: string;
  description?: string;
  events: EventType[];
  filter?: WebhookFilter;
  active: boolean;
  secret_last_chars: string; // Last 4 chars of secret
  created_at: string;
  updated_at: string;
  last_delivery_at?: string;
  delivery_stats: WebhookDeliveryStats;
}

/**
 * Webhook filter options
 */
export interface WebhookFilter {
  /**
   * Only trigger for events involving these accounts
   */
  accounts?: string[];

  /**
   * Only trigger for events on this network
   */
  network?: XRPLNetwork;

  /**
   * Minimum XRP amount for payment events
   */
  min_xrp_amount?: string;

  /**
   * Custom filter expression (future)
   */
  expression?: string;
}

/**
 * Webhook delivery statistics
 */
export interface WebhookDeliveryStats {
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  success_rate: number; // 0-100
  avg_latency_ms: number;
  last_24h: {
    total: number;
    successful: number;
    failed: number;
  };
}

/**
 * Create webhook request
 */
export interface CreateWebhookRequest {
  url: string;
  description?: string;
  events: EventType[];
  filter?: WebhookFilter;
  active?: boolean; // default: true
}

/**
 * Create webhook response
 */
export interface CreateWebhookResponse {
  webhook: Webhook;
  secret: string; // Full secret - only returned once!
}

/**
 * Update webhook request
 */
export interface UpdateWebhookRequest {
  url?: string;
  description?: string;
  events?: EventType[];
  filter?: WebhookFilter;
  active?: boolean;
}

/**
 * Update webhook response
 */
export interface UpdateWebhookResponse {
  webhook: Webhook;
}

/**
 * List webhooks query params
 */
export interface ListWebhooksParams extends PaginationParams {
  active?: boolean;
}

/**
 * List webhooks response
 */
export type ListWebhooksResponse = PaginatedResponse<Webhook>;

/**
 * Get webhook response
 */
export interface GetWebhookResponse {
  webhook: Webhook;
}

/**
 * Delete webhook response
 */
export interface DeleteWebhookResponse {
  deleted: boolean;
  webhook_id: string;
}

/**
 * Rotate webhook secret response
 */
export interface RotateWebhookSecretResponse {
  webhook_id: string;
  secret: string; // New secret
  previous_secret_valid_until: string; // Grace period
}

/**
 * Test webhook request
 */
export interface TestWebhookRequest {
  event_type?: EventType; // default: payment.xrp
}

/**
 * Test webhook response
 */
export interface TestWebhookResponse {
  webhook_id: string;
  delivery_id: string;
  status: 'delivered' | 'failed';
  http_status?: number;
  duration_ms: number;
  error?: string;
  request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body: string;
  };
  response?: {
    status: number;
    headers: Record<string, string>;
    body: string;
  };
}

// =============================================================================
// Deliveries
// =============================================================================

/**
 * Delivery log entry (API response version)
 */
export interface Delivery extends DeliveryLogEntry {
  webhook_url: string;
  request?: {
    method: string;
    headers: Record<string, string>;
    body_preview: string; // Truncated body
  };
  response?: {
    status: number;
    headers: Record<string, string>;
    body_preview: string;
  };
}

/**
 * List deliveries query params
 */
export interface ListDeliveriesParams extends PaginationParams, DateRangeFilter {
  webhook_id?: string;
  event_type?: EventType;
  status?: DeliveryStatus;
  event_id?: string;
}

/**
 * List deliveries response
 */
export type ListDeliveriesResponse = PaginatedResponse<Delivery>;

/**
 * Get delivery response
 */
export interface GetDeliveryResponse {
  delivery: Delivery;
  event: XRPLEvent;
}

/**
 * Delivery statistics
 */
export interface DeliveryStatistics {
  period: {
    from: string;
    to: string;
  };
  total: number;
  successful: number;
  failed: number;
  retrying: number;
  success_rate: number;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  by_status: Record<DeliveryStatus, number>;
  by_event_type: Record<string, number>;
  by_http_status: Record<string, number>;
  by_hour: Array<{
    hour: string;
    total: number;
    successful: number;
    failed: number;
  }>;
}

/**
 * Get delivery statistics params
 */
export interface GetDeliveryStatsParams extends DateRangeFilter {
  webhook_id?: string;
}

/**
 * Get delivery statistics response
 */
export interface GetDeliveryStatsResponse {
  statistics: DeliveryStatistics;
}

// =============================================================================
// Replay
// =============================================================================

/**
 * Replay events request
 */
export interface ReplayEventsRequest {
  /**
   * Webhook IDs to replay to (default: all active webhooks)
   */
  webhook_ids?: string[];

  /**
   * Event types to replay
   */
  event_types?: EventType[];

  /**
   * Account filter
   */
  accounts?: string[];

  /**
   * Time range (required)
   */
  from: string; // ISO 8601
  to: string; // ISO 8601

  /**
   * Specific event IDs to replay
   */
  event_ids?: string[];

  /**
   * Maximum events to replay (safety limit)
   */
  max_events?: number;

  /**
   * Dry run - don't actually send, just return what would be sent
   */
  dry_run?: boolean;
}

/**
 * Replay events response
 */
export interface ReplayEventsResponse {
  replay_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  events_queued: number;
  webhooks_targeted: number;
  estimated_deliveries: number;
  dry_run: boolean;
  created_at: string;
}

/**
 * Get replay status response
 */
export interface GetReplayStatusResponse {
  replay_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: {
    events_processed: number;
    events_total: number;
    deliveries_sent: number;
    deliveries_failed: number;
    percent_complete: number;
  };
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
}

// =============================================================================
// Events (Read-only)
// =============================================================================

/**
 * List events query params
 */
export interface ListEventsParams extends PaginationParams, DateRangeFilter {
  event_type?: EventType;
  account?: string;
  tx_hash?: string;
  ledger_index?: number;
  ledger_index_min?: number;
  ledger_index_max?: number;
}

/**
 * List events response
 */
export type ListEventsResponse = PaginatedResponse<XRPLEvent>;

/**
 * Get event response
 */
export interface GetEventResponse {
  event: XRPLEvent;
  deliveries: Array<{
    webhook_id: string;
    webhook_url: string;
    status: DeliveryStatus;
    delivered_at?: string;
  }>;
}

// =============================================================================
// Billing & Plans
// =============================================================================

/**
 * Plan types
 */
export type PlanType = 'free' | 'starter' | 'pro' | 'enterprise';

/**
 * Plan details
 */
export interface Plan {
  type: PlanType;
  name: string;
  description: string;
  price_monthly: number; // cents
  price_yearly: number; // cents
  features: {
    events_per_month: number; // 0 = unlimited
    webhooks: number;
    api_keys: number;
    retention_days: number;
    replay_enabled: boolean;
    websocket_streaming: boolean;
    raw_events: boolean;
    priority_support: boolean;
    sla_uptime?: number; // percentage
    custom_domains: boolean;
  };
}

/**
 * All plans
 */
export const PLANS: Record<PlanType, Plan> = {
  free: {
    type: 'free',
    name: 'Free',
    description: 'For hobbyists and testing',
    price_monthly: 0,
    price_yearly: 0,
    features: {
      events_per_month: 10000,
      webhooks: 3,
      api_keys: 2,
      retention_days: 7,
      replay_enabled: false,
      websocket_streaming: false,
      raw_events: false,
      priority_support: false,
      custom_domains: false,
    },
  },
  starter: {
    type: 'starter',
    name: 'Starter',
    description: 'For small projects',
    price_monthly: 2900, // $29
    price_yearly: 29000, // $290
    features: {
      events_per_month: 100000,
      webhooks: 10,
      api_keys: 5,
      retention_days: 30,
      replay_enabled: true,
      websocket_streaming: false,
      raw_events: false,
      priority_support: false,
      custom_domains: false,
    },
  },
  pro: {
    type: 'pro',
    name: 'Pro',
    description: 'For growing businesses',
    price_monthly: 9900, // $99
    price_yearly: 99000, // $990
    features: {
      events_per_month: 1000000,
      webhooks: 50,
      api_keys: 20,
      retention_days: 90,
      replay_enabled: true,
      websocket_streaming: true,
      raw_events: true,
      priority_support: true,
      sla_uptime: 99.9,
      custom_domains: false,
    },
  },
  enterprise: {
    type: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    price_monthly: 0, // Custom
    price_yearly: 0, // Custom
    features: {
      events_per_month: 0, // Unlimited
      webhooks: 0, // Unlimited
      api_keys: 0, // Unlimited
      retention_days: 365,
      replay_enabled: true,
      websocket_streaming: true,
      raw_events: true,
      priority_support: true,
      sla_uptime: 99.99,
      custom_domains: true,
    },
  },
};

/**
 * Current subscription info
 */
export interface Subscription {
  plan: PlanType;
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  trial_end?: string;
}

/**
 * Billing info
 */
export interface BillingInfo {
  subscription: Subscription;
  usage: UsageInfo;
  payment_method?: {
    type: 'card';
    last4: string;
    brand: string;
    exp_month: number;
    exp_year: number;
  };
  invoices: Invoice[];
}

/**
 * Invoice
 */
export interface Invoice {
  id: string;
  amount: number; // cents
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  created_at: string;
  due_date?: string;
  paid_at?: string;
  pdf_url?: string;
}

/**
 * Get billing response
 */
export interface GetBillingResponse {
  billing: BillingInfo;
}

/**
 * Create checkout session request
 */
export interface CreateCheckoutSessionRequest {
  plan: PlanType;
  billing_period: 'monthly' | 'yearly';
  success_url: string;
  cancel_url: string;
}

/**
 * Create checkout session response
 */
export interface CreateCheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
}

/**
 * Create billing portal session response
 */
export interface CreateBillingPortalSessionResponse {
  portal_url: string;
}

// =============================================================================
// WebSocket Streaming
// =============================================================================

/**
 * WebSocket message types
 */
export type WSMessageType =
  | 'subscribe'
  | 'unsubscribe'
  | 'event'
  | 'subscribed'
  | 'unsubscribed'
  | 'error'
  | 'ping'
  | 'pong';

/**
 * WebSocket subscribe message
 */
export interface WSSubscribeMessage {
  type: 'subscribe';
  id: string; // Request ID
  events?: EventType[];
  accounts?: string[];
}

/**
 * WebSocket unsubscribe message
 */
export interface WSUnsubscribeMessage {
  type: 'unsubscribe';
  id: string;
  events?: EventType[];
  accounts?: string[];
}

/**
 * WebSocket event message
 */
export interface WSEventMessage {
  type: 'event';
  event: XRPLEvent;
}

/**
 * WebSocket subscribed confirmation
 */
export interface WSSubscribedMessage {
  type: 'subscribed';
  id: string;
  events: EventType[];
  accounts: string[];
}

/**
 * WebSocket unsubscribed confirmation
 */
export interface WSUnsubscribedMessage {
  type: 'unsubscribed';
  id: string;
  events: EventType[];
  accounts: string[];
}

/**
 * WebSocket error message
 */
export interface WSErrorMessage {
  type: 'error';
  id?: string;
  code: string;
  message: string;
}

/**
 * WebSocket ping message
 */
export interface WSPingMessage {
  type: 'ping';
  timestamp: number;
}

/**
 * WebSocket pong message
 */
export interface WSPongMessage {
  type: 'pong';
  timestamp: number;
}

/**
 * All WebSocket message types
 */
export type WSMessage =
  | WSSubscribeMessage
  | WSUnsubscribeMessage
  | WSEventMessage
  | WSSubscribedMessage
  | WSUnsubscribedMessage
  | WSErrorMessage
  | WSPingMessage
  | WSPongMessage;

// =============================================================================
// Error Codes
// =============================================================================

/**
 * API error codes
 */
export const ErrorCode = {
  // Authentication errors (401)
  UNAUTHORIZED: 'unauthorized',
  INVALID_API_KEY: 'invalid_api_key',
  EXPIRED_API_KEY: 'expired_api_key',
  REVOKED_API_KEY: 'revoked_api_key',
  INVALID_TOKEN: 'invalid_token',
  EXPIRED_TOKEN: 'expired_token',

  // Authorization errors (403)
  FORBIDDEN: 'forbidden',
  INSUFFICIENT_SCOPE: 'insufficient_scope',
  PLAN_LIMIT_EXCEEDED: 'plan_limit_exceeded',

  // Not found errors (404)
  NOT_FOUND: 'not_found',
  WEBHOOK_NOT_FOUND: 'webhook_not_found',
  DELIVERY_NOT_FOUND: 'delivery_not_found',
  EVENT_NOT_FOUND: 'event_not_found',

  // Validation errors (400)
  VALIDATION_ERROR: 'validation_error',
  INVALID_URL: 'invalid_url',
  INVALID_EVENT_TYPE: 'invalid_event_type',
  INVALID_DATE_RANGE: 'invalid_date_range',
  DUPLICATE_WEBHOOK: 'duplicate_webhook',

  // Rate limiting (429)
  RATE_LIMITED: 'rate_limited',

  // Server errors (500)
  INTERNAL_ERROR: 'internal_error',
  DATABASE_ERROR: 'database_error',
  QUEUE_ERROR: 'queue_error',

  // Service unavailable (503)
  SERVICE_UNAVAILABLE: 'service_unavailable',
  XRPL_DISCONNECTED: 'xrpl_disconnected',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
