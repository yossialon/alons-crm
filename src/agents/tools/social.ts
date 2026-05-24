// ── Social Posting Tool ───────────────────────────────────────────────────────
// Authoritative wrappers for Instagram Graph API and Google Business Profile API.
// Startup validation logs a clear warning for every missing credential so the
// server log immediately tells you what to add to .env.local.

// ── Credential snapshot (read once at module load) ────────────────────────────
const IG_TOKEN         = process.env.INSTAGRAM_ACCESS_TOKEN            ?? '';
const IG_ACCT_ID       = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID     ?? '';
const GB_ACCOUNT_ID    = process.env.GOOGLE_BUSINESS_ACCOUNT_ID        ?? '';
const GB_LOCATION_ID   = process.env.GOOGLE_BUSINESS_LOCATION_ID       ?? '';
const GB_CLIENT_ID     = process.env.GOOGLE_BUSINESS_CLIENT_ID         ?? '';
const GB_CLIENT_SECRET = process.env.GOOGLE_BUSINESS_CLIENT_SECRET     ?? '';
const GB_REFRESH_TOKEN = process.env.GOOGLE_BUSINESS_REFRESH_TOKEN     ?? '';
// GOOGLE_BUSINESS_API_KEY — used for read-only Google APIs (Places, etc.).
// Google Business Profile *posting* requires the OAuth vars above, not an API key.
const GB_API_KEY       = process.env.GOOGLE_BUSINESS_API_KEY           ?? '';

const INSTAGRAM_VARS: Record<string, string> = {
  INSTAGRAM_ACCESS_TOKEN:        IG_TOKEN,
  INSTAGRAM_BUSINESS_ACCOUNT_ID: IG_ACCT_ID,
};

const GOOGLE_BUSINESS_OAUTH_VARS: Record<string, string> = {
  GOOGLE_BUSINESS_ACCOUNT_ID:    GB_ACCOUNT_ID,
  GOOGLE_BUSINESS_LOCATION_ID:   GB_LOCATION_ID,
  GOOGLE_BUSINESS_CLIENT_ID:     GB_CLIENT_ID,
  GOOGLE_BUSINESS_CLIENT_SECRET: GB_CLIENT_SECRET,
  GOOGLE_BUSINESS_REFRESH_TOKEN: GB_REFRESH_TOKEN,
};

// ── Startup validation (runs once when this module is first imported) ─────────
function _warnMissing(platform: string, vars: Record<string, string>): void {
  const missing = Object.entries(vars).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.warn(
      `[social] ⚠  ${platform} posting is DISABLED — add to .env.local:\n` +
      missing.map((k) => `           ${k}=<your_value>`).join('\n'),
    );
  }
}

_warnMissing('Instagram',        INSTAGRAM_VARS);
_warnMissing('Google Business',  GOOGLE_BUSINESS_OAUTH_VARS);
if (!GB_API_KEY) {
  console.warn(
    '[social] ⚠  GOOGLE_BUSINESS_API_KEY is not set\n' +
    '           (needed for Google Places / read-only APIs — add to .env.local)',
  );
}

// ── Credential status ─────────────────────────────────────────────────────────

export interface SocialCredentialStatus {
  instagram: {
    configured: boolean;
    missing:    string[];
  };
  google_business: {
    configured:  boolean;
    missing:     string[];
    api_key_set: boolean;
    note:        string;
  };
}

/** Returns a live credential status snapshot — call from the test endpoint. */
export function checkSocialCredentials(): SocialCredentialStatus {
  const missingIg = Object.entries(INSTAGRAM_VARS)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const missingGb = Object.entries(GOOGLE_BUSINESS_OAUTH_VARS)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  return {
    instagram: {
      configured: missingIg.length === 0,
      missing:    missingIg,
    },
    google_business: {
      configured:  missingGb.length === 0,
      missing:     missingGb,
      api_key_set: !!GB_API_KEY,
      note: 'Posting uses OAuth (CLIENT_ID/SECRET/REFRESH_TOKEN). GOOGLE_BUSINESS_API_KEY covers read-only APIs only.',
    },
  };
}

// ── Shared result type ────────────────────────────────────────────────────────

export interface PostResult {
  ok:       boolean;
  postId?:  string;
  postUrl?: string;
  error?:   string;
}

