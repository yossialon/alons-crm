import { supabase } from '@/lib/supabase';
import type { LeadCreate, LeadUpdate } from '@/lib/schemas/leads';

export async function listLeads(orgId: string) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function findLeadById(orgId: string, id: string) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createLead(orgId: string, data: LeadCreate) {
  const { data: lead, error } = await supabase
    .from('leads')
    .insert({ ...data, org_id: orgId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return lead;
}

export async function updateLead(orgId: string, id: string, data: LeadUpdate) {
  const { data: lead, error } = await supabase
    .from('leads')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return lead;
}

export async function deleteLead(orgId: string, id: string): Promise<boolean> {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('org_id', orgId)
    .eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}
