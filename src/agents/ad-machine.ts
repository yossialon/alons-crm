// ── Ad Machine Agent ──────────────────────────────────────────────────────────
// Triggered on job completion → auto-post to social platforms + review SMS.
// Also runs weekly (Monday) for campaign performance analysis with Claude.

import { logAgentRun, updateAgentRun, saveCampaignRecommendation } from '@/agents/tools/database';
import { callClaude } from '@/agents/tools/claude';
import { alertOwner } from '@/agents/tools/whatsapp';
import { createClient } from '@supabase/supabase-js';
import type { CampaignRecommendation } from '@/agents/types';

const ORG_ID      = process.env.ORG_ID ?? '00000000-0000-0000-0000-000000000001';
const BASE_URL    = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const REVIEW_LINK = process.env.GOOGLE_REVIEW_LINK ?? '';

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  return createClient(url, key);
}

// ── Job Completion: auto-post before/after to social ─────────────────────────
export async function runJobCompletion(jobData: {
  leadId:          string;
  leadName:        string;
  projectType:     string;
  beforePhotoUrl?: string;
  afterPhotoUrl?:  string;
  testimonial?:    string;
  customerPhone?:  string;
}): Promise<{ posted: string[]; errors: string[] }> {
  const runId = await logAgentRun('ad-machine', 'webhook');
  const posted: string[] = [];
  const errors: string[] = [];

  try {
    // 1. Generate AI caption
    const caption = await callClaude([{
      role:    'user',
      content: `Write a luxury kitchen cabinet Instagram caption for a completed ${jobData.projectType} project for ${jobData.leadName} in South Florida.
      ${jobData.testimonial ? `Customer said: "${jobData.testimonial}"` : ''}
      Rules: Max 150 words. Start with an emoji. Include before/after transformation story. End with a CTA. Use hashtags: #AlonsKitchens #SouthFlorida #KitchenCabinets #CustomKitchen #LuxuryKitchen #MiamiHomes #BrowardCounty`,
    }]);

    // 2. Post to Instagram (if after photo available)
    if (jobData.afterPhotoUrl) {
      try {
        const igRes = await fetch(`${BASE_URL}/api/social/google-business`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            type:      'STANDARD',
            summary:   caption,
            photoUrl:  jobData.afterPhotoUrl,
            callToAction: { actionType: 'LEARN_MORE', url: `https://www.alonskitchens.com` },
          }),
        });
        if (igRes.ok) posted.push('google-business');
      } catch (err) {
        errors.push(`Google Business: ${String(err)}`);
      }

      // Instagram direct post via Graph API
      const igToken   = process.env.INSTAGRAM_ACCESS_TOKEN;
      const igAcctId  = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
      if (igToken && igAcctId) {
        try {
          // Step 1: Create media container
          const containerRes = await fetch(
            `https://graph.facebook.com/v19.0/${igAcctId}/media`,
            {
              method:  'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${igToken}` },
              body:    JSON.stringify({ image_url: jobData.afterPhotoUrl, caption }),
            }
          );
          const container = await containerRes.json() as { id?: string };
          if (container.id) {
            // Step 2: Publish
            await fetch(`https://graph.facebook.com/v19.0/${igAcctId}/media_publish`, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${igToken}` },
              body:    JSON.stringify({ creation_id: container.id }),
            });
            posted.push('instagram');
          }
        } catch (err) {
          errors.push(`Instagram: ${String(err)}`);
        }
      }
    }

    // 3. Send review request via WhatsApp if customer phone available
    if (jobData.customerPhone && REVIEW_LINK) {
      const waToken   = process.env.META_WHATSAPP_ACCESS_TOKEN;
      const waPhoneId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
      if (waToken && waPhoneId) {
        try {
          await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/messages`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${waToken}` },
            body:    JSON.stringify({
              messaging_product: 'whatsapp',
              to:   jobData.customerPhone,
              type: 'text',
              text: {
                body: `Hi ${jobData.leadName}! 🎉 Your new kitchen is complete! We hope you love it.\n\nIf you're happy with your experience, a quick Google review would mean the world to us:\n${REVIEW_LINK}\n\nThank you! — Alon's Kitchens 🪵`,
              },
            }),
          });
          posted.push('whatsapp-review');
        } catch (err) {
          errors.push(`Review WA: ${String(err)}`);
        }
      }
    }

    await updateAgentRun(runId, {
      status:  errors.length === 0 ? 'success' : posted.length > 0 ? 'partial' : 'error',
      summary: `Job completion for ${jobData.leadName}. Posted to: ${posted.join(', ') || 'none'}. Errors: ${errors.length}`,
      errors,
    });

    return { posted, errors };
  } catch (err) {
    const msg = String(err);
    await updateAgentRun(runId, { status: 'error', summary: msg, errors: [msg] });
    await alertOwner(`❌ *Ad Machine* נכשל בפרסום:\n${jobData.leadName}\n${msg}`);
    return { posted: [], errors: [msg] };
  }
}

// ── Weekly Campaign Analysis ──────────────────────────────────────────────────
export async function runWeeklyReview(trigger: 'cron' | 'manual' = 'cron'): Promise<{
  recommendations: CampaignRecommendation[];
  errors: string[];
}> {
  const runId = await logAgentRun('ad-machine', trigger);
  const errors: string[] = [];

  try {
    // Gather stats from the DB
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [jobsRes, leadsRes, msgsRes] = await Promise.all([
      db().from('job_completions').select('id, created_at, lead_id').gte('created_at', weekAgo),
      db().from('leads').select('id, status, source, created_at').eq('org_id', ORG_ID).gte('created_at', weekAgo),
      db().from('social_messages').select('id, platform, direction, created_at').gte('created_at', weekAgo),
    ]);

    const jobs  = jobsRes.data  ?? [];
    const leads = leadsRes.data ?? [];
    const msgs  = msgsRes.data  ?? [];

    const statsStr = `Weekly Stats (last 7 days):
- Jobs completed: ${jobs.length}
- New leads: ${leads.length}
- Leads by source: ${JSON.stringify(leads.reduce((acc: Record<string, number>, l: { source?: string }) => { const s = l.source ?? 'unknown'; acc[s] = (acc[s] ?? 0) + 1; return acc; }, {}))}
- Social messages: ${msgs.length}
- Instagram DMs: ${msgs.filter((m: { platform?: string }) => m.platform === 'instagram').length}
- WhatsApp messages: ${msgs.filter((m: { platform?: string }) => m.platform === 'whatsapp').length}`;

    // Ask Claude for recommendations
    const response = await callClaude([{
      role:    'user',
      content: `You are a digital marketing expert for Alon's Kitchens, a luxury kitchen cabinet company in South Florida.

${statsStr}

Based on these numbers, provide 3-5 actionable campaign recommendations for next week.
Format as JSON array: [{
  "platform": "instagram|google|facebook|all",
  "insight": "what the data shows",
  "action": "specific action to take next week",
  "impact": "low|medium|high"
}]
Return ONLY the JSON array.`,
    }]);

    const match = response.match(/\[[\s\S]*\]/);
    const recs: CampaignRecommendation[] = match ? JSON.parse(match[0]) : [];

    // Save recommendations to DB
    const weekOf = new Date().toISOString().slice(0, 10);
    for (const rec of recs) {
      try {
        await saveCampaignRecommendation({ week_of: weekOf, ...rec });
      } catch (err) {
        errors.push(`Save rec: ${String(err)}`);
      }
    }

    await updateAgentRun(runId, {
      status:  'success',
      summary: `Weekly review complete. Generated ${recs.length} recommendations. Errors: ${errors.length}`,
      errors,
    });

    // WhatsApp summary to owner
    if (recs.length > 0) {
      const top = recs.slice(0, 3).map((r, i) => `${i + 1}. *${r.platform.toUpperCase()}*: ${r.action}`).join('\n');
      await alertOwner(`📊 *Ad Machine — דוח שבועי*\n\n${statsStr.split('\n').slice(1, 5).join('\n')}\n\n*המלצות לשבוע הבא:*\n${top}`);
    }

    return { recommendations: recs, errors };
  } catch (err) {
    const msg = String(err);
    await updateAgentRun(runId, { status: 'error', summary: msg, errors: [msg] });
    await alertOwner(`❌ *Ad Machine* — בדיקה שבועית נכשלה:\n${msg}`);
    return { recommendations: [], errors: [msg] };
  }
}
