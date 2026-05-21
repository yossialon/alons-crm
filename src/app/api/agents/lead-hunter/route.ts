import { NextRequest, NextResponse } from 'next/server';
import { runLeadHunter } from '@/agents/lead-hunter';

function verifyAuth(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET ?? process.env.AGENT_SECRET ?? '';
  if (!secret) return true; // dev mode — skip auth
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const trigger = (await req.json().catch(() => ({}))).trigger ?? 'cron';
    const result  = await runLeadHunter(trigger);
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
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
