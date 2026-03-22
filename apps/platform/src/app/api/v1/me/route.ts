// =============================================================================
// XRNotify Platform - Me API (Current User)
// =============================================================================
// GET /api/v1/me - Get current user profile and tenant info
// PATCH /api/v1/me - Update user profile
// POST /api/v1/me/password - Change password
// GET /api/v1/me/usage - Get usage statistics
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentSession, changePassword } from '@/lib/auth/session';
import { queryOne, execute } from '@/lib/db';
import { getUsageTracker } from '@/lib/rate-limit/tokenBucket';
import { getDeliveryStats } from '@/lib/deliveries/service';
import { checkRateLimit } from '@/lib/rate-limit/tokenBucket';
import { createModuleLogger, logSecurityEvent } from '@/lib/logger';
import { 
  recordHttpRequest, 
  incHttpRequestsInFlight, 
  decHttpRequestsInFlight,
} from '@/lib/metrics';
import { generateRequestId } from '@xrnotify/shared';

export const dynamic = 'force-dynamic';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

interface TenantRecord {
  id: string;
  name: string;
  plan: string;
  is_active: boolean;
  settings: Record<string, unknown>;
  webhook_limit: number;
  events_per_month: number;
  created_at: Date;
}

interface UserRecord {
  id: string;
  tenant_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  twitter_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  created_at: Date;
  updated_at: Date;
}

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const optionalUrl = z.union([z.string().url().max(500), z.literal('')]).optional().nullable();

const updateProfileSchema = z.object({
  name: z.string().max(100).optional(),
  avatar_url: z.string().max(500000).optional().nullable(),
  twitter_url: optionalUrl,
  github_url: optionalUrl,
  linkedin_url: optionalUrl,
  website_url: optionalUrl,
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8).max(128),
});

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = createModuleLogger('me-api');

// -----------------------------------------------------------------------------
// Session Authentication Helper
// -----------------------------------------------------------------------------

async function authenticateSession(): Promise<
  { session: NonNullable<Awaited<ReturnType<typeof getCurrentSession>>> } | { error: NextResponse<ApiErrorResponse> }
> {
  const session = await getCurrentSession();

  if (!session) {
    logSecurityEvent(logger, 'auth_failed', { reason: 'No session' });
    return {
      error: NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required. Please log in.',
          },
        },
        { status: 401 }
      ),
    };
  }

  return { session };
}

