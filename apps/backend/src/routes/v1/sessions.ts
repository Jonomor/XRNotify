/**
 * @fileoverview XRNotify Sessions Routes
 * User authentication for dashboard login (JWT-based).
 *
 * @packageDocumentation
 * @module @xrnotify/backend/routes/v1/sessions
 */

import { type FastifyPluginAsync, type FastifyRequest, type FastifyReply } from 'fastify';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createModuleLogger } from '../../core/logger.js';
import { getConfig } from '../../core/config.js';
import { query, queryOne, queryAll } from '../../core/db.js';
import { set, get, del } from '../../core/redis.js';
import { loginRateLimiter, passwordResetRateLimiter } from '../../middleware/rateLimit.js';
import { createSuccessResponse, createErrorResponse } from '../index.js';
import { uuid, nowISO } from '@xrnotify/shared';

// =============================================================================
// Types
// =============================================================================

const logger = createModuleLogger('sessions-routes');

/**
 * User row from database
 */
interface UserRow {
  id: string;
  tenant_id: string;
  email: string;
  name: string | null;
  password_hash: string | null;
  role: string;
  active: boolean;
  email_verified: boolean;
  failed_login_attempts: number;
  locked_until: Date | null;
  last_login_at: Date | null;
  created_at: Date;
}

/**
 * Session row from database
 */
interface SessionRow {
  id: string;
  user_id: string;
  tenant_id: string;
  token_hash: string;
  refresh_token_hash: string | null;
  refresh_token_expires_at: Date | null;
  user_agent: string | null;
  ip_address: string | null;
  revoked: boolean;
  created_at: Date;
  expires_at: Date;
  last_used_at: Date;
}

/**
 * Tenant row from database
 */
interface TenantRow {
  id: string;
  name: string;
  slug: string | null;
  plan: string;
  active: boolean;
}

/**
 * Login request body
 */
interface LoginBody {
  email: string;
  password: string;
  remember_me?: boolean;
}

/**
 * Refresh token request body
 */
interface RefreshBody {
  refresh_token: string;
}

/**
 * User info response
 */
interface UserInfoResponse {
  id: string;
  email: string;
  name: string | null;
  role: string;
  email_verified: boolean;
  tenant: {
    id: string;
    name: string;
    slug: string | null;
    plan: string;
  };
  created_at: string;
}

/**
 * Login response
 */
interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserInfoResponse;
}

// =============================================================================
// Constants
// =============================================================================

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;
const ACCESS_TOKEN_PREFIX = 'xrs_'; // XRNotify Session
const REFRESH_TOKEN_PREFIX = 'xrr_'; // XRNotify Refresh
const SESSION_CACHE_PREFIX = 'session:';
const SESSION_CACHE_TTL = 300; // 5 minutes

// =============================================================================
// Helpers
// =============================================================================

/**
 * Generate a secure random token
 */
function generateToken(prefix: string): string {
  const random = randomBytes(32).toString('base64url');
  return `${prefix}${random}`;
}

/**
 * Hash a token for storage
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Verify password using timing-safe comparison
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Import bcrypt dynamically (optional dependency)
  try {
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(password, hash);
  } catch {
    // Fallback to simple hash comparison (for development)
    // In production, bcrypt should be installed
    const inputHash = createHash('sha256').update(password).digest('hex');
    const storedHash = hash.startsWith('$2') ? hash : hash; // bcrypt hashes start with $2
    
    if (hash.startsWith('$2')) {
      // This is a bcrypt hash but bcrypt is not installed
      logger.error('bcrypt not installed but password hash is bcrypt format');
      return false;
    }
    
    // Simple SHA-256 comparison (development only)
    try {
      return timingSafeEqual(Buffer.from(inputHash), Buffer.from(storedHash));
    } catch {
      return false;
    }
  }
}

/**
 * Hash password for storage
 */
async function hashPassword(password: string): Promise<string> {
  try {
    const bcrypt = await import('bcrypt');
    return bcrypt.hash(password, 12);
  } catch {
    // Fallback for development (NOT SECURE FOR PRODUCTION)
    logger.warn('bcrypt not installed, using SHA-256 for password hashing (development only)');
    return createHash('sha256').update(password).digest('hex');
  }
}

