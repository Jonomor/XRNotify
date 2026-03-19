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
  created_at: Date;
  updated_at: Date;
}

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
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
    const isUsageRequest = url.pathname.endsWith('/usage') || url.searchParams.get('include') === 'usage';

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

    // Update user
    const user = await queryOne<UserRecord>(`
      UPDATE users
      SET name = COALESCE($1, name), updated_at = NOW()
      WHERE id = $2
      RETURNING id, tenant_id, email, name, created_at, updated_at
    `, [input.name ?? null, session.userId]);

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

    logger.info({ requestId, userId: session.userId }, 'User profile updated');

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
    const result = await changePassword(session.userId, current_password, new_password);

    if (!result.success) {
      logSecurityEvent(logger, 'password_change_failed', {
        userId: session.userId,
        reason: result.error,
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
            message: result.error ?? 'Current password is incorrect',
          },
        },
        { 
          status: 400,
          headers: { 'X-Request-Id': requestId },
        }
      );
    }

    logSecurityEvent(logger, 'password_changed', {
      userId: session.userId,
      email: session.email,
    });

    logger.info({ requestId, userId: session.userId }, 'Password changed');

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
