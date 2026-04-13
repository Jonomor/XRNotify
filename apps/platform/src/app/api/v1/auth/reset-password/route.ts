// =============================================================================
// XRNotify Platform - Password Reset API
// =============================================================================
// POST /api/v1/auth/reset-password - Request a password reset email
// PUT  /api/v1/auth/reset-password - Complete password reset with token
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { queryOne, execute } from '@/lib/db';
import { createModuleLogger, logSecurityEvent } from '@/lib/logger';
import { hashPassword } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const logger = createModuleLogger('password-reset');

// Token expires in 1 hour
const TOKEN_EXPIRY_MS = 60 * 60 * 1000;

// -----------------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------------

const requestResetSchema = z.object({
  email: z.string().email(),
});

const completeResetSchema = z.object({
  token: z.string().min(32),
  new_password: z.string().min(8).max(128),
});

// -----------------------------------------------------------------------------
// POST - Request password reset
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
        { status: 400 }
      );
    }

    const parsed = requestResetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid email address' } },
        { status: 400 }
      );
    }

    const { email } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Look up user - always return success to prevent email enumeration
    const user = await queryOne<{ id: string; tenant_id: string }>(`
      SELECT id, tenant_id FROM users WHERE LOWER(email) = $1 AND is_active = true
    `, [normalizedEmail]);

    if (user) {
      // Generate reset token
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

      // Store hashed token in DB (delete any existing tokens for this user)
      await execute(`
        DELETE FROM password_reset_tokens WHERE user_id = $1
      `, [user.id]);

      await execute(`
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
      `, [user.id, tokenHash, expiresAt]);

      logSecurityEvent(logger, 'password_reset_requested', {
        userId: user.id,
        email: normalizedEmail,
      });

      // TODO: Send email with reset link containing the token
      // For now, log the token in development only
      if (process.env.NODE_ENV !== 'production') {
        logger.info({ token, userId: user.id }, 'Password reset token generated (dev mode)');
      }
    }

    // Always return success to prevent enumeration
    return NextResponse.json({
      message: 'If an account exists with that email, a password reset link has been sent.',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to process password reset request');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}

// -----------------------------------------------------------------------------
// PUT - Complete password reset
// -----------------------------------------------------------------------------

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
        { status: 400 }
      );
    }

    const parsed = completeResetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    const { token, new_password } = parsed.data;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Look up the reset token
    const resetRecord = await queryOne<{ user_id: string; expires_at: Date }>(`
      SELECT user_id, expires_at FROM password_reset_tokens
      WHERE token_hash = $1
    `, [tokenHash]);

    if (!resetRecord) {
      logSecurityEvent(logger, 'password_reset_invalid_token', {});
      return NextResponse.json(
        { error: { code: 'INVALID_TOKEN', message: 'Invalid or expired reset token.' } },
        { status: 400 }
      );
    }

    if (new Date(resetRecord.expires_at) < new Date()) {
      // Token expired - clean it up
      await execute('DELETE FROM password_reset_tokens WHERE token_hash = $1', [tokenHash]);
      return NextResponse.json(
        { error: { code: 'TOKEN_EXPIRED', message: 'Reset token has expired. Please request a new one.' } },
        { status: 400 }
      );
    }

    // Hash new password and update
    const passwordHash = await hashPassword(new_password);

    await execute(`
      UPDATE users SET password_hash = $1, updated_at = NOW(), failed_login_attempts = 0, locked_until = NULL
      WHERE id = $2
    `, [passwordHash, resetRecord.user_id]);

    // Delete all reset tokens for this user
    await execute('DELETE FROM password_reset_tokens WHERE user_id = $1', [resetRecord.user_id]);

    // Invalidate all sessions for this user
    await execute('DELETE FROM sessions WHERE user_id = $1', [resetRecord.user_id]);

    logSecurityEvent(logger, 'password_reset_completed', { userId: resetRecord.user_id });

    return NextResponse.json({
      message: 'Password has been reset successfully. Please sign in with your new password.',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to complete password reset');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    );
  }
}
