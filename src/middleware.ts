import { NextRequest, NextResponse } from 'next/server';
import { getSessionPayload } from '@/lib/session';

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/api/auth/',
  '/api/billing/webhook',
  '/api/track/',
  '/api/social/webhooks/',
  '/_next/',
  '/favicon',
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  // Temporarily disable authentication for development
  const requestHeaders = new Headers(req.headers);
  const orgId = process.env.ORG_ID ?? '00000000-0000-0000-0000-000000000001';
  requestHeaders.set('x-org-id', orgId);
  requestHeaders.set('x-user-name', 'dev-user');
  requestHeaders.set('x-user-role', 'admin');
  requestHeaders.set('x-user-id', 'dev-user-id');

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
