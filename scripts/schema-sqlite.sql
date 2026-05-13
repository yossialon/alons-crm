-- ============================================================
-- Alon's CRM — SQLite schema
-- Run once against a local SQLite database.
-- Safe to re-run: all statements use IF NOT EXISTS.
-- ============================================================

-- ── Organizations (tenants) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id         TEXT        PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL UNIQUE,
  plan       TEXT        NOT NULL DEFAULT 'free'
               CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Default org for single-tenant operation (ORG_ID in .env)
INSERT OR IGNORE INTO organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Alon''s Kitchens', 'alons-kitchens');

-- ── Leads ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id         TEXT        PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  org_id     TEXT        NOT NULL REFERENCES organizations(id),
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
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS leads_org_idx        ON leads(org_id);
CREATE INDEX IF NOT EXISTS leads_status_idx     ON leads(org_id, status);

-- ── Suppliers ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id         TEXT        PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  org_id     TEXT        NOT NULL REFERENCES organizations(id),
  name       TEXT        NOT NULL,
  phone      TEXT        NOT NULL DEFAULT '',
  email      TEXT        NOT NULL DEFAULT '',
  company    TEXT        NOT NULL DEFAULT '',
  status     TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'active', 'inactive')),
  notes      TEXT        NOT NULL DEFAULT '',
  website    TEXT        NOT NULL DEFAULT '',
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS suppliers_org_idx ON suppliers(org_id);

-- ── Scan Results ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_results (
  id           TEXT        PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  org_id       TEXT        NOT NULL REFERENCES organizations(id),
  name         TEXT        NOT NULL,
  phone        TEXT        NOT NULL DEFAULT '',
  email        TEXT        NOT NULL DEFAULT '',
  type         TEXT        NOT NULL DEFAULT 'Homeowner',
  area         TEXT        NOT NULL DEFAULT 'Boca Raton',
  source       TEXT        NOT NULL DEFAULT '',
  notes        TEXT        NOT NULL DEFAULT '',
  website      TEXT        NOT NULL DEFAULT '',
  rating       TEXT        NOT NULL DEFAULT '',
  potential    TEXT        NOT NULL DEFAULT 'medium',
  imported     INTEGER     NOT NULL DEFAULT 0,
  imported_as  TEXT        DEFAULT NULL,
  created_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS scan_results_org_idx ON scan_results(org_id);

-- ── Clients (promoted from lead) ──────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id         TEXT        PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  org_id     TEXT        NOT NULL REFERENCES organizations(id),
  lead_id    TEXT        REFERENCES leads(id) ON DELETE SET NULL,
  name       TEXT        NOT NULL,
  phone      TEXT        NOT NULL DEFAULT '',
  email      TEXT        NOT NULL DEFAULT '',
  address    TEXT        NOT NULL DEFAULT '',
  notes      TEXT        NOT NULL DEFAULT '',
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS clients_org_idx  ON clients(org_id);
CREATE INDEX IF NOT EXISTS clients_lead_idx ON clients(lead_id);

-- ── Projects ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT        PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  org_id      TEXT        NOT NULL REFERENCES organizations(id),
  client_id   TEXT        REFERENCES clients(id) ON DELETE SET NULL,
  lead_id     TEXT        REFERENCES leads(id)   ON DELETE SET NULL,
  name        TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'estimate'
                CHECK (status IN ('estimate', 'active', 'completed', 'cancelled')),
  budget      REAL,
  start_date  DATE,
  end_date    DATE,
  notes       TEXT        NOT NULL DEFAULT '',
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS projects_org_idx    ON projects(org_id);
CREATE INDEX IF NOT EXISTS projects_client_idx ON projects(client_id);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(org_id, status);

-- ── Tasks ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT        PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  org_id      TEXT        NOT NULL REFERENCES organizations(id),
  lead_id     TEXT        REFERENCES leads(id)    ON DELETE CASCADE,
  project_id  TEXT        REFERENCES projects(id) ON DELETE CASCADE,
  client_id   TEXT        REFERENCES clients(id)  ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  status      TEXT        NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'done')),
  priority    TEXT        NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('high', 'medium', 'low')),
  due_date    DATE,
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS tasks_org_idx     ON tasks(org_id);
CREATE INDEX IF NOT EXISTS tasks_lead_idx    ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS tasks_project_idx ON tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx  ON tasks(org_id, status);

