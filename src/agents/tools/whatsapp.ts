// ── Agent WhatsApp Tool ───────────────────────────────────────────────────────
// Sends WhatsApp messages to the owner in Hebrew.

import { sendWhatsAppMessage } from '@/lib/meta';

const OWNER_PHONE = process.env.OWNER_PHONE ?? '';
const OWNER_NAME  = process.env.OWNER_NAME  ?? 'אלון';

/**
 * Alert the owner via WhatsApp.
 * Silently skips if OWNER_PHONE is not configured.
 */
export async function alertOwner(message: string): Promise<void> {
  if (!OWNER_PHONE) {
    console.log('[Agent WA] OWNER_PHONE not set — skipping WhatsApp alert');
    return;
  }
  try {
    await sendWhatsAppMessage(OWNER_PHONE, message);
  } catch (err) {
    console.error('[Agent WA] Failed to send owner alert:', err);
  }
}

/**
 * Send a structured daily briefing in Hebrew.
 */
export async function sendDailyBriefing(sections: {
  title: string;
  lines: string[];
}[]): Promise<void> {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' });
  const dateStr = now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/New_York' });

  const body = sections
    .map((s) => `*${s.title}*\n${s.lines.join('\n')}`)
    .join('\n\n');

  const msg = `🌅 *בוקר טוב ${OWNER_NAME}!* (${timeStr}, ${dateStr})\n\n${body}\n\n_הדוח מופק אוטומטית על ידי המערכת_ 🤖`;
  await alertOwner(msg);
}
