// ── Agent WhatsApp / Alert Tool ───────────────────────────────────────────────
// Primary channel: Meta WhatsApp Business API
// Fallback channel: Resend email (when WhatsApp credentials are not configured)

import { sendWhatsAppMessage } from '@/lib/meta';

const OWNER_PHONE = process.env.OWNER_PHONE ?? '';
const OWNER_NAME  = process.env.OWNER_NAME  ?? 'שמעון';
const OWNER_EMAIL = process.env.OWNER_EMAIL ?? '';
const RESEND_KEY  = process.env.RESEND_API_KEY ?? '';
const FROM_EMAIL  = process.env.OUTREACH_FROM_EMAIL ?? 'onboarding@resend.dev';

// WhatsApp credentials check
function hasWhatsAppCredentials(): boolean {
  return !!(process.env.META_WHATSAPP_PHONE_NUMBER_ID && process.env.META_WHATSAPP_ACCESS_TOKEN);
}

/**
 * Send an alert to the owner via WhatsApp (primary) or email (fallback).
 * Never throws — silently logs on error.
 */
export async function alertOwner(message: string): Promise<void> {
  // ── Primary: WhatsApp ──────────────────────────────────────────────────────
  if (OWNER_PHONE && hasWhatsAppCredentials()) {
    try {
      await sendWhatsAppMessage(OWNER_PHONE, message);
      return; // success — don't also send email
    } catch (err) {
      console.error('[Agent Alert] WhatsApp failed, falling back to email:', err);
    }
  }

  // ── Fallback: Resend email ─────────────────────────────────────────────────
  if (OWNER_EMAIL && RESEND_KEY) {
    try {
      // Convert WhatsApp markdown (*bold* → <strong>) to basic HTML
      const htmlBody = message
        .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

      const res = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${RESEND_KEY}`,
        },
        body: JSON.stringify({
          from:    `Alon's CRM <${FROM_EMAIL}>`,
          to:      [OWNER_EMAIL],
          subject: `🤖 CRM Agent Alert`,
          html:    `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">${htmlBody}</div>`,
          text:    message,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('[Agent Alert] Resend email failed:', err);
      } else {
        console.log('[Agent Alert] Email sent to', OWNER_EMAIL);
      }
    } catch (err) {
      console.error('[Agent Alert] Email fallback failed:', err);
    }
    return;
  }

  // Neither channel configured
  console.log('[Agent Alert] No messaging channel configured. Message:\n', message);
}

/**
 * Send a structured daily briefing in Hebrew via WhatsApp / email fallback.
 */
export async function sendDailyBriefing(sections: {
  title: string;
  lines: string[];
}[]): Promise<void> {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' });
  const dateStr = now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/New_York' });

  // WhatsApp / plain-text version
  const body = sections
    .map((s) => `*${s.title}*\n${s.lines.join('\n')}`)
    .join('\n\n');

  const msg = `🌅 *בוקר טוב ${OWNER_NAME}!* (${timeStr}, ${dateStr})\n\n${body}\n\n_הדוח מופק אוטומטית על ידי המערכת_ 🤖`;

  // If email is the channel, send a richer HTML email
  if (!hasWhatsAppCredentials() && OWNER_EMAIL && RESEND_KEY) {
    try {
      const htmlSections = sections.map((s) => `
        <div style="margin-bottom:20px">
          <h3 style="color:#92400e;border-bottom:2px solid #fbbf24;padding-bottom:6px;margin:0 0 10px">${s.title}</h3>
          <ul style="margin:0;padding-left:20px;color:#374151">
            ${s.lines.map((l) => `<li style="margin-bottom:4px">${l.replace(/\*(.*?)\*/g, '<strong>$1</strong>')}</li>`).join('')}
          </ul>
        </div>`).join('');

      const html = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;direction:rtl;text-align:right">
          <div style="background:linear-gradient(135deg,#92400e,#d97706);color:white;padding:20px;border-radius:12px;margin-bottom:24px">
            <h1 style="margin:0;font-size:22px">🌅 בוקר טוב ${OWNER_NAME}!</h1>
            <p style="margin:8px 0 0;opacity:0.9;font-size:14px">${timeStr} · ${dateStr}</p>
          </div>
          ${htmlSections}
          <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px">
            הדוח מופק אוטומטית על ידי Alon's Kitchens CRM 🤖
          </p>
        </div>`;

      const res = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({
          from:    `Alon's Kitchens CRM <${FROM_EMAIL}>`,
          to:      [OWNER_EMAIL],
          subject: `🌅 דוח בוקר — ${dateStr}`,
          html,
          text:    msg,
        }),
      });

      if (res.ok) {
        console.log('[Agent Briefing] Hebrew morning briefing emailed to', OWNER_EMAIL);
      } else {
        const err = await res.text();
        console.error('[Agent Briefing] Email error:', err);
      }
      return;
    } catch (err) {
      console.error('[Agent Briefing] Email fallback error:', err);
    }
  }

  await alertOwner(msg);
}
