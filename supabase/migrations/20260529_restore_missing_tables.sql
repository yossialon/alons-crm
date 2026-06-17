-- Restore three tables that exist in earlier migrations but were never applied
-- to the live database. All statements are idempotent (IF NOT EXISTS / DROP IF EXISTS).
--
-- Tables restored:
--   ad_leads              – Meta ad attribution side-table (linked to leads)
--   instagram_interactions – Comment-engagement log + DM auto-reply tracking
--   app_settings          – Runtime key-value config (e.g. instagram_auto_reply)
--
-- NOTE: instagram_interactions is intentionally restored as-is. A follow-up task
-- will migrate the Instagram webhook to use social_messages (platform='instagram')
-- and then drop this table.

-- ── ad_leads ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_leads (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid        NOT NULL,
  lead_id      uuid        REFERENCES leads(id) ON DELETE CASCADE,
  platform     text        NOT NULL DEFAULT 'facebook',
  ad_id        text,
  ad_name      text,
  form_id      text,
  form_name    text,
  campaign_id  text,
  campaign_name text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ad_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ad_leads: service role full access" ON ad_leads;
CREATE POLICY "ad_leads: service role full access"
  ON ad_leads FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ad_leads_org
  ON ad_leads (org_id);

-- ── instagram_interactions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS instagram_interactions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid        NOT NULL,
  commenter_username  text        NOT NULL DEFAULT '',
  commenter_id        text        NOT NULL DEFAULT '',
  comment_text        text        NOT NULL DEFAULT '',
  post_id             text        NOT NULL DEFAULT '',
  dm_sent             boolean     NOT NULL DEFAULT false,
  dm_text             text,
  dm_message_id       text,
  lead_id             uuid        REFERENCES leads(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE instagram_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "instagram_interactions: service role full access" ON instagram_interactions;
CREATE POLICY "instagram_interactions: service role full access"
  ON instagram_interactions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Composite index matches the one in 20260526_indexes.sql
CREATE INDEX IF NOT EXISTS idx_ig_interactions_org_date
  ON instagram_interactions (org_id, created_at DESC);

-- ── app_settings ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid        NOT NULL,
  key        text        NOT NULL,
  value      text        NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, key)
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings: service role full access" ON app_settings;
CREATE POLICY "app_settings: service role full access"
  ON app_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);
