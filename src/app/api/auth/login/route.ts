import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createSessionToken, setSessionCookie } from '@/lib/session';
import serverDb from '@/lib/supabase-server';

const DELAY_MS = 500;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
      await new Promise((r) => setTimeout(r, DELAY_MS));
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { email, password } = body;

    const envUser = process.env.CRM_USERNAME;
    const envHash = process.env.CRM_PASSWORD_HASH;
    if (envUser && envHash && (email === envUser || email === `${envUser}@admin`)) {
      const passOk = await bcrypt.compare(password, envHash);
      if (!passOk) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      const token = await createSessionToken(envUser, 'super_admin');
      await setSessionCookie(token);
      return NextResponse.json({ ok: true, role: 'super_admin' });
    }

    const { data: user } = await serverDb
      .from('users')
      .select('id, name, email, password_hash, role, org_id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    const hashToCheck = user?.password_hash ?? '$2b$10$invalidhashpadding000000000000000000000000000000000000';
    const passOk = await bcrypt.compare(password, hashToCheck);

    if (!user || !passOk) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await createSessionToken(user.name || user.email, user.role as never, {
      org_id: user.org_id,
      user_id: user.id,
    });
    await setSessionCookie(token);
    return NextResponse.json({ ok: true, role: user.role });
  } catch (err) {
    console.error('[POST /api/auth/login]', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
