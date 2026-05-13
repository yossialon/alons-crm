import { NextRequest, NextResponse } from 'next/server';
import { importScanResultAsLead } from '@/lib/db/repositories/scan-results';
import { insertAuditLog } from '@/lib/db/repositories/audit';
import { getOrgId } from '@/lib/tenant';
import { getActorInfo } from '@/lib/api-utils';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const orgId = await getOrgId();
  const { actorName, ip } = getActorInfo(req);

  const result = await importScanResultAsLead(orgId, id);

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await insertAuditLog({
    org_id: orgId, actor_name: actorName, action: 'import',
    entity_type: 'lead', entity_id: result.leadId,
    diff: { from_scan: id },
    ip,
  });

  return NextResponse.json({ ok: true, leadId: result.leadId });
}
