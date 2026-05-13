import { NextRequest, NextResponse } from 'next/server';
import { getSessionPayload } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { getPlan } from '@/lib/plans';

export async function GET(req: NextRequest) {
  try {
    const payload = await getSessionPayload(req);
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (payload.role === 'super_admin' && !payload.user_id) {
      return NextResponse.json({ username: payload.username, role: payload.role, org: null, plan: null });
    }

    const orgId = payload.org_id;
    if (!orgId) return NextResponse.json({ error: 'No org' }, { status: 400 });

    const [{ data: org }, { data: user }] = await Promise.all([
      supabase
        .from('organizations')
        .select('id, name, subscription_status, trial_ends_at, seats_limit')
        .eq('id', orgId)
        .maybeSingle(),
      supabase
        .from('users')
        .select('id, name, email, role')
        .eq('id', payload.user_id!)
        .maybeSingle(),
    ]);

    const status = org?.subscription_status ?? 'trialing';
    const planId = status === 'active' ? 'pro' : status === 'enterprise' ? 'enterprise' : 'free';
    const plan   = getPlan(planId);

    return NextResponse.json({
      user,
      org,
      plan: { id: planId, price_monthly: plan.price_monthly, limits: plan.limits },
      role: payload.role,
    });
  } catch (err) {
    console.error('[GET /api/auth/me]', err);
    return NextResponse.json({ error: 'Failed to load user' }, { status: 500 });
  }
}
