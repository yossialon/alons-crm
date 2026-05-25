-- ── Performance Indexes ───────────────────────────────────────────────────────
--
-- Covers the high-frequency query patterns in this codebase:
--   • org_id lookups (every query filters by org)
--   • Status / pipeline filters on leads and tasks
--   • Outreach cron queries (scheduled_at window, lead_id lookups)
--   • Social message inbox (platform, is_read, thread)
--   • Agent monitoring queries
--   • Dashboard count queries
--
-- All indexes use IF NOT EXISTS — safe to re-run against any environment.
-- NOTE: For very large existing tables, run these as CONCURRENTLY outside a
-- transaction in a maintenance window:
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS <name> ON <table>(<cols>);

-- ── leads ─────────────────────────────────────────────────────────────────────
-- Status filter (pipeline views, getDashboardStats)
CREATE INDEX IF NOT EXISTS idx_leads_org_status
  ON leads (org_id, status);

-- Created-at sort — most list queries
CREATE INDEX IF NOT EXISTS idx_leads_org_created
  ON leads (org_id, created_at DESC);

-- Source analytics
CREATE INDEX IF NOT EXISTS idx_leads_org_source
  ON leads (org_id, source);

-- ── tasks ─────────────────────────────────────────────────────────────────────
-- Pending task dashboard (completed=false sort by due_date)
CREATE INDEX IF NOT EXISTS idx_tasks_org_pending
  ON tasks (org_id, completed, due_date)
  WHERE completed = false;

-- Task list by lead (detail view, outreach context)
CREATE INDEX IF NOT EXISTS idx_tasks_org_lead
  ON tasks (org_id, lead_id)
  WHERE lead_id IS NOT NULL;

-- Task list by project
CREATE INDEX IF NOT EXISTS idx_tasks_org_project
  ON tasks (org_id, project_id)
  WHERE project_id IS NOT NULL;

-- ── outreach_log ──────────────────────────────────────────────────────────────
-- Per-lead outreach history (sorted by date, used by days_since_contact cron)
CREATE INDEX IF NOT EXISTS idx_outreach_log_lead_date
  ON outreach_log (lead_id, contacted_at DESC);

-- Org-level list view
CREATE INDEX IF NOT EXISTS idx_outreach_log_org_date
  ON outreach_log (org_id, contacted_at DESC);

-- ── scheduled_outreach ────────────────────────────────────────────────────────
-- Cron job primary query: pending rows due for dispatch
CREATE INDEX IF NOT EXISTS idx_scheduled_outreach_due
  ON scheduled_outreach (org_id, status, scheduled_at)
  WHERE status = 'pending';

-- Duplicate-detection query (today's window per lead+template)
CREATE INDEX IF NOT EXISTS idx_scheduled_outreach_dedup
  ON scheduled_outreach (lead_id, template_id, scheduled_at)
  WHERE status IN ('pending', 'sent');

-- ── social_messages ───────────────────────────────────────────────────────────
-- Inbox query: org + platform + unread
CREATE INDEX IF NOT EXISTS idx_social_msgs_org_platform
  ON social_messages (org_id, platform, created_at DESC);

-- Unread count
CREATE INDEX IF NOT EXISTS idx_social_msgs_unread
  ON social_messages (org_id, is_read)
  WHERE is_read = false;

-- Thread view
CREATE INDEX IF NOT EXISTS idx_social_msgs_thread_date
  ON social_messages (thread_id, created_at DESC);

-- ── instagram_interactions ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ig_interactions_org_date
  ON instagram_interactions (org_id, created_at DESC);

-- ── agent_runs ────────────────────────────────────────────────────────────────
-- Covered by existing indexes in 20260520_agents.sql but add status filter
CREATE INDEX IF NOT EXISTS idx_agent_runs_org_status
  ON agent_runs (org_id, status, started_at DESC)
  WHERE status IN ('running', 'error');

-- ── campaign_recommendations ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_campaign_recs_org_week
  ON campaign_recommendations (org_id, week_of DESC);

-- ── campaign_learnings ────────────────────────────────────────────────────────
-- Covered by existing indexes in 20260525_campaign_learnings.sql

-- ── clients ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clients_org_created
  ON clients (org_id, created_at DESC);

-- ── projects ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_projects_org_client
  ON projects (org_id, client_id);

CREATE INDEX IF NOT EXISTS idx_projects_org_status
  ON projects (org_id, status);

-- ── suppliers ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_suppliers_org_status
  ON suppliers (org_id, status);

-- ── scan_results ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_scan_results_org_imported
  ON scan_results (org_id, imported, created_at DESC);

-- ── audit_log ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_log_org_date
  ON audit_log (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON audit_log (org_id, entity_type, entity_id);

-- ── job_completions ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_job_completions_org_date
  ON job_completions (org_id, created_at DESC);
