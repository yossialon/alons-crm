import { NextRequest, NextResponse } from 'next/server';
import { getSessionPayload } from '@/lib/session';
import { getLatestHealthChecks } from '@/agents/tools/database';

export async function GET(req: NextRequest) {
  const payload = await getSessionPayload(req);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const checks = await getLatestHealthChecks();
    return NextResponse.json(checks);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
