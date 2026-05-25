import { NextRequest, NextResponse } from 'next/server';
import { getSessionPayload } from '@/lib/session';
// Note: middleware runs in the Edge runtime — use the Web Crypto global, not Node's crypto module.

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/data-deletion',
  '/api/data-deletion',
  '/api/tracking/',
  '/api/auth/',
  '/api/billing/webhook',
  '/api/track/',
  '/api/social/webhooks/',
  '/api/webhooks/',
  '/api/cron/',
  '/_next/',
  '/favicon',
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Request ID ─────────────────────────────────────────────────────────────
  // Propagated as x-request-id so it appears in every server log line and
  // in error responses — correlates browser, CDN, and function logs.
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();

  if (isPublic(pathname)) {
    const res = NextResponse.next();
    res.headers.set('x-request-id', requestId);
    return res;
  }

  const orgId = process.env.ORG_ID ?? '00000000-0000-0000-0000-000000000001';
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-org-id', orgId);
  requestHeaders.set('x-request-id', requestId);

  // Dev bypass: ONLY honoured in local development (NODE_ENV=development).
  // Setting DISABLE_AUTH=true on Vercel / any production deployment has NO effect.
  if (process.env.DISABLE_AUTH === 'true' && process.env.NODE_ENV !== 'production') {
    requestHeaders.set('x-user-name', 'dev-user');
    requestHeaders.set('x-user-role', 'admin');
    requestHeaders.set('x-user-id', 'dev-user-id');
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const session = await getSessionPayload(req);

  if (!session) {
    // API routes return 401; page routes redirect to login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized', requestId },
        { status: 401, headers: { 'x-request-id': requestId } },
      );
    }
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  requestHeaders.set('x-user-name', session.username);
  requestHeaders.set('x-user-role', session.role);
  requestHeaders.set('x-user-id', session.user_id ?? session.username);
  if (session.org_id) requestHeaders.set('x-org-id', session.org_id);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('x-request-id', requestId);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
