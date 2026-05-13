import { NextRequest, NextResponse } from 'next/server';
import { LeadCreateSchema } from '@/lib/schemas/leads';
import { listLeads, createLead } from '@/lib/db/repositories/leads';
import { insertAuditLog } from '@/lib/db/repositories/audit';
import { getOrgId } from '@/lib/tenant';
import { zodError, getActorInfo } from '@/lib/api-utils';

export async function GET() {
  try {
    const leads = await listLeads(await getOrgId());
    return NextResponse.json(leads);
  } catch (err) {
    console.error('[GET /api/leads]', err);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = LeadCreateSchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const orgId = await getOrgId();
    const { actorName, ip } = getActorInfo(req);

    const lead = await createLead(orgId, parsed.data);

    await insertAuditLog({
      org_id: orgId, actor_name: actorName, action: 'create',
      entity_type: 'lead', entity_id: lead.id as string, ip,
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (err) {
    console.error('[POST /api/leads]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create lead' },
      { status: 500 }
    );
  }
}
