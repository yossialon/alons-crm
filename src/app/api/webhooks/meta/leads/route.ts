import { NextRequest, NextResponse } from 'next/server';
import serverDb from '@/lib/supabase-server';
import { getOrgId } from '@/lib/tenant';
import { verifyMetaSignature, getLeadAdData } from '@/lib/meta';
import { computeLeadScore } from '@/lib/scoring';

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN ?? 'alons_verify_token';

// Meta webhook verification handshake
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// Receive lead form submissions
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256') ?? '';

  if (!verifyMetaSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody) as {
      object?: string;
      entry?: { changes?: { field: string; value: { leadgen_id?: string; page_id?: string } }[] }[];
    };

    if (body.object !== 'page') return NextResponse.json({ ok: true });

    const orgId = await getOrgId();

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'leadgen') continue;
        const { leadgen_id } = change.value;
        if (!leadgen_id) continue;

        // Fetch lead data from Meta
        const fields = await getLeadAdData(leadgen_id);
        const name = fields.full_name || fields.name || fields.first_name
          ? `${fields.first_name ?? ''} ${fields.last_name ?? ''}`.trim() || fields.full_name || 'Facebook Lead'
          : 'Facebook Lead';
        const phone = fields.phone_number || fields.phone || '';
        const email = fields.email || '';
        const notes = [
          fields._ad_name ? `Ad: ${fields._ad_name}` : '',
          fields._campaign_name ? `Campaign: ${fields._campaign_name}` : '',
        ].filter(Boolean).join(' | ');

        const score = computeLeadScore({ phone, email, source: 'Facebook Ad', notes });
        const potential: 'high' | 'medium' | 'low' = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

        const { data: lead, error } = await serverDb
          .from('leads')
          .insert({
            org_id: orgId,
            name,
            phone,
            email,
            source: 'Facebook Ad',
            status: 'new',
            type: 'Homeowner',
            notes,
            area: 'South Florida',
            potential,
          })
          .select()
          .single();

        if (!error && lead) {
          await serverDb.from('ad_leads').insert({
            org_id: orgId,
            lead_id: lead.id,
            platform: 'facebook',
            ad_id: fields._ad_id,
            ad_name: fields._ad_name,
            form_id: fields._form_id,
            form_name: fields._form_name || '',
            campaign_name: fields._campaign_name,
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Lead webhook error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
