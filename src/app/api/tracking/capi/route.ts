/**
 * Meta Conversions API (CAPI) endpoint — server-side event mirror.
 * ─────────────────────────────────────────────────────────────────────────────
 * STATUS: STUB — returns 200 and logs but does NOT yet forward to Meta.
 *
 * HOW TO ACTIVATE:
 *   1. Add META_CAPI_ACCESS_TOKEN to Vercel env vars.
 *      (System User token with ads_management + business_management scopes)
 *   2. Uncomment the fetch() block below.
 *   3. In pixel.ts, uncomment every `void sendToCAPI(...)` line.
 *
 * WHY CAPI:
 *   Browser pixels are blocked by ad blockers and iOS ITP.
 *   CAPI sends the same event from your server to Meta, bypassing those limits.
 *   The shared eventID between the browser call and CAPI call lets Meta
 *   deduplicate them so you never count a single conversion twice.
 *
 * GDPR NOTE:
 *   Hash all PII (email, phone, name) with SHA-256 before sending.
 *   See normalizeAndHash() below — it's already wired in but unused until
 *   you have user context (session) to pull from.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const PIXEL_ID         = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '';
const CAPI_ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN   ?? '';
const CAPI_URL          = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events`;

interface CAPIPayload {
  eventName:      string;
  eventId:        string;
  eventTime:      number;
  eventSourceUrl: string;
  userData?:      UserData;
  customData?:    Record<string, unknown>;
}

interface UserData {
  email?:      string;  // will be SHA-256 hashed before sending
  phone?:      string;  // will be SHA-256 hashed before sending
  firstName?:  string;  // will be SHA-256 hashed before sending
  lastName?:   string;  // will be SHA-256 hashed before sending
  clientIp?:   string;
  clientAgent?: string;
  fbc?:        string;  // _fbc cookie value
  fbp?:        string;  // _fbp cookie value
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payload = body as CAPIPayload;

  if (!payload.eventName || !payload.eventId) {
    return NextResponse.json({ error: 'eventName and eventId are required' }, { status: 400 });
  }

  // Enrich userData with request context (IP, user-agent) for better match rates
  const enrichedUserData: Record<string, string> = {};
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? '';
  const ua = req.headers.get('user-agent') ?? '';

  if (ip) enrichedUserData['client_ip_address'] = ip;
  if (ua) enrichedUserData['client_user_agent'] = ua;

  // Hash any PII provided by the client
  if (payload.userData?.email)     enrichedUserData['em'] = normalizeAndHash(payload.userData.email);
  if (payload.userData?.phone)     enrichedUserData['ph'] = normalizeAndHash(payload.userData.phone.replace(/\D/g, ''));
  if (payload.userData?.firstName) enrichedUserData['fn'] = normalizeAndHash(payload.userData.firstName.toLowerCase());
  if (payload.userData?.lastName)  enrichedUserData['ln'] = normalizeAndHash(payload.userData.lastName.toLowerCase());
  if (payload.userData?.fbc)       enrichedUserData['fbc'] = payload.userData.fbc;
  if (payload.userData?.fbp)       enrichedUserData['fbp'] = payload.userData.fbp;

  const metaEvent = {
    event_name:        payload.eventName,
    event_id:          payload.eventId,          // ← deduplicates against browser pixel
    event_time:        payload.eventTime || Math.floor(Date.now() / 1000),
    event_source_url:  payload.eventSourceUrl,
    action_source:     'website',
    user_data:         enrichedUserData,
    custom_data:       payload.customData ?? {},
  };

  // ── STUB: log only ────────────────────────────────────────────────────────
  // Remove this block and uncomment the fetch() block below to go live.
  console.log('[CAPI stub] Would send to Meta:', JSON.stringify(metaEvent, null, 2));
  return NextResponse.json({ ok: true, stub: true });

  // ── ACTIVATE: uncomment when META_CAPI_ACCESS_TOKEN is set ───────────────
  // if (!PIXEL_ID || !CAPI_ACCESS_TOKEN) {
  //   console.warn('[CAPI] PIXEL_ID or META_CAPI_ACCESS_TOKEN not set — skipping');
  //   return NextResponse.json({ ok: true, skipped: true });
  // }
  //
  // const res = await fetch(`${CAPI_URL}?access_token=${CAPI_ACCESS_TOKEN}`, {
  //   method:  'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body:    JSON.stringify({
  //     data:             [metaEvent],
  //     test_event_code:  process.env.META_CAPI_TEST_CODE, // set in Meta Events Manager while testing
  //   }),
  // });
  //
  // const data = await res.json().catch(() => ({}));
  //
  // if (!res.ok) {
  //   console.error('[CAPI] Meta rejected event:', data);
  //   return NextResponse.json({ error: 'Meta CAPI error', detail: data }, { status: 502 });
  // }
  //
  // return NextResponse.json({ ok: true, meta: data });
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/** SHA-256 hash required by Meta for all PII fields. */
function normalizeAndHash(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}
