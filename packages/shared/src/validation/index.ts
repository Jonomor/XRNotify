// =============================================================================
// @xrnotify/shared - Validation Schemas
// =============================================================================
// Zod schemas for runtime validation of API inputs
// =============================================================================

import { z } from 'zod';
import { EVENT_TYPES, ALL_API_KEY_SCOPES } from '../types/index';

// -----------------------------------------------------------------------------
// Common Validators
// -----------------------------------------------------------------------------

/**
 * XRPL account address validator (r-address format)
 */
export const xrplAddressSchema = z
  .string()
  .regex(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/, 'Invalid XRPL address format');

/**
 * UUID v4 validator
 */
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');

/**
 * ISO 8601 timestamp validator
 */
export const isoTimestampSchema = z
  .string()
  .datetime({ message: 'Invalid ISO 8601 timestamp' });

/**
 * URL validator (HTTPS required in production context)
 */
export const httpsUrlSchema = z
  .string()
  .url('Invalid URL format')
  .refine(
    (url) => url.startsWith('https://'),
    'URL must use HTTPS protocol'
  );

/**
 * URL validator (allows HTTP for development)
 */
export const webhookUrlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL exceeds maximum length of 2048 characters')
  .refine(
    (url) => url.startsWith('http://') || url.startsWith('https://'),
    'URL must use HTTP or HTTPS protocol'
  );

/**
 * Event type validator
 */
export const eventTypeSchema = z.enum(EVENT_TYPES, {
  errorMap: () => ({ message: `Invalid event type. Must be one of: ${EVENT_TYPES.join(', ')}` }),
});

/**
 * Event types array validator
 */
export const eventTypesArraySchema = z
  .array(eventTypeSchema)
  .min(1, 'At least one event type is required')
  .max(50, 'Maximum 50 event types allowed');

/**
 * API key scope validator
 */
export const apiKeyScopeSchema = z.enum(ALL_API_KEY_SCOPES as [string, ...string[]], {
  errorMap: () => ({ message: `Invalid scope. Must be one of: ${ALL_API_KEY_SCOPES.join(', ')}` }),
});

// -----------------------------------------------------------------------------
// Webhook Schemas
// -----------------------------------------------------------------------------

/**
 * Create webhook request body
 */
export const createWebhookSchema = z.object({
  url: webhookUrlSchema,
  event_types: eventTypesArraySchema,
  account_filters: z
    .array(xrplAddressSchema)
    .max(100, 'Maximum 100 account filters allowed')
    .optional()
    .default([]),
  description: z
    .string()
    .max(500, 'Description exceeds maximum length of 500 characters')
    .optional(),
  metadata: z
    .record(z.unknown())
    .optional(),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;

/**
 * Update webhook request body
 */
export const updateWebhookSchema = z.object({
  url: webhookUrlSchema.optional(),
  event_types: z.array(eventTypeSchema).max(50, 'Maximum 50 event types allowed').optional(),
  account_filters: z
    .array(xrplAddressSchema)
    .max(100, 'Maximum 100 account filters allowed')
    .optional(),
  is_active: z.boolean().optional(),
  description: z
    .string()
    .max(500, 'Description exceeds maximum length of 500 characters')
    .optional(),
  metadata: z
    .record(z.unknown())
    .optional(),
});

export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;

/**
 * List webhooks query parameters
 */
export const listWebhooksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  is_active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  event_type: eventTypeSchema.optional(),
});

export type ListWebhooksQuery = z.infer<typeof listWebhooksQuerySchema>;

// -----------------------------------------------------------------------------
// API Key Schemas
// -----------------------------------------------------------------------------

/**
 * Create API key request body
 */
export const createApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name exceeds maximum length of 100 characters'),
  scopes: z
    .array(apiKeyScopeSchema)
    .min(1, 'At least one scope is required')
    .default(['webhooks:read', 'webhooks:write', 'deliveries:read']),
  expires_at: isoTimestampSchema.optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

/**
 * Update API key request body
 */
export const updateApiKeySchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100, 'Name exceeds maximum length of 100 characters')
    .optional(),
  scopes: z
    .array(apiKeyScopeSchema)
    .min(1, 'At least one scope is required')
    .optional(),
  is_active: z.boolean().optional(),
});

export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;

/**
 * List API keys query parameters
 */
export const listApiKeysQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  is_active: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

export type ListApiKeysQuery = z.infer<typeof listApiKeysQuerySchema>;

