// ── Boss Agent / Orchestrator ─────────────────────────────────────────────────
// Runs LAST in the daily sequence (after all other agents).
// Sends a comprehensive Hebrew briefing to the owner via WhatsApp.
// Also handles natural language chat from the UI.

import { logAgentRun, updateAgentRun, getLastRun, getDashboardStats, getLatestHealthChecks } from '@/agents/tools/database';
import { callClaude } from '@/agents/tools/claude';
import { alertOwner, sendDailyBriefing } from '@/agents/tools/whatsapp';
import { createClient } from '@supabase/supabase-js';

const ORG_ID     = process.env.ORG_ID      ?? '00000000-0000-0000-0000-000000000001';
const OWNER_NAME = process.env.OWNER_NAME  ?? 'אלון';

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  return createClient(url, key);
}

// ── Daily Briefing ────────────────────────────────────────────────────────────
export async function runDailyBriefing(trigger: 'cron' | 'manual' = 'cron'): Promise<{
  sent: boolean;
  summary: string;
  errors: string[];
}> {
  const runId = await logAgentRun('boss', trigger);
  const errors: string[] = [];

  try {
    // Gather data from all sources in parallel
    const [stats, leadsRes, tasksRes, lastLeadHunt, lastAdMachine, lastTech, healthChecks] = await Promise.all([
      getDashboardStats(),
      db().from('leads').select('id, name, status, source, created_at').eq('org_id', ORG_ID).order('created_at', { ascending: false }).limit(5),
      db().from('tasks').select('id, title, due_date, completed').eq('org_id', ORG_ID).eq('completed', false).order('due_date').limit(5),
      getLastRun('lead-hunter'),
      getLastRun('ad-machine'),
      getLastRun('tech-manager'),
      getLatestHealthChecks(),
    ]);

    const recentLeads = (leadsRes.data ?? []) as { name: string; status: string; source?: string }[];
    const pendingTasks = (tasksRes.data ?? []) as { title: string; due_date?: string }[];

    // Health summary
    const healthErrors = healthChecks.filter((h) => h.status === 'error').length;
    const healthWarns  = healthChecks.filter((h) => h.status === 'warn').length;
    const healthLine   = healthErrors === 0 && healthWarns === 0
      ? '✅ כל המערכות תקינות'
      : `${healthErrors > 0 ? `❌ ${healthErrors} שגיאות` : ''} ${healthWarns > 0 ? `⚠️ ${healthWarns} אזהרות` : ''}`.trim();

    // Build briefing sections
    const sections: { title: string; lines: string[] }[] = [
      {
        title: '📊 סטטיסטיקות היום',
        lines: [
          `• סה"כ לידים: ${stats.totalLeads}`,
          `• לידים חדשים (7 ימים): ${stats.newLeads}`,
          `• צינור פעיל: ${stats.activePipeline}`,
          `• הודעות חברתיות: ${stats.recentMessages}`,
        ],
      },
      {
        title: '🎯 לידים אחרונים',
        lines: recentLeads.length > 0
          ? recentLeads.map((l) => `• ${l.name} — ${l.status}${l.source ? ` (${l.source})` : ''}`)
          : ['• אין לידים חדשים'],
      },
      {
        title: '✅ משימות ממתינות',
        lines: pendingTasks.length > 0
          ? pendingTasks.slice(0, 3).map((t) => `• ${t.title}${t.due_date ? ` — ${new Date(t.due_date).toLocaleDateString('he-IL')}` : ''}`)
          : ['• אין משימות פתוחות 🎉'],
      },
      {
        title: '🤖 דוח סוכנים',
        lines: [
          `• ציד לידים: ${lastLeadHunt?.status ?? 'לא רץ'} — ${lastLeadHunt?.leads_imported ?? 0} יובאו`,
          `• מכונת פרסום: ${lastAdMachine?.status ?? 'לא רץ'}`,
          `• מנהל טכני: ${healthLine}`,
        ],
      },
    ];

    await sendDailyBriefing(sections);

    await updateAgentRun(runId, {
      status:  'success',
      summary: `Daily briefing sent to ${OWNER_NAME}. Stats: ${stats.totalLeads} leads, ${stats.activePipeline} active.`,
      errors,
    });

    return { sent: true, summary: sections.map(s => s.title).join(' | '), errors };
  } catch (err) {
    const msg = String(err);
    await updateAgentRun(runId, { status: 'error', summary: msg, errors: [msg] });
    await alertOwner(`❌ *Boss Agent* — הדוח היומי נכשל:\n${msg}`);
    return { sent: false, summary: '', errors: [msg] };
  }
}

// ── Chat Handler (natural language from UI) ───────────────────────────────────
export async function handleBossChat(
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[] = [],
): Promise<string> {
  // Gather context
  const [stats, healthChecks, lastRunsRes] = await Promise.all([
    getDashboardStats().catch(() => null),
    getLatestHealthChecks().catch(() => []),
    db().from('agent_runs').select('agent_name, status, summary, started_at').eq('org_id', ORG_ID).order('started_at', { ascending: false }).limit(8),
  ]);

  const recentRuns = (lastRunsRes.data ?? []) as { agent_name: string; status: string; summary?: string; started_at: string }[];

  const systemPrompt = `You are the Boss Agent for Alon's Kitchens CRM — a luxury kitchen cabinet company in South Florida.
You are a smart, friendly AI assistant that helps ${OWNER_NAME} manage his business.

Current system status (as of now):
- Total leads: ${stats?.totalLeads ?? 'unknown'}
- New leads (7 days): ${stats?.newLeads ?? 'unknown'}
- Active pipeline: ${stats?.activePipeline ?? 'unknown'}
- Pending tasks: ${stats?.pendingTasks ?? 'unknown'}
- Recent social messages: ${stats?.recentMessages ?? 'unknown'}
- System health: ${healthChecks.filter(h => h.status === 'ok').length}/${healthChecks.length} checks passing
- Recent agent runs: ${recentRuns.map(r => `${r.agent_name}(${r.status})`).join(', ')}

You can answer questions about leads, tasks, system health, campaigns, and business performance.
You speak in English (or Hebrew if the user writes in Hebrew).
Be concise, actionable, and data-driven. Never make up numbers — use the data above.
If you don't have specific data, say so and suggest where to find it.`;

  const messages = [
    ...history,
    { role: 'user' as const, content: userMessage },
  ];

  try {
    return await callClaude(messages, systemPrompt);
  } catch (err) {
    return `Sorry, I ran into an error: ${String(err)}`;
  }
}
