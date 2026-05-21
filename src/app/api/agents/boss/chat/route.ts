import { NextRequest, NextResponse } from 'next/server';
import { handleBossChat } from '@/agents/orchestrator';
import { getSessionPayload } from '@/lib/session';

export async function POST(req: NextRequest) {
  // Chat endpoint is authenticated via session (not CRON_SECRET) since it's used from the UI
  const payload = await getSessionPayload(req);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json() as {
      message: string;
      history?: { role: 'user' | 'assistant'; content: string }[];
    };

    if (!body.message?.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const reply = await handleBossChat(body.message.trim(), body.history ?? []);
    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
