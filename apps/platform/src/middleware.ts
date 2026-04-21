import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIE = process.env['SESSION_COOKIE_NAME'] ?? 'xrnotify_session';

const CSP_REPORT_ONLY =
  "default-src 'self'; " +
  "script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://js.stripe.com 'unsafe-inline'; " +
  "connect-src 'self' https://*.stripe.com https://www.google-analytics.com https://region1.google-analytics.com; " +
  "img-src 'self' data: https:; " +
  "style-src 'self' 'unsafe-inline'; " +
  "frame-src https://js.stripe.com; " +
  "font-src 'self' data:; " +
  "report-uri /api/csp-report;";

function withCsp(response: NextResponse): NextResponse {
  response.headers.set('Content-Security-Policy-Report-Only', CSP_REPORT_ONLY);
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/dashboard')) {
    const session = request.cookies.get(SESSION_COOKIE);
    if (!session?.value) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return withCsp(NextResponse.redirect(loginUrl));
    }
  }

  return withCsp(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