-- ── Outreach log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outreach_log (
  id           TEXT        PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  org_id       TEXT        NOT NULL REFERENCES organizations(id),
  lead_id      TEXT        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
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
  contacted_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS outreach_lead_idx ON outreach_log(lead_id);
CREATE INDEX IF NOT EXISTS outreach_org_idx  ON outreach_log(org_id);

-- ── Audit log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT        PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  org_id      TEXT        NOT NULL,
  actor_name  TEXT        NOT NULL DEFAULT '',
  action      TEXT        NOT NULL
                CHECK (action IN ('create', 'update', 'delete', 'import', 'login', 'logout')),
  entity_type TEXT        NOT NULL,
  entity_id   TEXT,
  diff        TEXT,
  ip          TEXT        NOT NULL DEFAULT '',
  created_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS audit_org_idx     ON audit_log(org_id);
CREATE INDEX IF NOT EXISTS audit_entity_idx  ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_log(created_at DESC);

-- ── Social connections (OAuth tokens per platform) ────────────
CREATE TABLE IF NOT EXISTS social_connections (
  id           TEXT        PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  org_id       TEXT        NOT NULL    DEFAULT '00000000-0000-0000-0000-000000000001',
  platform     TEXT        NOT NULL    CHECK (platform IN ('facebook', 'instagram', 'whatsapp', 'linkedin', 'tiktok')),
  account_name TEXT        NOT NULL    DEFAULT '',
  account_id   TEXT        NOT NULL,
  access_token TEXT        NOT NULL,
  token_expiry DATETIME,
  page_id      TEXT,
  page_name    TEXT,
  metadata     TEXT        NOT NULL    DEFAULT '{}',
  created_at   DATETIME    NOT NULL    DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME    NOT NULL    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (org_id, platform, account_id)
);

-- ── Social messages (unified inbox store) ─────────────────────
CREATE TABLE IF NOT EXISTS social_messages (
  id            TEXT        PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  org_id        TEXT        NOT NULL    DEFAULT '00000000-0000-0000-0000-000000000001',
  connection_id TEXT        NOT NULL    REFERENCES social_connections(id) ON DELETE CASCADE,
  platform      TEXT        NOT NULL    CHECK (platform IN ('facebook', 'instagram', 'whatsapp', 'linkedin', 'tiktok')),
  external_id   TEXT        NOT NULL,
  thread_id     TEXT        NOT NULL,
  direction     TEXT        NOT NULL    CHECK (direction IN ('inbound', 'outbound')),
  sender_id     TEXT        NOT NULL    DEFAULT '',
  sender_name   TEXT        NOT NULL    DEFAULT '',
  sender_avatar TEXT,
  content       TEXT        NOT NULL    DEFAULT '',
  attachments   TEXT        NOT NULL    DEFAULT '[]',
  read_at       DATETIME,
  replied_at    DATETIME,
  lead_id       TEXT        REFERENCES leads(id) ON DELETE SET NULL,
  raw           TEXT        NOT NULL    DEFAULT '{}',
  created_at    DATETIME    NOT NULL    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (org_id, platform, external_id)
);

CREATE INDEX IF NOT EXISTS social_conn_org_idx    ON social_connections(org_id);
CREATE INDEX IF NOT EXISTS social_msg_org_idx     ON social_messages(org_id);
CREATE INDEX IF NOT EXISTS social_msg_thread_idx  ON social_messages(thread_id);
CREATE INDEX IF NOT EXISTS social_msg_created_idx ON social_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS social_msg_unread_idx  ON social_messages(org_id, read_at);

-- ── Message templates ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_templates (
  id         TEXT        PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  org_id     TEXT        NOT NULL    DEFAULT '00000000-0000-0000-0000-000000000001',
  name       TEXT        NOT NULL,
  channel    TEXT        NOT NULL    CHECK (channel IN ('email', 'sms', 'whatsapp')),
  subject    TEXT        NOT NULL    DEFAULT '',
  body       TEXT        NOT NULL    DEFAULT '',
  created_at DATETIME    NOT NULL    DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME    NOT NULL    DEFAULT CURRENT_TIMESTAMP
);

-- ── Campaigns ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id            TEXT        PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  org_id        TEXT        NOT NULL    DEFAULT '00000000-0000-0000-0000-000000000001',
  name          TEXT        NOT NULL,
  template_id   TEXT        REFERENCES message_templates(id) ON DELETE SET NULL,
  channel       TEXT        NOT NULL    CHECK (channel IN ('email', 'sms', 'whatsapp')),
  status        TEXT        NOT NULL    DEFAULT 'draft'
                            CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused')),
  target_filter TEXT        NOT NULL    DEFAULT '{}',
  scheduled_at  DATETIME,
  sent_count    INTEGER     NOT NULL    DEFAULT 0,
  open_count    INTEGER     NOT NULL    DEFAULT 0,
  click_count   INTEGER     NOT NULL    DEFAULT 0,
  created_at    DATETIME    NOT NULL    DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME    NOT NULL    DEFAULT CURRENT_TIMESTAMP
);

