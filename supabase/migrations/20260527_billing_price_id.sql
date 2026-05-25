-- ── Billing: track active Stripe price ID on each org ───────────────────────
-- Needed so the app can determine whether an org is on Pro vs Enterprise
-- without hardcoding status string heuristics.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Index so webhook lookups by customer ID stay fast
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer
  ON organizations (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
