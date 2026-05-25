-- ── RLS Policies for all CRM tables ──────────────────────────────────────────
--
-- Architecture:
--   • API routes use the SERVICE ROLE key (bypasses RLS by design).
--     App-level org_id enforcement is the primary isolation layer.
--   • These policies are a DEFENSE-IN-DEPTH layer that ensures:
--       1. Direct anon-key access (e.g. from the browser, Postman) can never
--          read or write any row — preventing accidental exposure.
--       2. Supabase Studio / SQL editor access is still protected.
--       3. Any future client-side Supabase calls are denied by default.
--
-- Pattern for each table:
--   ENABLE ROW LEVEL SECURITY
--   Grant service_role full access (explicit, belt-and-suspenders)
--   No policy for anon/authenticated → those roles get no access by default
--
-- Safe to re-run: all statements are idempotent.

-- ── leads ─────────────────────────────────────────────────────────────────────
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads: service role full access" ON leads;
CREATE POLICY "leads: service role full access"
  ON leads FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── tasks ─────────────────────────────────────────────────────────────────────
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks: service role full access" ON tasks;
CREATE POLICY "tasks: service role full access"
  ON tasks FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── suppliers ─────────────────────────────────────────────────────────────────
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suppliers: service role full access" ON suppliers;
CREATE POLICY "suppliers: service role full access"
  ON suppliers FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── clients ───────────────────────────────────────────────────────────────────
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients: service role full access" ON clients;
CREATE POLICY "clients: service role full access"
  ON clients FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── projects ──────────────────────────────────────────────────────────────────
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects: service role full access" ON projects;
CREATE POLICY "projects: service role full access"
  ON projects FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── outreach_log ──────────────────────────────────────────────────────────────
ALTER TABLE outreach_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outreach_log: service role full access" ON outreach_log;
CREATE POLICY "outreach_log: service role full access"
  ON outreach_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── scheduled_outreach ────────────────────────────────────────────────────────
ALTER TABLE scheduled_outreach ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scheduled_outreach: service role full access" ON scheduled_outreach;
CREATE POLICY "scheduled_outreach: service role full access"
  ON scheduled_outreach FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── scan_results ──────────────────────────────────────────────────────────────
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scan_results: service role full access" ON scan_results;
CREATE POLICY "scan_results: service role full access"
  ON scan_results FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── audit_log ─────────────────────────────────────────────────────────────────
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log: service role full access" ON audit_log;
CREATE POLICY "audit_log: service role full access"
  ON audit_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── agent_runs ────────────────────────────────────────────────────────────────
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_runs: service role full access" ON agent_runs;
CREATE POLICY "agent_runs: service role full access"
  ON agent_runs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── agent_tasks ─ (already has policy, refresh idempotently) ──────────────────
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_tasks: service role full access" ON agent_tasks;
CREATE POLICY "agent_tasks: service role full access"
  ON agent_tasks FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── system_health ─────────────────────────────────────────────────────────────
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_health: service role full access" ON system_health;
CREATE POLICY "system_health: service role full access"
  ON system_health FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── tech_recommendations ──────────────────────────────────────────────────────
ALTER TABLE tech_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tech_recommendations: service role full access" ON tech_recommendations;
CREATE POLICY "tech_recommendations: service role full access"
  ON tech_recommendations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── campaign_recommendations ──────────────────────────────────────────────────
ALTER TABLE campaign_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_recommendations: service role full access" ON campaign_recommendations;
CREATE POLICY "campaign_recommendations: service role full access"
  ON campaign_recommendations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── campaign_learnings ─ (already has policy, refresh idempotently) ───────────
ALTER TABLE campaign_learnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "campaign_learnings: service role full access" ON campaign_learnings;
CREATE POLICY "campaign_learnings: service role full access"
  ON campaign_learnings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── competitors ───────────────────────────────────────────────────────────────
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "competitors: service role full access" ON competitors;
CREATE POLICY "competitors: service role full access"
  ON competitors FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── social_messages ───────────────────────────────────────────────────────────
ALTER TABLE social_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "social_messages: service role full access" ON social_messages;
CREATE POLICY "social_messages: service role full access"
  ON social_messages FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── instagram_interactions ────────────────────────────────────────────────────
ALTER TABLE instagram_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "instagram_interactions: service role full access" ON instagram_interactions;
CREATE POLICY "instagram_interactions: service role full access"
  ON instagram_interactions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── ad_leads ──────────────────────────────────────────────────────────────────
ALTER TABLE ad_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ad_leads: service role full access" ON ad_leads;
CREATE POLICY "ad_leads: service role full access"
  ON ad_leads FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── app_settings ──────────────────────────────────────────────────────────────
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings: service role full access" ON app_settings;
CREATE POLICY "app_settings: service role full access"
  ON app_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── job_completions ───────────────────────────────────────────────────────────
ALTER TABLE job_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_completions: service role full access" ON job_completions;
CREATE POLICY "job_completions: service role full access"
  ON job_completions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── review_requests ───────────────────────────────────────────────────────────
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_requests: service role full access" ON review_requests;
CREATE POLICY "review_requests: service role full access"
  ON review_requests FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── brand_settings ────────────────────────────────────────────────────────────
ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_settings: service role full access" ON brand_settings;
CREATE POLICY "brand_settings: service role full access"
  ON brand_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── creative_templates ────────────────────────────────────────────────────────
ALTER TABLE creative_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creative_templates: service role full access" ON creative_templates;
CREATE POLICY "creative_templates: service role full access"
  ON creative_templates FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── message_templates (outreach) ──────────────────────────────────────────────
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_templates: service role full access" ON message_templates;
CREATE POLICY "message_templates: service role full access"
  ON message_templates FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── automation_rules ──────────────────────────────────────────────────────────
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automation_rules: service role full access" ON automation_rules;
CREATE POLICY "automation_rules: service role full access"
  ON automation_rules FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── organizations ─────────────────────────────────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations: service role full access" ON organizations;
CREATE POLICY "organizations: service role full access"
  ON organizations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── users ─────────────────────────────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users: service role full access" ON users;
CREATE POLICY "users: service role full access"
  ON users FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── Verification query ────────────────────────────────────────────────────────
-- Run this after applying to confirm all tables have RLS enabled:
--
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
--
-- All rows should show rowsecurity = true.