-- ── Per-recipient campaign tracking ───────────────────────────
CREATE TABLE IF NOT EXISTS campaign_sends (
  id          TEXT        PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  org_id      TEXT        NOT NULL    DEFAULT '00000000-0000-0000-0000-000000000001',
  campaign_id TEXT        NOT NULL    REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id     TEXT        NOT NULL    REFERENCES leads(id)     ON DELETE CASCADE,
  status      TEXT        NOT NULL    DEFAULT 'pending'
              CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  sent_at     DATETIME,
  opened_at   DATETIME,
  clicked_at  DATETIME,
  error       TEXT,
  created_at  DATETIME    NOT NULL    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (campaign_id, lead_id)
);

-- ── Scheduled follow-ups ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS scheduled_outreach (
  id           TEXT        PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  org_id       TEXT        NOT NULL    DEFAULT '00000000-0000-0000-0000-000000000001',
  lead_id      TEXT        NOT NULL    REFERENCES leads(id) ON DELETE CASCADE,
  template_id  TEXT        REFERENCES message_templates(id) ON DELETE SET NULL,
  channel      TEXT        NOT NULL    CHECK (channel IN ('email', 'sms', 'whatsapp')),
  subject      TEXT        NOT NULL    DEFAULT '',
  message      TEXT        NOT NULL    DEFAULT '',
  scheduled_at DATETIME    NOT NULL,
  status       TEXT        NOT NULL    DEFAULT 'pending'
               CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  sent_at      DATETIME,
  error        TEXT,
  created_at   DATETIME    NOT NULL    DEFAULT CURRENT_TIMESTAMP
);

-- ── Automation rules (lead nurturing) ─────────────────────────
CREATE TABLE IF NOT EXISTS automation_rules (
  id            TEXT        PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  org_id        TEXT        NOT NULL    DEFAULT '00000000-0000-0000-0000-000000000001',
  name          TEXT        NOT NULL,
  enabled       INTEGER     NOT NULL    DEFAULT 1,
  trigger_type  TEXT        NOT NULL
                CHECK (trigger_type IN ('days_since_created', 'days_since_contact', 'status_is')),
  trigger_value TEXT        NOT NULL    DEFAULT '',
  lead_filter   TEXT        NOT NULL    DEFAULT '{}',
  template_id   TEXT        REFERENCES message_templates(id) ON DELETE SET NULL,
  channel       TEXT        NOT NULL    CHECK (channel IN ('email', 'sms', 'whatsapp')),
  created_at    DATETIME    NOT NULL    DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME    NOT NULL    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS tmpl_org_idx      ON message_templates(org_id);
CREATE INDEX IF NOT EXISTS camp_org_idx      ON campaigns(org_id);
CREATE INDEX IF NOT EXISTS csend_camp_idx    ON campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS csend_lead_idx    ON campaign_sends(lead_id);
CREATE INDEX IF NOT EXISTS sched_org_idx     ON scheduled_outreach(org_id);
CREATE INDEX IF NOT EXISTS sched_status_idx  ON scheduled_outreach(org_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS auto_org_idx      ON automation_rules(org_id);
-- ── SaaS additions ────────────────────────────────────────────
-- ALTER TABLE is safe to re-run: migrate.mjs ignores "duplicate column" errors.
ALTER TABLE organizations ADD COLUMN stripe_customer_id      TEXT;
ALTER TABLE organizations ADD COLUMN stripe_subscription_id  TEXT;
ALTER TABLE organizations ADD COLUMN subscription_status     TEXT NOT NULL DEFAULT 'trialing';
ALTER TABLE organizations ADD COLUMN trial_ends_at           DATETIME;
ALTER TABLE organizations ADD COLUMN seats_limit             INTEGER NOT NULL DEFAULT 3;

-- ── Users (org members) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            TEXT     PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  org_id        TEXT     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email         TEXT     NOT NULL,
  password_hash TEXT     NOT NULL,
  name          TEXT     NOT NULL DEFAULT '',
  role          TEXT     NOT NULL DEFAULT 'member'
                  CHECK (role IN ('owner', 'admin', 'member')),
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS users_org_idx   ON users(org_id);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- ── Org invites ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_invites (
  id         TEXT     PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
  org_id     TEXT     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email      TEXT     NOT NULL,
  role       TEXT     NOT NULL DEFAULT 'member',
  token      TEXT     NOT NULL UNIQUE DEFAULT (lower(hex(randomblob(32)))),
  created_by TEXT     REFERENCES users(id) ON DELETE SET NULL,
  expires_at DATETIME NOT NULL DEFAULT (datetime('now', '+7 days')),
  used_at    DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS invites_org_idx   ON org_invites(org_id);
CREATE INDEX IF NOT EXISTS invites_token_idx ON org_invites(token);

-- ── Password reset tokens ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         TEXT     PRIMARY KEY DEFAULT (lower(hex(randomblob(32)))),
  user_id    TEXT     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at DATETIME NOT NULL DEFAULT (datetime('now', '+1 hour')),
  used_at    DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS prt_user_idx ON password_reset_tokens(user_id);
