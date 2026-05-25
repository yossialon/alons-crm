import { NextRequest, NextResponse } from 'next/server';
import serverDb from '@/lib/supabase-server';

type Ctx = { params: Promise<{ id: string }> };

// Respond with a 1×1 transparent GIF and record the open
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;

  // Record first open only
  try {
    const { data: updated } = await serverDb
      .from('campaign_sends')
      .update({ opened_at: new Date().toISOString() })
      .eq('id', id)
      .is('opened_at', null)
      .select('campaign_id');

    if (updated && updated.length > 0) {
      const campaignId = updated[0].campaign_id as string;
      const { data: camp } = await serverDb
        .from('campaigns')
        .select('open_count')
        .eq('id', campaignId)
        .maybeSingle();
      if (camp) {
        await serverDb
          .from('campaigns')
          .update({ open_count: ((camp.open_count as number) ?? 0) + 1 })
          .eq('id', campaignId);
      }
    }
  } catch { /* non-critical */ }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      'Content-Type':  'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    },
  });
}
