import { NextRequest, NextResponse } from 'next/server';
import { OutreachCreateSchema } from '@/lib/schemas/outreach';
import { listOutreachByLead, createOutreach } from '@/lib/db/repositories/outreach';
import { insertAuditLog } from '@/lib/db/repositories/audit';
import { getOrgId } from '@/lib/tenant';
import { zodError, getActorInfo } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    const leadId = req.nextUrl.searchParams.get('lead_id');
    if (!leadId) return NextResponse.json({ error: 'lead_id query param is required' }, { status: 400 });
    const entries = await listOutreachByLead(await getOrgId(), leadId);
    return NextResponse.json(entries);
  } catch (err) {
    console.error('[GET /api/outreach]', err);
    return NextResponse.json({ error: 'Failed to fetch outreach' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json().catch(() => null);
    const parsed = OutreachCreateSchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const orgId = await getOrgId();
    const { actorName, ip } = getActorInfo(req);

    const entry = await createOutreach(orgId, actorName, parsed.data);

    await insertAuditLog({
      org_id: orgId, actor_name: actorName, action: 'create',
      entity_type: 'outreach', entity_id: entry.id as string,
      diff: { lead_id: parsed.data.lead_id, method: parsed.data.method },
      ip,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error('[POST /api/outreach]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create outreach' }, { status: 500 });
  }
}
