/**
 * XRNotify Delivery Router
 * Delivery history and event replay endpoints
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../core/db.js';
import { addToStream } from '../core/redis.js';
import { config, createChildLogger } from '../core/index.js';
import {
  deliveryQuerySchema,
  replayRequestSchema,
  type DeliveryQuery,
  type ReplayRequest,
} from '../schemas/index.js';

const log = createChildLogger('delivery-router');

// ============================================
// Types
// ============================================

interface DeliveryRow {
  id: number;
  webhook_id: number;
  event_hash: string;
  status: string;
  attempts: number;
  latency_ms: number | null;
  last_attempt: Date;
}

// ============================================
// Route Handlers
// ============================================

async function listDeliveries(
  request: FastifyRequest<{ Querystring: DeliveryQuery }>,
  reply: FastifyReply
) {
  const validation = deliveryQuerySchema.safeParse(request.query);
  
  if (!validation.success) {
    return reply.status(400).send({
      code: 400,
      message: 'Invalid query parameters',
      details: validation.error.flatten(),
    });
  }
  
  const { limit, offset, status, webhook_id, from, to } = validation.data;
  const ownerId = request.user?.id || 'anonymous';
  
  try {
    // Build query
    const conditions: string[] = ['w.owner_id = $1'];
    const values: unknown[] = [ownerId];
    let paramIndex = 2;
    
    if (status) {
      conditions.push(`d.status = $${paramIndex++}`);
      values.push(status);
    }
    
    if (webhook_id) {
      conditions.push(`d.webhook_id = $${paramIndex++}`);
      values.push(webhook_id);
    }
    
    if (from) {
      conditions.push(`d.last_attempt >= $${paramIndex++}`);
      values.push(from);
    }
    
    if (to) {
      conditions.push(`d.last_attempt <= $${paramIndex++}`);
      values.push(to);
    }
    
    values.push(limit, offset);
    
    const result = await db.query<DeliveryRow>(
      `SELECT d.* FROM deliveries d
       JOIN webhooks w ON d.webhook_id = w.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY d.last_attempt DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      values
    );
    
    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) FROM deliveries d
       JOIN webhooks w ON d.webhook_id = w.id
       WHERE ${conditions.join(' AND ')}`,
      values.slice(0, -2) // Exclude limit and offset
    );
    
    return reply.send({
      deliveries: result.rows.map(row => ({
        id: row.id,
        webhook_id: row.webhook_id,
        event_hash: row.event_hash,
        status: row.status,
        attempts: row.attempts,
        latency_ms: row.latency_ms,
        last_attempt: row.last_attempt.toISOString(),
      })),
      pagination: {
        total: parseInt(countResult.rows[0].count, 10),
        limit,
        offset,
      },
    });
    
  } catch (error) {
    log.error('Failed to list deliveries', { error: (error as Error).message });
    return reply.status(500).send({
      code: 500,
      message: 'Failed to list deliveries',
    });
  }
}

async function getDeliveryStats(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const ownerId = request.user?.id || 'anonymous';
  
  try {
    // Get 24-hour stats
    const stats = await db.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'success') as success,
         COUNT(*) FILTER (WHERE status = 'failed') as failed,
         COUNT(*) FILTER (WHERE status = 'retry') as retry,
         AVG(latency_ms) FILTER (WHERE status = 'success') as avg_latency
       FROM deliveries d
       JOIN webhooks w ON d.webhook_id = w.id
       WHERE w.owner_id = $1
       AND d.last_attempt >= NOW() - INTERVAL '24 hours'`,
      [ownerId]
    );
    
    const row = stats.rows[0];
    const total = parseInt(row.total, 10);
    const success = parseInt(row.success, 10);
    
    return reply.send({
      period: '24h',
      total_deliveries: total,
      successful: success,
      failed: parseInt(row.failed, 10),
      retrying: parseInt(row.retry, 10),
      success_rate: total > 0 ? ((success / total) * 100).toFixed(2) : '0.00',
      avg_latency_ms: row.avg_latency ? Math.round(parseFloat(row.avg_latency)) : null,
    });
    
  } catch (error) {
    log.error('Failed to get delivery stats', { error: (error as Error).message });
    return reply.status(500).send({
      code: 500,
      message: 'Failed to get delivery stats',
    });
  }
}

async function replayEvents(
  request: FastifyRequest<{ Body: ReplayRequest }>,
  reply: FastifyReply
) {
  const validation = replayRequestSchema.safeParse(request.body);
  
  if (!validation.success) {
    return reply.status(400).send({
      code: 400,
      message: 'Invalid request body',
      details: validation.error.flatten(),
    });
  }
  
  const { start, end, event_types, webhook_ids } = validation.data;
  const ownerId = request.user?.id || 'anonymous';
  
  // Validate time range (max 7 days)
  const startDate = new Date(start);
  const endDate = new Date(end);
  const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff > 7) {
    return reply.status(400).send({
      code: 400,
      message: 'Time range cannot exceed 7 days',
    });
  }
  
  if (startDate >= endDate) {
    return reply.status(400).send({
      code: 400,
      message: 'Start time must be before end time',
    });
  }
  
  try {
    // Build query to get past deliveries
    const conditions: string[] = [
      'w.owner_id = $1',
      'd.last_attempt >= $2',
      'd.last_attempt <= $3',
    ];
    const values: unknown[] = [ownerId, start, end];
    let paramIndex = 4;
    
    if (webhook_ids && webhook_ids.length > 0) {
      conditions.push(`d.webhook_id = ANY($${paramIndex++})`);
      values.push(webhook_ids);
    }
    
    // Get deliveries to replay
    const result = await db.query<{ event_hash: string; webhook_id: number }>(
      `SELECT DISTINCT d.event_hash, d.webhook_id
       FROM deliveries d
       JOIN webhooks w ON d.webhook_id = w.id
       WHERE ${conditions.join(' AND ')}
       LIMIT 1000`,
      values
    );
    
    if (result.rows.length === 0) {
      return reply.send({
        queued_count: 0,
        message: 'No events found in the specified time range',
      });
    }
    
    // Queue events for replay
    let queuedCount = 0;
    const replayStream = `${config.streamName}_replay`;
    
    for (const row of result.rows) {
      // Create a replay event marker
      const replayEvent = {
        type: 'replay',
        original_hash: row.event_hash,
        webhook_id: row.webhook_id,
        replay_timestamp: new Date().toISOString(),
      };
      
      await addToStream(replayStream, { event: JSON.stringify(replayEvent) });
      queuedCount++;
    }
    
    log.info('Events queued for replay', {
      owner_id: ownerId,
      count: queuedCount,
      start,
      end,
    });
    
    return reply.send({
      queued_count: queuedCount,
      message: `${queuedCount} events queued for replay`,
    });
    
  } catch (error) {
    log.error('Failed to replay events', { error: (error as Error).message });
    return reply.status(500).send({
      code: 500,
      message: 'Failed to replay events',
    });
  }
}

// ============================================
// Route Registration
// ============================================

export async function deliveryRoutes(fastify: FastifyInstance): Promise<void> {
  // List deliveries
  fastify.get('/v1/deliveries', listDeliveries);
  
  // Get delivery stats
  fastify.get('/v1/deliveries/stats', getDeliveryStats);
  
  // Replay events
  fastify.post('/v1/events/replay', replayEvents);
}
