import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { config, logger, query, checkRateLimit } from '../core/index.js';
import { apiKeyAuthentications, rateLimitHits } from '../core/metrics.js';
import { ErrorResponse, ApiKey } from '../schemas/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

declare module 'fastify' {
  interface FastifyRequest {
    apiKey?: ApiKey;
    ownerId?: string;
    correlationId?: string;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API Key Hashing
// ═══════════════════════════════════════════════════════════════════════════════

export function hashApiKey(key: string): string {
  return crypto
    .createHmac('sha256', config.apiKeyHashSecret)
    .update(key)
    .digest('hex');
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = crypto.randomBytes(32).toString('base64url');
  const prefix = key.slice(0, 8);
  const hash = hashApiKey(key);
  return { key: `xrn_${key}`, prefix, hash };
}

// ═══════════════════════════════════════════════════════════════════════════════
// API Key Lookup
// ═══════════════════════════════════════════════════════════════════════════════

async function findApiKeyByHash(keyHash: string): Promise<ApiKey | null> {
  const result = await query<{
    id: string;
    owner_id: string;
    name: string;
    description: string | null;
    key_prefix: string;
    key_hash: string;
    permissions: string[];
    rate_limit_max: number;
    rate_limit_window_ms: number;
    ip_allowlist: string[] | null;
    created_at: Date;
    expires_at: Date | null;
    last_used_at: Date | null;
    revoked: boolean;
    revoked_at: Date | null;
  }>(`
    SELECT 
      id, owner_id, name, description, key_prefix, key_hash,
      permissions, rate_limit_max, rate_limit_window_ms, ip_allowlist,
      created_at, expires_at, last_used_at, revoked, revoked_at
    FROM api_keys 
    WHERE key_hash = $1
  `, [keyHash]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description || undefined,
    keyPrefix: row.key_prefix,
    keyHash: row.key_hash,
    permissions: row.permissions,
    rateLimit: {
      maxRequests: row.rate_limit_max,
      windowMs: row.rate_limit_window_ms,
    },
    ipAllowlist: row.ip_allowlist || undefined,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at?.toISOString(),
    lastUsedAt: row.last_used_at?.toISOString(),
    revoked: row.revoked,
    revokedAt: row.revoked_at?.toISOString(),
  };
}

async function updateLastUsed(keyId: string): Promise<void> {
  await query(
    'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
    [keyId]
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// IP Validation
// ═══════════════════════════════════════════════════════════════════════════════

function isIpAllowed(clientIp: string, allowlist?: string[]): boolean {
  if (!allowlist || allowlist.length === 0) return true;
  return allowlist.includes(clientIp);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Authentication Middleware
// ═══════════════════════════════════════════════════════════════════════════════

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const correlationId = crypto.randomUUID();
  request.correlationId = correlationId;

  const apiKeyHeader = request.headers[config.apiKeyHeader.toLowerCase()] as string | undefined;

  if (!apiKeyHeader) {
    apiKeyAuthentications.inc({ status: 'missing' });
    const error: ErrorResponse = {
      code: 401,
      message: 'API key required',
      hint: `Include your API key in the ${config.apiKeyHeader} header`,
      requestId: correlationId,
    };
    return reply.status(401).send(error);
  }

  // Remove prefix if present
  const rawKey = apiKeyHeader.startsWith('xrn_')
    ? apiKeyHeader.slice(4)
    : apiKeyHeader;

  const keyHash = hashApiKey(rawKey);
  const apiKey = await findApiKeyByHash(keyHash);

  if (!apiKey) {
    apiKeyAuthentications.inc({ status: 'invalid' });
    logger.warn('Invalid API key attempted', {
      prefix: rawKey.slice(0, 8),
      correlationId,
    });
    const error: ErrorResponse = {
      code: 401,
      message: 'Invalid API key',
      requestId: correlationId,
    };
    return reply.status(401).send(error);
  }

  if (apiKey.revoked) {
    apiKeyAuthentications.inc({ status: 'revoked' });
    const error: ErrorResponse = {
      code: 401,
      message: 'API key has been revoked',
      requestId: correlationId,
    };
    return reply.status(401).send(error);
  }

  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    apiKeyAuthentications.inc({ status: 'expired' });
    const error: ErrorResponse = {
      code: 401,
      message: 'API key has expired',
      requestId: correlationId,
    };
    return reply.status(401).send(error);
  }

  // IP allowlist check
  const clientIp = request.ip;
  if (!isIpAllowed(clientIp, apiKey.ipAllowlist)) {
    apiKeyAuthentications.inc({ status: 'ip_blocked' });
    logger.warn('IP not in allowlist', {
      keyId: apiKey.id,
      clientIp,
      correlationId,
    });
    const error: ErrorResponse = {
      code: 403,
      message: 'IP address not allowed',
      requestId: correlationId,
    };
    return reply.status(403).send(error);
  }

  // Rate limiting
  const rateLimitResult = await checkRateLimit(
    `api:${apiKey.id}`,
    apiKey.rateLimit.maxRequests,
    apiKey.rateLimit.windowMs
  );

  if (!rateLimitResult.allowed) {
    rateLimitHits.inc({ key_id: apiKey.id });
    reply.header('X-RateLimit-Limit', apiKey.rateLimit.maxRequests);
    reply.header('X-RateLimit-Remaining', 0);
    reply.header('X-RateLimit-Reset', rateLimitResult.resetAt);
    reply.header('Retry-After', Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000));

    const error: ErrorResponse = {
      code: 429,
      message: 'Rate limit exceeded',
      hint: `Maximum ${apiKey.rateLimit.maxRequests} requests per ${apiKey.rateLimit.windowMs / 1000} seconds`,
      requestId: correlationId,
    };
    return reply.status(429).send(error);
  }

  // Set rate limit headers
  reply.header('X-RateLimit-Limit', apiKey.rateLimit.maxRequests);
  reply.header('X-RateLimit-Remaining', rateLimitResult.remaining);
  reply.header('X-RateLimit-Reset', rateLimitResult.resetAt);

  // Attach to request
  request.apiKey = apiKey;
  request.ownerId = apiKey.ownerId;

  // Update last used (fire and forget)
  updateLastUsed(apiKey.id).catch((err) => {
    logger.error('Failed to update API key last_used_at', { error: err.message });
  });

  apiKeyAuthentications.inc({ status: 'success' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Permission Check Middleware
// ═══════════════════════════════════════════════════════════════════════════════

export function requirePermission(...requiredPermissions: string[]) {
  return async function (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    if (!request.apiKey) {
      const error: ErrorResponse = {
        code: 401,
        message: 'Authentication required',
        requestId: request.correlationId,
      };
      return reply.status(401).send(error);
    }

    const hasPermission = requiredPermissions.some((perm) =>
      request.apiKey!.permissions.includes(perm)
    );

    if (!hasPermission) {
      const error: ErrorResponse = {
        code: 403,
        message: 'Insufficient permissions',
        hint: `Required permissions: ${requiredPermissions.join(' or ')}`,
        requestId: request.correlationId,
      };
      return reply.status(403).send(error);
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Webhook Signature Generation
// ═══════════════════════════════════════════════════════════════════════════════

export function signWebhookPayload(payload: unknown, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify(payload);
  const signaturePayload = `${timestamp}.${body}`;
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  tolerance: number = 300
): boolean {
  try {
    const parts = signature.split(',');
    const timestampPart = parts.find((p) => p.startsWith('t='));
    const signaturePart = parts.find((p) => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) return false;

    const timestamp = parseInt(timestampPart.slice(2), 10);
    const expectedSig = signaturePart.slice(3);

    // Check timestamp tolerance
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > tolerance) return false;

    // Compute expected signature
    const signaturePayload = `${timestamp}.${payload}`;
    const computedSig = crypto
      .createHmac('sha256', secret)
      .update(signaturePayload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSig),
      Buffer.from(computedSig)
    );
  } catch {
    return false;
  }
}
