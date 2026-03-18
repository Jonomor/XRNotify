/**
 * @fileoverview XRNotify Validation Schemas
 * Zod schemas for validating API requests and data structures.
 *
 * @packageDocumentation
 * @module @xrnotify/shared/validation/schemas
 */

import { z } from 'zod';
import { ALL_EVENT_TYPES, EventType } from '../types/event.js';
import { ALL_API_KEY_SCOPES, type APIKeyScope } from '../types/api.js';

// =============================================================================
// Common Schemas
// =============================================================================

/**
 * UUID v4 format
 */
export const UUIDSchema = z.string().uuid();

/**
 * ISO 8601 date-time string
 */
export const ISODateTimeSchema = z.string().datetime({ offset: true });

/**
 * ISO 8601 date string (YYYY-MM-DD)
 */
export const ISODateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * Unix timestamp (seconds)
 */
export const UnixTimestampSchema = z.number().int().positive();

/**
 * Positive integer
 */
export const PositiveIntSchema = z.number().int().positive();

/**
 * Non-negative integer
 */
export const NonNegativeIntSchema = z.number().int().nonnegative();

/**
 * XRPL account address (r-address)
 */
export const XRPLAddressSchema = z
  .string()
  .regex(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/, 'Invalid XRPL address format');

/**
 * XRPL transaction hash
 */
export const TxHashSchema = z
  .string()
  .regex(/^[A-F0-9]{64}$/i, 'Invalid transaction hash format');

/**
 * XRPL ledger index
 */
export const LedgerIndexSchema = z.number().int().positive();

/**
 * XRPL network
 */
export const XRPLNetworkSchema = z.enum(['mainnet', 'testnet', 'devnet']);

/**
 * Currency code (3 chars or 40 hex chars)
 */
export const CurrencyCodeSchema = z
  .string()
  .regex(/^[A-Z0-9]{3}$|^[A-F0-9]{40}$/i, 'Invalid currency code format');

/**
 * Decimal amount string
 */
export const AmountStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'Invalid amount format');

/**
 * XRP amount (in XRP, not drops)
 */
export const XRPAmountSchema = z.object({
  currency: z.literal('XRP'),
  value: AmountStringSchema,
});

/**
 * Issued currency amount
 */
export const IssuedCurrencyAmountSchema = z.object({
  currency: CurrencyCodeSchema,
  value: AmountStringSchema,
  issuer: XRPLAddressSchema,
});

/**
 * Currency amount (XRP or issued)
 */
export const CurrencyAmountSchema = z.union([
  XRPAmountSchema,
  IssuedCurrencyAmountSchema,
]);

// =============================================================================
// Pagination & Sorting
// =============================================================================

/**
 * Pagination parameters
 */
export const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * Sort direction
 */
export const SortDirectionSchema = z.enum(['asc', 'desc']);

/**
 * Date range filter
 */
export const DateRangeSchema = z
  .object({
    from: ISODateTimeSchema.optional(),
    to: ISODateTimeSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.from && data.to) {
        return new Date(data.from) <= new Date(data.to);
      }
      return true;
    },
    { message: "'from' must be before or equal to 'to'" }
  );

// =============================================================================
// Event Type Schemas
// =============================================================================

/**
 * Event type enum
 */
export const EventTypeSchema = z.enum(ALL_EVENT_TYPES as [string, ...string[]]);

/**
 * Array of event types (1-20 items)
 */
export const EventTypesArraySchema = z
  .array(EventTypeSchema)
  .min(1, 'At least one event type is required')
  .max(20, 'Maximum 20 event types allowed')
  .refine(
    (items) => new Set(items).size === items.length,
    { message: 'Duplicate event types are not allowed' }
  );

/**
 * Event ID format: xrpl:<ledger_index>:<tx_hash>:<event_type>[:<sub_index>]
 */
export const EventIdSchema = z
  .string()
  .regex(
    /^xrpl:\d+:[A-F0-9]{64}:[a-z]+\.[a-z_]+(?::\d+)?$/i,
    'Invalid event ID format'
  );

// =============================================================================
// URL Validation
// =============================================================================

/**
 * HTTPS URL (required for webhooks in production)
 */
export const HTTPSURLSchema = z
  .string()
  .url('Invalid URL format')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'URL must use HTTPS protocol' }
  );

/**
 * HTTP or HTTPS URL (for development)
 */
export const HTTPURLSchema = z
  .string()
  .url('Invalid URL format')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'URL must use HTTP or HTTPS protocol' }
  );

/**
 * Webhook URL with additional validation
 */
