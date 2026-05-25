import crypto from 'crypto';

const APP_SECRET = process.env.META_APP_SECRET ?? '';
const PAGE_TOKEN = process.env.META_PAGE_ACCESS_TOKEN ?? '';
const WA_PHONE_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID ?? '';
const WA_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN ?? '';
const IG_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN ?? '';
const IG_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ?? '';

/** Verify Meta webhook signature */
export function verifyMetaSignature(body: string, signature: string): boolean {
  if (!APP_SECRET) return false; // reject all requests when APP_SECRET is not configured
  const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Send a WhatsApp text message */
export async function sendWhatsAppMessage(to: string, text: string): Promise<string | null> {
  if (!WA_PHONE_ID || !WA_TOKEN) return null;
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WA_TOKEN}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    }
  );
  const data = await res.json() as { messages?: { id: string }[] };
  return data.messages?.[0]?.id ?? null;
}

/** Send an Instagram DM */
export async function sendInstagramDM(recipientId: string, text: string): Promise<string | null> {
  if (!IG_TOKEN || !IG_ACCOUNT_ID) return null;
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ACCOUNT_ID}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${IG_TOKEN}` },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    }
  );
  const data = await res.json() as { message_id?: string; error?: { message: string } };
  if (data.error) console.error('IG DM error:', data.error.message);
  return data.message_id ?? null;
}

/** Get Lead Ad form data */
export async function getLeadAdData(leadgenId: string): Promise<Record<string, string>> {
  if (!PAGE_TOKEN) return {};
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${leadgenId}?fields=field_data,ad_id,ad_name,form_id,campaign_name&access_token=${PAGE_TOKEN}`
  );
  const data = await res.json() as {
    field_data?: { name: string; values: string[] }[];
    ad_id?: string;
    ad_name?: string;
    form_id?: string;
    campaign_name?: string;
  };
  const fields: Record<string, string> = {};
  (data.field_data ?? []).forEach(f => { fields[f.name] = f.values[0] ?? ''; });
  fields._ad_id = data.ad_id ?? '';
  fields._ad_name = data.ad_name ?? '';
  fields._form_id = data.form_id ?? '';
  fields._campaign_name = data.campaign_name ?? '';
  return fields;
}

/** Generate a Claude reply for social messages */
export async function generateSocialReply(context: {
  channel: 'whatsapp' | 'instagram';
  senderName: string;
  messageText: string;
  isExistingLead: boolean;
  isAfterHours: boolean;
}): Promise<string> {
  const CLAUDE_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!CLAUDE_KEY) return "Hi! Thanks for reaching out to Alon's Kitchens. We'll get back to you shortly!";

  const hour = new Date().getHours();
  const afterHours = context.isAfterHours || hour < 8 || hour >= 18;

  const prompt = `You are a friendly, professional assistant for Alon's Kitchens — a custom kitchen cabinet company in South Florida (Boca Raton area). Respond to this ${context.channel} message.

Sender: ${context.senderName}
Message: "${context.messageText}"
Existing customer: ${context.isExistingLead ? 'Yes' : 'No'}
After hours: ${afterHours ? 'Yes — acknowledge and say you will follow up in the morning' : 'No'}

Rules:
- Sound human, warm, professional — NEVER like a bot
- Keep it under 3 sentences
- If they ask about price/estimate: offer a free in-home estimate, mention you serve all of South Florida
- If after hours: thank them, say the team will follow up first thing in the morning
- Sign off as "Alon's Kitchens"
- Do NOT use emojis excessively — max 1
- Do NOT mention being an AI

Write only the reply message, nothing else.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': CLAUDE_KEY,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json() as { content?: { type: string; text?: string }[] };
  return (data.content ?? []).filter(b => b.type === 'text').map(b => b.text ?? '').join('').trim()
    || "Thanks for reaching out! We'll be in touch shortly. — Alon's Kitchens";
}
