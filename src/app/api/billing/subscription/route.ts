import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/supabase-server';
import { getSessionPayload } from '@/lib/session';
import { getPlan } from '@/lib/plans';
import { getPlanFromPriceId } from '@/lib/stripe';
import { log } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const payload = await getSessionPayload(req);
  if (!payload?.org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = payload.org_id;

  const { data: org, error: orgError } = await serverDb
    .from('organizations')
    .select('subscription_status, trial_ends_at, seats_limit, stripe_price_id')
    .eq('id', orgId)
    .maybeSingle();

  if (orgError) {
    log.error('[billing/subscription] DB error', orgError, { orgId });
    return NextResponse.json({ error: 'Failed to load subscription' }, { status: 500 });
  }
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  // Derive plan from the stored Stripe price ID — not from status string alone
  const planId = getPlanFromPriceId(org.stripe_price_id as string | null);
  const plan   = getPlan(planId);

  const [
    { count: leads },
    { count: campaigns },
    { count: automations },
    { count: connections },
    { count: members },
  ] = await Promise.all([
    serverDb.from('leads').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    serverDb.from('campaigns').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    serverDb.from('automation_rules').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    serverDb.from('social_connections').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    serverDb.from('users').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
  ]);

  return NextResponse.json({
    plan: {
      id:            planId,
      name:          plan.name,
      price_monthly: plan.price_monthly,
      price_yearly:  plan.price_yearly,
      limits:        plan.limits,
      features:      plan.features,
    },
    status:       org.subscription_status as string,
    trial_ends_at: org.trial_ends_at as string | null,
    usage: {
      leads:              leads ?? 0,
      campaigns:          campaigns ?? 0,
      automations:        automations ?? 0,
      social_connections: connections ?? 0,
      team_members:       members ?? 0,
    },
    limits: plan.limits,
  });
}