/**
 * Get session from cache or database
 */
async function getSession(tokenHash: string): Promise<{
  session: SessionRow;
  user: UserRow;
  tenant: TenantRow;
} | null> {
  // Try cache first
  const cached = await get(`${SESSION_CACHE_PREFIX}${tokenHash}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // Invalid cache, continue to database
    }
  }

  // Query database
  const result = await queryOne<SessionRow & { 
    user_email: string;
    user_name: string | null;
    user_role: string;
    user_active: boolean;
    user_email_verified: boolean;
    tenant_name: string;
    tenant_slug: string | null;
    tenant_plan: string;
    tenant_active: boolean;
  }>(
    `SELECT 
      s.*,
      u.email as user_email,
      u.name as user_name,
      u.role as user_role,
      u.active as user_active,
      u.email_verified as user_email_verified,
      t.name as tenant_name,
      t.slug as tenant_slug,
      t.plan as tenant_plan,
      t.active as tenant_active
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    JOIN tenants t ON t.id = s.tenant_id
    WHERE s.token_hash = $1`,
    [tokenHash]
  );

  if (!result) {
    return null;
  }

  const session: SessionRow = {
    id: result.id,
    user_id: result.user_id,
    tenant_id: result.tenant_id,
    token_hash: result.token_hash,
    refresh_token_hash: result.refresh_token_hash,
    refresh_token_expires_at: result.refresh_token_expires_at,
    user_agent: result.user_agent,
    ip_address: result.ip_address,
    revoked: result.revoked,
    created_at: result.created_at,
    expires_at: result.expires_at,
    last_used_at: result.last_used_at,
  };

  const user: UserRow = {
    id: result.user_id,
    tenant_id: result.tenant_id,
    email: result.user_email,
    name: result.user_name,
    password_hash: null, // Don't include in cache
    role: result.user_role,
    active: result.user_active,
    email_verified: result.user_email_verified,
    failed_login_attempts: 0,
    locked_until: null,
    last_login_at: null,
    created_at: result.created_at,
  };

  const tenant: TenantRow = {
    id: result.tenant_id,
    name: result.tenant_name,
    slug: result.tenant_slug,
    plan: result.tenant_plan,
    active: result.tenant_active,
  };

  const data = { session, user, tenant };

  // Cache for future requests
  await set(
    `${SESSION_CACHE_PREFIX}${tokenHash}`,
    JSON.stringify(data),
    SESSION_CACHE_TTL
  );

  return data;
}

/**
 * Invalidate session cache
 */
async function invalidateSessionCache(tokenHash: string): Promise<void> {
  await del(`${SESSION_CACHE_PREFIX}${tokenHash}`);
}

/**
 * Build user info response
 */
function buildUserInfo(user: UserRow, tenant: TenantRow): UserInfoResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    email_verified: user.email_verified,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
    },
    created_at: user.created_at.toISOString(),
  };
}

// =============================================================================
// Route Handlers
// =============================================================================

/**
 * Login handler
 */
async function login(
  request: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply
): Promise<void> {
  const config = getConfig();
  const { email, password, remember_me = false } = request.body;

  // Validate input
  if (!email || !password) {
    reply.status(400).send(
      createErrorResponse('validation_error', 'Email and password are required', request.requestId)
    );
    return;
  }

  // Normalize email
  const normalizedEmail = email.toLowerCase().trim();

  // Find user
  const user = await queryOne<UserRow>(
    `SELECT u.*, t.active as tenant_active
     FROM users u
     JOIN tenants t ON t.id = u.tenant_id
     WHERE LOWER(u.email) = $1`,
    [normalizedEmail]
  );

  if (!user) {
    reply.status(401).send(
      createErrorResponse('invalid_credentials', 'Invalid email or password', request.requestId)
    );
    return;
  }

  // Check if user is locked out
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const remainingMinutes = Math.ceil(
      (new Date(user.locked_until).getTime() - Date.now()) / 60000
    );
    reply.status(429).send(
      createErrorResponse(
        'account_locked',
        `Account is locked. Try again in ${remainingMinutes} minutes.`,
        request.requestId,
        { retry_after_minutes: remainingMinutes }
      )
    );
    return;
  }

  // Check if user is active
  if (!user.active) {
    reply.status(403).send(
      createErrorResponse('account_disabled', 'Your account has been disabled', request.requestId)
    );
    return;
  }

  // Check if tenant is active
  const tenant = await queryOne<TenantRow>(
    'SELECT * FROM tenants WHERE id = $1',
    [user.tenant_id]
  );

  if (!tenant || !tenant.active) {
    reply.status(403).send(
      createErrorResponse('tenant_suspended', 'Your organization has been suspended', request.requestId)
    );
    return;
  }

  // Check password
  if (!user.password_hash) {
    reply.status(401).send(
      createErrorResponse(
        'invalid_credentials',
        'Password login not available. Use OAuth or reset your password.',
        request.requestId
      )
    );
    return;
  }

  const passwordValid = await verifyPassword(password, user.password_hash);

  if (!passwordValid) {
    // Increment failed attempts
    const newAttempts = user.failed_login_attempts + 1;
    const lockUntil = newAttempts >= MAX_FAILED_ATTEMPTS
      ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
      : null;

    await query(
      `UPDATE users SET
        failed_login_attempts = $1,
        locked_until = $2,
        updated_at = NOW()
      WHERE id = $3`,
      [newAttempts, lockUntil, user.id]
    );

    if (lockUntil) {
      logger.warn({ userId: user.id, email: normalizedEmail }, 'Account locked due to failed attempts');
      reply.status(429).send(
        createErrorResponse(
          'account_locked',
          `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`,
          request.requestId,
          { retry_after_minutes: LOCKOUT_DURATION_MINUTES }
        )
      );
    } else {
      reply.status(401).send(
        createErrorResponse(
          'invalid_credentials',
          'Invalid email or password',
          request.requestId,
          { attempts_remaining: MAX_FAILED_ATTEMPTS - newAttempts }
        )
      );
    }
    return;
  }

  // Generate tokens
  const accessToken = generateToken(ACCESS_TOKEN_PREFIX);
  const refreshToken = generateToken(REFRESH_TOKEN_PREFIX);
  const accessTokenHash = hashToken(accessToken);
  const refreshTokenHash = hashToken(refreshToken);

  // Calculate expiry times
  const accessExpiresIn = config.auth.jwtAccessTokenExpiry; // e.g., "15m"
  const refreshExpiresIn = remember_me ? '30d' : config.auth.jwtRefreshTokenExpiry; // e.g., "7d"

  // Parse duration strings
  const parseExpiry = (str: string): number => {
    const match = str.match(/^(\d+)([smhd])$/);
    if (!match) return 15 * 60; // Default 15 minutes
    const value = parseInt(match[1]!, 10);
    const unit = match[2];
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: return 15 * 60;
    }
  };

  const accessExpiresInSeconds = parseExpiry(accessExpiresIn);
  const refreshExpiresInSeconds = parseExpiry(refreshExpiresIn);

  // Create session
  const sessionId = uuid();
  await query(
    `INSERT INTO sessions (
      id, user_id, tenant_id,
      token_hash, refresh_token_hash, refresh_token_expires_at,
      user_agent, ip_address,
      expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      sessionId,
      user.id,
      user.tenant_id,
      accessTokenHash,
      refreshTokenHash,
      new Date(Date.now() + refreshExpiresInSeconds * 1000),
      request.headers['user-agent'] || null,
      request.ip,
      new Date(Date.now() + accessExpiresInSeconds * 1000),
    ]
  );

  // Reset failed attempts and update last login
  await query(
    `UPDATE users SET
      failed_login_attempts = 0,
      locked_until = NULL,
      last_login_at = NOW(),
      last_login_ip = $1,
      updated_at = NOW()
    WHERE id = $2`,
    [request.ip, user.id]
  );

  logger.info({ userId: user.id, sessionId }, 'User logged in');

  // Build response
  const response: LoginResponse = {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: accessExpiresInSeconds,
    user: buildUserInfo(user, tenant),
  };

  reply.send(createSuccessResponse(response, request.requestId));
}

