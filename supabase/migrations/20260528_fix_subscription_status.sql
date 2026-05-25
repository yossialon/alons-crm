-- ── Fix organizations.subscription_status CHECK constraint ───────────────────
--
-- Why: normalizeSubStatus() in src/lib/stripe.ts returns 'canceled' (1 L,
-- American spelling) and 'incomplete', but the original CHECK constraint only
-- listed 'canceled' and was missing 'incomplete'. Any Stripe webhook event for
-- a canceled or incomplete-expired subscription would fail with a DB constraint
-- violation, leaving the org's subscription_status stale in the database.
--
-- Safe to re-run: DROP CONSTRAINT IF EXISTS is idempotent.

ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_subscription_status_check;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_subscription_status_check
  CHECK (subscription_status IN (
    'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid'
  ));
