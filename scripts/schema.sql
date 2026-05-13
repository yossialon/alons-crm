-- ============================================================
-- Alon's CRM — PostgreSQL schema
-- Run once against a fresh Supabase / Neon / PG 15+ database.
-- Safe to re-run: all statements use IF NOT EXISTS / ON CONFLICT.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
-- gen_random_uuid() is built-in since PG 13; no extension needed.

-- ── Organizations (tenants) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL UNIQUE,
  plan       TEXT        NOT NULL DEFAULT 'free'
               CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Default org for single-tenant operation (ORG_ID in .env)
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Alon''s Kitchens', 'alons-kitchens')
ON CONFLICT DO NOTHING;

-- ── Leads ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        NOT NULL REFERENCES organizations(id),
  name       TEXT        NOT NULL,
  phone      TEXT        NOT NULL,
  email      TEXT        NOT NULL DEFAULT '',
  type       TEXT        NOT NULL DEFAULT 'Homeowner'
               CHECK (type IN ('Homeowner', 'Contractor', 'Developer')),
  area       TEXT        NOT NULL DEFAULT 'Boca Raton',
  status     TEXT        NOT NULL DEFAULT 'new'
               CHECK (status IN ('new', 'contacted', 'qualified', 'closed')),
  source     TEXT        NOT NULL DEFAULT 'Manual',
  notes      TEXT        NOT NULL DEFAULT '',
  website    TEXT        NOT NULL DEFAULT '',
  rating     TEXT        NOT NULL DEFAULT '',
  potential  TEXT        NOT NULL DEFAULT 'medium'
               CHECK (potential IN ('high', 'medium', 'low')),
  date       DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_org_idx        ON leads(org_id);
CREATE INDEX IF NOT EXISTS leads_status_idx     ON leads(org_id, status);
CREATE INDEX IF NOT EXISTS leads_area_idx       ON leads(org_id, area);
CREATE INDEX IF NOT EXISTS leads_created_idx    ON leads(org_id, created_at DESC);

-- ── Clients (promoted from lead) ──────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        NOT NULL REFERENCES organizations(id),
  lead_id    UUID        REFERENCES leads(id) ON DELETE SET NULL,
  name       TEXT        NOT NULL,
  phone      TEXT        NOT NULL DEFAULT '',
  email      TEXT        NOT NULL DEFAULT '',
  address    TEXT        NOT NULL DEFAULT '',
  notes      TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clients_org_idx  ON clients(org_id);
CREATE INDEX IF NOT EXISTS clients_lead_idx ON clients(lead_id);

-- ── Projects ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID         NOT NULL REFERENCES organizations(id),
  client_id   UUID         REFERENCES clients(id) ON DELETE SET NULL,
  lead_id     UUID         REFERENCES leads(id)   ON DELETE SET NULL,
  name        TEXT         NOT NULL,
  status      TEXT         NOT NULL DEFAULT 'estimate'
                CHECK (status IN ('estimate', 'active', 'completed', 'cancelled')),
  budget      NUMERIC(12,2),
  start_date  DATE,
  end_date    DATE,
  notes       TEXT         NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_org_idx    ON projects(org_id);
CREATE INDEX IF NOT EXISTS projects_client_idx ON projects(client_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(org_id, status);

-- ── Tasks ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES organizations(id),
  lead_id     UUID        REFERENCES leads(id)    ON DELETE CASCADE,
  project_id  UUID        REFERENCES projects(id) ON DELETE CASCADE,
  client_id   UUID        REFERENCES clients(id)  ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  status      TEXT        NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'done')),
  priority    TEXT        NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('high', 'medium', 'low')),
  due_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_org_idx     ON tasks(org_id);
CREATE INDEX IF NOT EXISTS tasks_lead_idx    ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS tasks_project_idx ON tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx  ON tasks(org_id, status);

-- ── Suppliers ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL REFERENCES organizations(id),
  name         TEXT        NOT NULL,
  contact      TEXT        NOT NULL DEFAULT '',
  phone        TEXT        NOT NULL DEFAULT '',
  email        TEXT        NOT NULL DEFAULT '',
  category     TEXT        NOT NULL DEFAULT 'Hardware',
  status       TEXT        NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'pending', 'inactive')),
  notes        TEXT        NOT NULL DEFAULT '',
  last_contact DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS suppliers_org_idx ON suppliers(org_id);

