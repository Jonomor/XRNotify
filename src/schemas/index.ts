/**
 * XRNotify API Schemas
 * Zod validation schemas for request/response validation
 */

import { z } from 'zod';

// ============================================
// Common Schemas
// ============================================

export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const timestampSchema = z.string().datetime();

// ============================================
// Event Types
// ============================================

export const eventTypeSchema = z.enum([
  'payment_received',
  'payment_sent',
  'nft_minted',
  'nft_burned',
  'nft_offer_created',
  'nft_offer_accepted',
  'trustline_created',
  'trustline_modified',
  'trustline_removed',
  'dex_order_created',
  'dex_order_cancelled',
  'dex_order_filled',
  'escrow_created',
  'escrow_finished',
  'escrow_cancelled',
  'account_created',
  'account_deleted',
  'check_created',
  'check_cashed',
  'check_cancelled',
]);

export type EventType = z.infer<typeof eventTypeSchema>;

// ============================================
// Webhook Schemas
// ============================================

export const createWebhookSchema = z.object({
  url: z.string().url().startsWith('https://', {
    message: 'Webhook URL must use HTTPS',
  }),
  secret: z.string().min(16).max(128).optional(),
  event_filter: z.array(eventTypeSchema).min(1).max(20),
  description: z.string().max(255).optional(),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;

export const updateWebhookSchema = z.object({
  url: z.string().url().startsWith('https://').optional(),
  event_filter: z.array(eventTypeSchema).min(1).max(20).optional(),
  description: z.string().max(255).optional(),
  active: z.boolean().optional(),
});

export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;

export const webhookResponseSchema = z.object({
  id: z.number(),
  owner_id: uuidSchema,
  url: z.string().url(),
  event_filter: z.array(eventTypeSchema),
  description: z.string().nullable(),
  active: z.boolean(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type WebhookResponse = z.infer<typeof webhookResponseSchema>;

// ============================================
// API Key Schemas
// ============================================

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(255).optional(),
  expires_in_days: z.number().min(1).max(365).optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

export const apiKeyResponseSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  description: z.string().nullable(),
  key_prefix: z.string(),
  created_at: timestampSchema,
  expires_at: timestampSchema.nullable(),
  last_used_at: timestampSchema.nullable(),
});

export type ApiKeyResponse = z.infer<typeof apiKeyResponseSchema>;

// New API key response includes the full key (only shown once)
export const newApiKeyResponseSchema = apiKeyResponseSchema.extend({
  key: z.string(),
});

export type NewApiKeyResponse = z.infer<typeof newApiKeyResponseSchema>;

// ============================================
// Delivery Schemas
// ============================================

export const deliveryQuerySchema = paginationSchema.extend({
  status: z.enum(['success', 'retry', 'failed']).optional(),
  webhook_id: z.coerce.number().optional(),
  from: timestampSchema.optional(),
  to: timestampSchema.optional(),
});

export type DeliveryQuery = z.infer<typeof deliveryQuerySchema>;

export const deliveryResponseSchema = z.object({
  id: z.number(),
  webhook_id: z.number(),
  event_hash: z.string(),
  status: z.enum(['success', 'retry', 'failed']),
  attempts: z.number(),
  latency_ms: z.number().nullable(),
  last_attempt: timestampSchema,
});

export type DeliveryResponse = z.infer<typeof deliveryResponseSchema>;

// ============================================
// Replay Schemas
// ============================================

export const replayRequestSchema = z.object({
  start: timestampSchema,
  end: timestampSchema,
  event_types: z.array(eventTypeSchema).optional(),
  webhook_ids: z.array(z.number()).optional(),
});

export type ReplayRequest = z.infer<typeof replayRequestSchema>;

export const replayResponseSchema = z.object({
  queued_count: z.number(),
  message: z.string(),
});

export type ReplayResponse = z.infer<typeof replayResponseSchema>;

// ============================================
// Health & Stats Schemas
// ============================================

export const healthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  version: z.string(),
  uptime: z.number(),
  services: z.object({
    database: z.object({
      healthy: z.boolean(),
      latency_ms: z.number(),
    }),
    redis: z.object({
      healthy: z.boolean(),
      latency_ms: z.number(),
    }),
    xrpl: z.object({
      connected: z.boolean(),
      last_ledger: z.number().optional(),
    }).optional(),
  }),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const statsResponseSchema = z.object({
  webhooks: z.object({
    total: z.number(),
    active: z.number(),
  }),
  deliveries: z.object({
    total_24h: z.number(),
    success_rate: z.number(),
    avg_latency_ms: z.number(),
  }),
  events: z.object({
    total_24h: z.number(),
    by_type: z.record(z.number()),
  }),
});

export type StatsResponse = z.infer<typeof statsResponseSchema>;

// ============================================
// Error Schemas
// ============================================

export const errorResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
  hint: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