// -----------------------------------------------------------------------------
// GET /api/v1/me - Get Current User Profile
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = performance.now();
  incHttpRequestsInFlight();

  try {
    // Check for usage query param
    const url = new URL(request.url);
    const isUsageRequest = url.pathname.endsWith('/usage') || url.searchParams.get('include') === 'usage' || url.searchParams.has('include_usage');

    // Authenticate via session
    const authResult = await authenticateSession();
    if ('error' in authResult) {
      return authResult.error;
    }
    const { session } = authResult;

    // Rate limit
    const { allowed, headers: rateLimitHeaders } = await checkRateLimit(session.tenantId);
    if (!allowed) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please slow down.',
          },
        },
        { status: 429 }
      );
    }

    // Get full tenant info
    const tenant = await queryOne<TenantRecord>(`
      SELECT id, name, plan, is_active, settings, webhook_limit, events_per_month, created_at
      FROM tenants
      WHERE id = $1
    `, [session.tenantId]);

    if (!tenant) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Tenant not found',
          },
        },
        { status: 404 }
      );
    }

    // Get user profile (profile columns may not exist if migration 009 hasn't run)
    let user: UserRecord | null = null;
    try {
      user = await queryOne<UserRecord>(`
        SELECT id, tenant_id, email, name, avatar_url, twitter_url, github_url, linkedin_url, website_url, created_at, updated_at
        FROM users WHERE id = $1
      `, [session.id]);
    } catch {
      // Fallback if profile columns don't exist yet
      user = await queryOne<UserRecord>(`
        SELECT id, tenant_id, email, name, NULL as avatar_url, NULL as twitter_url, NULL as github_url, NULL as linkedin_url, NULL as website_url, created_at, updated_at
        FROM users WHERE id = $1
      `, [session.id]);
    }

    // Get webhook count
    const webhookCount = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM webhooks WHERE tenant_id = $1 AND is_active = true
    `, [session.tenantId]);

    // Get API key count
    const apiKeyCount = await queryOne<{ count: string }>(`
      SELECT COUNT(*) as count FROM api_keys WHERE tenant_id = $1 AND is_active = true
    `, [session.tenantId]);

    // Build response
    const responseData: Record<string, unknown> = {
      user: {
        id: session.id,
        email: session.email,
        name: user?.name ?? null,
        avatar_url: user?.avatar_url ?? null,
        twitter_url: user?.twitter_url ?? null,
        github_url: user?.github_url ?? null,
        linkedin_url: user?.linkedin_url ?? null,
        website_url: user?.website_url ?? null,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
        is_active: tenant.is_active,
        created_at: tenant.created_at.toISOString(),
      },
      limits: {
        webhooks: {
          used: parseInt(webhookCount?.count ?? '0', 10),
          limit: tenant.webhook_limit,
        },
        api_keys: {
          used: parseInt(apiKeyCount?.count ?? '0', 10),
          limit: 10, // Fixed limit for now
        },
        events_per_month: tenant.events_per_month,
      },
      features: {
        replay_enabled: tenant.settings['replay_enabled'] ?? false,
        events_api_enabled: tenant.settings['events_api_enabled'] ?? false,
        websocket_enabled: tenant.settings['websocket_enabled'] ?? false,
        retention_days: tenant.settings['retention_days'] ?? 30,
      },
    };

    // Include usage if requested
    if (isUsageRequest) {
      const usageTracker = getUsageTracker();
      const currentUsage = await usageTracker.getUsage(session.tenantId, 'events');
      const deliveryStats = await getDeliveryStats(session.tenantId);

      responseData['usage'] = {
        events_this_month: currentUsage,
        events_limit: tenant.events_per_month,
        events_remaining: Math.max(0, tenant.events_per_month - currentUsage),
        usage_percentage: Math.round((currentUsage / tenant.events_per_month) * 100),
        deliveries: {
          total: deliveryStats.total,
          delivered: deliveryStats.delivered,
          failed: deliveryStats.failed,
          pending: deliveryStats.pending,
          success_rate: Math.round(deliveryStats.successRate * 100) / 100,
        },
      };
    }

    logger.debug({ requestId, sessionId: session.id }, 'Retrieved user profile');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/me', status_code: '200' },
      durationMs / 1000
    );

    return NextResponse.json(
      { data: responseData },
      {
        status: 200,
        headers: {
          ...rateLimitHeaders,
          'X-Request-Id': requestId,
        },
      }
    );
  } catch (error) {
    logger.error({ error, requestId }, 'Failed to get user profile');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/me', status_code: '500' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { 
        status: 500,
        headers: { 'X-Request-Id': requestId },
      }
    );
  } finally {
    decHttpRequestsInFlight();
  }
}

// -----------------------------------------------------------------------------
// PATCH /api/v1/me - Update User Profile
// -----------------------------------------------------------------------------

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = performance.now();
  incHttpRequestsInFlight();

  try {
    // Authenticate via session
    const authResult = await authenticateSession();
    if ('error' in authResult) {
      return authResult.error;
    }
    const { session } = authResult;

    // Rate limit
    const { allowed, headers: rateLimitHeaders } = await checkRateLimit(session.tenantId);
    if (!allowed) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please slow down.',
          },
        },
        { status: 429 }
      );
    }

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_JSON',
            message: 'Request body must be valid JSON',
          },
        },
        { status: 400 }
      );
    }

    // Validate body
    const parseResult = updateProfileSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parseResult.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const input = parseResult.data;

    if (Object.keys(input).length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No fields to update',
          },
        },
        { status: 400 }
      );
    }

    // Build dynamic update
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (input.name !== undefined) {
      setClauses.push(`name = $${paramIdx++}`);
      params.push(input.name);
    }
    if (input.avatar_url !== undefined) {
      setClauses.push(`avatar_url = $${paramIdx++}`);
      params.push(input.avatar_url || null);
    }
    if (input.twitter_url !== undefined) {
      setClauses.push(`twitter_url = $${paramIdx++}`);
      params.push(input.twitter_url || null);
    }
    if (input.github_url !== undefined) {
      setClauses.push(`github_url = $${paramIdx++}`);
      params.push(input.github_url || null);
    }
    if (input.linkedin_url !== undefined) {
      setClauses.push(`linkedin_url = $${paramIdx++}`);
      params.push(input.linkedin_url || null);
    }
    if (input.website_url !== undefined) {
      setClauses.push(`website_url = $${paramIdx++}`);
      params.push(input.website_url || null);
    }

    params.push(session.id);

    // Update user (profile columns may not exist if migration 009 hasn't run)
    let user: UserRecord | null = null;
    try {
      user = await queryOne<UserRecord>(`
        UPDATE users
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIdx}
        RETURNING id, tenant_id, email, name, avatar_url, twitter_url, github_url, linkedin_url, website_url, created_at, updated_at
      `, params);
    } catch {
      // Fallback: only update name (profile columns may not exist)
      const fallbackParams: unknown[] = [];
      const fallbackClauses = ['updated_at = NOW()'];
      let fi = 1;
      if (input.name !== undefined) {
        fallbackClauses.push(`name = $${fi++}`);
        fallbackParams.push(input.name);
      }
      fallbackParams.push(session.id);
      user = await queryOne<UserRecord>(`
        UPDATE users
        SET ${fallbackClauses.join(', ')}
        WHERE id = $${fi}
        RETURNING id, tenant_id, email, name, NULL as avatar_url, NULL as twitter_url, NULL as github_url, NULL as linkedin_url, NULL as website_url, created_at, updated_at
      `, fallbackParams);
    }

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'User not found',
          },
        },
        { status: 404 }
      );
    }

    logger.info({ requestId, userId: session.id }, 'User profile updated');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'PATCH', route: '/api/v1/me', status_code: '200' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar_url: user.avatar_url,
            twitter_url: user.twitter_url,
            github_url: user.github_url,
            linkedin_url: user.linkedin_url,
            website_url: user.website_url,
            updated_at: user.updated_at.toISOString(),
          },
        },
        message: 'Profile updated successfully',
      },
      {
        status: 200,
        headers: {
          ...rateLimitHeaders,
          'X-Request-Id': requestId,
        },
      }
    );
  } catch (error) {
    logger.error({ error, requestId }, 'Failed to update user profile');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'PATCH', route: '/api/v1/me', status_code: '500' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { 
        status: 500,
        headers: { 'X-Request-Id': requestId },
      }
    );
  } finally {
    decHttpRequestsInFlight();
  }
}

// -----------------------------------------------------------------------------
// POST /api/v1/me - Change Password (via action query param)
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = performance.now();
  incHttpRequestsInFlight();

  try {
    // Check action
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action !== 'change-password') {
      return NextResponse.json(
        {
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid action. Use ?action=change-password',
          },
        },
        { status: 400 }
      );
    }

    // Authenticate via session
    const authResult = await authenticateSession();
    if ('error' in authResult) {
      return authResult.error;
    }
    const { session } = authResult;

    // Rate limit (stricter for password changes)
    const { allowed, headers: rateLimitHeaders } = await checkRateLimit(session.tenantId);
    if (!allowed) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please slow down.',
          },
        },
        { status: 429 }
      );
    }

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_JSON',
            message: 'Request body must be valid JSON',
          },
        },
        { status: 400 }
      );
    }

    // Validate body
    const parseResult = changePasswordSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parseResult.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { current_password, new_password } = parseResult.data;

    // Change password
    const passwordChanged = await changePassword(session.id, current_password, new_password);

    if (!passwordChanged) {
      logSecurityEvent(logger, 'password_change_failed', {
        userId: session.id,
        reason: 'invalid_current_password',
      });

      const durationMs = Math.round(performance.now() - startTime);
      recordHttpRequest(
        { method: 'POST', route: '/api/v1/me', status_code: '400' },
        durationMs / 1000
      );

      return NextResponse.json(
        {
          error: {
            code: 'INVALID_PASSWORD',
            message: 'Current password is incorrect',
          },
        },
        { 
          status: 400,
          headers: { 'X-Request-Id': requestId },
        }
      );
    }

    logSecurityEvent(logger, 'password_changed', {
      userId: session.id,
      email: session.email,
    });

    logger.info({ requestId, userId: session.id }, 'Password changed');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'POST', route: '/api/v1/me', status_code: '200' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        message: 'Password changed successfully',
      },
      {
        status: 200,
        headers: {
          ...rateLimitHeaders,
          'X-Request-Id': requestId,
        },
      }
    );
  } catch (error) {
    logger.error({ error, requestId }, 'Failed to change password');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'POST', route: '/api/v1/me', status_code: '500' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { 
        status: 500,
        headers: { 'X-Request-Id': requestId },
      }
    );
  } finally {
    decHttpRequestsInFlight();
  }
}
