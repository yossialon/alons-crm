-- ── Schema Drift Fixes ────────────────────────────────────────────────────────
--
-- These columns are referenced in application code but may be absent from
-- the original schema.sql (which is not version-controlled in this repo).
-- All statements use IF NOT EXISTS / DO NOTHING patterns — safe to re-run.

-- ── leads.updated_at ─────────────────────────────────────────────────────────
-- Used in: src/lib/db/repositories/leads.ts → updateLead()
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ── tasks.updated_at ─────────────────────────────────────────────────────────
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- tasks.completed (boolean) — used in getDashboardStats
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT false;

-- ── suppliers.updated_at ─────────────────────────────────────────────────────
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ── clients.updated_at ───────────────────────────────────────────────────────
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ── projects.updated_at ──────────────────────────────────────────────────────
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ── audit_log ────────────────────────────────────────────────────────────────
-- Create if not exists (used by all API routes via insertAuditLog)
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_name  TEXT        NOT NULL DEFAULT '',
  action      TEXT        NOT NULL
    CHECK (action IN ('create', 'update', 'delete', 'import', 'login', 'logout')),
  entity_type TEXT        NOT NULL DEFAULT '',
  entity_id   UUID,
  diff        JSONB,
  ip          TEXT        NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_audit_log_org_date_base
  ON audit_log (org_id, created_at DESC);

-- ── scheduled_outreach ───────────────────────────────────────────────────────
-- Create if not exists (referenced by cron route and outreach API)
CREATE TABLE IF NOT EXISTS scheduled_outreach (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL,
  lead_id       UUID        REFERENCES leads(id) ON DELETE CASCADE,
  template_id   UUID,
  channel       TEXT        NOT NULL DEFAULT 'email'
    CHECK (channel IN ('email', 'sms', 'whatsapp')),
  subject       TEXT        NOT NULL DEFAULT '',
  message       TEXT        NOT NULL DEFAULT '',
  scheduled_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  status        TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at       TIMESTAMPTZ,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sched_outreach_org_base
  ON scheduled_outreach (org_id, status, scheduled_at);

-- ── automation_rules ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_rules (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID        NOT NULL,
  name           TEXT        NOT NULL DEFAULT '',
  enabled        BOOLEAN     NOT NULL DEFAULT true,
  trigger_type   TEXT        NOT NULL
    CHECK (trigger_type IN ('days_since_created', 'days_since_contact', 'status_is')),
  trigger_value  TEXT        NOT NULL DEFAULT '',
  channel        TEXT        NOT NULL DEFAULT 'email'
    CHECK (channel IN ('email', 'sms', 'whatsapp')),
  lead_filter    JSONB       NOT NULL DEFAULT '{}',
  template_id    UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_rules_org
  ON automation_rules (org_id, enabled);

-- ── message_templates ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL,
  name        TEXT        NOT NULL DEFAULT '',
  subject     TEXT        NOT NULL DEFAULT '',
  body        TEXT        NOT NULL DEFAULT '',
  channel     TEXT        NOT NULL DEFAULT 'email'
    CHECK (channel IN ('email', 'sms', 'whatsapp')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_msg_templates_org
  ON message_templates (org_id);

-- ── outreach_log ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outreach_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL,
  lead_id       UUID        REFERENCES leads(id) ON DELETE CASCADE,
  actor_name    TEXT        NOT NULL DEFAULT '',
  method        TEXT        NOT NULL DEFAULT 'email'
    CHECK (method IN ('email', 'sms', 'whatsapp', 'call', 'note')),
  notes         TEXT        NOT NULL DEFAULT '',
  contacted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outreach_log_lead
  ON outreach_log (lead_id, contacted_at DESC);

-- ── scan_results ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_results (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL,
  name        TEXT        NOT NULL DEFAULT '',
  phone       TEXT        NOT NULL DEFAULT '',
  email       TEXT        NOT NULL DEFAULT '',
  type        TEXT,
  area        TEXT        NOT NULL DEFAULT '',
  source      TEXT        NOT NULL DEFAULT '',
  notes       TEXT        NOT NULL DEFAULT '',
  website     TEXT        NOT NULL DEFAULT '',
  rating      TEXT        NOT NULL DEFAULT '',
  potential   TEXT        NOT NULL DEFAULT 'medium',
  imported    BOOLEAN     NOT NULL DEFAULT false,
  imported_as UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scan_results_org
  ON scan_results (org_id, imported, created_at DESC);

-- ── social_connections ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_connections (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  platform      TEXT        NOT NULL
    CHECK (platform IN ('instagram', 'facebook', 'whatsapp', 'google_business')),
  access_token  TEXT        NOT NULL DEFAULT '',
  page_id       TEXT,
  account_id    TEXT,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, platform)
);
CREATE INDEX IF NOT EXISTS idx_social_connections_org
  ON social_connections (org_id, platform);

-- ── Triggers: auto-update updated_at ────────────────────────────────────────
-- Single reusable trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to each table that has updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['leads','tasks','suppliers','clients','projects','message_templates','social_connections']
  LOOP
    -- Drop if exists, recreate
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON %I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;
