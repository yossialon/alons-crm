// ── Boss Agent / Orchestrator ─────────────────────────────────────────────────
// Runs LAST in the daily sequence (after all other agents).
// Sends a comprehensive Hebrew briefing to the owner via WhatsApp.
// Also handles natural language chat from the UI — with full tool-calling support.

import Anthropic from '@anthropic-ai/sdk';
import { logAgentRun, updateAgentRun, getLastRun, getDashboardStats, getLatestHealthChecks } from '@/agents/tools/database';
import { alertOwner, sendDailyBriefing } from '@/agents/tools/whatsapp';
import { runLeadHunter } from '@/agents/lead-hunter';
import { runWeeklyReview } from '@/agents/ad-machine';
import serverDb from '@/lib/supabase-server';

const ORG_ID     = process.env.ORG_ID      ?? '00000000-0000-0000-0000-000000000001';
const OWNER_NAME = process.env.OWNER_NAME  ?? 'אלון';

// ── Anthropic client — lazy singleton (for tool-use loop in handleBossChat) ──
let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (_anthropic) return _anthropic;
  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error('[boss] ANTHROPIC_API_KEY is not set');
  _anthropic = new Anthropic({ apiKey });
  return _anthropic;
}

// ── Boss tool definitions ─────────────────────────────────────────────────────
const BOSS_TOOLS: Anthropic.Tool[] = [
  {
    name: 'createTask',
    description:
      'Create a new task or follow-up in the CRM. ' +
      'Use when the user says "add a task", "schedule a follow-up", "remind me to…", etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title:   { type: 'string', description: 'Short task title, e.g. "Follow up with Sarah about quote"' },
        dueDate: { type: 'string', description: 'Due date as YYYY-MM-DD. Omit if not specified.' },
        leadId:  { type: 'string', description: 'UUID of the associated lead. Omit if not specified.' },
      },
      required: ['title'],
    },
  },
  {
    name: 'updateLeadStatus',
    description:
      'Update the status of an existing lead. ' +
      'Use when the user says "mark lead X as qualified / closed / contacted", etc. ' +
      'Valid statuses: new, contacted, qualified, closed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        leadId:    { type: 'string', description: 'UUID of the lead to update' },
        newStatus: {
          type: 'string',
          description: 'New status value',
          enum: ['new', 'contacted', 'qualified', 'closed'],
        },
      },
      required: ['leadId', 'newStatus'],
    },
  },
  {
    name: 'triggerAgent',
    description:
      'Manually trigger an agent to run in the background. ' +
      'Use when the user says "run the lead hunter", "start the ad machine", "trigger agent X now", etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        agentName: {
          type: 'string',
          description: 'Which agent to trigger',
          enum: ['lead-hunter', 'ad-machine'],
        },
      },
      required: ['agentName'],
    },
  },
  {
    name: 'sendWhatsApp',
    description:
      'Send a WhatsApp (or email fallback) message to the owner. ' +
      'Use when the user asks to send themselves an alert, reminder, or summary.',
    input_schema: {
      type: 'object' as const,
      properties: {
        message: { type: 'string', description: 'The message body to send' },
      },
      required: ['message'],
    },
  },
];

