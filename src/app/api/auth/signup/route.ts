import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { createSessionToken, setSessionCookie } from '@/lib/session';

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'org';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { org_name, name, email, password } = body ?? {};

    if (!org_name || !name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const normalEmail = String(email).toLowerCase().trim();

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalEmail)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const trialEndsAt   = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const slug          = `${toSlug(String(org_name).trim())}-${Math.random().toString(36).slice(2, 7)}`;

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: String(org_name).trim(), slug, subscription_status: 'trialing', trial_ends_at: trialEndsAt, seats_limit: 3 })
      .select('id')
      .single();
    if (orgError) throw new Error(orgError.message);

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({ org_id: org.id, email: normalEmail, password_hash, name: String(name).trim(), role: 'owner' })
      .select('id')
      .single();
    if (userError) throw new Error(userError.message);

    const token = await createSessionToken(String(name).trim(), 'owner', {
      org_id: org.id,
      user_id: user.id,
    });
    await setSessionCookie(token);
    return NextResponse.json({ ok: true, org_id: org.id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/auth/signup]', err);
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
