import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  // Simple test middleware
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
