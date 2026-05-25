import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { serverDb as supabase } from '@/lib/supabase-server';
import { getOrgId } from '@/lib/tenant';
import { sendWhatsAppMessage } from '@/lib/meta';
import { getSessionPayload } from '@/lib/session';
import { checkRateLimit } from '@/lib/rateLimit';

// ── Input schema ──────────────────────────────────────────────────────────────
const SendSchema = z.object({
  to:      z.string().min(7).max(20).regex(/^\+?[0-9\s\-().]+$/, 'Invalid phone number'),
  message: z.string().min(1).max(4096),
});

export async function POST(req: NextRequest) {
  // ── 1. Session auth — only authenticated users may send WhatsApp messages ──
  const session = await getSessionPayload(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Rate limit (Upstash Redis → ioredis → in-memory fallback) ─────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const allowed = await checkRateLimit(`${ip}:whatsapp-send`, { windowMs: 60_000, max: 5 });
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests — please wait before sending another message' },
      { status: 429 },
    );
  }

  // ── 3. Validate input ─────────────────────────────────────────────────────
  let body: z.infer<typeof SendSchema>;
  try {
    body = SendSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request', details: err instanceof z.ZodError ? err.issues : String(err) },
      { status: 400 },
    );
  }

  const { to, message } = body;

  // ── 4. Send ───────────────────────────────────────────────────────────────
  const msgId = await sendWhatsAppMessage(to, message);
  if (!msgId) {
    return NextResponse.json(
      { error: 'WhatsApp not configured or send failed' },
      { status: 500 },
    );
  }

  const orgId = await getOrgId();
  await supabase.from('social_messages').insert({
    org_id:          orgId,
    platform:        'whatsapp',
    thread_id:       to,
    sender_name:     "Alon's Kitchens",
    sender_phone:    to,
    message,
    direction:       'outbound',
    is_read:         true,
    is_hot:          false,
    meta_message_id: msgId,
  });

  return NextResponse.json({ ok: true, msgId });
}
