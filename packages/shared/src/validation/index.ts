/**
 * @fileoverview XRNotify Validation Module Index
 * Re-exports all validation schemas and utilities.
 *
 * @packageDocumentation
 * @module @xrnotify/shared/validation
 */

export {
  // Common Schemas
  UUIDSchema,
  ISODateTimeSchema,
  ISODateSchema,
  UnixTimestampSchema,
  PositiveIntSchema,
  NonNegativeIntSchema,
  XRPLAddressSchema,
  TxHashSchema,
  LedgerIndexSchema,
  XRPLNetworkSchema,
  CurrencyCodeSchema,
  AmountStringSchema,
  XRPAmountSchema,
  IssuedCurrencyAmountSchema,
  CurrencyAmountSchema,

  // Pagination & Sorting
  PaginationSchema,
  SortDirectionSchema,
  DateRangeSchema,

  // Event Type Schemas
  EventTypeSchema,
  EventTypesArraySchema,
  EventIdSchema,

  // URL Validation
  HTTPSURLSchema,
  HTTPURLSchema,
  WebhookURLSchema,

  // API Key Schemas
  APIKeyScopeSchema,
  APIKeyScopesArraySchema,
  CreateAPIKeyRequestSchema,
  RevokeAPIKeyRequestSchema,

  // Webhook Schemas
  WebhookFilterSchema,
  CreateWebhookRequestSchema,
  UpdateWebhookRequestSchema,
  ListWebhooksQuerySchema,
  TestWebhookRequestSchema,

  // Delivery Schemas
  DeliveryStatusSchema,
  ListDeliveriesQuerySchema,
  GetDeliveryStatsQuerySchema,

  // Replay Schemas
  ReplayEventsRequestSchema,

  // Events Query Schemas
  ListEventsQuerySchema,

  // Session/Auth Schemas
  EmailSchema,
  PasswordSchema,
  StrongPasswordSchema,
  LoginRequestSchema,
  RefreshTokenRequestSchema,
  RegisterRequestSchema,

  // Billing Schemas
  PlanTypeSchema,
  BillingPeriodSchema,
  CreateCheckoutSessionRequestSchema,

  // Secret/Key Validation
  WebhookSecretSchema,
  APIKeyFormatSchema,

  // Health Check Schemas
  HealthStatusSchema,
  ServiceStatusSchema,

  // Inferred Types
  type CreateAPIKeyRequest,
  type RevokeAPIKeyRequest,
  type CreateWebhookRequest,
  type UpdateWebhookRequest,
  type ListWebhooksQuery,
  type TestWebhookRequest,
  type ListDeliveriesQuery,
  type GetDeliveryStatsQuery,
  type ReplayEventsRequest,
  type ListEventsQuery,
  type LoginRequest,
  type RefreshTokenRequest,
  type RegisterRequest,
  type CreateCheckoutSessionRequest,
  type WebhookFilter,
  type Pagination,
  type DateRange,

  // Validation Helpers
  validate,
  safeValidate,
  formatZodErrors,
  createValidationErrorResponse,
} from './schemas.js';

// Re-export Zod for convenience
export { z } from 'zod';
