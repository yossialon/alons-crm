import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleBossChat } from '@/agents/orchestrator';
import { getSessionPayload } from '@/lib/session';

// ── Input schema ──────────────────────────────────────────────────────────────
const HistoryItemSchema = z.object({
  role:    z.enum(['user', 'assistant']),
  content: z.string().max(4000),
});

const ChatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(HistoryItemSchema).max(20).optional(),
});

// ── POST /api/agents/boss/chat ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Chat endpoint authenticated via session (not CRON_SECRET — called from the UI)
  const payload = await getSessionPayload(req);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Enforce payload size before parsing (prevent multi-MB JSON attacks)
  const contentLength = Number(req.headers.get('content-length') ?? 0);
  if (contentLength > 64_000) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  let body: z.infer<typeof ChatSchema>;
  try {
    body = ChatSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request', details: err instanceof z.ZodError ? err.issues : String(err) },
      { status: 400 },
    );
  }

  try {
    const reply = await handleBossChat(body.message.trim(), body.history ?? []);
    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
