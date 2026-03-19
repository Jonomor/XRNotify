// =============================================================================
// XRNotify Platform - Session Authentication
// =============================================================================
// JWT-based sessions for dashboard authentication with secure cookies
// =============================================================================

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { hash, compare } from 'bcryptjs';
import { cookies } from 'next/headers';
import type { Tenant } from '@xrnotify/shared';
import { uuid, nowISO } from '@xrnotify/shared';
import { getConfig } from '../config';
import { queryOne, query } from '../db';
import { get, set, del } from '../redis';
import { createModuleLogger, logSecurityEvent } from '../logger';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface SessionPayload extends JWTPayload {
  /** Session ID */
  sid: string;
  /** Tenant ID */
  tid: string;
  /** User email */
  email: string;
  /** Session version (for invalidation) */
  version: number;
}

export interface Session {
  id: string;
  tenantId: string;
  email: string;
  name?: string;
  tenant: Tenant;
  createdAt: string;
  expiresAt: string;
}

export interface LoginResult {
  success: boolean;
  session?: Session;
  token?: string;
  error?: string;
  errorCode?: 'INVALID_CREDENTIALS' | 'ACCOUNT_INACTIVE' | 'ACCOUNT_LOCKED';
}

export interface UserRecord {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  failed_login_attempts: number;
  locked_until: Date | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const BCRYPT_ROUNDS = 12;
const SESSION_CACHE_PREFIX = 'session:';
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = createModuleLogger('session-auth');

// -----------------------------------------------------------------------------
// JWT Helpers
// -----------------------------------------------------------------------------

/**
 * Get the JWT secret as a Uint8Array
 */
function getJwtSecret(): Uint8Array {
  const config = getConfig();
  return new TextEncoder().encode(config.session.secret);
}

/**
 * Create a signed JWT token
 */
async function createToken(payload: SessionPayload): Promise<string> {
  const config = getConfig();
  const secret = getJwtSecret();
  
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Date.now() + config.session.maxAgeMs)
    .setIssuer('xrnotify')
    .setAudience('xrnotify-dashboard')
    .sign(secret);
  
  return token;
}

/**
 * Verify and decode a JWT token
 */
async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'xrnotify',
      audience: 'xrnotify-dashboard',
    });
    
    return payload as SessionPayload;
  } catch (error) {
    logger.debug({ error }, 'Token verification failed');
    return null;
  }
}

// -----------------------------------------------------------------------------
// Password Hashing
// -----------------------------------------------------------------------------

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await compare(password, hashedPassword);
}

// -----------------------------------------------------------------------------
// Session Management
// -----------------------------------------------------------------------------

/**
 * Create a new session for a tenant
 */
export async function createSession(tenant: Tenant, email: string): Promise<{ session: Session; token: string }> {
  const config = getConfig();
  const sessionId = uuid();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.session.maxAgeMs);
  
  const payload: SessionPayload = {
    sid: sessionId,
    tid: tenant.id,
    email,
    version: 1,
  };
  
  const token = await createToken(payload);
  
  const session: Session = {
    id: sessionId,
    tenantId: tenant.id,
    email,
    tenant,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  
  // Cache session data
  await set(
    `${SESSION_CACHE_PREFIX}${sessionId}`,
    JSON.stringify(session),
    Math.floor(config.session.maxAgeMs / 1000)
  );
  
  // Store session in database
  await query(`
    INSERT INTO sessions (id, tenant_id, email, expires_at)
    VALUES ($1, $2, $3, $4)
  `, [sessionId, tenant.id, email, expiresAt]);
  
  logger.info({ sessionId, tenantId: tenant.id, email }, 'Session created');
  
  return { session, token };
}

/**
 * Get current session from cookies
 */
export async function getCurrentSession(): Promise<Session | null> {
  const config = getConfig();
  const cookieStore = await cookies();
  const token = cookieStore.get(config.session.cookieName)?.value;
  
  if (!token) {
    return null;
  }
  
  return await getSessionFromToken(token);
}

/**
 * Get session from a token
 */
