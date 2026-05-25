import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';
import { sendWhatsAppMessage } from '@/lib/meta';
import { getSessionPayload } from '@/lib/session';

// ── Input schema ──────────────────────────────────────────────────────────────
const SendSchema = z.object({
  to:      z.string().min(7).max(20).regex(/^\+?[0-9\s\-().]+$/, 'Invalid phone number'),
  message: z.string().min(1).max(4096),
});

// ── Simple in-memory rate limiter (5 req / 60 s per IP) ──────────────────────
// NOTE: stateless across serverless cold starts — upgrade to Upstash Redis for
//       distributed rate limiting once traffic grows.
const ratemap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT   = 5;
const RATE_WINDOW  = 60_000; // ms

function checkRate(ip: string): boolean {
  const now  = Date.now();
  const slot = ratemap.get(ip);
  if (!slot || now > slot.reset) {
    ratemap.set(ip, { count: 1, reset: now + RATE_WINDOW });
    return true;
  }
  if (slot.count >= RATE_LIMIT) return false;
  slot.count++;
  return true;
}

export async function POST(req: NextRequest) {
  // ── 1. Session auth — only authenticated users may send WhatsApp messages ──
  const session = await getSessionPayload(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 2. Rate limit ─────────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRate(ip)) {
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
