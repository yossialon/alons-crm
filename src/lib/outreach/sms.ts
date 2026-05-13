// SMS sending via Twilio (https://twilio.com).
// Requires: TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM in .env.local
// TWILIO_FROM must be a Twilio phone number or messaging service SID.

export interface SendSmsOptions {
  to:   string; // E.164 format preferred: +15551234567
  body: string;
}

export interface SendResult {
  ok:     boolean;
  sid?:   string;
  error?: string;
}

export async function sendSms(opts: SendSmsOptions): Promise<SendResult> {
  const sid   = process.env.TWILIO_SID;
  const token = process.env.TWILIO_TOKEN;
  const from  = process.env.TWILIO_FROM;

  if (!sid || !token || !from) return { ok: false, error: 'Twilio credentials not configured' };

  // Normalize phone: strip everything except digits and leading +
  const to = opts.to.replace(/[^\d+]/g, '').replace(/^(\d)/, '+$1');
  if (to.replace(/\D/g, '').length < 7) return { ok: false, error: 'Invalid phone number' };

  const body = new URLSearchParams({ To: to, From: from, Body: opts.body });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      },
      body: body.toString(),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.message ?? `HTTP ${res.status}` };
  return { ok: true, sid: data.sid };
}