export async function getSessionFromToken(token: string): Promise<Session | null> {
  const payload = await verifyToken(token);
  if (!payload) {
    return null;
  }
  
  // Check cache first
  const cacheKey = `${SESSION_CACHE_PREFIX}${payload.sid}`;
  const cached = await get(cacheKey);
  
  if (cached) {
    try {
      const session = JSON.parse(cached) as Session;
      
      // Check if expired
      if (new Date(session.expiresAt) < new Date()) {
        await del(cacheKey);
        return null;
      }
      
      return session;
    } catch {
      // Invalid cached data
      await del(cacheKey);
    }
  }
  
  // Look up in database
  const row = await queryOne<{
    session_id: string;
    session_email: string;
    session_expires_at: Date;
    session_created_at: Date;
    tenant_id: string;
    tenant_name: string;
    tenant_email: string;
    tenant_plan: string;
    tenant_is_active: boolean;
    tenant_settings: Tenant['settings'];
    tenant_created_at: Date;
    tenant_updated_at: Date;
  }>(`
    SELECT 
      s.id as session_id,
      s.email as session_email,
      s.expires_at as session_expires_at,
      s.created_at as session_created_at,
      t.id as tenant_id,
      t.name as tenant_name,
      t.email as tenant_email,
      t.plan as tenant_plan,
      t.is_active as tenant_is_active,
      t.settings as tenant_settings,
      t.created_at as tenant_created_at,
      t.updated_at as tenant_updated_at
    FROM sessions s
    JOIN tenants t ON s.tenant_id = t.id
    WHERE s.id = $1 AND s.expires_at > NOW() AND s.revoked_at IS NULL
  `, [payload.sid]);
  
  if (!row) {
    return null;
  }
  
  const session: Session = {
    id: row.session_id,
    tenantId: row.tenant_id,
    email: row.session_email,
    tenant: {
      id: row.tenant_id,
      name: row.tenant_name,
      email: row.tenant_email,
      plan: row.tenant_plan as Tenant['plan'],
      is_active: row.tenant_is_active,
      settings: row.tenant_settings,
      created_at: row.tenant_created_at.toISOString(),
      updated_at: row.tenant_updated_at.toISOString(),
    },
    createdAt: row.session_created_at.toISOString(),
    expiresAt: row.session_expires_at.toISOString(),
  };
  
  // Re-cache
  const config = getConfig();
  const ttl = Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000);
  if (ttl > 0) {
    await set(cacheKey, JSON.stringify(session), ttl);
  }
  
  return session;
}

/**
 * Invalidate a session
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  // Remove from cache
  await del(`${SESSION_CACHE_PREFIX}${sessionId}`);
  
  // Mark as revoked in database
  await query(`
    UPDATE sessions SET revoked_at = NOW() WHERE id = $1
  `, [sessionId]);
  
  logger.info({ sessionId }, 'Session invalidated');
}

/**
 * Invalidate all sessions for a tenant
 */
export async function invalidateAllSessions(tenantId: string): Promise<number> {
  const result = await query(`
    UPDATE sessions 
    SET revoked_at = NOW() 
    WHERE tenant_id = $1 AND revoked_at IS NULL
    RETURNING id
  `, [tenantId]);
  
  // Remove from cache
  for (const row of result.rows) {
    await del(`${SESSION_CACHE_PREFIX}${row['id']}`);
  }
  
  logger.info({ tenantId, count: result.rowCount }, 'All sessions invalidated');
  return result.rowCount ?? 0;
}

// -----------------------------------------------------------------------------
// Login / Logout
// -----------------------------------------------------------------------------

