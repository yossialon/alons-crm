import { getAppUrl } from '@/lib/app-url';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getOrgId } from '@/lib/tenant';

type Ctx = { params: Promise<{ platform: string }> };



async function handleMetaCallback(code: string, orgId: string) {
  const appId      = process.env.META_APP_ID ?? '';
  const appSecret  = process.env.META_APP_SECRET ?? '';
  const redirectUri = `${getAppUrl()}/api/social/callback/meta`;

  const tokenRes  = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
  );
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error(tokenData.error?.message ?? 'Token exchange failed');

  const llRes  = await fetch(
    `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
  );
  const llData    = await llRes.json();
  const userToken = llData.access_token ?? tokenData.access_token;
  const expiresIn = llData.expires_in ? Date.now() + llData.expires_in * 1000 : null;

  const pagesRes  = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${userToken}&fields=id,name,access_token,category`);
  const pagesData = await pagesRes.json();
  const pages     = (pagesData.data ?? []) as { id: string; name: string; access_token: string; category: string }[];

  for (const page of pages) {
    await fetch(`https://graph.facebook.com/v21.0/${page.id}/subscribed_apps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscribed_fields: 'messages,messaging_postbacks,message_deliveries,message_reads',
        access_token: page.access_token,
      }),
    }).catch(() => {});

    await supabase.from('social_connections').upsert({
      org_id:       orgId,
      platform:     'facebook',
      account_name: page.name,
      account_id:   page.id,
      access_token: page.access_token,
      token_expiry: expiresIn ? new Date(expiresIn).toISOString() : null,
      page_id:      page.id,
      page_name:    page.name,
      metadata:     { category: page.category },
      updated_at:   new Date().toISOString(),
    }, { onConflict: 'org_id,platform,account_id' });

    const igRes  = await fetch(`https://graph.facebook.com/v21.0/${page.id}/instagram_accounts?access_token=${page.access_token}&fields=id,username`);
    const igData = await igRes.json();
    for (const ig of (igData.data ?? []) as { id: string; username: string }[]) {
      await supabase.from('social_connections').upsert({
        org_id:       orgId,
        platform:     'instagram',
        account_name: ig.username,
        account_id:   ig.id,
        access_token: page.access_token,
        page_id:      page.id,
        page_name:    page.name,
        metadata:     { linked_page_id: page.id },
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'org_id,platform,account_id' });
    }
  }
}

async function handleLinkedInCallback(code: string, orgId: string) {
  const clientId     = process.env.LINKEDIN_CLIENT_ID ?? '';
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET ?? '';
  const redirectUri  = `${getAppUrl()}/api/social/callback/linkedin`;

  const tokenRes  = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error(tokenData.error_description ?? 'Token exchange failed');

  const profileRes = await fetch('https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const profile = await profileRes.json();
  const name    = `${profile.localizedFirstName ?? ''} ${profile.localizedLastName ?? ''}`.trim() || 'LinkedIn Account';
  const expiry  = tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null;

  await supabase.from('social_connections').upsert({
    org_id:       orgId,
    platform:     'linkedin',
    account_name: name,
    account_id:   profile.id,
    access_token: tokenData.access_token,
    token_expiry: expiry,
    updated_at:   new Date().toISOString(),
  }, { onConflict: 'org_id,platform,account_id' });
}

async function handleTikTokCallback(code: string, orgId: string) {
  const clientKey    = process.env.TIKTOK_CLIENT_KEY ?? '';
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET ?? '';
  const redirectUri  = `${getAppUrl()}/api/social/callback/tiktok`;

  const tokenRes  = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_key: clientKey, client_secret: clientSecret, code, grant_type: 'authorization_code', redirect_uri: redirectUri }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error(tokenData.error ?? 'Token exchange failed');

  await supabase.from('social_connections').upsert({
    org_id:       orgId,
    platform:     'tiktok',
    account_name: tokenData.open_id ?? 'TikTok Account',
    account_id:   tokenData.open_id,
    access_token: tokenData.access_token,
    token_expiry: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
    metadata:     { refresh_token: tokenData.refresh_token },
    updated_at:   new Date().toISOString(),
  }, { onConflict: 'org_id,platform,account_id' });
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const { platform } = await params;
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${getAppUrl()}/dashboard?social_error=${error ?? 'access_denied'}&tab=social`);
  }

  const orgId = await getOrgId();
  try {
    switch (platform) {
      case 'meta':     await handleMetaCallback(code, orgId);     break;
      case 'linkedin': await handleLinkedInCallback(code, orgId); break;
      case 'tiktok':   await handleTikTokCallback(code, orgId);   break;
      default:
        return NextResponse.redirect(`${getAppUrl()}/dashboard?social_error=unknown_platform&tab=social`);
    }
    return NextResponse.redirect(`${getAppUrl()}/dashboard?social_connected=${platform}&tab=social`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.redirect(`${getAppUrl()}/dashboard?social_error=${encodeURIComponent(msg)}&tab=social`);
  }
}
