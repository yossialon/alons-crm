import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

// ── Zod validation ────────────────────────────────────────────────────────────

export function zodError(err: ZodError): NextResponse {
  return NextResponse.json(
    { error: 'Validation failed', issues: err.flatten().fieldErrors },
    { status: 422 }
  );
}

// ── URL sanitization ──────────────────────────────────────────────────────────

export function sanitizeUrl(raw: string): string {
  if (!raw) return '';
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.toString();
  } catch {
    // fall through
  }
  return '';
}

// ── Request actor info ────────────────────────────────────────────────────────
// The middleware decodes the JWT and sets x-user-name / x-user-role headers.

export function getActorInfo(req: NextRequest) {
  return {
    actorName: req.headers.get('x-user-name') ?? 'unknown',
    ip:
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      'local',
  };
}
