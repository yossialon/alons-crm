import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { token, password } = body ?? {};

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const { data: row } = await supabase
      .from('password_reset_tokens')
      .select('id, user_id, expires_at')
      .eq('id', token)
      .is('used_at', null)
      .maybeSingle();

    if (!row || new Date(row.expires_at as string) < new Date()) {
      return NextResponse.json(
        { error: 'This reset link is invalid or has expired. Please request a new one.' },
        { status: 400 },
      );
    }

    const hash = await bcrypt.hash(password, 10);
    await Promise.all([
      supabase.from('users').update({ password_hash: hash, updated_at: new Date().toISOString() }).eq('id', row.user_id as string),
      supabase.from('password_reset_tokens').update({ used_at: new Date().toISOString() }).eq('id', row.id),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/auth/reset-password]', err);
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}