// ── Google OAuth helper ───────────────────────────────────────────────────────

async function _getGoogleAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      client_id:     GB_CLIENT_ID,
      client_secret: GB_CLIENT_SECRET,
      refresh_token: GB_REFRESH_TOKEN,
      grant_type:    'refresh_token',
    }),
  });
  const data = await res.json() as { access_token?: string; error?: string; error_description?: string };
  if (!data.access_token) {
    const desc = data.error_description ?? data.error ?? 'no access_token in response';
    throw new Error(`Google OAuth token refresh failed: ${desc}`);
  }
  return data.access_token;
}

// ── Instagram ─────────────────────────────────────────────────────────────────

/**
 * Post a caption + image to Instagram via the Graph API (two-step: container → publish).
 *
 * Instagram does NOT support text-only posts through the API — `imageUrl` is
 * required in production.  Pass a publicly accessible HTTPS URL (not base64).
 *
 * Requires:
 *   INSTAGRAM_ACCESS_TOKEN
 *   INSTAGRAM_BUSINESS_ACCOUNT_ID
 */
export async function postToInstagram(caption: string, imageUrl: string): Promise<PostResult> {
  const missing = Object.entries(INSTAGRAM_VARS).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    return { ok: false, error: `Instagram not configured. Missing env vars: ${missing.join(', ')}` };
  }

  // Step 1 — create media container
  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ACCT_ID}/media`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ image_url: imageUrl, caption, access_token: IG_TOKEN }),
    },
  );
  const container = await containerRes.json() as {
    id?: string;
    error?: { message: string; type: string; code: number };
  };
  if (!containerRes.ok || !container.id) {
    return { ok: false, error: container.error?.message ?? 'Failed to create Instagram media container' };
  }

  // Step 2 — publish
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ACCT_ID}/media_publish`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ creation_id: container.id, access_token: IG_TOKEN }),
    },
  );
  const published = await publishRes.json() as {
    id?: string;
    error?: { message: string };
  };
  if (!publishRes.ok || !published.id) {
    return { ok: false, error: published.error?.message ?? 'Failed to publish Instagram media' };
  }

  return {
    ok:      true,
    postId:  published.id,
    postUrl: `https://www.instagram.com/p/${published.id}/`,
  };
}

// ── Google Business Profile ───────────────────────────────────────────────────

/**
 * Create a Google Business Profile Local Post via the My Business API v4.
 * Supports text-only or text + photo posts.
 *
 * Requires (OAuth flow — API key alone is not sufficient for posting):
 *   GOOGLE_BUSINESS_CLIENT_ID
 *   GOOGLE_BUSINESS_CLIENT_SECRET
 *   GOOGLE_BUSINESS_REFRESH_TOKEN
 *   GOOGLE_BUSINESS_ACCOUNT_ID
 *   GOOGLE_BUSINESS_LOCATION_ID
 */
export async function postToGoogleBusiness(caption: string, imageUrl?: string): Promise<PostResult> {
  const missing = Object.entries(GOOGLE_BUSINESS_OAUTH_VARS).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    return { ok: false, error: `Google Business not configured. Missing env vars: ${missing.join(', ')}` };
  }

  const token        = await _getGoogleAccessToken();
  const locationName = `accounts/${GB_ACCOUNT_ID}/locations/${GB_LOCATION_ID}`;

  const body: Record<string, unknown> = {
    languageCode: 'en-US',
    summary:      caption,
    topicType:    'STANDARD',
    callToAction: { actionType: 'LEARN_MORE', url: 'https://www.alonskitchens.com' },
  };

  // Only include media for public HTTPS URLs (not data: URIs)
  if (imageUrl && imageUrl.startsWith('https://')) {
    body.media = [{ mediaFormat: 'PHOTO', sourceUrl: imageUrl }];
  }

  const postRes = await fetch(
    `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`,
    {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
  );
  const data = await postRes.json() as {
    name?:      string;
    searchUrl?: string;
    error?:     { message: string; status: string };
  };
  if (!postRes.ok) {
    return { ok: false, error: data.error?.message ?? `Google Business API error (HTTP ${postRes.status})` };
  }

  return {
    ok:      true,
    postId:  data.name,
    postUrl: data.searchUrl ?? 'https://business.google.com/',
  };
}
