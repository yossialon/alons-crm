/**
 * Billing guards — call at the top of any API route that creates a resource.
 *
 * Usage:
 *   const guard = await checkBillingLimit(orgId, 'leads');
 *   if (!guard.allowed) return guard.response;   // 402 with upgrade prompt
 *
 * The guard reads current usage + plan limits from Supabase in a single
 * round-trip (one COUNT query per resource) and returns a typed result.
 *
 * It does NOT throw — callers must check `guard.allowed`.
 */

import { NextResponse } from 'next/server';
import { serverDb } from '@/lib/supabase-server';
import { isWithinLimit, getPlan, type PlanId, type UsageResource } from '@/lib/plans';
import { getPlanFromPriceId } from '@/lib/stripe';

// Resource → Supabase table name
const RESOURCE_TABLE: Record<UsageResource, string> = {
  leads:              'leads',
  campaigns:          'campaigns',
  automations:        'automation_rules',
  social_connections: 'social_connections',
  team_members:       'users',
};

export interface BillingGuardResult {
  allowed:   true;
  planId:    PlanId;
  current:   number;
  limit:     number | typeof Infinity;
}

export interface BillingGuardBlocked {
  allowed:   false;
  planId:    PlanId;
  current:   number;
  limit:     number;
  response:  NextResponse;
}

type GuardResult = BillingGuardResult | BillingGuardBlocked;

/**
 * Checks whether the org is within its plan limit for the given resource.
 * Returns `{ allowed: true }` or `{ allowed: false, response }`.
 *
 * @param orgId    The org's UUID.
 * @param resource The resource type to check (e.g. 'leads').
 */
export async function checkBillingLimit(
  orgId:    string,
  resource: UsageResource,
): Promise<GuardResult> {
  const table = RESOURCE_TABLE[resource];

  // Fetch org's price ID and current resource count in parallel
  const [{ data: org }, { count }] = await Promise.all([
    serverDb
      .from('organizations')
      .select('stripe_price_id, subscription_status')
      .eq('id', orgId)
      .maybeSingle(),
    serverDb
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId),
  ]);

  // If org query fails, fail open (let the operation proceed; DB constraints are the safety net)
  if (!org) {
    return { allowed: true, planId: 'free', current: 0, limit: 0 };
  }

  const status = org.subscription_status as string;
  // Trialing orgs get Pro-level limits so they can properly evaluate the product
  const planId: PlanId = status === 'trialing'
    ? 'pro'
    : getPlanFromPriceId((org as { stripe_price_id?: string | null }).stripe_price_id);

  const plan    = getPlan(planId);
  const current = count ?? 0;
  const limit   = plan.limits[resource];

  if (isWithinLimit(planId, resource, current)) {
    return { allowed: true, planId, current, limit };
  }

  const resourceLabels: Record<UsageResource, string> = {
    leads:              'leads',
    campaigns:          'campaigns',
    automations:        'automations',
    social_connections: 'social connections',
    team_members:       'team members',
  };

  return {
    allowed: false,
    planId,
    current,
    limit: limit as number,
    response: NextResponse.json(
      {
        error:   'Plan limit reached',
        code:    'PLAN_LIMIT_REACHED',
        resource,
        current,
        limit,
        message: `Your ${planId} plan allows ${limit === Infinity ? 'unlimited' : limit} ${resourceLabels[resource]}. ` +
                 (planId === 'free' ? 'Upgrade to Pro to unlock more.' :
                  planId === 'pro'  ? 'Upgrade to Enterprise for unlimited access.' :
                  'Contact support.'),
        upgrade_url: '/dashboard?tab=settings&billing=upgrade',
      },
      { status: 402 },
    ),
  };
}

/**
 * Checks whether the org's subscription is in a state that allows API usage.
 * Returns a 402 response if the subscription is past_due, incomplete, or cancelled.
 *
 * Use this on any route that requires an active subscription (not just plan limits).
 */
export async function requireActiveSubscription(orgId: string): Promise<NextResponse | null> {
  const { data: org } = await serverDb
    .from('organizations')
    .select('subscription_status, trial_ends_at')
    .eq('id', orgId)
    .maybeSingle();

  if (!org) return null; // fail open

  const status = org.subscription_status as string;

  // Trial is valid as long as it hasn't expired
  if (status === 'trialing') {
    const endsAt = org.trial_ends_at ? new Date(org.trial_ends_at as string).getTime() : 0;
    if (endsAt > Date.now()) return null; // still active
    return NextResponse.json(
      {
        error:       'Trial expired',
        code:        'TRIAL_EXPIRED',
        message:     'Your 14-day free trial has ended. Upgrade to continue.',
        upgrade_url: '/dashboard?tab=settings&billing=upgrade',
      },
      { status: 402 },
    );
  }

  if (status === 'active') return null;

  const messages: Record<string, string> = {
    past_due:   'Your payment is past due. Update your billing details to continue.',
    incomplete: 'Your subscription payment is incomplete. Please complete payment.',
    unpaid:     'Your subscription is unpaid. Update your billing details.',
    cancelled:  'Your subscription has been cancelled. Resubscribe to continue.',
  };

  return NextResponse.json(
    {
      error:       'Subscription inactive',
      code:        'SUBSCRIPTION_INACTIVE',
      status,
      message:     messages[status] ?? 'Your subscription is not active.',
      upgrade_url: '/dashboard?tab=settings&billing=upgrade',
    },
    { status: 402 },
  );
}
