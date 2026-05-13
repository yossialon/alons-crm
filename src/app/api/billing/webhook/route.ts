import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? '', { apiVersion: '2026-04-22.dahlia' });
}

export const config = { api: { bodyParser: false } };

async function updateOrgFromSubscription(sub: Stripe.Subscription) {
  const orgId = sub.metadata?.org_id;
  if (!orgId) return;

  const status = sub.status === 'active' ? 'active'
    : sub.status === 'trialing' ? 'trialing'
    : sub.status === 'past_due' ? 'past_due'
    : 'cancelled';

  await supabase
    .from('organizations')
    .update({ stripe_subscription_id: sub.id, subscription_status: status, updated_at: new Date().toISOString() })
    .eq('id', orgId);
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && session.metadata?.org_id) {
          const sub = await stripe.subscriptions.retrieve(String(session.subscription));
          await updateOrgFromSubscription(sub);
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await updateOrgFromSubscription(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded': {
        const inv = event.data.object as unknown as { subscription?: string };
        if (inv.subscription) {
          const sub = await stripe.subscriptions.retrieve(inv.subscription);
          await updateOrgFromSubscription(sub);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as unknown as { subscription?: string };
        if (inv.subscription) {
          const sub = await stripe.subscriptions.retrieve(inv.subscription);
          const orgId = sub.metadata?.org_id;
          if (orgId) {
            await supabase.from('organizations').update({ subscription_status: 'past_due' }).eq('id', orgId);
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error('[webhook] handler error:', err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
