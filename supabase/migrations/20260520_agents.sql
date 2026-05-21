-- ── AI Agents System ─────────────────────────────────────────────────────────
-- Creates tables for agent runs, system health, and recommendations.

-- Agent run log (every agent start/finish is recorded)
CREATE TABLE IF NOT EXISTS agent_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID REFERENCES organizations(id) ON DELETE CASCADE,
  agent_name      TEXT NOT NULL,               -- 'lead-hunter' | 'ad-machine' | 'tech-manager' | 'boss'
  status          TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'error', 'partial')),
  trigger         TEXT NOT NULL DEFAULT 'cron', -- 'cron' | 'manual' | 'webhook'
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  duration_ms     INTEGER,
  summary         TEXT,                         -- human-readable outcome
  leads_found     INTEGER DEFAULT 0,
  leads_imported  INTEGER DEFAULT 0,
  errors          JSONB DEFAULT '[]'::JSONB,
  metadata        JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_name ON agent_runs (agent_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_org_id     ON agent_runs (org_id, started_at DESC);

-- System health snapshots (Tech Manager stores every check here)
CREATE TABLE IF NOT EXISTS system_health (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  checked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_name  TEXT NOT NULL,   -- 'db_latency' | 'api_latency' | 'lead_api' | etc.
  status      TEXT NOT NULL CHECK (status IN ('ok', 'warn', 'error')),
  value_ms    INTEGER,         -- response time in ms (where applicable)
  details     TEXT             -- free-form extra info or error message
);

CREATE INDEX IF NOT EXISTS idx_system_health_checked ON system_health (check_name, checked_at DESC);

-- Tech Manager recommendations (weekly optimization report)
CREATE TABLE IF NOT EXISTS tech_recommendations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  category    TEXT NOT NULL,  -- 'performance' | 'cost' | 'reliability' | 'feature'
  priority    TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done','dismissed')),
  resolved_at TIMESTAMPTZ
);

-- Ad Machine recommendations (weekly campaign analysis)
CREATE TABLE IF NOT EXISTS campaign_recommendations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  week_of      DATE NOT NULL,
  platform     TEXT NOT NULL DEFAULT 'all',   -- 'instagram' | 'google' | 'facebook' | 'all'
  insight      TEXT NOT NULL,
  action       TEXT NOT NULL,
  impact       TEXT NOT NULL DEFAULT 'medium' CHECK (impact IN ('low','medium','high')),
  applied      BOOLEAN NOT NULL DEFAULT false
);

-- Competitors table (used by Lead Hunter for bad-review tracking)
CREATE TABLE IF NOT EXISTS competitors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  google_place_id TEXT,
  yelp_id      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
