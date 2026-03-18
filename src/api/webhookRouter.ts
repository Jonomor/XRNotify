/**
 * XRNotify Webhook Router
 * CRUD operations for webhook subscriptions
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { db } from '../core/db.js';
import { createChildLogger } from '../core/logger.js';
import { activeWebhooks } from '../core/metrics.js';
import {
  createWebhookSchema,
  updateWebhookSchema,
  type CreateWebhookInput,
  type UpdateWebhookInput,
} from '../schemas/index.js';

const log = createChildLogger('webhook-router');

// ============================================
// Types
// ============================================

interface WebhookParams {
  id: string;
}

interface WebhookRow {
  id: number;
  owner_id: string;
  url: string;
  secret: string;
  event_filter: string[];
  description: string | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// Helper Functions
// ============================================

function generateSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

function formatWebhookResponse(row: WebhookRow) {
  return {
    id: row.id,
    owner_id: row.owner_id,
    url: row.url,
    event_filter: row.event_filter,
    description: row.description,
    active: row.active,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

// ============================================
// Route Handlers
// ============================================

async function createWebhook(
  request: FastifyRequest<{ Body: CreateWebhookInput }>,
  reply: FastifyReply
) {
  const validation = createWebhookSchema.safeParse(request.body);
  
  if (!validation.success) {
    return reply.status(400).send({
      code: 400,
      message: 'Invalid request body',
      details: validation.error.flatten(),
    });
  }
  
  const { url, secret: providedSecret, event_filter, description } = validation.data;
  const ownerId = request.user?.id || 'anonymous'; // From auth middleware
  const secret = providedSecret || generateSecret();
  
  try {
    // Validate URL is reachable (basic DNS check)
    const urlObj = new URL(url);
    if (!['https:'].includes(urlObj.protocol)) {
      return reply.status(400).send({
        code: 400,
        message: 'Webhook URL must use HTTPS',
      });
    }
    
    // Check for duplicate URL for this owner
    const existing = await db.query(
      'SELECT id FROM webhooks WHERE owner_id = $1 AND url = $2 AND active = true',
      [ownerId, url]
    );
    
    if (existing.rows.length > 0) {
      return reply.status(409).send({
        code: 409,
        message: 'A webhook with this URL already exists',
        hint: 'Update the existing webhook or delete it first',
      });
    }
    
    // Create webhook
    const result = await db.query<WebhookRow>(
      `INSERT INTO webhooks (owner_id, url, secret, event_filter, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [ownerId, url, secret, event_filter, description || null]
    );
    
    const webhook = result.rows[0];
    
    log.info('Webhook created', {
      id: webhook.id,
      owner_id: ownerId,
      url,
      events: event_filter,
    });
    
    // Update metrics
    const countResult = await db.query('SELECT COUNT(*) FROM webhooks WHERE active = true');
    activeWebhooks.set(parseInt(countResult.rows[0].count, 10));
    
    // Return webhook with secret (only shown on creation)
    return reply.status(201).send({
      ...formatWebhookResponse(webhook),
      secret, // Include secret only on creation
    });
    
  } catch (error) {
    log.error('Failed to create webhook', { error: (error as Error).message });
    return reply.status(500).send({
      code: 500,
      message: 'Failed to create webhook',
    });
  }
}

async function listWebhooks(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const ownerId = request.user?.id || 'anonymous';
  
  try {
    const result = await db.query<WebhookRow>(
      `SELECT * FROM webhooks
       WHERE owner_id = $1
       ORDER BY created_at DESC`,
      [ownerId]
    );
    
    return reply.send({
      webhooks: result.rows.map(formatWebhookResponse),
      total: result.rows.length,
    });
    
  } catch (error) {
    log.error('Failed to list webhooks', { error: (error as Error).message });
    return reply.status(500).send({
      code: 500,
      message: 'Failed to list webhooks',
    });
  }
}

async function getWebhook(
  request: FastifyRequest<{ Params: WebhookParams }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const ownerId = request.user?.id || 'anonymous';
  
  try {
    const result = await db.query<WebhookRow>(
      'SELECT * FROM webhooks WHERE id = $1 AND owner_id = $2',
      [parseInt(id, 10), ownerId]
    );
    
    if (result.rows.length === 0) {
      return reply.status(404).send({
        code: 404,
        message: 'Webhook not found',
      });
    }
    
    return reply.send(formatWebhookResponse(result.rows[0]));
    
  } catch (error) {
    log.error('Failed to get webhook', { error: (error as Error).message });
    return reply.status(500).send({
      code: 500,
      message: 'Failed to get webhook',
    });
  }
}

async function updateWebhook(
  request: FastifyRequest<{ Params: WebhookParams; Body: UpdateWebhookInput }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const ownerId = request.user?.id || 'anonymous';
  
  const validation = updateWebhookSchema.safeParse(request.body);
  
  if (!validation.success) {
    return reply.status(400).send({
      code: 400,
      message: 'Invalid request body',
      details: validation.error.flatten(),
    });
  }
  
  const updates = validation.data;
  
  if (Object.keys(updates).length === 0) {
    return reply.status(400).send({
      code: 400,
      message: 'No update fields provided',
    });
  }
  
  try {
    // Build dynamic update query
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let paramIndex = 1;
    
    if (updates.url !== undefined) {
      setClauses.push(`url = $${paramIndex++}`);
      values.push(updates.url);
    }
    if (updates.event_filter !== undefined) {
      setClauses.push(`event_filter = $${paramIndex++}`);
      values.push(updates.event_filter);
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.active !== undefined) {
      setClauses.push(`active = $${paramIndex++}`);
      values.push(updates.active);
    }
    
    values.push(parseInt(id, 10), ownerId);
    
    const result = await db.query<WebhookRow>(
      `UPDATE webhooks
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex++} AND owner_id = $${paramIndex}
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return reply.status(404).send({
        code: 404,
        message: 'Webhook not found',
      });
    }
    
    log.info('Webhook updated', { id, updates: Object.keys(updates) });
    
    // Update metrics
    const countResult = await db.query('SELECT COUNT(*) FROM webhooks WHERE active = true');
    activeWebhooks.set(parseInt(countResult.rows[0].count, 10));
    
    return reply.send(formatWebhookResponse(result.rows[0]));
    
  } catch (error) {
    log.error('Failed to update webhook', { error: (error as Error).message });
    return reply.status(500).send({
      code: 500,
      message: 'Failed to update webhook',
    });
  }
}

async function deleteWebhook(
  request: FastifyRequest<{ Params: WebhookParams }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const ownerId = request.user?.id || 'anonymous';
  
  try {
    // Soft delete (mark as inactive)
    const result = await db.query(
      `UPDATE webhooks
       SET active = false, updated_at = NOW()
       WHERE id = $1 AND owner_id = $2
       RETURNING id`,
      [parseInt(id, 10), ownerId]
    );
    
    if (result.rows.length === 0) {
      return reply.status(404).send({
        code: 404,
        message: 'Webhook not found',
      });
    }
    
    log.info('Webhook deleted', { id });
    
    // Update metrics
    const countResult = await db.query('SELECT COUNT(*) FROM webhooks WHERE active = true');
    activeWebhooks.set(parseInt(countResult.rows[0].count, 10));
    
    return reply.status(200).send({
      id: parseInt(id, 10),
      status: 'deleted',
    });
    
  } catch (error) {
    log.error('Failed to delete webhook', { error: (error as Error).message });
    return reply.status(500).send({
      code: 500,
      message: 'Failed to delete webhook',
    });
  }
}

async function rotateSecret(
  request: FastifyRequest<{ Params: WebhookParams }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const ownerId = request.user?.id || 'anonymous';
  const newSecret = generateSecret();
  
  try {
    const result = await db.query<WebhookRow>(
      `UPDATE webhooks
       SET secret = $1, updated_at = NOW()
       WHERE id = $2 AND owner_id = $3
       RETURNING *`,
      [newSecret, parseInt(id, 10), ownerId]
    );
    
    if (result.rows.length === 0) {
      return reply.status(404).send({
        code: 404,
        message: 'Webhook not found',
      });
    }
    
    log.info('Webhook secret rotated', { id });
    
    return reply.send({
      ...formatWebhookResponse(result.rows[0]),
      secret: newSecret,
    });
    
  } catch (error) {
    log.error('Failed to rotate webhook secret', { error: (error as Error).message });
    return reply.status(500).send({
      code: 500,
      message: 'Failed to rotate secret',
    });
  }
}

// ============================================
// Route Registration
// ============================================

export async function webhookRoutes(fastify: FastifyInstance): Promise<void> {
  // Create webhook
  fastify.post('/v1/webhooks', createWebhook);
  
  // List webhooks
  fastify.get('/v1/webhooks', listWebhooks);
  
  // Get single webhook
  fastify.get<{ Params: WebhookParams }>('/v1/webhooks/:id', getWebhook);
  
  // Update webhook
  fastify.patch<{ Params: WebhookParams }>('/v1/webhooks/:id', updateWebhook);
  
  // Delete webhook
  fastify.delete<{ Params: WebhookParams }>('/v1/webhooks/:id', deleteWebhook);
  
  // Rotate webhook secret
  fastify.post<{ Params: WebhookParams }>('/v1/webhooks/:id/rotate-secret', rotateSecret);
}