/**
 * Attempt to login a user
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  // Look up user
  const user = await queryOne<UserRecord>(`
    SELECT * FROM users WHERE email = $1
  `, [email.toLowerCase()]);
  
  if (!user) {
    logSecurityEvent(logger, 'auth_failed', { email, reason: 'User not found' });
    return {
      success: false,
      error: 'Invalid email or password',
      errorCode: 'INVALID_CREDENTIALS',
    };
  }
  
  // Check if locked
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    logSecurityEvent(logger, 'auth_failed', { email, reason: 'Account locked' });
    return {
      success: false,
      error: 'Account is temporarily locked. Please try again later.',
      errorCode: 'ACCOUNT_LOCKED',
    };
  }
  
  // Verify password
  const passwordValid = await verifyPassword(password, user.password_hash);
  
  if (!passwordValid) {
    // Increment failed attempts
    const newAttempts = user.failed_login_attempts + 1;
    const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;
    
    await query(`
      UPDATE users 
      SET 
        failed_login_attempts = $1,
        locked_until = $2,
        updated_at = NOW()
      WHERE id = $3
    `, [
      newAttempts,
      shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
      user.id,
    ]);
    
    logSecurityEvent(logger, 'auth_failed', { 
      email, 
      reason: 'Invalid password',
      attempts: newAttempts,
      locked: shouldLock,
    });
    
    return {
      success: false,
      error: 'Invalid email or password',
      errorCode: 'INVALID_CREDENTIALS',
    };
  }
  
  // Check if active
  if (!user.is_active) {
    logSecurityEvent(logger, 'auth_failed', { email, reason: 'Account inactive' });
    return {
      success: false,
      error: 'Account is inactive',
      errorCode: 'ACCOUNT_INACTIVE',
    };
  }
  
  // Get tenant
  const tenant = await queryOne<Tenant>(`
    SELECT * FROM tenants WHERE id = $1
  `, [user.tenant_id]);
  
  if (!tenant || !tenant.is_active) {
    logSecurityEvent(logger, 'auth_failed', { email, reason: 'Tenant inactive' });
    return {
      success: false,
      error: 'Account is inactive',
      errorCode: 'ACCOUNT_INACTIVE',
    };
  }
  
  // Reset failed attempts and update last login
  await query(`
    UPDATE users 
    SET 
      failed_login_attempts = 0,
      locked_until = NULL,
      last_login_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
  `, [user.id]);
  
  // Create session
  const { session, token } = await createSession(tenant, user.email);
  
  logger.info({ email, tenantId: tenant.id }, 'User logged in');
  
  return {
    success: true,
    session,
    token,
  };
}

/**
 * Logout current session
 */
export async function logout(): Promise<void> {
  const session = await getCurrentSession();
  
  if (session) {
    await invalidateSession(session.id);
  }
  
  // Clear cookie
  const config = getConfig();
  const cookieStore = await cookies();
  cookieStore.delete(config.session.cookieName);
}

// -----------------------------------------------------------------------------
// Cookie Management
// -----------------------------------------------------------------------------

/**
 * Set session cookie
 */
export async function setSessionCookie(token: string): Promise<void> {
  const config = getConfig();
  const cookieStore = await cookies();
  
  cookieStore.set(config.session.cookieName, token, {
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'lax',
    maxAge: Math.floor(config.session.maxAgeMs / 1000),
    path: '/',
  });
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const config = getConfig();
  const cookieStore = await cookies();
  cookieStore.delete(config.session.cookieName);
}

// -----------------------------------------------------------------------------
// User Management Helpers
// -----------------------------------------------------------------------------

/**
 * Create a new user
 */
export async function createUser(
  tenantId: string,
  email: string,
  password: string
): Promise<UserRecord> {
  const passwordHash = await hashPassword(password);
  
  const user = await queryOne<UserRecord>(`
    INSERT INTO users (tenant_id, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [tenantId, email.toLowerCase(), passwordHash]);
  
  if (!user) {
    throw new Error('Failed to create user');
  }
  
  logger.info({ userId: user.id, tenantId, email }, 'User created');
  return user;
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  const user = await queryOne<UserRecord>(`
    SELECT * FROM users WHERE id = $1
  `, [userId]);
  
  if (!user) {
    return false;
  }
  
  const isValid = await verifyPassword(currentPassword, user.password_hash);
  if (!isValid) {
    return false;
  }
  
  const newHash = await hashPassword(newPassword);
  
  await query(`
    UPDATE users 
    SET password_hash = $1, updated_at = NOW()
    WHERE id = $2
  `, [newHash, userId]);
  
  // Invalidate all sessions for security
  await invalidateAllSessions(user.tenant_id);
  
  logger.info({ userId }, 'Password changed');
  return true;
}