// -----------------------------------------------------------------------------
// Delivery Schemas
// -----------------------------------------------------------------------------

/**
 * Delivery status enum
 */
export const deliveryStatusSchema = z.enum([
  'pending',
  'processing',
  'delivered',
  'failed',
  'retrying',
  'dead_letter',
]);

export type DeliveryStatusInput = z.infer<typeof deliveryStatusSchema>;

/**
 * List deliveries query parameters
 */
export const listDeliveriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  webhook_id: uuidSchema.optional(),
  event_type: eventTypeSchema.optional(),
  status: deliveryStatusSchema.optional(),
  from: isoTimestampSchema.optional(),
  to: isoTimestampSchema.optional(),
});

export type ListDeliveriesQuery = z.infer<typeof listDeliveriesQuerySchema>;

// -----------------------------------------------------------------------------
// Replay Schemas
// -----------------------------------------------------------------------------

/**
 * Replay events request body
 */
export const replayEventsSchema = z.object({
  webhook_id: uuidSchema,
  event_ids: z
    .array(z.string())
    .min(1, 'At least one event ID is required')
    .max(100, 'Maximum 100 events can be replayed at once')
    .optional(),
  start_date: isoTimestampSchema.optional(),
  end_date: isoTimestampSchema.optional(),
  event_type: z.string().optional(),
  status: z.enum(['failed', 'dead_letter']).optional(),
});

export type ReplayEventsInput = z.infer<typeof replayEventsSchema>;

/**
 * Replay by time range request body
 */
export const replayTimeRangeSchema = z.object({
  webhook_id: uuidSchema,
  from: isoTimestampSchema,
  to: isoTimestampSchema,
  event_types: eventTypesArraySchema.optional(),
});

export type ReplayTimeRangeInput = z.infer<typeof replayTimeRangeSchema>;

// -----------------------------------------------------------------------------
// Event Schemas
// -----------------------------------------------------------------------------

/**
 * List events query parameters
 */
export const listEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  event_type: eventTypeSchema.optional(),
  account: xrplAddressSchema.optional(),
  from: isoTimestampSchema.optional(),
  to: isoTimestampSchema.optional(),
  ledger_index_min: z.coerce.number().int().min(0).optional(),
  ledger_index_max: z.coerce.number().int().min(0).optional(),
});

export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;

// -----------------------------------------------------------------------------
// Tenant / Account Schemas
// -----------------------------------------------------------------------------

/**
 * Update tenant settings request body
 */
export const updateTenantSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100, 'Name exceeds maximum length of 100 characters')
    .optional(),
  settings: z
    .object({
      webhook_timeout_ms: z.number().int().min(1000).max(60000).optional(),
    })
    .optional(),
});

export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

// -----------------------------------------------------------------------------
// Authentication Schemas
// -----------------------------------------------------------------------------

/**
 * Login request body
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Register request body
 */
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name exceeds maximum length of 100 characters'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// -----------------------------------------------------------------------------
// Pagination Schemas
// -----------------------------------------------------------------------------

/**
 * Standard pagination query parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Cursor-based pagination query parameters
 */
export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CursorPaginationInput = z.infer<typeof cursorPaginationSchema>;

// -----------------------------------------------------------------------------
// ID Parameter Schemas
// -----------------------------------------------------------------------------

/**
 * Path parameter with ID
 */
export const idParamSchema = z.object({
  id: uuidSchema,
});

export type IdParam = z.infer<typeof idParamSchema>;

// -----------------------------------------------------------------------------
// Validation Helper Functions
// -----------------------------------------------------------------------------

/**
 * Validate and parse input, throwing on error
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Parsed and validated data
 * @throws ZodError if validation fails
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Validate and parse input, returning result object
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Object with success flag and data or error
 */
export function validateSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Format Zod errors into a user-friendly object
 * 
 * @param error - Zod error object
 * @returns Object mapping field paths to error messages
 */
export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(issue.message);
  }
  
  return formatted;
}

/**
 * Get first error message from Zod error
 * 
 * @param error - Zod error object
 * @returns First error message string
 */
export function getFirstZodError(error: z.ZodError): string {
  const firstIssue = error.issues[0];
  if (!firstIssue) {
    return 'Validation failed';
  }
  
  const path = firstIssue.path.join('.');
  return path ? `${path}: ${firstIssue.message}` : firstIssue.message;
}

// -----------------------------------------------------------------------------
// Re-export Zod for convenience
// -----------------------------------------------------------------------------

export { z };
