import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createSessionToken, setSessionCookie } from '@/lib/session';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const expectedUser = process.env.CRM_USERNAME || 'admin';
  const expectedPass = process.env.CRM_PASSWORD || 'changeme123';
  const expectedHash = process.env.CRM_PASSWORD_HASH || '';

  const userOk = username === expectedUser;

  let passOk = false;
  if (expectedHash) {
    passOk = await bcrypt.compare(password, expectedHash);
  } else {
    passOk = password === expectedPass;
  }

  if (!userOk || !passOk) {
    // Constant-time-ish delay to slow brute force
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await createSessionToken();
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
