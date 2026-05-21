import { NextRequest, NextResponse } from 'next/server';
import { getSessionPayload } from '@/lib/session';
import { getRecentRuns } from '@/agents/tools/database';

export async function GET(req: NextRequest) {
  const payload = await getSessionPayload(req);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '20');
  try {
    const runs = await getRecentRuns(Math.min(limit, 100));
    return NextResponse.json(runs);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
