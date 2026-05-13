import { NextRequest, NextResponse } from 'next/server';
import { ScanResultsBatchSchema } from '@/lib/schemas/scan-results';
import { listScanResults, bulkInsertScanResults, clearScanResults } from '@/lib/db/repositories/scan-results';
import { insertAuditLog } from '@/lib/db/repositories/audit';
import { getOrgId } from '@/lib/tenant';
import { zodError, getActorInfo } from '@/lib/api-utils';

export async function GET() {
  try {
    const rows = await listScanResults(await getOrgId());
    return NextResponse.json(rows);
  } catch (err) {
    console.error('[GET /api/scan-results]', err);
    return NextResponse.json({ error: 'Failed to fetch scan results' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = ScanResultsBatchSchema.safeParse(body);
    if (!parsed.success) return zodError(parsed.error);

    const orgId = await getOrgId();
    const count = await bulkInsertScanResults(orgId, parsed.data.results);

    const { actorName, ip } = getActorInfo(req);
    await insertAuditLog({
      org_id: orgId, actor_name: actorName, action: 'create',
      entity_type: 'scan_results', diff: { count }, ip,
    });

    return NextResponse.json({ ok: true, count });
  } catch (err) {
    console.error('[POST /api/scan-results]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to insert scan results' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const orgId = await getOrgId();
    const { actorName, ip } = getActorInfo(req);

    await clearScanResults(orgId);

    await insertAuditLog({
      org_id: orgId, actor_name: actorName, action: 'delete',
      entity_type: 'scan_results', ip,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/scan-results]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to clear scan results' },
      { status: 500 }
    );
  }
}
