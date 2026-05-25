import { serverDb as supabase } from '@/lib/supabase-server';
import type { TaskCreate, TaskUpdate } from '@/lib/schemas/tasks';

export async function listTasks(orgId: string, filters?: { lead_id?: string; project_id?: string }) {
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (filters?.lead_id)    query = query.eq('lead_id', filters.lead_id);
  if (filters?.project_id) query = query.eq('project_id', filters.project_id);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function findTaskById(orgId: string, id: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function createTask(orgId: string, data: TaskCreate) {
  const { data: task, error } = await supabase
    .from('tasks')
    .insert({ ...data, org_id: orgId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return task;
}

export async function updateTask(orgId: string, id: string, data: TaskUpdate) {
  const { data: task, error } = await supabase
    .from('tasks')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return task;
}

export async function deleteTask(orgId: string, id: string): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('org_id', orgId)
    .eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}
