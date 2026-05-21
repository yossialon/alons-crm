import { NextRequest, NextResponse } from 'next/server';
import { runHealthCheck } from '@/agents/tech-manager';

function verifyAuth(req: NextRequest): boolean {
  const auth   = req.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET ?? process.env.AGENT_SECRET ?? '';
  if (!secret) return true;
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await runHealthCheck('cron');
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await runHealthCheck('manual');
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
