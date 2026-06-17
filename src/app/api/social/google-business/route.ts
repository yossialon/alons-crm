// FIXED: Added session auth check (was fully unauthenticated — any internet caller could post).
// Also aligned with social.ts::postToGoogleBusiness: added callToAction and HTTPS-only media guard.
import { NextRequest, NextResponse } from 'next/server';
import { getSessionPayload } from '@/lib/session';

const CLIENT_ID     = process.env.GOOGLE_BUSINESS_CLIENT_ID     ?? '';
const CLIENT_SECRET = process.env.GOOGLE_BUSINESS_CLIENT_SECRET ?? '';
const REFRESH_TOKEN = process.env.GOOGLE_BUSINESS_REFRESH_TOKEN ?? '';
const ACCOUNT_ID    = process.env.GOOGLE_BUSINESS_ACCOUNT_ID    ?? '';
const LOCATION_ID   = process.env.GOOGLE_BUSINESS_LOCATION_ID   ?? '';

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type:    'refresh_token',
    }),
  });
  const data = await res.json() as { access_token?: string; error_description?: string };
  if (!data.access_token) {
    throw new Error(`Google OAuth token refresh failed: ${data.error_description ?? 'no access_token'}`);
  }
  return data.access_token;
}

export async function POST(req: NextRequest) {
  // Auth guard — middleware protects most routes but this is an explicit check
  // because /api/social/ routes are in a partially-public subtree.
  const session = await getSessionPayload(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!CLIENT_ID || !REFRESH_TOKEN || !ACCOUNT_ID || !LOCATION_ID) {
    return NextResponse.json({ error: 'Google Business not configured' }, { status: 500 });
  }

  let caption: string;
  let imageUrl: string | undefined;
  try {
    const body = await req.json() as { caption?: string; imageUrl?: string };
    caption  = body.caption?.trim() ?? '';
    imageUrl = body.imageUrl?.trim() || undefined;
    if (!caption) return NextResponse.json({ error: 'caption is required' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const token        = await getAccessToken();
    const locationName = `accounts/${ACCOUNT_ID}/locations/${LOCATION_ID}`;

    const body: Record<string, unknown> = {
      languageCode: 'en-US',
      summary:      caption,
      topicType:    'STANDARD',
      callToAction: { actionType: 'LEARN_MORE', url: 'https://www.alonskitchens.com' },
    };

    // Only attach media for public HTTPS URLs (not data: URIs, not empty)
    if (imageUrl && imageUrl.startsWith('https://')) {
      body.media = [{ mediaFormat: 'PHOTO', sourceUrl: imageUrl }];
    }

    const postRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
      }
    );

    const data = await postRes.json() as { name?: string; searchUrl?: string; error?: { message: string } };
    if (!postRes.ok) {
      return NextResponse.json({ error: data.error?.message ?? 'Post failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, postUrl: data.searchUrl ?? '', postName: data.name });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
