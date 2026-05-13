import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const COOKIE = 'crm_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export type SessionRole = 'super_admin' | 'owner' | 'admin' | 'member' | 'viewer';

export interface SessionPayload extends JWTPayload {
  username: string;
  role: SessionRole;
  org_id?: string;
  user_id?: string;
}

function getSecret(): Uint8Array {
  const raw = process.env.SESSION_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      'SESSION_SECRET env var is missing or too short (must be ≥ 32 chars). ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
  }
  return new TextEncoder().encode(raw);
}

export async function createSessionToken(
  username: string,
  role: SessionRole,
  opts: { org_id?: string; user_id?: string } = {},
): Promise<string> {
  return new SignJWT({ username, role, ...opts })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSessionPayload(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function requireAuth(req: NextRequest): Promise<boolean> {
  return (await getSessionPayload(req)) !== null;
}

export async function requireRole(req: NextRequest, role: SessionRole): Promise<boolean> {
  const payload = await getSessionPayload(req);
  return payload?.role === role;
}
