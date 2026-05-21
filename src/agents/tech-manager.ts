// ── Tech Manager Agent ────────────────────────────────────────────────────────
// Health check every 10 min (9 checks). Weekly optimization report.
// Auto-recovery: alerts owner + logs on error. Never crashes silently.

import { logAgentRun, updateAgentRun, saveHealthCheck, saveTechRecommendation } from '@/agents/tools/database';
import { callClaude } from '@/agents/tools/claude';
import { alertOwner } from '@/agents/tools/whatsapp';
import { runAllHealthChecks } from '@/agents/tools/monitor';
import type { HealthCheck, TechRecommendation } from '@/agents/types';

// ── Health Check Run ─────────────────────────────────────────────────────────
export async function runHealthCheck(trigger: 'cron' | 'manual' = 'cron'): Promise<{
  checks: HealthCheck[];
  allOk: boolean;
  errors: string[];
}> {
  const runId = await logAgentRun('tech-manager', trigger);
  const errors: string[] = [];

  try {
    const checks = await runAllHealthChecks();

    // Persist each check to DB
    for (const check of checks) {
      try {
        await saveHealthCheck(check);
      } catch (err) {
        errors.push(`Save ${check.name}: ${String(err)}`);
      }
    }

    const failedChecks = checks.filter((c) => c.status === 'error');
    const warnChecks   = checks.filter((c) => c.status === 'warn');
    const allOk        = failedChecks.length === 0;

    // Alert owner if any critical failures
    if (failedChecks.length > 0) {
      const failList = failedChecks.map((c) => `• ${c.name}: ${c.details ?? 'no details'}`).join('\n');
      await alertOwner(
        `🚨 *מנהל טכני — אזהרה!*\n\n${failedChecks.length} בדיקות נכשלו:\n${failList}\n\n${warnChecks.length > 0 ? `⚠️ אזהרות: ${warnChecks.map(c => c.name).join(', ')}` : ''}`
      );
    }

    const summary = checks
      .map((c) => `${c.status === 'ok' ? '✅' : c.status === 'warn' ? '⚠️' : '❌'} ${c.name}${c.value_ms ? ` (${c.value_ms}ms)` : ''}`)
      .join(', ');

    await updateAgentRun(runId, {
      status:  failedChecks.length > 2 ? 'error' : failedChecks.length > 0 || warnChecks.length > 0 ? 'partial' : 'success',
      summary: `Health: ${checks.filter(c => c.status === 'ok').length}✅ ${warnChecks.length}⚠️ ${failedChecks.length}❌. ${summary}`,
      errors,
    });

    return { checks, allOk, errors };
  } catch (err) {
    const msg = String(err);
    await updateAgentRun(runId, { status: 'error', summary: msg, errors: [msg] });
    await alertOwner(`❌ *מנהל טכני* — בדיקת בריאות נכשלה:\n${msg}`);
    return { checks: [], allOk: false, errors: [msg] };
  }
}

// ── Weekly Optimization Report ────────────────────────────────────────────────
export async function runOptimizationReport(trigger: 'cron' | 'manual' = 'cron'): Promise<{
  recommendations: TechRecommendation[];
  errors: string[];
}> {
  const runId = await logAgentRun('tech-manager', trigger);
  const errors: string[] = [];

  try {
    // Run health checks to get current state
    const checks = await runAllHealthChecks();

    const slowChecks = checks.filter((c) => (c.value_ms ?? 0) > 1000);
    const errorChecks = checks.filter((c) => c.status === 'error');
    const warnChecks  = checks.filter((c) => c.status === 'warn');

    const healthSummary = checks.map((c) =>
      `- ${c.name}: ${c.status}${c.value_ms ? ` (${c.value_ms}ms)` : ''}${c.details ? ` — ${c.details}` : ''}`
    ).join('\n');

    const response = await callClaude([{
      role:    'user',
      content: `You are a senior DevOps engineer reviewing a Next.js CRM system for Alon's Kitchens (small business).

Current system health:
${healthSummary}

Slow checks (>1000ms): ${slowChecks.map(c => c.name).join(', ') || 'none'}
Error checks: ${errorChecks.map(c => c.name).join(', ') || 'none'}
Warning checks: ${warnChecks.map(c => c.name).join(', ') || 'none'}

Provide 3-5 specific, actionable optimization recommendations.
Format as JSON array: [{
  "category": "performance|cost|reliability|feature",
  "priority": "low|medium|high|critical",
  "title": "short title",
  "description": "specific action to take"
}]
Return ONLY the JSON array.`,
    }]);

    const match = response.match(/\[[\s\S]*\]/);
    const recs: TechRecommendation[] = match ? JSON.parse(match[0]) : [];

    // Save to DB
    for (const rec of recs) {
      try {
        await saveTechRecommendation(rec);
      } catch (err) {
        errors.push(`Save rec: ${String(err)}`);
      }
    }

    await updateAgentRun(runId, {
      status:  'success',
      summary: `Optimization report generated. ${recs.length} recommendations. Checks: ${checks.filter(c => c.status === 'ok').length}/${checks.length} OK`,
      errors,
    });

    // WhatsApp summary
    if (recs.length > 0) {
      const criticals = recs.filter((r) => r.priority === 'critical' || r.priority === 'high');
      if (criticals.length > 0) {
        const list = criticals.map((r, i) => `${i + 1}. *[${r.priority.toUpperCase()}]* ${r.title}`).join('\n');
        await alertOwner(`🔧 *מנהל טכני — דוח שבועי*\n\n${criticals.length} המלצות דחופות:\n${list}\n\nראה לשונית Settings → System לפרטים`);
      }
    }

    return { recommendations: recs, errors };
  } catch (err) {
    const msg = String(err);
    await updateAgentRun(runId, { status: 'error', summary: msg, errors: [msg] });
    await alertOwner(`❌ *מנהל טכני* — דוח שבועי נכשל:\n${msg}`);
    return { recommendations: [], errors: [msg] };
  }
}
