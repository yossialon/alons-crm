// Email sending via Resend (https://resend.com).
// Requires: RESEND_API_KEY, OUTREACH_FROM_EMAIL in .env.local
// Free tier: 3,000 emails/month, 100/day.
// For testing without a verified domain use from: "onboarding@resend.dev"

export interface SendEmailOptions {
  to:      string;
  subject: string;
  html:    string;
  text?:   string;
}

export interface SendResult {
  ok:    boolean;
  id?:   string;
  error?: string;
}

export async function sendEmail(opts: SendEmailOptions): Promise<SendResult> {
  const apiKey  = process.env.RESEND_API_KEY;
  const from    = process.env.OUTREACH_FROM_EMAIL ?? 'onboarding@resend.dev';

  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not configured' };
  if (!opts.to?.includes('@')) return { ok: false, error: 'Invalid recipient email' };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to:      [opts.to],
      subject: opts.subject,
      html:    opts.html,
      text:    opts.text ?? opts.html.replace(/<[^>]+>/g, ''),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.message ?? `HTTP ${res.status}` };
  return { ok: true, id: data.id };
}

// Wrap plaintext body with open-tracking pixel and click-tracked links
export function buildTrackedHtml(opts: {
  body:       string;
  sendId:     string;
  appUrl:     string;
}): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? opts.appUrl;
  const pixel = `<img src="${base}/api/track/open/${opts.sendId}" width="1" height="1" alt="" style="display:none" />`;

  // Wrap http/https links with click-tracking redirect
  const linked = opts.body.replace(
    /https?:\/\/[^\s"'<>]+/g,
    (url) => `${base}/api/track/click/${opts.sendId}?url=${encodeURIComponent(url)}`,
  );

  return `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#334155;max-width:600px;margin:0 auto;padding:24px">
  <div>${linked.replace(/\n/g, '<br/>')}</div>
  <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0"/>
  <p style="font-size:11px;color:#94A3B8">
    Alon's Kitchens · South Florida Custom Kitchen Cabinets<br/>
    954-859-9046 · alonskitchen.com
  </p>
  ${pixel}
</body>
</html>`;
}
