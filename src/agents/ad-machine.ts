// ── Ad Machine Agent ──────────────────────────────────────────────────────────
// Triggered on job completion → auto-post to social platforms + review SMS.
// Also runs weekly (Monday) for campaign performance analysis with Claude.

import { logAgentRun, updateAgentRun, saveCampaignRecommendation, saveCampaignLearning, enqueueAgentTask } from '@/agents/tools/database';
import { callClaude } from '@/agents/tools/claude';
import { alertOwner } from '@/agents/tools/whatsapp';
import { postToInstagram, postToGoogleBusiness } from '@/agents/tools/social';
import { createGeoCampaign } from '@/agents/tools/meta-ads';
import serverDb from '@/lib/supabase-server';
import type { CampaignRecommendation, CampaignLearning } from '@/agents/types';

const ORG_ID      = process.env.ORG_ID ?? '00000000-0000-0000-0000-000000000001';
const REVIEW_LINK = process.env.GOOGLE_REVIEW_LINK ?? '';


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

    // 2. Post to social platforms (requires after photo for Instagram;
    //    Google Business supports text-only but photos improve engagement)
    const [igResult, gbResult] = await Promise.allSettled([
      jobData.afterPhotoUrl
        ? postToInstagram(caption, jobData.afterPhotoUrl)
        : Promise.resolve({ ok: false as const, error: 'No after photo provided' }),
      postToGoogleBusiness(caption, jobData.afterPhotoUrl),
    ]);

    if (igResult.status === 'fulfilled' && igResult.value.ok) {
      posted.push('instagram');
    } else {
      const reason = igResult.status === 'rejected'
        ? String(igResult.reason)
        : igResult.value.error ?? 'unknown error';
      errors.push(`Instagram: ${reason}`);
    }

    if (gbResult.status === 'fulfilled' && gbResult.value.ok) {
      posted.push('google-business');
    } else {
      const reason = gbResult.status === 'rejected'
        ? String(gbResult.reason)
        : gbResult.value.error ?? 'unknown error';
      errors.push(`Google Business: ${reason}`);
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

// ── Inter-agent notification: lead-hunter → ad-machine ───────────────────────

/**
 * Called by the lead-hunter route after a successful import run.
 *
 * 1. Enqueues an async 'new_leads_imported' task for the ad-machine to drain.
 * 2. For batches ≥3, fires a weekly campaign review immediately (fire-and-forget).
 * 3. For each new city+zip location, launches a hyper-local geo ad campaign
 *    (fire-and-forget, deduplication built into createGeoCampaign).
 *
 * @param importedLeads  Number of net-new leads written to the DB.
 * @param newLocations   Distinct city+zip pairs from the imported leads.
 */
export async function notifyAdMachine(
  importedLeads: number,
  newLocations:  Array<{ city: string; zip: string }> = [],
): Promise<void> {
  // Always persist a queued task
  await enqueueAgentTask({
    from_agent: 'lead-hunter',
    to_agent:   'ad-machine',
    task_type:  'new_leads_imported',
    payload:    {
      count:         importedLeads,
      imported_at:   new Date().toISOString(),
      new_locations: newLocations,
    },
  });

  // For a meaningful batch, kick off campaign analysis right now
  if (importedLeads >= 3) {
    runWeeklyReview('manual').catch((err: unknown) =>
      console.error('[notifyAdMachine] Background campaign review failed:', err),
    );
  }

  // Launch a geo campaign for every new location (fire-and-forget per city)
  for (const loc of newLocations) {
    createGeoCampaign(loc.city, loc.zip).catch((err: unknown) =>
      console.error(`[notifyAdMachine] Geo campaign failed for ${loc.city} ${loc.zip}:`, err),
    );
  }
}

// ── Campaign Learning Layer ───────────────────────────────────────────────────
// Local types used only within this module.

/** One week's campaign outcomes — what was recommended and how many leads came the next week */
interface WeeklyOutcome {
  week_of:         string;   // ISO date of the rec week
  recommendations: Array<{ platform: string; action: string; impact: string }>;
  next_week_leads: number;   // leads created in the 7-day window starting 7 days after week_of
}

/** A pattern Claude extracted from the historical outcomes */
interface LearnedPattern {
  pattern:          string;
  confidence_score: number;  // 0.0–1.0
  based_on_weeks:   number;
  reasoning:        string;
}

/** Claude's per-recommendation confidence scoring */
interface ScoredRecommendation {
  index:      number;
  confidence: number;   // 0.0–1.0
  rationale:  string;
}

interface LearningAnalysis {
  patterns:                LearnedPattern[];
  scored_recommendations:  ScoredRecommendation[];
}

/**
 * Query 8 weeks of historical campaign_recommendations, count leads in the
 * following-week window for each, and ask Claude which patterns correlate with
 * lead increases.  Returns annotated recommendations (with confidence) and the
 * extracted patterns.
 *
 * When there is insufficient history (< 2 distinct weeks) the function returns
 * `skipped: true` and `annotated` is the original unmodified recs array.
 */
async function runLearningAnalysis(
  weekOf:      string,                      // YYYY-MM-DD of the current review week
  statsStr:    string,                      // same human-readable stats already sent to the recommendation step
  currentRecs: CampaignRecommendation[],    // freshly generated recs (no confidence yet)
): Promise<{
  annotated: CampaignRecommendation[];
  patterns:  CampaignLearning[];
  skipped:   boolean;
}> {
  const client = serverDb;

  // ── 1. Fetch last 8 weeks of historical recommendations ────────────────────
  const eightWeeksAgo = new Date(new Date(weekOf).getTime() - 8 * 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const { data: historicalRecs } = await client
    .from('campaign_recommendations')
    .select('week_of, platform, action, impact')
    .eq('org_id', ORG_ID)
    .gte('week_of', eightWeeksAgo)
    .lt('week_of', weekOf)           // exclude the current week
    .order('week_of', { ascending: true });

  const allHistorical = (historicalRecs ?? []) as Array<{
    week_of: string; platform: string; action: string; impact: string;
  }>;

  // Group by week_of
  const recsByWeek = new Map<string, Array<{ platform: string; action: string; impact: string }>>();
  for (const r of allHistorical) {
    const week = r.week_of.slice(0, 10);
    if (!recsByWeek.has(week)) recsByWeek.set(week, []);
    recsByWeek.get(week)!.push({ platform: r.platform, action: r.action, impact: r.impact });
  }

  if (recsByWeek.size < 2) {
    // Not enough history for meaningful correlation
    return { annotated: currentRecs, patterns: [], skipped: true };
  }

  // ── 2. Count leads created in the week *after* each rec week ───────────────
  const outcomes: WeeklyOutcome[] = [];
  for (const [week, recs] of recsByWeek) {
    const windowStart = new Date(new Date(week).getTime() + 7 * 86_400_000).toISOString();
    const windowEnd   = new Date(new Date(week).getTime() + 14 * 86_400_000).toISOString();

    const { count } = await client
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', ORG_ID)
      .gte('created_at', windowStart)
      .lt('created_at', windowEnd);

    outcomes.push({ week_of: week, recommendations: recs, next_week_leads: count ?? 0 });
  }

  // ── 3. Ask Claude to identify patterns and score current recs ──────────────
  const prompt = `You are a marketing analytics expert for Alon's Kitchens, a luxury custom kitchen cabinet company in South Florida.

${statsStr}

Historical campaign data — each entry shows what was recommended and how many new leads arrived the following week:
${JSON.stringify(outcomes, null, 2)}

Current week's recommendations to score (index 0-based):
${JSON.stringify(currentRecs.map((r, i) => ({ index: i, platform: r.platform, action: r.action, impact: r.impact })), null, 2)}

Tasks:
1. Identify 2-4 PATTERNS from the historical data that correlate with higher lead counts the following week.
   A pattern describes a type of recommendation (e.g. "Instagram before/after posts", "Google Ads with local targeting").
   Only include patterns that appear in at least 2 historical weeks.

2. For each current recommendation, assign a confidence score (0.0–1.0) based on how closely it matches a historically successful pattern.
   - 0.8–1.0: strong match to a high-performing pattern
   - 0.5–0.79: partial match or mixed historical evidence
   - 0.2–0.49: weak signal or no clear historical match
   - 0.0–0.19: no historical support or negative correlation

Return a single JSON object:
{
  "patterns": [
    {
      "pattern": "...",
      "confidence_score": 0.0-1.0,
      "based_on_weeks": N,
      "reasoning": "appeared in X/Y weeks, avg Z leads vs W without"
    }
  ],
  "scored_recommendations": [
    { "index": 0, "confidence": 0.0-1.0, "rationale": "≤15 words" }
  ]
}
Return ONLY valid JSON, no other text.`;

  const raw = await callClaude([{ role: 'user', content: prompt }]);

  // Tolerate markdown fences
  const cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!objMatch) throw new Error(`Learning analysis: no JSON object in response. Raw: ${raw.slice(0, 200)}`);

  const analysis: LearningAnalysis = JSON.parse(objMatch[0]);

  // ── 4. Merge confidence scores back into current recs ─────────────────────
  const confidenceMap = new Map<number, number>();
  for (const s of (analysis.scored_recommendations ?? [])) {
    if (typeof s.index === 'number' && typeof s.confidence === 'number') {
      confidenceMap.set(s.index, Math.max(0, Math.min(1, s.confidence)));
    }
  }

  const annotated: CampaignRecommendation[] = currentRecs.map((rec, i) => ({
    ...rec,
    confidence: confidenceMap.get(i) ?? 0.5,   // default 0.5 when Claude skipped
  }));

  // ── 5. Shape patterns into CampaignLearning records ────────────────────────
  const patterns: CampaignLearning[] = (analysis.patterns ?? [])
    .filter((p): p is LearnedPattern =>
      typeof p.pattern === 'string' &&
      typeof p.confidence_score === 'number' &&
      typeof p.based_on_weeks === 'number',
    )
    .map((p) => ({
      week_of:          weekOf,
      pattern:          p.pattern,
      confidence_score: Math.max(0, Math.min(1, p.confidence_score)),
      based_on_weeks:   Math.max(1, p.based_on_weeks),
      reasoning:        p.reasoning ?? undefined,
    }));

  return { annotated, patterns, skipped: false };
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
      serverDb.from('job_completions').select('id, created_at, lead_id').gte('created_at', weekAgo),
      serverDb.from('leads').select('id, status, source, created_at').eq('org_id', ORG_ID).gte('created_at', weekAgo),
      serverDb.from('social_messages').select('id, platform, direction, created_at').gte('created_at', weekAgo),
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

    const weekOf = new Date().toISOString().slice(0, 10);

    // ── Learning layer ─────────────────────────────────────────────────────
    // Run historical correlation analysis. Non-blocking: failures append to
    // errors[] but never prevent recommendations from being saved/returned.
    let finalRecs = recs;
    let learningSkipped = true;

    try {
      const { annotated, patterns, skipped } = await runLearningAnalysis(weekOf, statsStr, recs);
      learningSkipped = skipped;

      if (!skipped) {
        finalRecs = annotated;

        // Persist each extracted pattern
        for (const pattern of patterns) {
          try {
            await saveCampaignLearning(pattern);
          } catch (err) {
            errors.push(`Save learning: ${String(err)}`);
          }
        }
      }
    } catch (err) {
      errors.push(`Learning analysis: ${String(err)}`);
      // finalRecs stays as the original unscored recs
    }

    // ── Save recommendations to DB (with confidence if learning ran) ────────
    for (const rec of finalRecs) {
      try {
        await saveCampaignRecommendation({ week_of: weekOf, ...rec });
      } catch (err) {
        errors.push(`Save rec: ${String(err)}`);
      }
    }

    await updateAgentRun(runId, {
      status:  'success',
      summary: `Weekly review complete. Generated ${finalRecs.length} recommendations. Learning: ${learningSkipped ? 'skipped (insufficient history)' : 'applied'}. Errors: ${errors.length}`,
      errors,
    });

    // WhatsApp summary to owner
    if (finalRecs.length > 0) {
      const top = finalRecs.slice(0, 3).map((r, i) => {
        const conf = typeof r.confidence === 'number'
          ? ` (${Math.round(r.confidence * 100)}% confidence)`
          : '';
        return `${i + 1}. *${r.platform.toUpperCase()}*: ${r.action}${conf}`;
      }).join('\n');
      await alertOwner(`📊 *Ad Machine — דוח שבועי*\n\n${statsStr.split('\n').slice(1, 5).join('\n')}\n\n*המלצות לשבוע הבא:*\n${top}`);
    }

    return { recommendations: finalRecs, errors };
  } catch (err) {
    const msg = String(err);
    await updateAgentRun(runId, { status: 'error', summary: msg, errors: [msg] });
    await alertOwner(`❌ *Ad Machine* — בדיקה שבועית נכשלה:\n${msg}`);
    return { recommendations: [], errors: [msg] };
  }
}
