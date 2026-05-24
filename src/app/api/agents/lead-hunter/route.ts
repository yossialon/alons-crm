import { NextRequest, NextResponse } from 'next/server';
import { runLeadHunter } from '@/agents/lead-hunter';
import { notifyAdMachine } from '@/agents/ad-machine';
import { logAgentRun, updateAgentRun } from '@/agents/tools/database';

function verifyAuth(req: NextRequest): boolean {
  const auth   = req.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET ?? process.env.AGENT_SECRET ?? '';
  if (!secret) return true; // dev mode — skip auth
  return auth === `Bearer ${secret}`;
}

/**
 * After a successful lead-hunter run that imported > 0 leads:
 *  1. Logs a delegation event to agent_runs (agent_name='boss', trigger='auto-delegation')
 *  2. Calls notifyAdMachine() to enqueue the ad-machine task, optionally fire a
 *     background campaign review, and launch geo campaigns for new cities.
 *
 * Errors here are non-fatal — the hunter result is always returned to the caller.
 */
async function maybeDelegateToAdMachine(
  importedLeads: number,
  newLocations:  Array<{ city: string; zip: string }>,
): Promise<void> {
  const delegationId = await logAgentRun('boss', 'auto-delegation');
  try {
    await notifyAdMachine(importedLeads, newLocations);
    await updateAgentRun(delegationId, {
      status:         'success',
      summary:        `Lead Hunter imported ${importedLeads} lead${importedLeads === 1 ? '' : 's'}. Delegated to Ad Machine. New locations: ${newLocations.map((l) => l.city).join(', ') || 'none'}.`,
      leads_imported: importedLeads,
      errors:         [],
    });
  } catch (err) {
    await updateAgentRun(delegationId, {
      status:  'error',
      summary: `Delegation to Ad Machine failed: ${String(err)}`,
      errors:  [String(err)],
    }).catch(() => {});
    throw err;
  }
}

export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const trigger = (await req.json().catch(() => ({}))).trigger ?? 'cron';
    const result  = await runLeadHunter(trigger);

    if (result.imported > 0) {
      maybeDelegateToAdMachine(result.imported, result.newLocations).catch((err: unknown) =>
        console.error('[lead-hunter route] Auto-delegation failed:', err),
      );
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // GET = manual trigger from UI (same as POST)
  try {
    const result = await runLeadHunter('manual');

    if (result.imported > 0) {
      maybeDelegateToAdMachine(result.imported, result.newLocations).catch((err: unknown) =>
        console.error('[lead-hunter route] Auto-delegation failed:', err),
      );
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