export const WebhookURLSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL must be 2048 characters or less')
  .refine(
    (url) => {
      try {
        const parsed = new URL(url);
        // Must be HTTP or HTTPS
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          return false;
        }
        // No localhost in production (checked separately)
        // No path traversal
        if (parsed.pathname.includes('..')) {
          return false;
        }
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid webhook URL' }
  );

// =============================================================================
// API Key Schemas
// =============================================================================

/**
 * API key scope
 */
export const APIKeyScopeSchema = z.enum(
  ALL_API_KEY_SCOPES as [APIKeyScope, ...APIKeyScope[]]
);

/**
 * Array of API key scopes
 */
export const APIKeyScopesArraySchema = z
  .array(APIKeyScopeSchema)
  .min(1, 'At least one scope is required')
  .refine(
    (items) => new Set(items).size === items.length,
    { message: 'Duplicate scopes are not allowed' }
  );

/**
 * Create API key request
 */
export const CreateAPIKeyRequestSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .trim(),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .trim()
    .optional(),
  scopes: APIKeyScopesArraySchema.optional(),
  expires_in_days: z
    .number()
    .int()
    .min(1)
    .max(365)
    .nullable()
    .optional(),
});

/**
 * Revoke API key request
 */
export const RevokeAPIKeyRequestSchema = z.object({
  revoke_reason: z
    .string()
    .max(500, 'Reason must be 500 characters or less')
    .trim()
    .optional(),
});

// =============================================================================
// Webhook Schemas
// =============================================================================

/**
 * Webhook filter
 */
export const WebhookFilterSchema = z.object({
  accounts: z
    .array(XRPLAddressSchema)
    .max(100, 'Maximum 100 accounts allowed')
    .optional(),
  network: XRPLNetworkSchema.optional(),
  min_xrp_amount: AmountStringSchema.optional(),
  expression: z
    .string()
    .max(1000, 'Expression must be 1000 characters or less')
    .optional(),
});

/**
 * Create webhook request
 */
export const CreateWebhookRequestSchema = z.object({
  url: WebhookURLSchema,
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .trim()
    .optional(),
  events: EventTypesArraySchema,
  filter: WebhookFilterSchema.optional(),
  active: z.boolean().default(true),
});

/**
 * Update webhook request
 */
export const UpdateWebhookRequestSchema = z
  .object({
    url: WebhookURLSchema.optional(),
    description: z
      .string()
      .max(500, 'Description must be 500 characters or less')
      .trim()
      .nullable()
      .optional(),
    events: EventTypesArraySchema.optional(),
    filter: WebhookFilterSchema.nullable().optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
  );

/**
 * List webhooks query params
 */
export const ListWebhooksQuerySchema = PaginationSchema.extend({
  active: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
});

/**
 * Test webhook request
 */
export const TestWebhookRequestSchema = z.object({
  event_type: EventTypeSchema.optional().default(EventType.PAYMENT_XRP),
});

// =============================================================================
// Delivery Schemas
// =============================================================================

/**
 * Delivery status
 */
export const DeliveryStatusSchema = z.enum([
  'pending',
  'delivered',
  'failed',
  'retrying',
]);

/**
 * List deliveries query params
 */
export const ListDeliveriesQuerySchema = PaginationSchema.merge(DateRangeSchema).extend({
  webhook_id: UUIDSchema.optional(),
  event_type: EventTypeSchema.optional(),
  status: DeliveryStatusSchema.optional(),
  event_id: EventIdSchema.optional(),
});

/**
 * Get delivery statistics query params
 */
export const GetDeliveryStatsQuerySchema = DateRangeSchema.extend({
  webhook_id: UUIDSchema.optional(),
});

// =============================================================================
// Replay Schemas
// =============================================================================

/**
 * Replay events request
 */
export const ReplayEventsRequestSchema = z
  .object({
    webhook_ids: z
      .array(UUIDSchema)
      .max(50, 'Maximum 50 webhooks allowed')
      .optional(),
    event_types: EventTypesArraySchema.optional(),
    accounts: z
      .array(XRPLAddressSchema)
      .max(100, 'Maximum 100 accounts allowed')
      .optional(),
    from: ISODateTimeSchema,
    to: ISODateTimeSchema,
    event_ids: z
      .array(EventIdSchema)
      .max(1000, 'Maximum 1000 event IDs allowed')
      .optional(),
    max_events: z
      .number()
      .int()
      .min(1)
      .max(100000)
      .default(10000),
    dry_run: z.boolean().default(false),
  })
  .refine(
    (data) => new Date(data.from) <= new Date(data.to),
    { message: "'from' must be before or equal to 'to'" }
  )
  .refine(
    (data) => {
      const from = new Date(data.from);
      const to = new Date(data.to);
      const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 30;
    },
    { message: 'Date range must be 30 days or less' }
  );

// =============================================================================
// Events Query Schemas
// =============================================================================

/**
 * List events query params
 */
export const ListEventsQuerySchema = PaginationSchema.merge(DateRangeSchema).extend({
  event_type: EventTypeSchema.optional(),
  account: XRPLAddressSchema.optional(),
  tx_hash: TxHashSchema.optional(),
  ledger_index: z.coerce.number().int().positive().optional(),
  ledger_index_min: z.coerce.number().int().positive().optional(),
  ledger_index_max: z.coerce.number().int().positive().optional(),
});

// =============================================================================
// Session/Auth Schemas
// =============================================================================

/**
 * Email address
 */
export const EmailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email must be 255 characters or less')
  .toLowerCase()
  .trim();

/**
 * Password (for login)
 */
export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be 128 characters or less');

/**
 * Strong password (for registration)
 */
export const StrongPasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(128, 'Password must be 128 characters or less')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

/**
 * Login request
 */
export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});

