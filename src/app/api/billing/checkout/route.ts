import { getAppUrl } from '@/lib/app-url';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { getSessionPayload } from '@/lib/session';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-04-22.dahlia' });
}

function getPriceId(plan: string, interval: string): string | undefined {
  const map: Record<string, string | undefined> = {
    pro_monthly:        process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    pro_yearly:         process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    enterprise_monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
    enterprise_yearly:  process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
  };
  return map[`${plan}_${interval}`];
}

export async function POST(req: NextRequest) {
  const payload = await getSessionPayload(req);
  if (!payload?.org_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const priceId = getPriceId(body.plan ?? 'pro', body.interval ?? 'monthly');

  if (!priceId) {
    return NextResponse.json({ error: 'Invalid plan/interval or Stripe not configured' }, { status: 400 });
  }

  const stripe = getStripe();
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, stripe_customer_id')
    .eq('id', payload.org_id)
    .maybeSingle();
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  let customerId = org.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      metadata: { org_id: org.id },
    });
    customerId = customer.id;
    await supabase.from('organizations').update({ stripe_customer_id: customerId }).eq('id', org.id);
  }

  
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${getAppUrl()}/dashboard?billing=success`,
    cancel_url:  `${getAppUrl()}/dashboard?billing=cancelled`,
    metadata: { org_id: org.id },
    subscription_data: { metadata: { org_id: org.id } },
  });

  return NextResponse.json({ url: session.url });
}
