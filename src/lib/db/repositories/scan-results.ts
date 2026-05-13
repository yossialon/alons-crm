import { supabase } from '@/lib/supabase';
import type { ScanResultItem } from '@/lib/schemas/scan-results';

export async function listScanResults(orgId: string, limit = 300) {
  const { data, error } = await supabase
    .from('scan_results')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}

export async function bulkInsertScanResults(orgId: string, items: ScanResultItem[]) {
  if (items.length === 0) return 0;
  const rows = items.map((item) => ({ ...item, org_id: orgId }));
  const { error } = await supabase.from('scan_results').insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}

export async function clearScanResults(orgId: string): Promise<void> {
  const { error } = await supabase
    .from('scan_results')
    .delete()
    .eq('org_id', orgId);
  if (error) throw new Error(error.message);
}

export async function findScanResultById(orgId: string, id: string) {
  const { data, error } = await supabase
    .from('scan_results')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function importScanResultAsLead(
  orgId: string,
  scanId: string
): Promise<{ leadId: string } | { error: string; status: number }> {
  const scan = await findScanResultById(orgId, scanId);
  if (!scan) return { error: 'Scan result not found', status: 404 };

  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .eq('org_id', orgId)
    .eq('name', scan.name)
    .maybeSingle();
  if (existing) return { error: 'Already imported', status: 409 };

  const today = new Date().toISOString().split('T')[0];
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      org_id: orgId,
      name: scan.name,
      phone: scan.phone,
      email: scan.email,
      type: scan.type || 'Homeowner',
      area: scan.area,
      status: 'new',
      source: scan.source,
      notes: scan.notes,
      website: scan.website,
      rating: scan.rating,
      potential: scan.potential || 'medium',
      date: today,
    })
    .select('id')
    .single();

  if (leadError) return { error: leadError.message, status: 500 };

  await supabase
    .from('scan_results')
    .update({ imported: true, imported_as: lead.id })
    .eq('id', scanId);

  return { leadId: lead.id as string };
}
