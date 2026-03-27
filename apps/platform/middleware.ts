// =============================================================================
// XRNotify Platform - Next.js Middleware
// =============================================================================
// Handles authentication checks, route protection, and request processing
// =============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

/**
 * Routes that require session authentication (dashboard pages)
 */
const PROTECTED_ROUTES = [
  '/dashboard',
];

/**
 * Routes that should redirect to dashboard if already authenticated
 */
const AUTH_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
];

/**
 * API routes that require API key authentication
 */
const API_KEY_ROUTES = [
  '/api/v1/webhooks',
  '/api/v1/deliveries',
  '/api/v1/events',
  '/api/v1/replay',
];

/**
 * API routes that require session authentication
 */
const SESSION_API_ROUTES = [
  '/api/v1/api-keys',
  '/api/v1/me',
];

/**
 * Public routes (no auth required)
 */
const PUBLIC_ROUTES = [
  '/',
  '/docs',
  '/api/health',
  '/api/ready',
  '/api/metrics',
  '/api/v1/auth/session',
  '/api/v1/auth/register',
];

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Check if a path matches any of the given prefixes
 */
function matchesRoute(path: string, routes: string[]): boolean {
  return routes.some(route => {
    if (route.endsWith('*')) {
      return path.startsWith(route.slice(0, -1));
    }
    return path === route || path.startsWith(route + '/');
  });
}

/**
 * Extract session token from cookies
 */
function getSessionToken(request: NextRequest): string | null {
  return request.cookies.get('xrn_session')?.value ?? null;
}

/**
 * Verify session token is valid (basic check - full validation in API routes)
 * In middleware we only check if token exists and has valid format
 */
function isValidSessionFormat(token: string): boolean {
  // JWT format: header.payload.signature
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  // Check each part is base64url encoded
  const base64urlRegex = /^[A-Za-z0-9_-]+$/;
  return parts.every(part => base64urlRegex.test(part));
}

/**
 * Check if request has API key header
 */
function hasApiKey(request: NextRequest): boolean {
  return !!(
    request.headers.get('x-xrnotify-key') ||
    request.headers.get('authorization')?.startsWith('Bearer ')
  );
}

// -----------------------------------------------------------------------------
// Middleware
// -----------------------------------------------------------------------------

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and internal Next.js routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // Has file extension
  ) {
    return NextResponse.next();
  }

  // Get authentication state
  const sessionToken = getSessionToken(request);
  const hasValidSession = sessionToken && isValidSessionFormat(sessionToken);
  const hasApiKeyHeader = hasApiKey(request);

  // -----------------------------------------------------------------------------
  // Public routes - allow through
  // -----------------------------------------------------------------------------
  if (matchesRoute(pathname, PUBLIC_ROUTES)) {
    return NextResponse.next();
  }

  // -----------------------------------------------------------------------------
  // Auth routes (login, signup) - redirect to dashboard if authenticated
  // -----------------------------------------------------------------------------
  if (matchesRoute(pathname, AUTH_ROUTES)) {
    if (hasValidSession) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // -----------------------------------------------------------------------------
  // Protected dashboard routes - require session
  // -----------------------------------------------------------------------------
  if (matchesRoute(pathname, PROTECTED_ROUTES)) {
    if (!hasValidSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // -----------------------------------------------------------------------------
  // API routes requiring API key - check header presence
  // (Actual validation happens in route handlers)
  // -----------------------------------------------------------------------------
  if (matchesRoute(pathname, API_KEY_ROUTES)) {
    if (!hasApiKeyHeader && !hasValidSession) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // -----------------------------------------------------------------------------
  // API routes requiring session
  // -----------------------------------------------------------------------------
  if (matchesRoute(pathname, SESSION_API_ROUTES)) {
    if (!hasValidSession) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session required',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // -----------------------------------------------------------------------------
  // Add security headers to all responses
  // -----------------------------------------------------------------------------
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    
    // Allow requests from same origin or configured domains
    const allowedOrigins = [
      process.env['NEXT_PUBLIC_APP_URL'],
      'https://www.xrnotify.io',
      'https://xrnotify.dev',
    ].filter(Boolean);

    if (origin && (allowedOrigins.includes(origin) || process.env['NODE_ENV'] === 'development')) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-XRNotify-Key, X-Request-Id');
      response.headers.set('Access-Control-Max-Age', '86400');
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: response.headers,
      });
    }
  }

  // Add request ID for tracing
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  response.headers.set('X-Request-Id', requestId);

  return response;
}

// -----------------------------------------------------------------------------
// Middleware Config
// -----------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
