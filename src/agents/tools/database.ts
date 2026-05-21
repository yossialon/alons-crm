// ── Agent Database Tool ───────────────────────────────────────────────────────
// Helpers for logging agent runs and reading system state.

import { createClient } from '@supabase/supabase-js';
import type { AgentName, AgentStatus, AgentRun, HealthCheck } from '@/agents/types';

const ORG_ID = process.env.ORG_ID ?? '00000000-0000-0000-0000-000000000001';

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  // Prefer service role for agent writes (bypasses RLS)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  return createClient(url, key);
}

/** Insert a new agent_run row and return its id */
export async function logAgentRun(
  agentName: AgentName,
  trigger: AgentRun['trigger'] = 'cron',
): Promise<string> {
  const { data, error } = await db()
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
  const now = new Date();
  await db()
    .from('agent_runs')
    .update({
      ...update,
      finished_at: now.toISOString(),
      errors:      update.errors ?? [],
      metadata:    update.metadata ?? {},
    })
    .eq('id', runId);
}

/** Get the last completed run for a given agent */
export async function getLastRun(agentName: AgentName): Promise<AgentRun | null> {
  const { data } = await db()
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
  const { data } = await db()
    .from('agent_runs')
    .select('*')
    .eq('org_id', ORG_ID)
    .order('started_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as AgentRun[];
}

/** Save a health check snapshot */
export async function saveHealthCheck(check: HealthCheck): Promise<void> {
  await db().from('system_health').insert({
    org_id:     ORG_ID,
    check_name: check.name,
    status:     check.status,
    value_ms:   check.value_ms,
    details:    check.details,
  });
}

/** Get the latest health checks (one per check_name) */
export async function getLatestHealthChecks(): Promise<HealthCheck[]> {
  const { data } = await db()
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
  category: string;
  priority: string;
  title: string;
  description: string;
}): Promise<void> {
  await db().from('tech_recommendations').insert({ org_id: ORG_ID, ...rec });
}

/** Save a campaign recommendation */
export async function saveCampaignRecommendation(rec: {
  week_of: string;
  platform: string;
  insight: string;
  action: string;
  impact: string;
}): Promise<void> {
  await db().from('campaign_recommendations').insert({ org_id: ORG_ID, ...rec });
}

/** Check if a lead already exists by phone or email */
export async function leadExists(phone?: string, email?: string): Promise<boolean> {
  if (!phone && !email) return false;
  const conditions: string[] = [];
  if (phone) conditions.push(`phone.eq.${phone}`);
  if (email) conditions.push(`email.eq.${email}`);

  const { data } = await db()
    .from('leads')
    .select('id')
    .or(conditions.join(','))
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/** Import a lead row */
export async function importLead(lead: Record<string, unknown>): Promise<string | null> {
  const { data, error } = await db()
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

/** Fetch dashboard stats for the briefing */
export async function getDashboardStats(): Promise<{
  totalLeads: number;
  newLeads: number;
  activePipeline: number;
  pendingTasks: number;
  recentMessages: number;
}> {
  const client = db();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [leadsRes, tasksRes, msgsRes] = await Promise.all([
    client.from('leads').select('id, status, created_at').eq('org_id', ORG_ID),
    client.from('tasks').select('id, completed').eq('org_id', ORG_ID).eq('completed', false),
    client.from('social_messages').select('id').gte('created_at', weekAgo),
  ]);

  const leads = (leadsRes.data ?? []) as { status: string; created_at: string }[];
  return {
    totalLeads:     leads.length,
    newLeads:       leads.filter((l) => new Date(l.created_at) >= new Date(weekAgo)).length,
    activePipeline: leads.filter((l) => ['contacted', 'qualified'].includes(l.status)).length,
    pendingTasks:   tasksRes.data?.length ?? 0,
    recentMessages: msgsRes.data?.length ?? 0,
  };
}
