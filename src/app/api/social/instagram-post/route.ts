import { NextRequest, NextResponse } from 'next/server';

const IG_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN ?? '';
const IG_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ?? '';

export async function POST(req: NextRequest) {
  if (!IG_TOKEN || !IG_ACCOUNT_ID) {
    return NextResponse.json({ error: 'Instagram not configured' }, { status: 500 });
  }

  const { caption, imageUrl } = await req.json() as { caption: string; imageUrl: string };

  // Step 1: Create media container
  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ACCOUNT_ID}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: IG_TOKEN }),
    }
  );
  const container = await containerRes.json() as { id?: string; error?: { message: string } };
  if (!containerRes.ok || !container.id) {
    return NextResponse.json({ error: container.error?.message ?? 'Failed to create container' }, { status: 500 });
  }

  // Step 2: Publish
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${IG_ACCOUNT_ID}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: container.id, access_token: IG_TOKEN }),
    }
  );
  const published = await publishRes.json() as { id?: string; error?: { message: string } };
  if (!publishRes.ok || !published.id) {
    return NextResponse.json({ error: published.error?.message ?? 'Failed to publish' }, { status: 500 });
  }

  const postUrl = `https://www.instagram.com/p/${published.id}/`;
  return NextResponse.json({ ok: true, postUrl, postId: published.id });
}