-- ── Scan results ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_results (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL REFERENCES organizations(id),
  name        TEXT        NOT NULL DEFAULT '',
  phone       TEXT        NOT NULL DEFAULT '',
  email       TEXT        NOT NULL DEFAULT '',
  website     TEXT        NOT NULL DEFAULT '',
  area        TEXT        NOT NULL DEFAULT '',
  type        TEXT        NOT NULL DEFAULT '',
  source      TEXT        NOT NULL DEFAULT '',
  rating      TEXT        NOT NULL DEFAULT '',
  potential   TEXT        NOT NULL DEFAULT 'medium',
  notes       TEXT        NOT NULL DEFAULT '',
  scan_date   TIMESTAMPTZ NOT NULL DEFAULT now(),
  imported    BOOLEAN     NOT NULL DEFAULT false,
  imported_as UUID        REFERENCES leads(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scan_results_org_idx      ON scan_results(org_id);
CREATE INDEX IF NOT EXISTS scan_results_imported_idx ON scan_results(org_id, imported);

-- ── Outreach log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outreach_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL REFERENCES organizations(id),
  lead_id      UUID        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  method       TEXT        NOT NULL
                 CHECK (method IN ('email', 'phone', 'sms', 'in_person', 'social')),
  direction    TEXT        NOT NULL DEFAULT 'outbound'
                 CHECK (direction IN ('outbound', 'inbound')),
  outcome      TEXT        CHECK (outcome IN (
                   'no_answer', 'callback', 'interested',
                   'not_interested', 'follow_up', 'converted'
                 )),
  notes        TEXT        NOT NULL DEFAULT '',
  actor_name   TEXT        NOT NULL DEFAULT '',
  contacted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outreach_lead_idx ON outreach_log(lead_id);
CREATE INDEX IF NOT EXISTS outreach_org_idx  ON outreach_log(org_id);

-- ── Audit log ─────────────────────────────────────────────────
-- Not a foreign key on org_id so audit rows survive org deletion.
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL,
  actor_name  TEXT        NOT NULL DEFAULT '',
  action      TEXT        NOT NULL
                CHECK (action IN ('create', 'update', 'delete', 'import', 'login', 'logout')),
  entity_type TEXT        NOT NULL,
  entity_id   UUID,
  diff        JSONB,
  ip          TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_org_idx     ON audit_log(org_id);
CREATE INDEX IF NOT EXISTS audit_entity_idx  ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_log(created_at DESC);

-- ── Row-level security stubs (enable when ready for full multi-tenancy) ────────
-- ALTER TABLE leads       ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE clients     ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE projects    ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tasks       ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE suppliers   ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE outreach_log ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_log   ENABLE ROW LEVEL SECURITY;
--
-- Example policy (repeat for each table):
-- CREATE POLICY tenant_isolation ON leads
--   USING (org_id = current_setting('app.current_org_id')::uuid);

-- ── Social connections (OAuth tokens per platform) ────────────────────────────
CREATE TABLE IF NOT EXISTS social_connections (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL    DEFAULT '00000000-0000-0000-0000-000000000001',
  platform     TEXT        NOT NULL    CHECK (platform IN ('facebook', 'instagram', 'whatsapp', 'linkedin', 'tiktok')),
  account_name TEXT        NOT NULL    DEFAULT '',
  account_id   TEXT        NOT NULL,
  access_token TEXT        NOT NULL,
  token_expiry TIMESTAMPTZ,
  page_id      TEXT,
  page_name    TEXT,
  metadata     JSONB       NOT NULL    DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL    DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL    DEFAULT now(),
  UNIQUE (org_id, platform, account_id)
);

-- ── Social messages (unified inbox store) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_messages (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL    DEFAULT '00000000-0000-0000-0000-000000000001',
  connection_id UUID        NOT NULL    REFERENCES social_connections(id) ON DELETE CASCADE,
  platform      TEXT        NOT NULL    CHECK (platform IN ('facebook', 'instagram', 'whatsapp', 'linkedin', 'tiktok')),
  external_id   TEXT        NOT NULL,
  thread_id     TEXT        NOT NULL,
  direction     TEXT        NOT NULL    CHECK (direction IN ('inbound', 'outbound')),
  sender_id     TEXT        NOT NULL    DEFAULT '',
  sender_name   TEXT        NOT NULL    DEFAULT '',
  sender_avatar TEXT,
  content       TEXT        NOT NULL    DEFAULT '',
  attachments   JSONB       NOT NULL    DEFAULT '[]',
  read_at       TIMESTAMPTZ,
  replied_at    TIMESTAMPTZ,
  lead_id       UUID        REFERENCES leads(id) ON DELETE SET NULL,
  raw           JSONB       NOT NULL    DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL    DEFAULT now(),
  UNIQUE (org_id, platform, external_id)
);

CREATE INDEX IF NOT EXISTS social_conn_org_idx    ON social_connections(org_id);
CREATE INDEX IF NOT EXISTS social_msg_org_idx     ON social_messages(org_id);
CREATE INDEX IF NOT EXISTS social_msg_thread_idx  ON social_messages(thread_id);
CREATE INDEX IF NOT EXISTS social_msg_created_idx ON social_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS social_msg_unread_idx  ON social_messages(org_id, read_at) WHERE read_at IS NULL;

-- ── Message templates ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_templates (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID        NOT NULL    DEFAULT '00000000-0000-0000-0000-000000000001',
  name       TEXT        NOT NULL,
  channel    TEXT        NOT NULL    CHECK (channel IN ('email', 'sms', 'whatsapp')),
  subject    TEXT        NOT NULL    DEFAULT '',
  body       TEXT        NOT NULL    DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL    DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL    DEFAULT now()
);

-- ── Campaigns ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL    DEFAULT '00000000-0000-0000-0000-000000000001',
  name          TEXT        NOT NULL,
  template_id   UUID        REFERENCES message_templates(id) ON DELETE SET NULL,
  channel       TEXT        NOT NULL    CHECK (channel IN ('email', 'sms', 'whatsapp')),
  status        TEXT        NOT NULL    DEFAULT 'draft'
                            CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused')),
  target_filter JSONB       NOT NULL    DEFAULT '{}',
  scheduled_at  TIMESTAMPTZ,
  sent_count    INT         NOT NULL    DEFAULT 0,
  open_count    INT         NOT NULL    DEFAULT 0,
  click_count   INT         NOT NULL    DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL    DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL    DEFAULT now()
);

-- ── Per-recipient campaign tracking ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_sends (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        NOT NULL    DEFAULT '00000000-0000-0000-0000-000000000001',
  campaign_id UUID        NOT NULL    REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id     UUID        NOT NULL    REFERENCES leads(id)     ON DELETE CASCADE,
  status      TEXT        NOT NULL    DEFAULT 'pending'
              CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  sent_at     TIMESTAMPTZ,
  opened_at   TIMESTAMPTZ,
  clicked_at  TIMESTAMPTZ,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL    DEFAULT now(),
  UNIQUE (campaign_id, lead_id)
);

-- ── Scheduled follow-ups ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scheduled_outreach (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL    DEFAULT '00000000-0000-0000-0000-000000000001',
  lead_id      UUID        NOT NULL    REFERENCES leads(id) ON DELETE CASCADE,
  template_id  UUID        REFERENCES message_templates(id) ON DELETE SET NULL,
  channel      TEXT        NOT NULL    CHECK (channel IN ('email', 'sms', 'whatsapp')),
  subject      TEXT        NOT NULL    DEFAULT '',
  message      TEXT        NOT NULL    DEFAULT '',
  scheduled_at TIMESTAMPTZ NOT NULL,
  status       TEXT        NOT NULL    DEFAULT 'pending'
               CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  sent_at      TIMESTAMPTZ,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL    DEFAULT now()
);

-- ── Automation rules (lead nurturing) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_rules (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID        NOT NULL    DEFAULT '00000000-0000-0000-0000-000000000001',
  name          TEXT        NOT NULL,
  enabled       BOOLEAN     NOT NULL    DEFAULT true,
  trigger_type  TEXT        NOT NULL
                CHECK (trigger_type IN ('days_since_created', 'days_since_contact', 'status_is')),
  trigger_value TEXT        NOT NULL    DEFAULT '',
  lead_filter   JSONB       NOT NULL    DEFAULT '{}',
  template_id   UUID        REFERENCES message_templates(id) ON DELETE SET NULL,
  channel       TEXT        NOT NULL    CHECK (channel IN ('email', 'sms', 'whatsapp')),
  created_at    TIMESTAMPTZ NOT NULL    DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL    DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tmpl_org_idx      ON message_templates(org_id);
CREATE INDEX IF NOT EXISTS camp_org_idx      ON campaigns(org_id);
CREATE INDEX IF NOT EXISTS csend_camp_idx    ON campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS csend_lead_idx    ON campaign_sends(lead_id);
CREATE INDEX IF NOT EXISTS sched_org_idx     ON scheduled_outreach(org_id);
CREATE INDEX IF NOT EXISTS sched_status_idx  ON scheduled_outreach(org_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS auto_org_idx      ON automation_rules(org_id);

-- ── SaaS additions ────────────────────────────────────────────
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status    TEXT NOT NULL DEFAULT 'trialing'
  CHECK (subscription_status IN ('trialing','active','past_due','canceled','unpaid'));
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at          TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS seats_limit            INT NOT NULL DEFAULT 3;

-- ── Users (org members) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email         TEXT     NOT NULL UNIQUE,
  password_hash TEXT     NOT NULL,
  name          TEXT     NOT NULL DEFAULT '',
  role          TEXT     NOT NULL DEFAULT 'member'
                  CHECK (role IN ('owner', 'admin', 'member')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_org_idx   ON users(org_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- ── Org invites ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_invites (
  id         UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email      TEXT     NOT NULL,
  role       TEXT     NOT NULL DEFAULT 'member',
  token      TEXT     NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by UUID     REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invites_org_idx   ON org_invites(org_id);
CREATE INDEX IF NOT EXISTS invites_token_idx ON org_invites(token);

-- ── Password reset tokens ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         TEXT        PRIMARY KEY DEFAULT encode(gen_random_bytes(32), 'hex'),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '1 hour',
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prt_user_idx ON password_reset_tokens(user_id);
