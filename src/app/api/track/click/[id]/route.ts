import { NextRequest, NextResponse } from 'next/server';
import serverDb from '@/lib/supabase-server';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const { id }  = await params;
  const url     = req.nextUrl.searchParams.get('url') ?? '/';

  // Validate redirect target — only allow http/https to prevent open redirect abuse
  let safe: string;
  try {
    const parsed = new URL(url);
    safe = parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : '/';
  } catch {
    safe = '/';
  }

  // Record first click only
  try {
    const { data: updated } = await serverDb
      .from('campaign_sends')
      .update({ clicked_at: new Date().toISOString() })
      .eq('id', id)
      .is('clicked_at', null)
      .select('campaign_id');

    if (updated && updated.length > 0) {
      const campaignId = updated[0].campaign_id as string;
      const { data: camp } = await serverDb
        .from('campaigns')
        .select('click_count')
        .eq('id', campaignId)
        .maybeSingle();
      if (camp) {
        await serverDb
          .from('campaigns')
          .update({ click_count: ((camp.click_count as number) ?? 0) + 1 })
          .eq('id', campaignId);
      }
    }
  } catch { /* non-critical */ }

  return NextResponse.redirect(safe, 302);
}
