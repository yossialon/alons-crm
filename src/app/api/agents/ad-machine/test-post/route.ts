// ── POST /api/agents/ad-machine/test-post ─────────────────────────────────────
// Verifies Instagram + Google Business posting end-to-end.
//
// Request body (all optional):
//   image_url   string  — publicly accessible HTTPS image to attach.
//                         Instagram REQUIRES an image; if omitted, the IG step is
//                         skipped and the response explains why.
//   dry_run     boolean — if true, checks credentials and generates the caption
//                         but does NOT actually post. Defaults to false.
//
// Always returns:
//   credentials   — which env vars are present / missing
//   caption       — the AI-generated test caption (even on dry_run)
//   instagram     — { skipped?, ok, postUrl?, error? }
//   google_business — { ok, postUrl?, error? }
//
// Auth: requires Bearer CRON_SECRET or AGENT_SECRET (same as other agent routes).

import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/agents/tools/claude';
import { checkSocialCredentials, postToInstagram, postToGoogleBusiness } from '@/agents/tools/social';

function verifyAuth(req: NextRequest): boolean {
  const auth   = req.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET ?? process.env.AGENT_SECRET ?? '';
  if (!secret) return false; // fail closed — AGENT_SECRET must be set in production
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body      = await req.json().catch(() => ({})) as { image_url?: string; dry_run?: boolean };
  const imageUrl  = body.image_url?.trim() || undefined;
  const dryRun    = body.dry_run === true;

  // ── 1. Credential check ────────────────────────────────────────────────────
  const credentials = checkSocialCredentials();

  // ── 2. Generate a test caption via Claude ──────────────────────────────────
  let caption = '';
  let captionError: string | undefined;
  try {
    caption = await callClaude([{
      role:    'user',
      content: `Write a short luxury kitchen cabinet Instagram caption for Alon's Kitchens in South Florida.
This is a TEST POST — keep it under 80 words.
Start with ✨. Include one sentence about craftsmanship. End with: "Visit alonskitchens.com to start your transformation. 🪵"
Hashtags: #AlonsKitchens #SouthFlorida #LuxuryKitchen #CustomCabinets`,
    }]);
  } catch (err) {
    captionError = String(err);
    caption = '✨ Test post from Alon\'s Kitchens — luxury custom kitchen cabinets in South Florida. Every detail crafted to perfection. Visit alonskitchens.com to start your transformation. 🪵 #AlonsKitchens #SouthFlorida #LuxuryKitchen #CustomCabinets';
  }

  // ── 3. Post (or dry-run) ───────────────────────────────────────────────────
  type PlatformResult = { skipped?: boolean; reason?: string; ok: boolean; postUrl?: string; postId?: string; error?: string };

  let igResult:  PlatformResult;
  let gbResult:  PlatformResult;

  if (dryRun) {
    igResult = { skipped: true, reason: 'dry_run=true', ok: false };
    gbResult = { skipped: true, reason: 'dry_run=true', ok: false };
  } else if (!imageUrl) {
    // Instagram requires an image — skip it, but still test Google Business
    igResult = {
      skipped: true,
      reason:  'No image_url provided. Instagram Graph API requires a publicly accessible image URL. '
               + 'Pass image_url in the request body to test Instagram.',
      ok:      false,
    };

    try {
      const r = await postToGoogleBusiness(caption);
      gbResult = { ok: r.ok, postUrl: r.postUrl, postId: r.postId, error: r.error };
    } catch (err) {
      gbResult = { ok: false, error: String(err) };
    }
  } else {
    // Full test — both platforms in parallel
    const [ig, gb] = await Promise.allSettled([
      postToInstagram(caption, imageUrl),
      postToGoogleBusiness(caption, imageUrl),
    ]);

    igResult = ig.status === 'fulfilled'
      ? { ok: ig.value.ok, postUrl: ig.value.postUrl, postId: ig.value.postId, error: ig.value.error }
      : { ok: false, error: String(ig.reason) };

    gbResult = gb.status === 'fulfilled'
      ? { ok: gb.value.ok, postUrl: gb.value.postUrl, postId: gb.value.postId, error: gb.value.error }
      : { ok: false, error: String(gb.reason) };
  }

  // ── 4. Summarise ──────────────────────────────────────────────────────────
  const anyPosted = !dryRun && (igResult.ok || gbResult.ok);
  const allFailed = !dryRun && !imageUrl
    ? !gbResult.ok           // only GB was attempted
    : !igResult.ok && !gbResult.ok;

  return NextResponse.json({
    ok:          dryRun ? true : anyPosted,
    dry_run:     dryRun,
    caption,
    caption_error: captionError,
    credentials,
    instagram:       igResult,
    google_business: gbResult,
    summary: dryRun
      ? 'Dry run — credentials checked and caption generated. No posts sent.'
      : allFailed
        ? 'All attempted posts failed. Check the errors and credentials above.'
        : `Posted to: ${[igResult.ok && 'instagram', gbResult.ok && 'google-business'].filter(Boolean).join(', ')}.`,
  }, { status: dryRun || anyPosted ? 200 : 500 });
}
