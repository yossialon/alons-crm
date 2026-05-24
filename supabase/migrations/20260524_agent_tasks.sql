-- ── Agent Task Queue ──────────────────────────────────────────────────────────
-- Allows agents to queue work for each other asynchronously.
-- A task is created by one agent (from_agent) and consumed by another (to_agent).
-- The lead-hunter → ad-machine pipeline is the primary initial use-case:
--   after importing leads the hunter enqueues a 'new_leads_imported' task so
--   the ad-machine can run campaign analysis without blocking the hunter's HTTP
--   response.
--
-- agent_runs.trigger is also extended with 'auto-delegation':
--   logged by the orchestration layer when one agent automatically delegates
--   work to another (no human/cron initiated the run directly).

-- Document the new trigger value on agent_runs (no CHECK constraint to alter —
-- the original migration uses a comment, not an enum constraint).
COMMENT ON COLUMN agent_runs.trigger IS
  'How the run was initiated: cron | manual | webhook | auto-delegation';

-- ── agent_tasks ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_tasks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID        REFERENCES organizations(id) ON DELETE CASCADE,

  -- which agent created this task
  from_agent  TEXT        NOT NULL
    CHECK (from_agent IN ('lead-hunter', 'ad-machine', 'tech-manager', 'boss')),

  -- which agent should process it
  to_agent    TEXT        NOT NULL
    CHECK (to_agent IN ('lead-hunter', 'ad-machine', 'tech-manager', 'boss')),

  -- free-form discriminator; application code checks this to decide how to handle the task
  -- known values: 'new_leads_imported' | 'job_completed' | 'review_request'
  task_type   TEXT        NOT NULL,

  -- arbitrary JSON payload; schema depends on task_type
  payload     JSONB       NOT NULL DEFAULT '{}',

  status      TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'failed')),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at  TIMESTAMPTZ,           -- set when a worker picks up the task
  finished_at TIMESTAMPTZ,           -- set when done or failed
  error       TEXT                   -- populated on failure
);

-- Fast lookup: "give me all pending tasks for the ad-machine, oldest first"
CREATE INDEX IF NOT EXISTS idx_agent_tasks_consumer
  ON agent_tasks (to_agent, status, created_at);

-- Audit / dashboard: all tasks for an org ordered by recency
CREATE INDEX IF NOT EXISTS idx_agent_tasks_org
  ON agent_tasks (org_id, created_at DESC);

-- ── Row-level security (match existing tables in this project) ────────────────
ALTER TABLE agent_tasks ENABLE ROW LEVEL SECURITY;

-- Service-role key (used by all agents) bypasses RLS automatically.
-- The policy below is a safety net for anon/authenticated roles.
CREATE POLICY "agent_tasks: service role full access"
  ON agent_tasks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
