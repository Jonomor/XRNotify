/**
 * XRNotify Auth Router
 * API key creation and management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { db } from '../core/db.js';
import { createChildLogger } from '../core/logger.js';
import { createApiKeySchema, type CreateApiKeyInput } from '../schemas/index.js';

const log = createChildLogger('auth-router');

// ============================================
// Types
// ============================================

interface ApiKeyParams {
  id: string;
}

interface ApiKeyRow {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  key_hash: string;
  key_prefix: string;
  created_at: Date;
  expires_at: Date | null;
  last_used_at: Date | null;
  revoked: boolean;
}

// ============================================
// Helper Functions
// ============================================

function generateApiKey(): { key: string; hash: string; prefix: string } {
  // Generate a 32-byte random key
  const keyBuffer = crypto.randomBytes(32);
  const key = `xrn_${keyBuffer.toString('base64url')}`;
  
  // Hash for storage
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  
  // Prefix for identification (first 8 chars after prefix)
  const prefix = key.substring(4, 12);
  
  return { key, hash, prefix };
}

function formatApiKeyResponse(row: ApiKeyRow, includeKey?: string) {
  const response: Record<string, unknown> = {
    id: row.id,
    name: row.name,
    description: row.description,
    key_prefix: row.key_prefix,
    created_at: row.created_at.toISOString(),
    expires_at: row.expires_at?.toISOString() || null,
    last_used_at: row.last_used_at?.toISOString() || null,
  };
  
  if (includeKey) {
    response.key = includeKey;
  }
  
  return response;
}

// ============================================
// Route Handlers
// ============================================

async function createApiKey(
  request: FastifyRequest<{ Body: CreateApiKeyInput }>,
  reply: FastifyReply
) {
  const validation = createApiKeySchema.safeParse(request.body);
  
  if (!validation.success) {
    return reply.status(400).send({
      code: 400,
      message: 'Invalid request body',
      details: validation.error.flatten(),
    });
  }
  
  const { name, description, expires_in_days } = validation.data;
  const ownerId = request.user?.id || 'anonymous';
  
  try {
    // Check API key limit (max 5 per account)
    const countResult = await db.query(
      'SELECT COUNT(*) FROM api_keys WHERE owner_id = $1 AND revoked = false',
      [ownerId]
    );
    
    if (parseInt(countResult.rows[0].count, 10) >= 5) {
      return reply.status(400).send({
        code: 400,
        message: 'Maximum API key limit reached',
        hint: 'Delete an existing API key before creating a new one',
      });
    }
    
    // Generate key
    const { key, hash, prefix } = generateApiKey();
    
    // Calculate expiration
    const expiresAt = expires_in_days
      ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000)
      : null;
    
    // Insert
    const result = await db.query<ApiKeyRow>(
      `INSERT INTO api_keys (owner_id, name, description, key_hash, key_prefix, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [ownerId, name, description || null, hash, prefix, expiresAt]
    );
    
    const apiKey = result.rows[0];
    
    log.info('API key created', {
      id: apiKey.id,
      owner_id: ownerId,
      name,
      prefix,
    });
    
    // Return with full key (only shown once)
    return reply.status(201).send({
      ...formatApiKeyResponse(apiKey, key),
      message: 'Store this key securely - it will not be shown again',
    });
    
  } catch (error) {
    log.error('Failed to create API key', { error: (error as Error).message });
    return reply.status(500).send({
      code: 500,
      message: 'Failed to create API key',
    });
  }
}

async function listApiKeys(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const ownerId = request.user?.id || 'anonymous';
  
  try {
    const result = await db.query<ApiKeyRow>(
      `SELECT * FROM api_keys
       WHERE owner_id = $1 AND revoked = false
       ORDER BY created_at DESC`,
      [ownerId]
    );
    
    return reply.send({
      api_keys: result.rows.map(row => formatApiKeyResponse(row)),
      total: result.rows.length,
    });
    
  } catch (error) {
    log.error('Failed to list API keys', { error: (error as Error).message });
    return reply.status(500).send({
      code: 500,
      message: 'Failed to list API keys',
    });
  }
}

async function revokeApiKey(
  request: FastifyRequest<{ Params: ApiKeyParams }>,
  reply: FastifyReply
) {
  const { id } = request.params;
  const ownerId = request.user?.id || 'anonymous';
  
  try {
    const result = await db.query(
      `UPDATE api_keys
       SET revoked = true
       WHERE id = $1 AND owner_id = $2 AND revoked = false
       RETURNING id`,
      [id, ownerId]
    );
    
    if (result.rows.length === 0) {
      return reply.status(404).send({
        code: 404,
        message: 'API key not found',
      });
    }
    
    log.info('API key revoked', { id, owner_id: ownerId });
    
    return reply.send({
      id,
      status: 'revoked',
    });
    
  } catch (error) {
    log.error('Failed to revoke API key', { error: (error as Error).message });
    return reply.status(500).send({
      code: 500,
      message: 'Failed to revoke API key',
    });
  }
}

// ============================================
// Authentication Middleware
// ============================================

export async function authenticateApiKey(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const apiKey = request.headers['x-xrnotify-key'] as string;
  
  if (!apiKey) {
    reply.status(401).send({
      code: 401,
      message: 'API key required',
      hint: 'Include X-XRNotify-Key header with your API key',
    });
    return;
  }
  
  try {
    // Hash the provided key
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    // Look up key
    const result = await db.query<ApiKeyRow>(
      `SELECT * FROM api_keys
       WHERE key_hash = $1 AND revoked = false`,
      [keyHash]
    );
    
    if (result.rows.length === 0) {
      reply.status(401).send({
        code: 401,
        message: 'Invalid or revoked API key',
      });
      return;
    }
    
    const key = result.rows[0];
    
    // Check expiration
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      reply.status(401).send({
        code: 401,
        message: 'API key has expired',
        hint: 'Create a new API key',
      });
      return;
    }
    
    // Update last used
    await db.query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
      [key.id]
    );
    
    // Attach user info to request
    request.user = {
      id: key.owner_id,
      keyId: key.id,
      keyName: key.name,
    };
    
  } catch (error) {
    log.error('Authentication error', { error: (error as Error).message });
    reply.status(500).send({
      code: 500,
      message: 'Authentication failed',
    });
  }
}

// ============================================
// Route Registration
// ============================================

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // Create API key
  fastify.post('/v1/api-keys', createApiKey);
  
  // List API keys
  fastify.get('/v1/api-keys', listApiKeys);
  
  // Revoke API key
  fastify.delete<{ Params: ApiKeyParams }>('/v1/api-keys/:id', revokeApiKey);
}

// Type augmentation for request.user
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      keyId: string;
      keyName: string;
    };
  }
}
