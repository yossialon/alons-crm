-- ── RLS policies for campaigns and campaign_sends ────────────────────────────
--
-- Why: These two tables were created in scripts/schema.sql but were omitted
-- from 20260526_rls_policies.sql. Without RLS enabled, the anon Supabase
-- client has unrestricted read/write access to all campaign data.
--
-- Pattern matches 20260526_rls_policies.sql: grant full access to service_role,
-- deny everything to anon/authenticated by default (no policy = no access).
--
-- Safe to re-run: DROP POLICY IF EXISTS is idempotent.

-- ── campaigns ─────────────────────────────────────────────────────────────────
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaigns: service role full access" ON campaigns;
CREATE POLICY "campaigns: service role full access"
  ON campaigns FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── campaign_sends ────────────────────────────────────────────────────────────
ALTER TABLE campaign_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_sends: service role full access" ON campaign_sends;
CREATE POLICY "campaign_sends: service role full access"
  ON campaign_sends FOR ALL TO service_role
  USING (true) WITH CHECK (true);