/**
 * Refresh token handler
 */
async function refresh(
  request: FastifyRequest<{ Body: RefreshBody }>,
  reply: FastifyReply
): Promise<void> {
  const config = getConfig();
  const { refresh_token } = request.body;

  if (!refresh_token || !refresh_token.startsWith(REFRESH_TOKEN_PREFIX)) {
    reply.status(400).send(
      createErrorResponse('invalid_token', 'Invalid refresh token', request.requestId)
    );
    return;
  }

  const refreshTokenHash = hashToken(refresh_token);

  // Find session by refresh token
  const session = await queryOne<SessionRow>(
    `SELECT * FROM sessions
     WHERE refresh_token_hash = $1
     AND revoked = FALSE
     AND refresh_token_expires_at > NOW()`,
    [refreshTokenHash]
  );

  if (!session) {
    reply.status(401).send(
      createErrorResponse('invalid_token', 'Invalid or expired refresh token', request.requestId)
    );
    return;
  }

  // Get user and tenant
  const user = await queryOne<UserRow>(
    'SELECT * FROM users WHERE id = $1 AND active = TRUE',
    [session.user_id]
  );

  if (!user) {
    reply.status(403).send(
      createErrorResponse('account_disabled', 'Your account has been disabled', request.requestId)
    );
    return;
  }

  const tenant = await queryOne<TenantRow>(
    'SELECT * FROM tenants WHERE id = $1 AND active = TRUE',
    [session.tenant_id]
  );

  if (!tenant) {
    reply.status(403).send(
      createErrorResponse('tenant_suspended', 'Your organization has been suspended', request.requestId)
    );
    return;
  }

  // Generate new tokens
  const newAccessToken = generateToken(ACCESS_TOKEN_PREFIX);
  const newRefreshToken = generateToken(REFRESH_TOKEN_PREFIX);
  const newAccessTokenHash = hashToken(newAccessToken);
  const newRefreshTokenHash = hashToken(newRefreshToken);

  const parseExpiry = (str: string): number => {
    const match = str.match(/^(\d+)([smhd])$/);
    if (!match) return 15 * 60;
    const value = parseInt(match[1]!, 10);
    const unit = match[2];
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: return 15 * 60;
    }
  };

  const accessExpiresInSeconds = parseExpiry(config.auth.jwtAccessTokenExpiry);
  const refreshExpiresInSeconds = parseExpiry(config.auth.jwtRefreshTokenExpiry);

  // Invalidate old session cache
  await invalidateSessionCache(session.token_hash);

  // Update session with new tokens
  await query(
    `UPDATE sessions SET
      token_hash = $1,
      refresh_token_hash = $2,
      refresh_token_expires_at = $3,
      expires_at = $4,
      last_used_at = NOW()
    WHERE id = $5`,
    [
      newAccessTokenHash,
      newRefreshTokenHash,
      new Date(Date.now() + refreshExpiresInSeconds * 1000),
      new Date(Date.now() + accessExpiresInSeconds * 1000),
      session.id,
    ]
  );

  logger.debug({ sessionId: session.id, userId: user.id }, 'Session refreshed');

  reply.send(createSuccessResponse({
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    token_type: 'Bearer',
    expires_in: accessExpiresInSeconds,
    user: buildUserInfo(user, tenant),
  }, request.requestId));
}