// ── Tool executor ─────────────────────────────────────────────────────────────
async function executeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case 'createTask': {
      const { title, dueDate, leadId } = input as {
        title: string;
        dueDate?: string;
        leadId?: string;
      };
      const { data, error } = await serverDb
        .from('tasks')
        .insert({
          org_id:   ORG_ID,
          title,
          due_date: dueDate ?? null,
          lead_id:  leadId  ?? null,
          completed: false,
        })
        .select('id')
        .single();
      if (error) throw new Error(`createTask failed: ${error.message}`);
      return JSON.stringify({
        success: true,
        taskId:  (data as { id: string }).id,
        title,
        dueDate: dueDate ?? null,
      });
    }

    case 'updateLeadStatus': {
      const { leadId, newStatus } = input as { leadId: string; newStatus: string };
      const { error } = await serverDb
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId)
        .eq('org_id', ORG_ID);
      if (error) throw new Error(`updateLeadStatus failed: ${error.message}`);
      return JSON.stringify({ success: true, leadId, newStatus });
    }

    case 'triggerAgent': {
      const { agentName } = input as { agentName: 'lead-hunter' | 'ad-machine' };
      if (agentName === 'lead-hunter') {
        // Fire-and-forget — the hunter takes several minutes
        runLeadHunter('manual').catch((err: unknown) =>
          console.error('[Boss] lead-hunter background run failed:', err),
        );
      } else {
        runWeeklyReview('manual').catch((err: unknown) =>
          console.error('[Boss] ad-machine background run failed:', err),
        );
      }
      return JSON.stringify({ success: true, agentName, status: 'triggered' });
    }

    case 'sendWhatsApp': {
      const { message } = input as { message: string };
      await alertOwner(message);
      return JSON.stringify({ success: true, messageSent: true });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
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
      serverDb.from('leads').select('id, name, status, source, created_at').eq('org_id', ORG_ID).order('created_at', { ascending: false }).limit(5),
      serverDb.from('tasks').select('id, title, due_date, completed').eq('org_id', ORG_ID).eq('completed', false).order('due_date').limit(5),
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
  // ── Gather live context ───────────────────────────────────────────────────
  const [stats, healthChecks, lastRunsRes, recentLeadsRes] = await Promise.all([
    getDashboardStats().catch(() => null),
    getLatestHealthChecks().catch(() => []),
    serverDb
      .from('agent_runs')
      .select('agent_name, status, summary, started_at')
      .eq('org_id', ORG_ID)
      .order('started_at', { ascending: false })
      .limit(8),
    serverDb
      .from('leads')
      .select('id, name, status, phone, email')
      .eq('org_id', ORG_ID)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const recentRuns = (lastRunsRes.data ?? []) as {
    agent_name: string; status: string; summary?: string; started_at: string;
  }[];
  const recentLeads = (recentLeadsRes.data ?? []) as {
    id: string; name: string; status: string; phone?: string; email?: string;
  }[];

  const leadsContext = recentLeads.length > 0
    ? recentLeads.map((l) => `  - ${l.name} (id: ${l.id}, status: ${l.status})`).join('\n')
    : '  (no leads found)';

  const systemPrompt = `You are the Boss Agent for Alon's Kitchens CRM — a luxury kitchen cabinet company in South Florida.
You are a smart, proactive AI assistant that helps ${OWNER_NAME} manage his business.

## Current system status
- Total leads: ${stats?.totalLeads ?? 'unknown'}
- New leads (7 days): ${stats?.newLeads ?? 'unknown'}
- Active pipeline: ${stats?.activePipeline ?? 'unknown'}
- Pending tasks: ${stats?.pendingTasks ?? 'unknown'}
- Recent social messages: ${stats?.recentMessages ?? 'unknown'}
- System health: ${healthChecks.filter((h) => h.status === 'ok').length}/${healthChecks.length} checks passing
- Recent agent runs: ${recentRuns.map((r) => `${r.agent_name}(${r.status})`).join(', ')}

## Recent leads (use these IDs when calling tools)
${leadsContext}

## Your capabilities
You can answer questions AND take real actions using your tools:
- **createTask** — add a task or follow-up (with optional due date and lead link)
- **updateLeadStatus** — move a lead to a new status (new → contacted → qualified → proposal → won/lost)
- **triggerAgent** — run the lead-hunter or ad-machine agent right now
- **sendWhatsApp** — send a message or alert to ${OWNER_NAME}

When the user asks you to do something actionable, use the appropriate tool and then confirm what you did.
Match lead names to IDs from the list above. If a name is ambiguous, ask for clarification.
Respond in English (or Hebrew if the user writes in Hebrew).
Be concise, actionable, and data-driven. Never make up numbers — use the data above.`;

  // Build message array — history has content: string which SDK accepts natively
  const messages: Anthropic.MessageParam[] = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage },
  ];

  // ── Agentic tool-calling loop (max 5 iterations) ──────────────────────────
  const MAX_ITERATIONS = 5;
  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await getAnthropic().messages.create({
        model:      'claude-sonnet-4-6', // FIXED: upgraded to claude-sonnet-4-6
        max_tokens: 4096,
        system:     systemPrompt,
        tools:      BOSS_TOOLS,
        messages,
      });

      // If no tool calls, return the text directly
      if (response.stop_reason !== 'tool_use') {
        return response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('') || '✅ Done.';
      }

      // Execute every tool_use block in this turn
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        let resultContent: string;
        let isError = false;
        try {
          resultContent = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
          );
        } catch (err) {
          resultContent = `Error: ${String(err)}`;
          isError = true;
        }

        toolResults.push({
          type:        'tool_result',
          tool_use_id: block.id,
          content:     resultContent,
          ...(isError ? { is_error: true } : {}),
        });
      }

      // Append the assistant turn and the tool results, then loop
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user',      content: toolResults });
    }

    return 'I reached the maximum number of tool steps. Please try a more specific request.';
  } catch (err) {
    return `Sorry, I ran into an error: ${String(err)}`;
  }
}
