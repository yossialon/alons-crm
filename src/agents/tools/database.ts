// ── Agent Database Tool ───────────────────────────────────────────────────────
// Helpers for logging agent runs and reading system state.
// Uses the shared serverDb singleton (service role) — never the anon key.

import { serverDb as db } from '@/lib/supabase-server';
import type {
  AgentName, AgentStatus, AgentTrigger,
  AgentRun, AgentTask, AgentTaskStatus, HealthCheck,
} from '@/agents/types';

const ORG_ID = process.env.ORG_ID ?? '00000000-0000-0000-0000-000000000001';

/** Insert a new agent_run row and return its id */
export async function logAgentRun(
  agentName: AgentName,
  trigger: AgentTrigger = 'cron',
): Promise<string> {
  const { data, error } = await db
    .from('agent_runs')
    .insert({
      org_id:     ORG_ID,
      agent_name: agentName,
      status:     'running',
      trigger,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(`logAgentRun failed: ${error?.message}`);
  return data.id as string;
}

/** Update an existing agent_run row with final state */
export async function updateAgentRun(
  runId: string,
  update: {
    status: AgentStatus;
    summary?: string;
    leads_found?: number;
    leads_imported?: number;
    errors?: string[];
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await db
    .from('agent_runs')
    .update({
      ...update,
      finished_at: new Date().toISOString(),
      errors:      update.errors ?? [],
      metadata:    update.metadata ?? {},
    })
    .eq('id', runId);
}

/** Get the last completed run for a given agent */
export async function getLastRun(agentName: AgentName): Promise<AgentRun | null> {
  const { data } = await db
    .from('agent_runs')
    .select('*')
    .eq('agent_name', agentName)
    .eq('org_id', ORG_ID)
    .neq('status', 'running')
    .order('started_at', { ascending: false })
    .limit(1)
    .single();
  return (data as AgentRun) ?? null;
}

/** Get recent runs (for the UI) */
export async function getRecentRuns(limit = 20): Promise<AgentRun[]> {
  const { data } = await db
    .from('agent_runs')
    .select('*')
    .eq('org_id', ORG_ID)
    .order('started_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as AgentRun[];
}

/** Save a health check snapshot */
export async function saveHealthCheck(check: HealthCheck): Promise<void> {
  await db.from('system_health').insert({
    org_id:     ORG_ID,
    check_name: check.name,
    status:     check.status,
    value_ms:   check.value_ms,
    details:    check.details,
  });
}

/** Get the latest health checks (one per check_name) */
export async function getLatestHealthChecks(): Promise<HealthCheck[]> {
  const { data } = await db
    .from('system_health')
    .select('check_name, status, value_ms, details, checked_at')
    .eq('org_id', ORG_ID)
    .order('checked_at', { ascending: false })
    .limit(200);

  if (!data) return [];

  // De-duplicate — keep only the most recent per check_name
  const seen = new Set<string>();
  const result: HealthCheck[] = [];
  for (const row of data as { check_name: string; status: string; value_ms?: number; details?: string }[]) {
    if (!seen.has(row.check_name)) {
      seen.add(row.check_name);
      result.push({
        name:     row.check_name,
        status:   row.status as 'ok' | 'warn' | 'error',
        value_ms: row.value_ms,
        details:  row.details,
      });
    }
  }
  return result;
}

/** Save a tech recommendation */
export async function saveTechRecommendation(rec: {
  category:    string;
  priority:    string;
  title:       string;
  description: string;
}): Promise<void> {
  await db.from('tech_recommendations').insert({ org_id: ORG_ID, ...rec });
}

/** Save a campaign recommendation (confidence is optional — NULL when no learning data) */
export async function saveCampaignRecommendation(rec: {
  week_of:     string;
  platform:    string;
  insight:     string;
  action:      string;
  impact:      string;
  confidence?: number;
}): Promise<void> {
  await db.from('campaign_recommendations').insert({ org_id: ORG_ID, ...rec });
}

/** Persist a learned pattern from the weekly learning analysis pass */
export async function saveCampaignLearning(learning: {
  week_of:          string;
  pattern:          string;
  confidence_score: number;
  based_on_weeks:   number;
  reasoning?:       string;
}): Promise<void> {
  await db.from('campaign_learnings').insert({ org_id: ORG_ID, ...learning });
}

/** Check if a lead already exists by phone or email (org-scoped dedup) */
export async function leadExists(phone?: string, email?: string): Promise<boolean> {
  if (!phone && !email) return false;
  const conditions: string[] = [];
  if (phone) conditions.push(`phone.eq.${phone}`);
  if (email) conditions.push(`email.eq.${email}`);

  const { data } = await db
    .from('leads')
    .select('id')
    .eq('org_id', ORG_ID)
    .or(conditions.join(','))
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/** Import a lead row */
export async function importLead(lead: Record<string, unknown>): Promise<string | null> {
  const { data, error } = await db
    .from('leads')
    .insert({ org_id: ORG_ID, ...lead })
    .select('id')
    .single();
  if (error) {
    console.error('[DB] importLead error:', error.message);
    return null;
  }
  return (data as { id: string }).id;
}

/**
 * Fetch dashboard stats for the boss agent briefing.
 * Uses server-side COUNT queries instead of fetching all rows and filtering
 * in JS — avoids N rows transfer for large orgs.
 */
export async function getDashboardStats(): Promise<{
  totalLeads:     number;
  newLeads:       number;
  activePipeline: number;
  pendingTasks:   number;
  recentMessages: number;
}> {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [totalRes, newRes, pipelineRes, tasksRes, msgsRes] = await Promise.all([
    // total leads
    db.from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', ORG_ID),
    // new leads this week
    db.from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', ORG_ID)
      .gte('created_at', weekAgo),
    // active pipeline (contacted + qualified)
    db.from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', ORG_ID)
      .in('status', ['contacted', 'qualified']),
    // pending tasks
    db.from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', ORG_ID)
      .eq('completed', false),
    // recent messages (org-scoped — was missing org_id filter before)
    db.from('social_messages')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', ORG_ID)
      .gte('created_at', weekAgo),
  ]);

  return {
    totalLeads:     totalRes.count    ?? 0,
    newLeads:       newRes.count      ?? 0,
    activePipeline: pipelineRes.count ?? 0,
    pendingTasks:   tasksRes.count    ?? 0,
    recentMessages: msgsRes.count     ?? 0,
  };
}

// ── Agent Task Queue ──────────────────────────────────────────────────────────

/**
 * Enqueue a task for another agent to process asynchronously.
 * Returns the new task's UUID.
 */
export async function enqueueAgentTask(task: {
  from_agent: AgentName;
  to_agent:   AgentName;
  task_type:  string;
  payload?:   Record<string, unknown>;
}): Promise<string> {
  const { data, error } = await db
    .from('agent_tasks')
    .insert({
      org_id:     ORG_ID,
      from_agent: task.from_agent,
      to_agent:   task.to_agent,
      task_type:  task.task_type,
      payload:    task.payload ?? {},
      status:     'pending',
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`enqueueAgentTask failed: ${error?.message}`);
  return (data as { id: string }).id;
}

/**
 * Fetch the oldest pending tasks destined for a specific agent.
 * Call this at the start of an agent run to drain its queue.
 */
export async function dequeueAgentTasks(
  toAgent: AgentName,
  limit = 10,
): Promise<AgentTask[]> {
  const { data } = await db
    .from('agent_tasks')
    .select('*')
    .eq('to_agent', toAgent)
    .eq('org_id', ORG_ID)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);
  return (data ?? []) as AgentTask[];
}

/**
 * Mark a task as done or failed after the receiving agent processes it.
 */
export async function resolveAgentTask(
  taskId:  string,
  outcome: { status: 'done' | 'failed'; error?: string },
): Promise<void> {
  await db
    .from('agent_tasks')
    .update({
      status:      outcome.status,
      finished_at: new Date().toISOString(),
      ...(outcome.error ? { error: outcome.error } : {}),
    })
    .eq('id', taskId);
}

/**
 * Mark a task as 'processing' (so a second worker doesn't pick it up) and
 * return the updated row. Returns null if the task was already claimed.
 */
export async function claimAgentTask(taskId: string): Promise<AgentTask | null> {
  const { data } = await db
    .from('agent_tasks')
    .update({ status: 'processing' as AgentTaskStatus, started_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('org_id', ORG_ID)
    .eq('status', 'pending')   // only claim if still pending (optimistic lock)
    .select('*')
    .single();
  return (data as AgentTask) ?? null;
}
