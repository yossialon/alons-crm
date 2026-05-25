import { NextRequest, NextResponse } from 'next/server';
import { getSessionPayload } from '@/lib/session';
import { serverDb } from '@/lib/supabase-server';
import { getPlan } from '@/lib/plans';
import { getPlanFromPriceId } from '@/lib/stripe';
import { log } from '@/lib/logger';

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
      serverDb
        .from('organizations')
        .select('id, name, subscription_status, trial_ends_at, seats_limit, stripe_price_id')
        .eq('id', orgId)
        .maybeSingle(),
      serverDb
        .from('users')
        .select('id, name, email, role')
        .eq('id', payload.user_id!)
        .maybeSingle(),
    ]);

    // Derive plan tier from stored Stripe price ID — not from status heuristics
    const planId = getPlanFromPriceId((org as { stripe_price_id?: string | null } | null)?.stripe_price_id);
    const plan   = getPlan(planId);

    return NextResponse.json({
      user,
      org,
      plan: { id: planId, name: plan.name, price_monthly: plan.price_monthly, limits: plan.limits },
      role: payload.role,
    });
  } catch (err) {
    log.error('[GET /api/auth/me]', err);
    return NextResponse.json({ error: 'Failed to load user' }, { status: 500 });
  }
}
