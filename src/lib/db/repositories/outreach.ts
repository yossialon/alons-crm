import { serverDb as supabase } from '@/lib/supabase-server';
import type { OutreachCreate } from '@/lib/schemas/outreach';

export async function listOutreachByLead(orgId: string, leadId: string) {
  const { data, error } = await supabase
    .from('outreach_log')
    .select('*')
    .eq('org_id', orgId)
    .eq('lead_id', leadId)
    .order('contacted_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function createOutreach(orgId: string, actorName: string, data: OutreachCreate) {
  const { data: entry, error } = await supabase
    .from('outreach_log')
    .insert({ ...data, org_id: orgId, actor_name: actorName })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return entry;
}

export async function deleteOutreach(orgId: string, id: string): Promise<boolean> {
  const { error } = await supabase
    .from('outreach_log')
    .delete()
    .eq('org_id', orgId)
    .eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}
