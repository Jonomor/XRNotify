// =============================================================================
// XRNotify Platform - User Registration
// =============================================================================
// POST /api/v1/auth/register - Create tenant + user account
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { registerSchema } from '@xrnotify/shared';
import { queryOne } from '@/lib/db';
import { hashPassword } from '@/lib/auth/session';
import { createModuleLogger, logSecurityEvent } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const logger = createModuleLogger('auth-register');

// -----------------------------------------------------------------------------
// POST /api/v1/auth/register
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Request body must be valid JSON' },
      { status: 400 }
    );
  }

  // Validate with shared schema
  const parseResult = registerSchema.safeParse(body);

  if (!parseResult.success) {
    const fieldErrors: Record<string, string> = {};
    const flat = parseResult.error.flatten();

    for (const [field, messages] of Object.entries(flat.fieldErrors)) {
      if (messages?.[0]) fieldErrors[field] = messages[0];
    }

    return NextResponse.json(
      { success: false, error: 'Validation failed', errors: fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, password } = parseResult.data;
  // company is not in registerSchema - extract it manually from raw body if present
  const rawBody = body as Record<string, unknown>;
  const company = typeof rawBody['company'] === 'string' ? rawBody['company'] : undefined;
  const normalizedEmail = email.toLowerCase();

  // Check if email already taken
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM users WHERE email = $1`,
    [normalizedEmail]
  );

  if (existing) {
    return NextResponse.json(
      {
        success: false,
        error: 'An account with this email already exists',
        errors: { email: 'An account with this email already exists' },
      },
      { status: 409 }
    );
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create tenant (company name takes priority, fallback to user's name)
  const tenantName = (company?.trim()) || name.trim();

  const tenant = await queryOne<{ id: string }>(
    `INSERT INTO tenants (name, plan, events_per_month, webhook_limit)
     VALUES ($1, 'free', 500, 1)
     RETURNING id`,
    [tenantName]
  );

  if (!tenant) {
    logger.error({ email: normalizedEmail }, 'Failed to create tenant during registration');
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }

  // Create user
  const user = await queryOne<{ id: string }>(
    `INSERT INTO users (tenant_id, email, password_hash, name)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [tenant.id, normalizedEmail, passwordHash, name.trim()]
  );

  if (!user) {
    logger.error({ tenantId: tenant.id, email: normalizedEmail }, 'Failed to create user during registration');
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }

  logSecurityEvent(logger, 'login_success', {
    userId: user.id,
    tenantId: tenant.id,
    email: normalizedEmail,
  });

  logger.info({ userId: user.id, tenantId: tenant.id, email: normalizedEmail }, 'User registered');

  return NextResponse.json({ success: true }, { status: 201 });
}