/**
 * Logout handler
 */
async function logout(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Extract token from Authorization header
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send(
      createErrorResponse('unauthorized', 'No session token provided', request.requestId)
    );
    return;
  }

  const token = authHeader.slice(7);
  if (!token.startsWith(ACCESS_TOKEN_PREFIX)) {
    reply.status(401).send(
      createErrorResponse('invalid_token', 'Invalid session token', request.requestId)
    );
    return;
  }

  const tokenHash = hashToken(token);

  // Invalidate cache
  await invalidateSessionCache(tokenHash);

  // Revoke session
  const result = await query(
    `UPDATE sessions SET
      revoked = TRUE,
      revoked_at = NOW()
    WHERE token_hash = $1 AND revoked = FALSE`,
    [tokenHash]
  );

  if (result.rowCount === 0) {
    // Session not found or already revoked, but we still return success
    logger.debug('Session not found or already revoked');
  } else {
    logger.debug({ tokenHash: tokenHash.substring(0, 8) }, 'Session revoked');
  }

  reply.status(204).send();
}

/**
 * Logout all sessions handler
 */
async function logoutAll(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Get current session
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send(
      createErrorResponse('unauthorized', 'No session token provided', request.requestId)
    );
    return;
  }

  const token = authHeader.slice(7);
  const tokenHash = hashToken(token);

  // Get session to find user
  const sessionData = await getSession(tokenHash);
  if (!sessionData) {
    reply.status(401).send(
      createErrorResponse('invalid_token', 'Invalid session', request.requestId)
    );
    return;
  }

  // Get all active sessions for user
  const sessions = await queryAll<{ token_hash: string }>(
    `SELECT token_hash FROM sessions
     WHERE user_id = $1 AND revoked = FALSE`,
    [sessionData.user.id]
  );

  // Invalidate all caches
  for (const s of sessions) {
    await invalidateSessionCache(s.token_hash);
  }

  // Revoke all sessions
  const result = await query(
    `UPDATE sessions SET
      revoked = TRUE,
      revoked_at = NOW()
    WHERE user_id = $1 AND revoked = FALSE`,
    [sessionData.user.id]
  );

  logger.info(
    { userId: sessionData.user.id, count: result.rowCount },
    'All sessions revoked'
  );

  reply.send(createSuccessResponse({
    revoked_count: result.rowCount,
    message: 'All sessions have been logged out',
  }, request.requestId));
}

