import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverDb } from '@/lib/supabase-server';
import { getSessionPayload } from '@/lib/session';
import { getStripe } from '@/lib/stripe';
import { getAppUrl } from '@/lib/app-url';
import { log } from '@/lib/logger';
import { PLANS } from '@/lib/plans';

const BodySchema = z.object({
  plan:     z.enum(['pro', 'enterprise']).default('pro'),
  interval: z.enum(['monthly', 'yearly']).default('monthly'),
});

function getPriceId(plan: string, interval: string): string | undefined {
  const p = PLANS[plan as 'pro' | 'enterprise'];
  if (!p) return undefined;
  return interval === 'yearly' ? p.stripe_price_yearly : p.stripe_price_monthly;
}

export async function POST(req: NextRequest) {
  const payload = await getSessionPayload(req);
  if (!payload?.org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }
  const { plan, interval } = parsed.data;

  const priceId = getPriceId(plan, interval);
  if (!priceId) {
    return NextResponse.json(
      { error: `Stripe price ID for ${plan}/${interval} is not configured. Set STRIPE_${plan.toUpperCase()}_${interval.toUpperCase()}_PRICE_ID.` },
      { status: 400 },
    );
  }

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch (err) {
    log.error('[billing/checkout] Stripe not configured', err);
    return NextResponse.json({ error: 'Billing not available' }, { status: 503 });
  }

  const { data: org } = await serverDb
    .from('organizations')
    .select('id, name, stripe_customer_id, trial_ends_at, subscription_status')
    .eq('id', payload.org_id)
    .maybeSingle();

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  // Ensure a Stripe customer record exists
  let customerId = org.stripe_customer_id as string | null;
  if (!customerId) {
    try {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: { org_id: org.id },
      });
      customerId = customer.id;
      await serverDb
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', org.id);
    } catch (err) {
      log.error('[billing/checkout] Failed to create Stripe customer', err, { orgId: org.id });
      return NextResponse.json({ error: 'Could not create billing account' }, { status: 500 });
    }
  }

  // If the org is still within its trial window, pass remaining days to Stripe
  // so the subscription starts at end-of-trial instead of charging immediately.
  let trialEnd: number | undefined;
  if (org.subscription_status === 'trialing' && org.trial_ends_at) {
    const endsAt = new Date(org.trial_ends_at as string).getTime();
    const remainingMs = endsAt - Date.now();
    if (remainingMs > 60_000) {
      // Only pass trial_end if > 1 minute remains (Stripe minimum)
      trialEnd = Math.floor(endsAt / 1000);
    }
  }

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      ...(trialEnd ? { subscription_data: { trial_end: trialEnd, metadata: { org_id: org.id } } }
                   : { subscription_data: { metadata: { org_id: org.id } } }),
      allow_promotion_codes: true,
      success_url: `${getAppUrl()}/dashboard?billing=success`,
      cancel_url:  `${getAppUrl()}/dashboard?billing=cancelled`,
      metadata: { org_id: org.id },
    });

    log.info('[billing/checkout] Session created', { orgId: org.id, plan, interval, sessionId: session.id });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    log.error('[billing/checkout] Failed to create checkout session', err, { orgId: org.id, plan, interval });
    return NextResponse.json({ error: 'Could not create checkout session' }, { status: 500 });
  }
}
