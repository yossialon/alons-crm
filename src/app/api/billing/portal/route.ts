import { NextRequest, NextResponse } from 'next/server';
import { serverDb } from '@/lib/supabase-server';
import { getSessionPayload } from '@/lib/session';
import { getStripe } from '@/lib/stripe';
import { getAppUrl } from '@/lib/app-url';
import { log } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const payload = await getSessionPayload(req);
  if (!payload?.org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: org } = await serverDb
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', payload.org_id)
    .maybeSingle();

  if (!org?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No billing account found. Please subscribe first.' },
      { status: 404 },
    );
  }

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch (err) {
    log.error('[billing/portal] Stripe not configured', err);
    return NextResponse.json({ error: 'Billing not available' }, { status: 503 });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer:   org.stripe_customer_id as string,
      return_url: `${getAppUrl()}/dashboard`,
    });

    log.info('[billing/portal] Session created', { orgId: payload.org_id });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    log.error('[billing/portal] Failed to create portal session', err, { orgId: payload.org_id });
    return NextResponse.json({ error: 'Could not open billing portal' }, { status: 500 });
  }
}