/**
 * Refresh token request
 */
export const RefreshTokenRequestSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

/**
 * Registration request
 */
export const RegisterRequestSchema = z.object({
  email: EmailSchema,
  password: StrongPasswordSchema,
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .trim()
    .optional(),
});

// =============================================================================
// Billing Schemas
// =============================================================================

/**
 * Plan type
 */
export const PlanTypeSchema = z.enum(['free', 'starter', 'pro', 'enterprise']);

/**
 * Billing period
 */
export const BillingPeriodSchema = z.enum(['monthly', 'yearly']);

/**
 * Create checkout session request
 */
export const CreateCheckoutSessionRequestSchema = z.object({
  plan: PlanTypeSchema.refine((val) => val !== 'free', {
    message: 'Cannot checkout free plan',
  }),
  billing_period: BillingPeriodSchema,
  success_url: HTTPSURLSchema,
  cancel_url: HTTPSURLSchema,
});

// =============================================================================
// Webhook Secret Validation
// =============================================================================

/**
 * Webhook secret format
 */
export const WebhookSecretSchema = z
  .string()
  .regex(/^whsec_[a-f0-9]{64}$/, 'Invalid webhook secret format');

/**
 * API key format
 */
export const APIKeyFormatSchema = z
  .string()
  .regex(/^xrn_[A-Za-z0-9_-]{43}$/, 'Invalid API key format');

// =============================================================================
// Health Check Schemas
// =============================================================================

/**
 * Health status
 */
export const HealthStatusSchema = z.enum(['healthy', 'degraded', 'unhealthy']);

/**
 * Service status
 */
export const ServiceStatusSchema = z.object({
  status: z.enum(['connected', 'disconnected', 'error']),
  latency_ms: z.number().optional(),
  error: z.string().optional(),
});

// =============================================================================
// Type Exports
// =============================================================================

// Infer types from schemas
export type CreateAPIKeyRequest = z.infer<typeof CreateAPIKeyRequestSchema>;
export type RevokeAPIKeyRequest = z.infer<typeof RevokeAPIKeyRequestSchema>;
export type CreateWebhookRequest = z.infer<typeof CreateWebhookRequestSchema>;
export type UpdateWebhookRequest = z.infer<typeof UpdateWebhookRequestSchema>;
export type ListWebhooksQuery = z.infer<typeof ListWebhooksQuerySchema>;
export type TestWebhookRequest = z.infer<typeof TestWebhookRequestSchema>;
export type ListDeliveriesQuery = z.infer<typeof ListDeliveriesQuerySchema>;
export type GetDeliveryStatsQuery = z.infer<typeof GetDeliveryStatsQuerySchema>;
export type ReplayEventsRequest = z.infer<typeof ReplayEventsRequestSchema>;
export type ListEventsQuery = z.infer<typeof ListEventsQuerySchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type CreateCheckoutSessionRequest = z.infer<typeof CreateCheckoutSessionRequestSchema>;
export type WebhookFilter = z.infer<typeof WebhookFilterSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type DateRange = z.infer<typeof DateRangeSchema>;

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate data against a schema and return typed result
 */
export function validate<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data);
}

/**
 * Safely validate data and return result object
 */
export function safeValidate<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Format Zod errors into a user-friendly format
 */
export function formatZodErrors(
  error: z.ZodError
): Array<{ path: string; message: string }> {
  return error.errors.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(error: z.ZodError): {
  error: {
    code: string;
    message: string;
    details: {
      validation_errors: Array<{ path: string; message: string }>;
    };
  };
} {
  return {
    error: {
      code: 'validation_error',
      message: 'Request validation failed',
      details: {
        validation_errors: formatZodErrors(error),
      },
    },
  };
}
