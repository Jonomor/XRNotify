// =============================================================================
// XRNotify Platform - Auth Session API
// =============================================================================
// GET /api/v1/auth/session - Get current session
// POST /api/v1/auth/session - Login (create session)
// DELETE /api/v1/auth/session - Logout (destroy session)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@xrnotify/shared';
import { 
  login, 
  logout, 
  getCurrentSession,
  setSessionCookie,
  clearSessionCookie,
} from '@/lib/auth/session';
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

// -----------------------------------------------------------------------------
// Logger
// -----------------------------------------------------------------------------

const logger = createModuleLogger('auth-session-api');

// -----------------------------------------------------------------------------
// GET /api/v1/auth/session - Get Current Session
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = performance.now();
  incHttpRequestsInFlight();

  try {
    const session = await getCurrentSession();

    if (!session) {
      const durationMs = Math.round(performance.now() - startTime);
      recordHttpRequest(
        { method: 'GET', route: '/api/v1/auth/session', status_code: '401' },
        durationMs / 1000
      );

      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Not authenticated',
          },
        },
        { 
          status: 401,
          headers: { 'X-Request-Id': requestId },
        }
      );
    }

    logger.debug({ requestId, email: session.email }, 'Session retrieved');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/auth/session', status_code: '200' },
      durationMs / 1000
    );

    return NextResponse.json(
      {
        data: {
          user: {
            id: session.id,
            email: session.email,
          },
          tenant: {
            id: session.tenantId,
            name: session.tenant.name,
            plan: session.tenant.plan,
            is_active: session.tenant.is_active,
          },
          expires_at: session.expiresAt,
        },
      },
      {
        status: 200,
        headers: { 'X-Request-Id': requestId },
      }
    );
  } catch (error) {
    logger.error({ error, requestId }, 'Failed to get session');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'GET', route: '/api/v1/auth/session', status_code: '500' },
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
// POST /api/v1/auth/session - Login
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = performance.now();
  incHttpRequestsInFlight();

  try {
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
    const parseResult = loginSchema.safeParse(body);

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

    const { email, password } = parseResult.data;

    // Get client info for logging
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      ?? request.headers.get('x-real-ip') 
      ?? 'unknown';
    const userAgent = request.headers.get('user-agent') ?? 'unknown';

    // Attempt login
    const result = await login(email, password);

    if (!result.success || !result.session) {
      logSecurityEvent(logger, 'login_failed', {
        email,
        reason: result.error,
        clientIp,
        userAgent,
      });

      const durationMs = Math.round(performance.now() - startTime);
      recordHttpRequest(
        { method: 'POST', route: '/api/v1/auth/session', status_code: '401' },
        durationMs / 1000
      );

      // Use generic message to prevent user enumeration
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
        },
        { 
          status: 401,
          headers: { 'X-Request-Id': requestId },
        }
      );
    }

    logSecurityEvent(logger, 'login_success', {
      email,
      tenantId: result.session.tenantId,
      clientIp,
      userAgent,
    });

    logger.info({ 
      requestId, 
      email,
      tenantId: result.session.tenantId,
    }, 'User logged in');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'POST', route: '/api/v1/auth/session', status_code: '200' },
      durationMs / 1000
    );

    // Create response with session cookie
    const response = NextResponse.json(
      {
        message: 'Login successful',
        data: {
          user: {
            id: result.session.id,
            email: result.session.email,
          },
          tenant: {
            id: result.session.tenantId,
            name: result.session.tenant.name,
            plan: result.session.tenant.plan,
            is_active: result.session.tenant.is_active,
          },
          expires_at: result.session.expiresAt,
        },
      },
      {
        status: 200,
        headers: { 'X-Request-Id': requestId },
      }
    );

    // Set session cookie
    if (result.token) {
      await setSessionCookie(result.token);
    }

    return response;
  } catch (error) {
    logger.error({ error, requestId }, 'Login failed');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'POST', route: '/api/v1/auth/session', status_code: '500' },
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
// DELETE /api/v1/auth/session - Logout
// -----------------------------------------------------------------------------

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = performance.now();
  incHttpRequestsInFlight();

  try {
    const session = await getCurrentSession();

    if (session) {
      // Invalidate session
      await logout();

      logSecurityEvent(logger, 'logout', {
        email: session.email,
        tenantId: session.tenantId,
      });

      logger.info({ 
        requestId, 
        email: session.email,
      }, 'User logged out');
    }

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'DELETE', route: '/api/v1/auth/session', status_code: '200' },
      durationMs / 1000
    );

    // Create response and clear cookie
    const response = NextResponse.json(
      {
        message: 'Logged out successfully',
      },
      {
        status: 200,
        headers: { 'X-Request-Id': requestId },
      }
    );

    // Clear session cookie
    await clearSessionCookie();

    return response;
  } catch (error) {
    logger.error({ error, requestId }, 'Logout failed');

    const durationMs = Math.round(performance.now() - startTime);
    recordHttpRequest(
      { method: 'DELETE', route: '/api/v1/auth/session', status_code: '500' },
      durationMs / 1000
    );

    // Still try to clear the cookie even on error
    const response = NextResponse.json(
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

    await clearSessionCookie();

    return response;
  } finally {
    decHttpRequestsInFlight();
  }
}
