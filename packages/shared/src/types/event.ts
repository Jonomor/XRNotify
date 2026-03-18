/**
 * @fileoverview XRNotify Canonical Event Types
 * Defines the stable event schema contract for all XRPL events.
 *
 * Event ID Format: xrpl:<ledger_index>:<tx_hash>:<event_type>[:<sub_index>]
 *
 * @packageDocumentation
 * @module @xrnotify/shared/types/event
 */

// =============================================================================
// Event Type Enum
// =============================================================================

/**
 * All supported XRPL event types
 */
export const EventType = {
  // Payment events
  PAYMENT_XRP: 'payment.xrp',
  PAYMENT_ISSUED: 'payment.issued',

  // Trustline events
  TRUSTLINE_CREATED: 'trustline.created',
  TRUSTLINE_MODIFIED: 'trustline.modified',
  TRUSTLINE_REMOVED: 'trustline.removed',

  // NFT events
  NFT_MINTED: 'nft.minted',
  NFT_BURNED: 'nft.burned',
  NFT_OFFER_CREATED: 'nft.offer_created',
  NFT_OFFER_ACCEPTED: 'nft.offer_accepted',
  NFT_OFFER_CANCELLED: 'nft.offer_cancelled',

  // DEX events
  DEX_OFFER_CREATED: 'dex.offer_created',
  DEX_OFFER_CANCELLED: 'dex.offer_cancelled',
  DEX_OFFER_FILLED: 'dex.offer_filled',
  DEX_OFFER_PARTIALLY_FILLED: 'dex.offer_partially_filled',

  // Account events
  ACCOUNT_SETTINGS_CHANGED: 'account.settings_changed',
  ACCOUNT_DELETED: 'account.deleted',

  // Escrow events (roadmap)
  ESCROW_CREATED: 'escrow.created',
  ESCROW_FINISHED: 'escrow.finished',
  ESCROW_CANCELLED: 'escrow.cancelled',

  // Check events (roadmap)
  CHECK_CREATED: 'check.created',
  CHECK_CASHED: 'check.cashed',
  CHECK_CANCELLED: 'check.cancelled',
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

/**
 * Array of all event types for validation
 */
export const ALL_EVENT_TYPES: EventType[] = Object.values(EventType);

/**
 * Payment event types
 */
export const PAYMENT_EVENT_TYPES: EventType[] = [
  EventType.PAYMENT_XRP,
  EventType.PAYMENT_ISSUED,
];

/**
 * Trustline event types
 */
export const TRUSTLINE_EVENT_TYPES: EventType[] = [
  EventType.TRUSTLINE_CREATED,
  EventType.TRUSTLINE_MODIFIED,
  EventType.TRUSTLINE_REMOVED,
];

/**
 * NFT event types
 */
export const NFT_EVENT_TYPES: EventType[] = [
  EventType.NFT_MINTED,
  EventType.NFT_BURNED,
  EventType.NFT_OFFER_CREATED,
  EventType.NFT_OFFER_ACCEPTED,
  EventType.NFT_OFFER_CANCELLED,
];

/**
 * DEX event types
 */
export const DEX_EVENT_TYPES: EventType[] = [
  EventType.DEX_OFFER_CREATED,
  EventType.DEX_OFFER_CANCELLED,
  EventType.DEX_OFFER_FILLED,
  EventType.DEX_OFFER_PARTIALLY_FILLED,
];

/**
 * Account event types
 */
export const ACCOUNT_EVENT_TYPES: EventType[] = [
  EventType.ACCOUNT_SETTINGS_CHANGED,
  EventType.ACCOUNT_DELETED,
];

// =============================================================================
// Common Types
// =============================================================================

/**
 * XRPL currency amount - either XRP (drops as string) or issued currency
 */
export interface XRPAmount {
  currency: 'XRP';
  value: string; // Decimal string (e.g., "100.5")
  issuer?: never;
}

export interface IssuedCurrencyAmount {
  currency: string; // 3-char code or 40-char hex
  value: string; // Decimal string
  issuer: string; // XRPL address
}

export type CurrencyAmount = XRPAmount | IssuedCurrencyAmount;

/**
 * Type guard for XRP amount
 */
export function isXRPAmount(amount: CurrencyAmount): amount is XRPAmount {
  return amount.currency === 'XRP';
}

/**
 * Type guard for issued currency amount
 */
export function isIssuedCurrencyAmount(amount: CurrencyAmount): amount is IssuedCurrencyAmount {
  return amount.currency !== 'XRP' && 'issuer' in amount;
}

/**
 * XRPL transaction result
 */
export interface TransactionResult {
  code: string; // e.g., "tesSUCCESS"
  message: string;
  success: boolean;
}

/**
 * XRPL network identifier
 */
export type XRPLNetwork = 'mainnet' | 'testnet' | 'devnet';

// =============================================================================
// Base Event
// =============================================================================

/**
 * Base event structure - all events extend this
 */
export interface BaseEvent<T extends EventType = EventType, P = unknown> {
  /**
   * Deterministic event ID
   * Format: xrpl:<ledger_index>:<tx_hash>:<event_type>[:<sub_index>]
   */
  event_id: string;

  /**
   * Event type identifier
   */
  event_type: T;

  /**
   * Ledger index where the transaction was validated
   */
  ledger_index: number;

  /**
   * Transaction hash
   */
  tx_hash: string;

  /**
   * ISO 8601 UTC timestamp of the ledger close time
   */
  timestamp: string;

  /**
   * XRPL network
   */
  network: XRPLNetwork;

  /**
   * Primary accounts involved in this event
   * Used for filtering/routing webhooks
   */
  account_context: string[];

  /**
   * Transaction result
   */
  result: TransactionResult;

  /**
   * Event-specific payload
   */
  payload: P;

  /**
   * Raw transaction data (optional, gated by plan)
   */
  raw?: unknown;
}

// =============================================================================
// Payment Events
// =============================================================================

/**
 * XRP Payment payload
 */
export interface PaymentXRPPayload {
  source: string;
  destination: string;
  amount: XRPAmount;
  delivered_amount: XRPAmount;
  fee: string; // Drops
  source_tag?: number;
  destination_tag?: number;
  memos?: Array<{
    type?: string;
    data?: string;
    format?: string;
  }>;
  paths_used: boolean;
}

/**
 * Issued Currency Payment payload
 */
export interface PaymentIssuedPayload {
  source: string;
  destination: string;
  amount: IssuedCurrencyAmount;
  delivered_amount: CurrencyAmount;
  fee: string; // Drops
  source_tag?: number;
  destination_tag?: number;
  send_max?: CurrencyAmount;
  memos?: Array<{
    type?: string;
    data?: string;
    format?: string;
  }>;
  paths_used: boolean;
  partial_payment: boolean;
}

export type PaymentXRPEvent = BaseEvent<typeof EventType.PAYMENT_XRP, PaymentXRPPayload>;
export type PaymentIssuedEvent = BaseEvent<typeof EventType.PAYMENT_ISSUED, PaymentIssuedPayload>;
export type PaymentEvent = PaymentXRPEvent | PaymentIssuedEvent;

// =============================================================================
// Trustline Events
// =============================================================================

/**
 * Trustline payload
 */
export interface TrustlinePayload {
  account: string;
  issuer: string;
  currency: string;
  limit: string;
  balance: string;
  quality_in?: number;
  quality_out?: number;
  no_ripple?: boolean;
  no_ripple_peer?: boolean;
  authorized?: boolean;
  freeze?: boolean;
  freeze_peer?: boolean;
}

/**
 * Trustline created payload
 */
export interface TrustlineCreatedPayload extends TrustlinePayload {
  previous_limit?: never;
}

/**
 * Trustline modified payload
 */
export interface TrustlineModifiedPayload extends TrustlinePayload {
  previous_limit: string;
  previous_balance?: string;
}

/**
 * Trustline removed payload
 */
export interface TrustlineRemovedPayload {
  account: string;
  issuer: string;
  currency: string;
  previous_limit: string;
  previous_balance: string;
}

export type TrustlineCreatedEvent = BaseEvent<typeof EventType.TRUSTLINE_CREATED, TrustlineCreatedPayload>;
export type TrustlineModifiedEvent = BaseEvent<typeof EventType.TRUSTLINE_MODIFIED, TrustlineModifiedPayload>;
export type TrustlineRemovedEvent = BaseEvent<typeof EventType.TRUSTLINE_REMOVED, TrustlineRemovedPayload>;
export type TrustlineEvent = TrustlineCreatedEvent | TrustlineModifiedEvent | TrustlineRemovedEvent;

// =============================================================================
// NFT Events
// =============================================================================

/**
 * NFT Token details
 */
export interface NFTokenInfo {
  nft_id: string;
  issuer: string;
  taxon: number;
  sequence: number;
  transfer_fee?: number; // Basis points (0-50000)
  flags: number;
  uri?: string; // Decoded from hex
}

/**
 * NFT Minted payload
 */
export interface NFTMintedPayload {
  account: string;
  token: NFTokenInfo;
  fee: string;
}

/**
 * NFT Burned payload
 */
export interface NFTBurnedPayload {
  account: string;
  nft_id: string;
  owner: string;
  fee: string;
}

/**
 * NFT Offer details
 */
export interface NFTOfferInfo {
  offer_id: string;
  owner: string;
  nft_id: string;
  amount: CurrencyAmount;
  destination?: string;
  expiration?: number;
  flags: number;
  is_sell_offer: boolean;
}

/**
 * NFT Offer Created payload
 */
export interface NFTOfferCreatedPayload {
  account: string;
  offer: NFTOfferInfo;
  fee: string;
}

/**
 * NFT Offer Accepted payload
 */
export interface NFTOfferAcceptedPayload {
  account: string;
  nft_id: string;
  sell_offer?: string;
  buy_offer?: string;
  seller: string;
  buyer: string;
  amount: CurrencyAmount;
  broker_fee?: CurrencyAmount;
  fee: string;
}

/**
 * NFT Offer Cancelled payload
 */
export interface NFTOfferCancelledPayload {
  account: string;
  offer_ids: string[];
  fee: string;
}

export type NFTMintedEvent = BaseEvent<typeof EventType.NFT_MINTED, NFTMintedPayload>;
export type NFTBurnedEvent = BaseEvent<typeof EventType.NFT_BURNED, NFTBurnedPayload>;
export type NFTOfferCreatedEvent = BaseEvent<typeof EventType.NFT_OFFER_CREATED, NFTOfferCreatedPayload>;
export type NFTOfferAcceptedEvent = BaseEvent<typeof EventType.NFT_OFFER_ACCEPTED, NFTOfferAcceptedPayload>;
export type NFTOfferCancelledEvent = BaseEvent<typeof EventType.NFT_OFFER_CANCELLED, NFTOfferCancelledPayload>;
export type NFTEvent =
  | NFTMintedEvent
  | NFTBurnedEvent
  | NFTOfferCreatedEvent
  | NFTOfferAcceptedEvent
  | NFTOfferCancelledEvent;

// =============================================================================
// DEX Events
// =============================================================================

/**
 * DEX Offer details
 */
export interface DEXOfferInfo {
  offer_sequence: number;
  taker_pays: CurrencyAmount;
  taker_gets: CurrencyAmount;
  expiration?: number;
  flags: number;
  passive: boolean;
  immediate_or_cancel: boolean;
  fill_or_kill: boolean;
  sell: boolean;
}

/**
 * DEX Offer Created payload
 */
export interface DEXOfferCreatedPayload {
  account: string;
  offer: DEXOfferInfo;
  book_directory: string;
  fee: string;
}

/**
 * DEX Offer Cancelled payload
 */
export interface DEXOfferCancelledPayload {
  account: string;
  offer_sequence: number;
  fee: string;
}

/**
 * DEX trade execution details
 */
export interface DEXTradeExecution {
  taker: string;
  maker: string;
  taker_paid: CurrencyAmount;
  taker_got: CurrencyAmount;
  maker_offer_sequence: number;
}

/**
 * DEX Offer Filled payload
 */
export interface DEXOfferFilledPayload {
  account: string; // Taker
  offer_sequence: number; // Maker's offer
  maker: string;
  taker_paid: CurrencyAmount;
  taker_got: CurrencyAmount;
  fully_filled: boolean;
  fee: string;
}

/**
 * DEX Offer Partially Filled payload
 */
export interface DEXOfferPartiallyFilledPayload {
  account: string;
  offer_sequence: number;
  maker: string;
  taker_paid: CurrencyAmount;
  taker_got: CurrencyAmount;
  remaining_taker_pays: CurrencyAmount;
  remaining_taker_gets: CurrencyAmount;
  fee: string;
}

export type DEXOfferCreatedEvent = BaseEvent<typeof EventType.DEX_OFFER_CREATED, DEXOfferCreatedPayload>;
export type DEXOfferCancelledEvent = BaseEvent<typeof EventType.DEX_OFFER_CANCELLED, DEXOfferCancelledPayload>;
export type DEXOfferFilledEvent = BaseEvent<typeof EventType.DEX_OFFER_FILLED, DEXOfferFilledPayload>;
export type DEXOfferPartiallyFilledEvent = BaseEvent<
  typeof EventType.DEX_OFFER_PARTIALLY_FILLED,
  DEXOfferPartiallyFilledPayload
>;
export type DEXEvent =
  | DEXOfferCreatedEvent
  | DEXOfferCancelledEvent
  | DEXOfferFilledEvent
  | DEXOfferPartiallyFilledEvent;

// =============================================================================
// Account Events
// =============================================================================

/**
 * Account settings details
 */
export interface AccountSettings {
  domain?: string;
  email_hash?: string;
  message_key?: string;
  transfer_rate?: number;
  tick_size?: number;
  require_dest?: boolean;
  require_auth?: boolean;
  disallow_xrp?: boolean;
  disable_master?: boolean;
  no_freeze?: boolean;
  global_freeze?: boolean;
  default_ripple?: boolean;
  deposit_auth?: boolean;
  nft_token_minter?: string;
}

/**
 * Account Settings Changed payload
 */
export interface AccountSettingsChangedPayload {
  account: string;
  settings: AccountSettings;
  previous_settings?: Partial<AccountSettings>;
  fee: string;
}

/**
 * Account Deleted payload
 */
export interface AccountDeletedPayload {
  account: string;
  destination: string;
  destination_tag?: number;
  balance_transferred: XRPAmount;
  fee: string;
}

export type AccountSettingsChangedEvent = BaseEvent<
  typeof EventType.ACCOUNT_SETTINGS_CHANGED,
  AccountSettingsChangedPayload
>;
export type AccountDeletedEvent = BaseEvent<typeof EventType.ACCOUNT_DELETED, AccountDeletedPayload>;
export type AccountEvent = AccountSettingsChangedEvent | AccountDeletedEvent;

// =============================================================================
// Escrow Events (Roadmap)
// =============================================================================

/**
 * Escrow details
 */
export interface EscrowInfo {
  escrow_id: string;
  owner: string;
  destination: string;
  amount: XRPAmount;
  condition?: string;
  cancel_after?: number;
  finish_after?: number;
  source_tag?: number;
  destination_tag?: number;
}

/**
 * Escrow Created payload
 */
export interface EscrowCreatedPayload {
  account: string;
  escrow: EscrowInfo;
  fee: string;
}

/**
 * Escrow Finished payload
 */
export interface EscrowFinishedPayload {
  account: string;
  owner: string;
  offer_sequence: number;
  destination: string;
  amount: XRPAmount;
  condition?: string;
  fulfillment?: string;
  fee: string;
}

/**
 * Escrow Cancelled payload
 */
export interface EscrowCancelledPayload {
  account: string;
  owner: string;
  offer_sequence: number;
  amount: XRPAmount;
  fee: string;
}

export type EscrowCreatedEvent = BaseEvent<typeof EventType.ESCROW_CREATED, EscrowCreatedPayload>;
export type EscrowFinishedEvent = BaseEvent<typeof EventType.ESCROW_FINISHED, EscrowFinishedPayload>;
export type EscrowCancelledEvent = BaseEvent<typeof EventType.ESCROW_CANCELLED, EscrowCancelledPayload>;
export type EscrowEvent = EscrowCreatedEvent | EscrowFinishedEvent | EscrowCancelledEvent;

// =============================================================================
// Check Events (Roadmap)
// =============================================================================

/**
 * Check details
 */
export interface CheckInfo {
  check_id: string;
  account: string;
  destination: string;
  send_max: CurrencyAmount;
  expiration?: number;
  invoice_id?: string;
  source_tag?: number;
  destination_tag?: number;
}

/**
 * Check Created payload
 */
export interface CheckCreatedPayload {
  account: string;
  check: CheckInfo;
  fee: string;
}

/**
 * Check Cashed payload
 */
export interface CheckCashedPayload {
  account: string;
  check_id: string;
  sender: string;
  amount_received: CurrencyAmount;
  fee: string;
}

/**
 * Check Cancelled payload
 */
export interface CheckCancelledPayload {
  account: string;
  check_id: string;
  fee: string;
}

export type CheckCreatedEvent = BaseEvent<typeof EventType.CHECK_CREATED, CheckCreatedPayload>;
export type CheckCashedEvent = BaseEvent<typeof EventType.CHECK_CASHED, CheckCashedPayload>;
export type CheckCancelledEvent = BaseEvent<typeof EventType.CHECK_CANCELLED, CheckCancelledPayload>;
export type CheckEvent = CheckCreatedEvent | CheckCashedEvent | CheckCancelledEvent;

// =============================================================================
// Union Types
// =============================================================================

/**
 * All possible XRPL events
 */
export type XRPLEvent =
  | PaymentEvent
  | TrustlineEvent
  | NFTEvent
  | DEXEvent
  | AccountEvent
  | EscrowEvent
  | CheckEvent;

/**
 * Event payload union type
 */
export type XRPLEventPayload =
  | PaymentXRPPayload
  | PaymentIssuedPayload
  | TrustlineCreatedPayload
  | TrustlineModifiedPayload
  | TrustlineRemovedPayload
  | NFTMintedPayload
  | NFTBurnedPayload
  | NFTOfferCreatedPayload
  | NFTOfferAcceptedPayload
  | NFTOfferCancelledPayload
  | DEXOfferCreatedPayload
  | DEXOfferCancelledPayload
  | DEXOfferFilledPayload
  | DEXOfferPartiallyFilledPayload
  | AccountSettingsChangedPayload
  | AccountDeletedPayload
  | EscrowCreatedPayload
  | EscrowFinishedPayload
  | EscrowCancelledPayload
  | CheckCreatedPayload
  | CheckCashedPayload
  | CheckCancelledPayload;

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if event is a payment event
 */
export function isPaymentEvent(event: XRPLEvent): event is PaymentEvent {
  return PAYMENT_EVENT_TYPES.includes(event.event_type);
}

/**
 * Check if event is a trustline event
 */
export function isTrustlineEvent(event: XRPLEvent): event is TrustlineEvent {
  return TRUSTLINE_EVENT_TYPES.includes(event.event_type);
}

/**
 * Check if event is an NFT event
 */
export function isNFTEvent(event: XRPLEvent): event is NFTEvent {
  return NFT_EVENT_TYPES.includes(event.event_type);
}

/**
 * Check if event is a DEX event
 */
export function isDEXEvent(event: XRPLEvent): event is DEXEvent {
  return DEX_EVENT_TYPES.includes(event.event_type);
}

/**
 * Check if event is an account event
 */
export function isAccountEvent(event: XRPLEvent): event is AccountEvent {
  return ACCOUNT_EVENT_TYPES.includes(event.event_type);
}

// =============================================================================
// Webhook Delivery Types
// =============================================================================

/**
 * Webhook delivery envelope
 */
export interface WebhookDeliveryEnvelope<E extends XRPLEvent = XRPLEvent> {
  /**
   * Delivery ID (for idempotency)
   */
  delivery_id: string;

  /**
   * Webhook ID
   */
  webhook_id: string;

  /**
   * Delivery attempt number (1-indexed)
   */
  attempt: number;

  /**
   * Maximum attempts configured
   */
  max_attempts: number;

  /**
   * Timestamp of this delivery attempt
   */
  delivered_at: string;

  /**
   * The event being delivered
   */
  event: E;
}

/**
 * Webhook delivery status
 */
export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'retrying';

/**
 * Delivery log entry
 */
export interface DeliveryLogEntry {
  delivery_id: string;
  webhook_id: string;
  event_id: string;
  event_type: EventType;
  status: DeliveryStatus;
  attempt: number;
  max_attempts: number;
  http_status?: number;
  error_message?: string;
  duration_ms?: number;
  created_at: string;
  delivered_at?: string;
  next_retry_at?: string;
}