/**
 * Get current session info
 */
async function getMe(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send(
      createErrorResponse('unauthorized', 'No session token provided', request.requestId)
    );
    return;
  }

  const token = authHeader.slice(7);
  
  if (!token.startsWith(ACCESS_TOKEN_PREFIX)) {
    reply.status(401).send(
      createErrorResponse('invalid_token', 'Invalid session token', request.requestId)
    );
    return;
  }

  const tokenHash = hashToken(token);

  const sessionData = await getSession(tokenHash);

  if (!sessionData) {
    reply.status(401).send(
      createErrorResponse('invalid_token', 'Invalid or expired session', request.requestId)
    );
    return;
  }

  const { session, user, tenant } = sessionData;

  // Check if session is still valid
  if (session.revoked || new Date(session.expires_at) < new Date()) {
    await invalidateSessionCache(tokenHash);
    reply.status(401).send(
      createErrorResponse('session_expired', 'Session has expired', request.requestId)
    );
    return;
  }

  // Check user and tenant status
  if (!user.active) {
    reply.status(403).send(
      createErrorResponse('account_disabled', 'Your account has been disabled', request.requestId)
    );
    return;
  }

  if (!tenant.active) {
    reply.status(403).send(
      createErrorResponse('tenant_suspended', 'Your organization has been suspended', request.requestId)
    );
    return;
  }

  // Update last used
  query(
    'UPDATE sessions SET last_used_at = NOW() WHERE id = $1',
    [session.id]
  ).catch(() => {}); // Fire and forget

  reply.send(createSuccessResponse(buildUserInfo(user, tenant), request.requestId));
}

/**
 * List active sessions
 */
