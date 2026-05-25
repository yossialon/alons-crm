import { getAppUrl } from '@/lib/app-url';
import { NextRequest, NextResponse } from 'next/server';

type Ctx = { params: Promise<{ platform: string }> };



// Build the OAuth redirect URL for each platform.
// Env vars required per platform are documented in .env.local.example
function buildOAuthUrl(platform: string): string | null {
  switch (platform) {
    case 'meta': {
      // Handles Facebook Pages + Instagram + WhatsApp (one Meta App covers all three)
      const clientId = process.env.META_APP_ID;
      if (!clientId) return null;
      const url = new URL('https://www.facebook.com/v21.0/dialog/oauth');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', `${getAppUrl()}/api/social/callback/meta`);
      url.searchParams.set('scope', 'pages_show_list,pages_messaging,pages_read_engagement,instagram_manage_messages,instagram_basic,whatsapp_business_messaging');
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('state', 'meta');
      return url.toString();
    }
    case 'linkedin': {
      const clientId = process.env.LINKEDIN_CLIENT_ID;
      if (!clientId) return null;
      const url = new URL('https://www.linkedin.com/oauth/v2/authorization');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', `${getAppUrl()}/api/social/callback/linkedin`);
      url.searchParams.set('scope', 'r_organization_social w_organization_social r_basicprofile');
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('state', 'linkedin');
      return url.toString();
    }
    case 'tiktok': {
      const clientKey = process.env.TIKTOK_CLIENT_KEY;
      if (!clientKey) return null;
      const url = new URL('https://www.tiktok.com/v2/auth/authorize');
      url.searchParams.set('client_key', clientKey);
      url.searchParams.set('redirect_uri', `${getAppUrl()}/api/social/callback/tiktok`);
      url.searchParams.set('scope', 'user.info.basic,video.list,comment.list');
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('state', 'tiktok');
      return url.toString();
    }
    default:
      return null;
  }
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { platform } = await params;
  const url = buildOAuthUrl(platform);
  if (!url) {
    // Redirect back to app with an error message if credentials are not configured
    return NextResponse.redirect(`${getAppUrl()}/dashboard?social_error=${platform}_not_configured`);
  }
  return NextResponse.redirect(url);
}
