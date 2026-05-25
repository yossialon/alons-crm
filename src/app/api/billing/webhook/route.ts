import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { serverDb } from '@/lib/supabase-server';
import { getStripe, normalizeSubStatus, getPlanFromPriceId } from '@/lib/stripe';
import { log } from '@/lib/logger';

// ── IMPORTANT ─────────────────────────────────────────────────────────────────
// App Router reads the raw body via req.text() — do NOT export the Pages Router
// `export const config = { api: { bodyParser: false } }` here; it has no effect
// and will cause a TypeScript error.
// ─────────────────────────────────────────────────────────────────────────────

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Persist the current state of a Stripe Subscription to `organizations`.
 * Derives plan tier from the first subscription item's price ID.
 */
async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const orgId = sub.metadata?.org_id;
  if (!orgId) {
    log.warn('[billing/webhook] Subscription has no org_id in metadata', { subId: sub.id });
    return;
  }

  const priceId  = sub.items.data[0]?.price?.id ?? null;
  const planId   = getPlanFromPriceId(priceId);
  const status   = normalizeSubStatus(sub.status);

  const { error } = await serverDb
    .from('organizations')
    .update({
      stripe_subscription_id: sub.id,
      stripe_price_id:        priceId,
      subscription_status:    status,
      // Seats limit follows plan tier
      seats_limit:            planId === 'enterprise' ? 999 : planId === 'pro' ? 5 : 1,
      updated_at:             new Date().toISOString(),
    })
    .eq('id', orgId);

  if (error) {
    log.error('[billing/webhook] DB update failed', error, { orgId, subId: sub.id, status, planId });
  } else {
    log.info('[billing/webhook] Org synced', { orgId, subId: sub.id, status, planId });
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const sig           = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    log.warn('[billing/webhook] Missing stripe-signature or STRIPE_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let stripe: ReturnType<typeof getStripe>;
  try {
    stripe = getStripe();
  } catch (err) {
    log.error('[billing/webhook] Stripe not configured', err);
    return NextResponse.json({ error: 'Billing not available' }, { status: 503 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    log.error('[billing/webhook] Signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  log.info('[billing/webhook] Received', { type: event.type, id: event.id });

  try {
    switch (event.type) {
      // ── Checkout completed ───────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && session.metadata?.org_id) {
          const sub = await stripe.subscriptions.retrieve(String(session.subscription));
          await syncSubscription(sub);
        }
        break;
      }

      // ── Subscription lifecycle ───────────────────────────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;

      // ── Payment events ───────────────────────────────────────────────────
      // Stripe SDK v22+: invoice.subscription moved to
      // invoice.parent.subscription_details.subscription
      case 'invoice.payment_succeeded': {
        const inv   = event.data.object as Stripe.Invoice;
        const subId = inv.parent?.subscription_details?.subscription;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(String(subId));
          await syncSubscription(sub);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const inv   = event.data.object as Stripe.Invoice;
        const subId = inv.parent?.subscription_details?.subscription;
        if (subId) {
          const sub   = await stripe.subscriptions.retrieve(String(subId));
          const orgId = sub.metadata?.org_id;
          if (orgId) {
            await serverDb
              .from('organizations')
              .update({ subscription_status: 'past_due', updated_at: new Date().toISOString() })
              .eq('id', orgId);
            log.warn('[billing/webhook] Payment failed — org marked past_due', { orgId, subId: sub.id });
          }
        }
        break;
      }

      // ── Upcoming invoice reminder (optional: send owner notification) ────
      case 'invoice.upcoming': {
        const inv = event.data.object as Stripe.Invoice;
        log.info('[billing/webhook] Upcoming invoice', {
          customer:  inv.customer,
          amount:    inv.amount_due,
          due:       inv.next_payment_attempt,
        });
        // TODO: send owner reminder via WhatsApp if desired
        break;
      }

      default:
        // Unhandled events — not an error, just log and return 200
        log.info('[billing/webhook] Unhandled event type', { type: event.type });
        break;
    }
  } catch (err) {
    log.error('[billing/webhook] Handler error', err, { type: event.type, id: event.id });
    // Return 500 so Stripe retries the event
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