async function listSessions(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send(
      createErrorResponse('unauthorized', 'No session token provided', request.requestId)
    );
    return;
  }

  const token = authHeader.slice(7);
  const tokenHash = hashToken(token);

  const sessionData = await getSession(tokenHash);
  if (!sessionData) {
    reply.status(401).send(
      createErrorResponse('invalid_token', 'Invalid session', request.requestId)
    );
    return;
  }

  // Get all active sessions
  const sessions = await queryAll<SessionRow>(
    `SELECT * FROM sessions
     WHERE user_id = $1 AND revoked = FALSE AND expires_at > NOW()
     ORDER BY last_used_at DESC`,
    [sessionData.user.id]
  );

  const sessionList = sessions.map(s => ({
    id: s.id,
    user_agent: s.user_agent,
    ip_address: s.ip_address,
    created_at: s.created_at.toISOString(),
    last_used_at: s.last_used_at.toISOString(),
    expires_at: s.expires_at.toISOString(),
    is_current: s.token_hash === tokenHash,
  }));

  reply.send(createSuccessResponse({ sessions: sessionList }, request.requestId));
}

/**
 * Revoke specific session
 */
async function revokeSession(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params;

  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.status(401).send(
      createErrorResponse('unauthorized', 'No session token provided', request.requestId)
    );
    return;
  }

  const token = authHeader.slice(7);
  const tokenHash = hashToken(token);

  const currentSession = await getSession(tokenHash);
  if (!currentSession) {
    reply.status(401).send(
      createErrorResponse('invalid_token', 'Invalid session', request.requestId)
    );
    return;
  }

  // Get target session
  const targetSession = await queryOne<SessionRow>(
    'SELECT * FROM sessions WHERE id = $1 AND user_id = $2',
    [id, currentSession.user.id]
  );

  if (!targetSession) {
    reply.status(404).send(
      createErrorResponse('not_found', 'Session not found', request.requestId)
    );
    return;
  }

  if (targetSession.revoked) {
    reply.status(400).send(
      createErrorResponse('already_revoked', 'Session is already revoked', request.requestId)
    );
    return;
  }

  // Invalidate cache
  await invalidateSessionCache(targetSession.token_hash);

  // Revoke session
  await query(
    `UPDATE sessions SET revoked = TRUE, revoked_at = NOW() WHERE id = $1`,
    [id]
  );

  logger.info({ sessionId: id, userId: currentSession.user.id }, 'Session revoked');

  reply.status(204).send();
}

// =============================================================================
// Route Registration
// =============================================================================

/**
 * Sessions routes plugin
 */
export const sessionsRoutes: FastifyPluginAsync = async (server) => {
  // Login
  server.post<{ Body: LoginBody }>(
    '/login',
    {
      preHandler: [loginRateLimiter],
      schema: {
        description: 'Login with email and password',
        tags: ['Sessions'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 1 },
            remember_me: { type: 'boolean', default: false },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'object' },
            },
          },
        },
      },
    },
    login
  );

  // Refresh token
  server.post<{ Body: RefreshBody }>(
    '/refresh',
    {
      schema: {
        description: 'Refresh access token using refresh token',
        tags: ['Sessions'],
        body: {
          type: 'object',
          required: ['refresh_token'],
          properties: {
            refresh_token: { type: 'string' },
          },
        },
      },
    },
    refresh
  );

  // Logout current session
  server.post(
    '/logout',
    {
      schema: {
        description: 'Logout current session',
        tags: ['Sessions'],
        response: {
          204: { type: 'null' },
        },
      },
    },
    logout
  );

  // Logout all sessions
  server.post(
    '/logout-all',
    {
      schema: {
        description: 'Logout all sessions for current user',
        tags: ['Sessions'],
      },
    },
    logoutAll
  );

  // Get current user info
  server.get(
    '/me',
    {
      schema: {
        description: 'Get current user info',
        tags: ['Sessions'],
      },
    },
    getMe
  );

  // List active sessions
  server.get(
    '/',
    {
      schema: {
        description: 'List all active sessions',
        tags: ['Sessions'],
      },
    },
    listSessions
  );

  // Revoke specific session
  server.delete<{ Params: { id: string } }>(
    '/:id',
    {
      schema: {
        description: 'Revoke a specific session',
        tags: ['Sessions'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          204: { type: 'null' },
        },
      },
    },
    revokeSession
  );

  logger.info('Sessions routes registered');
};

// =============================================================================
// Export
// =============================================================================

export default sessionsRoutes;
export { hashToken, generateToken, hashPassword, verifyPassword };
