import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID = process.env.GOOGLE_BUSINESS_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.GOOGLE_BUSINESS_CLIENT_SECRET ?? '';
const REFRESH_TOKEN = process.env.GOOGLE_BUSINESS_REFRESH_TOKEN ?? '';
const ACCOUNT_ID = process.env.GOOGLE_BUSINESS_ACCOUNT_ID ?? '';
const LOCATION_ID = process.env.GOOGLE_BUSINESS_LOCATION_ID ?? '';

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json() as { access_token?: string };
  if (!data.access_token) throw new Error('Failed to get Google access token');
  return data.access_token;
}

export async function POST(req: NextRequest) {
  if (!CLIENT_ID || !REFRESH_TOKEN || !ACCOUNT_ID || !LOCATION_ID) {
    return NextResponse.json({ error: 'Google Business not configured' }, { status: 500 });
  }

  const { caption, imageUrl } = await req.json() as { caption: string; imageUrl: string };

  try {
    const token = await getAccessToken();
    const locationName = `accounts/${ACCOUNT_ID}/locations/${LOCATION_ID}`;

    const body: Record<string, unknown> = {
      languageCode: 'en-US',
      summary: caption,
      topicType: 'STANDARD',
    };

    if (imageUrl && !imageUrl.startsWith('data:')) {
      body.media = [{ mediaFormat: 'PHOTO', sourceUrl: imageUrl }];
    }

    const postRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationName}/localPosts`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      }
    );

    const data = await postRes.json() as { name?: string; searchUrl?: string; error?: { message: string } };
    if (!postRes.ok) return NextResponse.json({ error: data.error?.message ?? 'Post failed' }, { status: 500 });

    return NextResponse.json({ ok: true, postUrl: data.searchUrl ?? '', postName: data.name });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
