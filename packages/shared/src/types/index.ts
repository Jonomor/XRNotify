// =============================================================================
// @xrnotify/shared - Type Definitions
// =============================================================================

// -----------------------------------------------------------------------------
// Event Types
// -----------------------------------------------------------------------------

/**
 * Supported XRPL event types
 */
export const EVENT_TYPES = [
  // Payments
  'payment.xrp',
  'payment.issued',
  
  // NFTs
  'nft.minted',
  'nft.burned',
  'nft.offer_created',
  'nft.offer_accepted',
  'nft.offer_cancelled',
  
  // DEX
  'dex.offer_created',
  'dex.offer_cancelled',
  'dex.offer_filled',
  
  // Trust Lines
  'trustline.created',
  'trustline.modified',
  'trustline.deleted',
  
  // Account
  'account.settings_changed',
  'account.deleted',
  
  // Escrow
  'escrow.created',
  'escrow.finished',
  'escrow.cancelled',
  
  // Check
  'check.created',
  'check.cashed',
  'check.cancelled',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

/**
 * Event type categories for filtering
 */
export const EVENT_CATEGORIES = {
  payment: ['payment.xrp', 'payment.issued'],
  nft: ['nft.minted', 'nft.burned', 'nft.offer_created', 'nft.offer_accepted', 'nft.offer_cancelled'],
  dex: ['dex.offer_created', 'dex.offer_cancelled', 'dex.offer_filled'],
  trustline: ['trustline.created', 'trustline.modified', 'trustline.deleted'],
  account: ['account.settings_changed', 'account.deleted'],
  escrow: ['escrow.created', 'escrow.finished', 'escrow.cancelled'],
  check: ['check.created', 'check.cashed', 'check.cancelled'],
} as const;

export type EventCategory = keyof typeof EVENT_CATEGORIES;

// -----------------------------------------------------------------------------
// Canonical Event Schema
// -----------------------------------------------------------------------------

/**
 * Base event structure - all events conform to this schema
 */
export interface XrplEvent<T extends EventType = EventType, P = Record<string, unknown>> {
  /** Deterministic event ID: xrpl:<ledger_index>:<tx_hash>:<event_type>[:<sub_index>] */
  event_id: string;
  
  /** Type of event */
  event_type: T;
  
  /** Ledger index where this event occurred */
  ledger_index: number;
  
  /** Transaction hash */
  tx_hash: string;
  
  /** ISO 8601 UTC timestamp */
  timestamp: string;
  
  /** Primary account(s) involved in this event */
  account_context: string[];
  
  /** Event-specific normalized payload */
  payload: P;
  
  /** Network: mainnet, testnet, devnet */
  network: 'mainnet' | 'testnet' | 'devnet';
  
  /** Raw transaction data (optional, gated by plan) */
  raw?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Event Payloads by Type
// -----------------------------------------------------------------------------

export interface PaymentXrpPayload {
  sender: string;
  receiver: string;
  amount: string;
  delivered_amount: string;
  destination_tag?: number;
  source_tag?: number;
  fee: string;
}

export interface PaymentIssuedPayload {
  sender: string;
  receiver: string;
  amount: string;
  currency: string;
  issuer: string;
  delivered_amount: string;
  destination_tag?: number;
  source_tag?: number;
  fee: string;
}

export interface NftMintedPayload {
  minter: string;
  token_id: string;
  uri?: string;
  flags: number;
  transfer_fee?: number;
  taxon: number;
  issuer: string;
}

export interface NftBurnedPayload {
  owner: string;
  token_id: string;
  burner: string;
}

export interface NftOfferCreatedPayload {
  owner: string;
  token_id: string;
  offer_id: string;
  amount: string;
  currency: string;
  issuer?: string;
  destination?: string;
  expiration?: number;
  is_sell_offer: boolean;
}

export interface NftOfferAcceptedPayload {
  seller: string;
  buyer: string;
  token_id: string;
  offer_id: string;
  amount: string;
  currency: string;
  issuer?: string;
  broker?: string;
}

export interface NftOfferCancelledPayload {
  owner: string;
  offer_id: string;
  token_id: string;
}

export interface DexOfferCreatedPayload {
  account: string;
  offer_id: string;
  taker_pays: {
    value: string;
    currency: string;
    issuer?: string;
  };
  taker_gets: {
    value: string;
    currency: string;
    issuer?: string;
  };
  expiration?: number;
  sequence: number;
}

export interface DexOfferCancelledPayload {
  account: string;
  offer_id: string;
  offer_sequence: number;
}

export interface DexOfferFilledPayload {
  account: string;
  offer_id: string;
  taker: string;
  taker_paid: {
    value: string;
    currency: string;
    issuer?: string;
  };
  taker_got: {
    value: string;
    currency: string;
    issuer?: string;
  };
  is_partial: boolean;
}

export interface TrustlinePayload {
  account: string;
  issuer: string;
  currency: string;
  limit: string;
  quality_in?: number;
  quality_out?: number;
  no_ripple?: boolean;
  freeze?: boolean;
}

export interface AccountSettingsPayload {
  account: string;
  flags_set: string[];
  flags_cleared: string[];
  domain?: string;
  email_hash?: string;
  message_key?: string;
  transfer_rate?: number;
  tick_size?: number;
}

export interface AccountDeletedPayload {
  account: string;
  destination: string;
  destination_tag?: number;
}

export interface EscrowCreatedPayload {
  account: string;
  destination: string;
  amount: string;
  sequence: number;
  condition?: string;
  cancel_after?: number;
  finish_after?: number;
  destination_tag?: number;
}

export interface EscrowFinishedPayload {
  account: string;
  owner: string;
  destination: string;
  amount: string;
  offer_sequence: number;
  condition?: string;
  fulfillment?: string;
}

export interface EscrowCancelledPayload {
  account: string;
  owner: string;
  offer_sequence: number;
}

export interface CheckCreatedPayload {
  account: string;
  destination: string;
  check_id: string;
  send_max: {
    value: string;
    currency: string;
    issuer?: string;
  };
  expiration?: number;
  destination_tag?: number;
  invoice_id?: string;
}

export interface CheckCashedPayload {
  account: string;
  check_id: string;
  amount: {
    value: string;
    currency: string;
    issuer?: string;
  };
}

export interface CheckCancelledPayload {
  account: string;
  check_id: string;
}

// -----------------------------------------------------------------------------
// Typed Event Helpers
// -----------------------------------------------------------------------------

export type PaymentXrpEvent = XrplEvent<'payment.xrp', PaymentXrpPayload>;
export type PaymentIssuedEvent = XrplEvent<'payment.issued', PaymentIssuedPayload>;
export type NftMintedEvent = XrplEvent<'nft.minted', NftMintedPayload>;
export type NftBurnedEvent = XrplEvent<'nft.burned', NftBurnedPayload>;
export type NftOfferCreatedEvent = XrplEvent<'nft.offer_created', NftOfferCreatedPayload>;
export type NftOfferAcceptedEvent = XrplEvent<'nft.offer_accepted', NftOfferAcceptedPayload>;
export type NftOfferCancelledEvent = XrplEvent<'nft.offer_cancelled', NftOfferCancelledPayload>;
export type DexOfferCreatedEvent = XrplEvent<'dex.offer_created', DexOfferCreatedPayload>;
export type DexOfferCancelledEvent = XrplEvent<'dex.offer_cancelled', DexOfferCancelledPayload>;
export type DexOfferFilledEvent = XrplEvent<'dex.offer_filled', DexOfferFilledPayload>;
export type TrustlineCreatedEvent = XrplEvent<'trustline.created', TrustlinePayload>;
export type TrustlineModifiedEvent = XrplEvent<'trustline.modified', TrustlinePayload>;
export type TrustlineDeletedEvent = XrplEvent<'trustline.deleted', TrustlinePayload>;
export type AccountSettingsEvent = XrplEvent<'account.settings_changed', AccountSettingsPayload>;
export type AccountDeletedEvent = XrplEvent<'account.deleted', AccountDeletedPayload>;

// -----------------------------------------------------------------------------
// Webhook Types
// -----------------------------------------------------------------------------

export interface Webhook {
  id: string;
  tenant_id: string;
  url: string;
  secret: string;
  events: EventType[];
  accounts: string[];
  is_active: boolean;
  description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WebhookCreateInput {
  url: string;
  events: EventType[];
  accounts?: string[];
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface WebhookUpdateInput {
  url?: string;
  events?: EventType[];
  accounts?: string[];
  is_active?: boolean;
  description?: string;
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Delivery Types
// -----------------------------------------------------------------------------

export type DeliveryStatus = 
  | 'pending'
  | 'processing'
  | 'delivered'
  | 'failed'
  | 'retrying'
  | 'dlq';

export type DeliveryErrorCode =
  | 'TIMEOUT'
  | 'CONNECTION_REFUSED'
  | 'CONNECTION_RESET'
  | 'DNS_RESOLUTION'
  | 'SSL_ERROR'
  | 'HTTP_4XX'
  | 'HTTP_5XX'
  | 'INVALID_RESPONSE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'URL_BLOCKED';

export interface Delivery {
  id: string;
  webhook_id: string;
  tenant_id: string;
  event_id: string;
  event_type: EventType;
  status: DeliveryStatus;
  attempt_count: number;
  max_attempts: number;
  next_attempt_at?: string;
  last_attempt_at?: string;
  last_error?: string;
  last_error_code?: DeliveryErrorCode;
  last_status_code?: number;
  last_response_body?: string;
  last_duration_ms?: number;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryAttempt {
  id: string;
  delivery_id: string;
  attempt_number: number;
  status_code?: number;
  response_body?: string;
  error?: string;
  error_code?: DeliveryErrorCode;
  duration_ms: number;
  created_at: string;
}

// -----------------------------------------------------------------------------
// Tenant & API Key Types
// -----------------------------------------------------------------------------

export type PlanType = 'free' | 'starter' | 'pro' | 'enterprise';

export interface Tenant {
  id: string;
  name: string;
  email: string;
  plan: PlanType;
  is_active: boolean;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  settings: TenantSettings;
  created_at: string;
  updated_at: string;
}

export interface TenantSettings {
  webhook_timeout_ms: number;
  max_webhooks: number;
  max_events_per_month: number;
  retry_policy: RetryPolicy;
  include_raw_events: boolean;
  custom_domains?: string[];
}

export interface RetryPolicy {
  max_attempts: number;
  initial_delay_ms: number;
  max_delay_ms: number;
  backoff_multiplier: number;
}

export const DEFAULT_TENANT_SETTINGS: Record<PlanType, TenantSettings> = {
  free: {
    webhook_timeout_ms: 10000,
    max_webhooks: 2,
    max_events_per_month: 1000,
    retry_policy: {
      max_attempts: 3,
      initial_delay_ms: 1000,
      max_delay_ms: 60000,
      backoff_multiplier: 2,
    },
    include_raw_events: false,
  },
  starter: {
    webhook_timeout_ms: 15000,
    max_webhooks: 10,
    max_events_per_month: 50000,
    retry_policy: {
      max_attempts: 5,
      initial_delay_ms: 1000,
      max_delay_ms: 300000,
      backoff_multiplier: 2,
    },
    include_raw_events: false,
  },
  pro: {
    webhook_timeout_ms: 30000,
    max_webhooks: 50,
    max_events_per_month: 500000,
    retry_policy: {
      max_attempts: 10,
      initial_delay_ms: 1000,
      max_delay_ms: 3600000,
      backoff_multiplier: 2,
    },
    include_raw_events: true,
  },
  enterprise: {
    webhook_timeout_ms: 60000,
    max_webhooks: 1000,
    max_events_per_month: -1, // unlimited
    retry_policy: {
      max_attempts: 15,
      initial_delay_ms: 1000,
      max_delay_ms: 86400000,
      backoff_multiplier: 2,
    },
    include_raw_events: true,
  },
};

export interface ApiKey {
  id: string;
  tenant_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: ApiKeyScope[];
  last_used_at?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ApiKeyScope = 
  | 'webhooks:read'
  | 'webhooks:write'
  | 'deliveries:read'
  | 'events:read'
  | 'api_keys:read'
  | 'api_keys:write'
  | 'tenant:read'
  | 'tenant:write';

export const ALL_API_KEY_SCOPES: ApiKeyScope[] = [
  'webhooks:read',
  'webhooks:write',
  'deliveries:read',
  'events:read',
  'api_keys:read',
  'api_keys:write',
  'tenant:read',
  'tenant:write',
];

// -----------------------------------------------------------------------------
// API Response Types
// -----------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  request_id: string;
  timestamp: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
  cursor?: string;
}

// -----------------------------------------------------------------------------
// Queue Types
// -----------------------------------------------------------------------------

export interface QueuedEvent {
  id: string;
  event: XrplEvent;
  webhook_ids: string[];
  queued_at: string;
  attempts: number;
}

export interface DeliveryJob {
  id: string;
  delivery_id: string;
  webhook_id: string;
  tenant_id: string;
  event: XrplEvent;
  attempt: number;
  scheduled_at: string;
}

// -----------------------------------------------------------------------------
// Health Check Types
// -----------------------------------------------------------------------------

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime_seconds: number;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    xrpl?: ComponentHealth;
  };
}

export interface ComponentHealth {
  status: 'healthy' | 'unhealthy';
  latency_ms?: number;
  message?: string;
  last_check?: string;
  details?: Record<string, unknown>;
}
