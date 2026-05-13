import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSessionPayload } from '@/lib/session';
import { getPlan } from '@/lib/plans';

export async function GET(req: NextRequest) {
  const payload = await getSessionPayload(req);
  if (!payload?.org_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = payload.org_id;

  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_status, trial_ends_at, seats_limit')
    .eq('id', orgId)
    .maybeSingle();
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const status = org.subscription_status as string;
  const planId = status === 'active' ? 'pro' : status === 'enterprise_active' ? 'enterprise' : 'free';
  const plan = getPlan(planId);

  const [
    { count: leads },
    { count: campaigns },
    { count: automations },
    { count: connections },
    { count: members },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('automation_rules').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('social_connections').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('org_id', orgId),
  ]);

  return NextResponse.json({
    plan: { id: planId, price_monthly: plan.price_monthly, limits: plan.limits },
    status,
    trial_ends_at: org.trial_ends_at,
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
