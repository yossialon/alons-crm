// Data deletion endpoint — serves two callers:
//
//  1. Meta webhook callback (app review requirement):
//     POST, Content-Type: application/x-www-form-urlencoded
//     Body: signed_request=<base64url_sig>.<base64url_payload>
//     Meta sends this when a user requests data deletion via Facebook privacy settings.
//     Must verify HMAC-SHA256 signature using META_APP_SECRET, then return:
//       { "url": "<status-page-url>?code=<uuid>", "confirmation_code": "<uuid>" }
//
//  2. Human form on /data-deletion:
//     POST, Content-Type: application/json
//     Body: { name, email, message? }
//     Sends an email to the owner and returns { success: true }.

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendEmail } from '@/lib/outreach/email';
import { getAppUrl } from '@/lib/app-url';

const OWNER_EMAIL = 'shimon@alonskitchens.com';

// ── Meta signed_request handler ────────────────────────────────────────────

interface MetaPayload {
  algorithm: string;
  issued_at: number;
  user_id: string;
}

function parseSignedRequest(
  signedRequest: string,
  appSecret: string,
): MetaPayload | null {
  const dotIndex = signedRequest.indexOf('.');
  if (dotIndex === -1) return null;

  const encodedSig = signedRequest.slice(0, dotIndex);
  const encodedPayload = signedRequest.slice(dotIndex + 1);

  // Base64url → Buffer
  const toBuffer = (b64url: string) =>
    Buffer.from(b64url.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

  // Verify HMAC-SHA256 signature over the raw encoded payload string
  const expectedSig = crypto
    .createHmac('sha256', appSecret)
    .update(encodedPayload)
    .digest();

  let valid = false;
  try {
    valid = crypto.timingSafeEqual(toBuffer(encodedSig), expectedSig);
  } catch {
    return null;
  }
  if (!valid) return null;

  try {
    return JSON.parse(toBuffer(encodedPayload).toString('utf8')) as MetaPayload;
  } catch {
    return null;
  }
}

async function handleMetaCallback(req: NextRequest): Promise<NextResponse> {
  const appSecret = process.env.META_APP_SECRET ?? '';
  if (!appSecret) {
    console.error('[data-deletion] META_APP_SECRET is not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // Meta sends form-encoded body
  const text = await req.text();
  const params = new URLSearchParams(text);
  const signedRequest = params.get('signed_request');

  if (!signedRequest) {
    return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 });
  }

  const payload = parseSignedRequest(signedRequest, appSecret);
  if (!payload) {
    console.warn('[data-deletion] Invalid signed_request signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  const confirmationCode = crypto.randomUUID();
  const statusUrl = `${getAppUrl()}/data-deletion?code=${confirmationCode}`;

  // Notify owner — fire-and-forget, don't block the Meta response
  sendEmail({
    to: OWNER_EMAIL,
    subject: `Meta Data Deletion Request — Facebook User ${payload.user_id}`,
    html: buildMetaEmailHtml(payload.user_id, confirmationCode),
  }).catch((err) =>
    console.error('[data-deletion] Meta email notification failed:', err),
  );

  console.log(
    `[data-deletion] Meta request received — user_id=${payload.user_id} code=${confirmationCode}`,
  );

  // Meta requires exactly this shape
  return NextResponse.json({ url: statusUrl, confirmation_code: confirmationCode });
}

// ── Human form handler ──────────────────────────────────────────────────────

async function handleFormSubmission(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, email, message } = body as {
    name?: string;
    email?: string;
    message?: string;
  };

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'name and email are required' }, { status: 400 });
  }
  if (!email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const submittedAt = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const result = await sendEmail({
    to: OWNER_EMAIL,
    subject: `Data Deletion Request from ${name.trim()} <${email.trim()}>`,
    html: buildFormEmailHtml(name.trim(), email.trim(), message?.trim() ?? '', submittedAt),
  });

  if (!result.ok) {
    console.error('[data-deletion] sendEmail failed:', result.error);
    return NextResponse.json(
      { error: 'Failed to send request. Please email us directly at shimon@alonskitchens.com' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

// ── Route entry point ───────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ct = req.headers.get('content-type') ?? '';

  // Meta sends application/x-www-form-urlencoded with a signed_request field
  if (ct.includes('application/x-www-form-urlencoded')) {
    return handleMetaCallback(req);
  }

  return handleFormSubmission(req);
}

// ── Email templates ─────────────────────────────────────────────────────────

function buildMetaEmailHtml(userId: string, code: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 24px;font-size:20px;border-bottom:2px solid #1a1a1a;padding-bottom:12px">
    Meta Data Deletion Request — Alon's Kitchens
  </h2>
  <p>A Facebook user has requested deletion of their data through Meta's privacy settings.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
    <tr>
      <td style="padding:10px 12px;background:#f7f7f5;border:1px solid #e0e0e0;font-weight:700;width:160px">Facebook User ID</td>
      <td style="padding:10px 12px;border:1px solid #e0e0e0;font-family:monospace">${escapeHtml(userId)}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;background:#f7f7f5;border:1px solid #e0e0e0;font-weight:700">Confirmation Code</td>
      <td style="padding:10px 12px;border:1px solid #e0e0e0;font-family:monospace">${escapeHtml(code)}</td>
    </tr>
  </table>
  <p>Search your CRM for any leads associated with this Facebook User ID and delete their personal data.</p>
  <hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0"/>
  <p style="font-size:12px;color:#888;margin:0">
    Automated notification from alonskitchens.com/api/data-deletion<br/>
    Please act on this request within 30 days per your Privacy Policy.
  </p>
</body>
</html>`;
}

function buildFormEmailHtml(
  name: string,
  email: string,
  message: string,
  submittedAt: string,
): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 24px;font-size:20px;border-bottom:2px solid #1a1a1a;padding-bottom:12px">
    Data Deletion Request — Alon's Kitchens
  </h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr>
      <td style="padding:10px 12px;background:#f7f7f5;border:1px solid #e0e0e0;font-weight:700;width:120px">Name</td>
      <td style="padding:10px 12px;border:1px solid #e0e0e0">${escapeHtml(name)}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;background:#f7f7f5;border:1px solid #e0e0e0;font-weight:700">Email</td>
      <td style="padding:10px 12px;border:1px solid #e0e0e0">${escapeHtml(email)}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;background:#f7f7f5;border:1px solid #e0e0e0;font-weight:700">Submitted</td>
      <td style="padding:10px 12px;border:1px solid #e0e0e0">${escapeHtml(submittedAt)}</td>
    </tr>
  </table>
  ${message ? `
  <h3 style="margin:24px 0 8px;font-size:15px">Message</h3>
  <div style="background:#f7f7f5;border:1px solid #e0e0e0;border-radius:4px;padding:16px;white-space:pre-wrap">${escapeHtml(message)}</div>
  ` : ''}
  <hr style="border:none;border-top:1px solid #e0e0e0;margin:28px 0"/>
  <p style="font-size:12px;color:#888;margin:0">
    Submitted via alonskitchens.com/data-deletion<br/>
    Please respond within 30 days per your Privacy Policy (Section 9).
  </p>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
