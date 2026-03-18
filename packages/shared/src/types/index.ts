/**
 * @fileoverview XRNotify Types Index
 * Re-exports all type definitions.
 *
 * @packageDocumentation
 * @module @xrnotify/shared/types
 */

// =============================================================================
// Event Types
// =============================================================================

export {
  // Event Type Constants
  EventType,
  ALL_EVENT_TYPES,
  PAYMENT_EVENT_TYPES,
  TRUSTLINE_EVENT_TYPES,
  NFT_EVENT_TYPES,
  DEX_EVENT_TYPES,
  ACCOUNT_EVENT_TYPES,

  // Currency Types
  type XRPAmount,
  type IssuedCurrencyAmount,
  type CurrencyAmount,
  isXRPAmount,
  isIssuedCurrencyAmount,

  // Common Types
  type TransactionResult,
  type XRPLNetwork,

  // Base Event
  type BaseEvent,

  // Payment Events
  type PaymentXRPPayload,
  type PaymentIssuedPayload,
  type PaymentXRPEvent,
  type PaymentIssuedEvent,
  type PaymentEvent,

  // Trustline Events
  type TrustlinePayload,
  type TrustlineCreatedPayload,
  type TrustlineModifiedPayload,
  type TrustlineRemovedPayload,
  type TrustlineCreatedEvent,
  type TrustlineModifiedEvent,
  type TrustlineRemovedEvent,
  type TrustlineEvent,

  // NFT Events
  type NFTokenInfo,
  type NFTMintedPayload,
  type NFTBurnedPayload,
  type NFTOfferInfo,
  type NFTOfferCreatedPayload,
  type NFTOfferAcceptedPayload,
  type NFTOfferCancelledPayload,
  type NFTMintedEvent,
  type NFTBurnedEvent,
  type NFTOfferCreatedEvent,
  type NFTOfferAcceptedEvent,
  type NFTOfferCancelledEvent,
  type NFTEvent,

  // DEX Events
  type DEXOfferInfo,
  type DEXOfferCreatedPayload,
  type DEXOfferCancelledPayload,
  type DEXTradeExecution,
  type DEXOfferFilledPayload,
  type DEXOfferPartiallyFilledPayload,
  type DEXOfferCreatedEvent,
  type DEXOfferCancelledEvent,
  type DEXOfferFilledEvent,
  type DEXOfferPartiallyFilledEvent,
  type DEXEvent,

  // Account Events
  type AccountSettings,
  type AccountSettingsChangedPayload,
  type AccountDeletedPayload,
  type AccountSettingsChangedEvent,
  type AccountDeletedEvent,
  type AccountEvent,

  // Escrow Events
  type EscrowInfo,
  type EscrowCreatedPayload,
  type EscrowFinishedPayload,
  type EscrowCancelledPayload,
  type EscrowCreatedEvent,
  type EscrowFinishedEvent,
  type EscrowCancelledEvent,
  type EscrowEvent,

  // Check Events
  type CheckInfo,
  type CheckCreatedPayload,
  type CheckCashedPayload,
  type CheckCancelledPayload,
  type CheckCreatedEvent,
  type CheckCashedEvent,
  type CheckCancelledEvent,
  type CheckEvent,

  // Union Types
  type XRPLEvent,
  type XRPLEventPayload,

  // Type Guards
  isPaymentEvent,
  isTrustlineEvent,
  isNFTEvent,
  isDEXEvent,
  isAccountEvent,

  // Webhook Delivery Types
  type WebhookDeliveryEnvelope,
  type DeliveryStatus,
  type DeliveryLogEntry,
} from './event.js';

// =============================================================================
// API Types
// =============================================================================

export {
  // Common Types
  type APIError,
  type APIResponse,
  type PaginatedResponse,
  type PaginationParams,
  type SortDirection,
  type SortParams,
  type DateRangeFilter,

  // Health & Status
  type HealthStatus,
  type HealthCheckResponse,
  type ReadinessCheckResponse,
  type ServiceStatus,

  // Authentication
  type APIKey,
  type APIKeyScope,
  ALL_API_KEY_SCOPES,
  DEFAULT_API_KEY_SCOPES,
  type CreateAPIKeyRequest,
  type CreateAPIKeyResponse,
  type ListAPIKeysResponse,
  type RevokeAPIKeyRequest,

  // Sessions
  type LoginRequest,
  type LoginResponse,
  type RefreshTokenRequest,
  type RefreshTokenResponse,
  type UserInfo,
  type CurrentUserResponse,
  type TenantInfo,
  type UsageInfo,

  // Webhooks
  type Webhook,
  type WebhookFilter,
  type WebhookDeliveryStats,
  type CreateWebhookRequest,
  type CreateWebhookResponse,
  type UpdateWebhookRequest,
  type UpdateWebhookResponse,
  type ListWebhooksParams,
  type ListWebhooksResponse,
  type GetWebhookResponse,
  type DeleteWebhookResponse,
  type RotateWebhookSecretResponse,
  type TestWebhookRequest,
  type TestWebhookResponse,

  // Deliveries
  type Delivery,
  type ListDeliveriesParams,
  type ListDeliveriesResponse,
  type GetDeliveryResponse,
  type DeliveryStatistics,
  type GetDeliveryStatsParams,
  type GetDeliveryStatsResponse,

  // Replay
  type ReplayEventsRequest,
  type ReplayEventsResponse,
  type GetReplayStatusResponse,

  // Events
  type ListEventsParams,
  type ListEventsResponse,
  type GetEventResponse,

  // Billing & Plans
  type PlanType,
  type Plan,
  PLANS,
  type Subscription,
  type BillingInfo,
  type Invoice,
  type GetBillingResponse,
  type CreateCheckoutSessionRequest,
  type CreateCheckoutSessionResponse,
  type CreateBillingPortalSessionResponse,

  // WebSocket Streaming
  type WSMessageType,
  type WSSubscribeMessage,
  type WSUnsubscribeMessage,
  type WSEventMessage,
  type WSSubscribedMessage,
  type WSUnsubscribedMessage,
  type WSErrorMessage,
  type WSPingMessage,
  type WSPongMessage,
  type WSMessage,

  // Error Codes
  ErrorCode,
  type ErrorCode as ErrorCodeType,
} from './api.js';
