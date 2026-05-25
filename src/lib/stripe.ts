/**
 * Stripe singleton + billing helpers.
 *
 * - Lazy singleton: validated on first call, not at build time.
 * - `getPlanFromPriceId` maps a Stripe Price ID → PlanId using the same env
 *   vars already defined in `src/lib/plans.ts` — single source of truth.
 * - Throws descriptive errors when env vars are missing in production.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY           – Stripe secret key (sk_live_… / sk_test_…)
 *   STRIPE_WEBHOOK_SECRET       – whsec_… from dashboard or CLI
 *   STRIPE_PRO_MONTHLY_PRICE_ID
 *   STRIPE_PRO_YEARLY_PRICE_ID
 *   STRIPE_ENTERPRISE_MONTHLY_PRICE_ID
 *   STRIPE_ENTERPRISE_YEARLY_PRICE_ID
 */

import Stripe from 'stripe';
import { log } from '@/lib/logger';
import { PLANS, type PlanId } from '@/lib/plans';

// Keep in sync with the Stripe dashboard API version used during development.
export const STRIPE_API_VERSION = '2026-04-22.dahlia' as const;

// ── Singleton ────────────────────────────────────────────────────────────────
let _stripe: Stripe | null = null;

/**
 * Returns the shared Stripe client.
 * Creates it on first call; throws if STRIPE_SECRET_KEY is absent.
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      '[stripe] STRIPE_SECRET_KEY is not set. ' +
      'Add it to your .env.local and Vercel environment variables.'
    );
  }

  _stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
  return _stripe;
}

// ── Plan helpers ─────────────────────────────────────────────────────────────

/**
 * Maps a Stripe Price ID to a PlanId using the price IDs already configured
 * in PLANS. Returns 'free' for null/unknown price IDs.
 */
export function getPlanFromPriceId(priceId: string | null | undefined): PlanId {
  if (!priceId) return 'free';

  for (const [planId, plan] of Object.entries(PLANS)) {
    if (
      (plan.stripe_price_monthly && plan.stripe_price_monthly === priceId) ||
      (plan.stripe_price_yearly  && plan.stripe_price_yearly  === priceId)
    ) {
      return planId as PlanId;
    }
  }

  log.warn('[stripe] Unrecognized Stripe price ID — defaulting to free', { priceId });
  return 'free';
}

/**
 * Maps a subscription status to the canonical value stored in
 * `organizations.subscription_status`.
 */
export function normalizeSubStatus(
  status: Stripe.Subscription.Status,
): 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid' {
  switch (status) {
    case 'active':              return 'active';
    case 'trialing':            return 'trialing';
    case 'past_due':            return 'past_due';
    case 'canceled':            return 'canceled';
    case 'incomplete':          return 'incomplete';
    case 'incomplete_expired':  return 'canceled';
    case 'unpaid':              return 'unpaid';
    case 'paused':              return 'past_due';
    default:                    return 'canceled';
  }
}
