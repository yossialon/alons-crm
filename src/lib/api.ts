// Client-side helpers for talking to our own API routes.
// The API key never touches the browser — all Claude calls go through /api/claude.

import { MODEL } from './constants';

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const errMsg = typeof err.error === 'string'
      ? err.error
      : (err.error?.message ?? err.message ?? res.statusText);
    throw new Error(errMsg);
  }
  return res.json();
}

const json = (body: unknown) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// ── Leads ─────────────────────────────────────────────────────────────────────
export const getLeads      = ()             => req<object[]>('/api/leads');
export const createLead    = (data: object) => req<object>('/api/leads', { ...json(data), method: 'POST' });
export const updateLead    = (id: string, data: object) => req<object>(`/api/leads/${id}`, { ...json(data), method: 'PUT' });
export const deleteLead    = (id: string)  => req<object>(`/api/leads/${id}`, { method: 'DELETE' });

// ── Suppliers ─────────────────────────────────────────────────────────────────
export const getSuppliers    = ()             => req<object[]>('/api/suppliers');
export const createSupplier  = (data: object) => req<object>('/api/suppliers', { ...json(data), method: 'POST' });
export const updateSupplier  = (id: string, data: object) => req<object>(`/api/suppliers/${id}`, { ...json(data), method: 'PUT' });
export const deleteSupplier  = (id: string)  => req<object>(`/api/suppliers/${id}`, { method: 'DELETE' });

// ── Scan results ──────────────────────────────────────────────────────────────
export const getScanResults   = ()                 => req<object[]>('/api/scan-results');
export const saveScanResults  = (results: object[]) => req<object>('/api/scan-results', { ...json({ results }), method: 'POST' });
export const clearScanResults = ()                 => req<object>('/api/scan-results', { method: 'DELETE' });
export const importScanResult = (id: string)       => req<object>(`/api/scan-results/${id}/import`, { method: 'POST' });

// ── Claude (proxied — API key stays server-side) ──────────────────────────────
export async function callClaude(prompt: string): Promise<string> {
  const data = await req<{
    content?: { type: string; text?: string }[];
    error?: { message: string };
  }>('/api/claude', {
    ...json({
      model: MODEL,
      max_tokens: 4000,
      tools: [{ type: 'web_search_20260209', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    }),
    method: 'POST',
  });
  if (data.error) throw new Error(data.error.message);
  return (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n');
}

export function parseLeadsFromText(text: string): object[] {
  const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const s = clean.indexOf('[');
  const e = clean.lastIndexOf(']');
  if (s === -1 || e === -1) return [];
  try {
    return JSON.parse(clean.slice(s, e + 1));
  } catch {
    return [];
  }
}

// ── Clients ───────────────────────────────────────────────────────────────────
export const getClients    = ()             => req<object[]>('/api/clients');
export const createClient  = (data: object) => req<object>('/api/clients', { ...json(data), method: 'POST' });
export const updateClient  = (id: string, data: object) => req<object>(`/api/clients/${id}`, { ...json(data), method: 'PUT' });
export const deleteClient  = (id: string)  => req<object>(`/api/clients/${id}`, { method: 'DELETE' });

// ── Projects ──────────────────────────────────────────────────────────────────
export const getProjects   = ()             => req<object[]>('/api/projects');
export const createProject = (data: object) => req<object>('/api/projects', { ...json(data), method: 'POST' });
export const updateProject = (id: string, data: object) => req<object>(`/api/projects/${id}`, { ...json(data), method: 'PUT' });
export const deleteProject = (id: string)  => req<object>(`/api/projects/${id}`, { method: 'DELETE' });

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const getTasks    = ()             => req<object[]>('/api/tasks');
export const createTask  = (data: object) => req<object>('/api/tasks', { ...json(data), method: 'POST' });
export const updateTask  = (id: string, data: object) => req<object>(`/api/tasks/${id}`, { ...json(data), method: 'PUT' });
export const deleteTask  = (id: string)  => req<object>(`/api/tasks/${id}`, { method: 'DELETE' });

// ── Outreach ──────────────────────────────────────────────────────────────────
export const getOutreach    = (leadId: string) => req<object[]>(`/api/outreach?lead_id=${leadId}`);
export const createOutreach = (data: object)   => req<object>('/api/outreach', { ...json(data), method: 'POST' });

// ── Outreach / Campaigns / Templates / Automations ───────────────────────────
export const getTemplates      = ()                    => req<object[]>('/api/outreach/templates');
export const createTemplate    = (data: object)        => req<object>('/api/outreach/templates',       { ...json(data), method: 'POST' });
export const updateTemplate    = (id: string, data: object) => req<object>(`/api/outreach/templates/${id}`, { ...json(data), method: 'PUT' });
export const deleteTemplate    = (id: string)          => req<object>(`/api/outreach/templates/${id}`, { method: 'DELETE' });

export const getCampaigns      = ()                    => req<object[]>('/api/outreach/campaigns');
export const createCampaign    = (data: object)        => req<object>('/api/outreach/campaigns',       { ...json(data), method: 'POST' });
export const updateCampaign    = (id: string, data: object) => req<object>(`/api/outreach/campaigns/${id}`, { ...json(data), method: 'PUT' });
export const deleteCampaign    = (id: string)          => req<object>(`/api/outreach/campaigns/${id}`, { method: 'DELETE' });
export const sendCampaign      = (id: string)          => req<object>(`/api/outreach/campaigns/${id}/send`, { method: 'POST' });

export const getScheduled      = ()                    => req<object[]>('/api/outreach/scheduled');
export const createScheduled   = (data: object)        => req<object>('/api/outreach/scheduled',       { ...json(data), method: 'POST' });
export const cancelScheduled   = (id: string)          => req<object>(`/api/outreach/scheduled/${id}`, { method: 'DELETE' });

export const getAutomations    = ()                    => req<object[]>('/api/outreach/automations');
export const createAutomation  = (data: object)        => req<object>('/api/outreach/automations',       { ...json(data), method: 'POST' });
export const updateAutomation  = (id: string, data: object) => req<object>(`/api/outreach/automations/${id}`, { ...json(data), method: 'PUT' });
export const deleteAutomation  = (id: string)          => req<object>(`/api/outreach/automations/${id}`, { method: 'DELETE' });

// ── Social ────────────────────────────────────────────────────────────────────
export const getSocialConnections  = ()                    => req<object[]>('/api/social/connections');
export const deleteSocialConnection = (id: string)         => req<object>(`/api/social/connections/${id}`, { method: 'DELETE' });
export const getSocialMessages     = (platform = 'all', unread = false) =>
  req<object[]>(`/api/social/messages?platform=${platform}&unread=${unread}`);
export const getThreadMessages     = (threadId: string)    => req<object[]>(`/api/social/messages?thread_id=${encodeURIComponent(threadId)}&platform=all`);
export const markThreadRead        = (threadId: string)    => req<object>('/api/social/messages', { ...json({ thread_id: threadId }), method: 'PATCH' });
export const replySocialMessage    = (id: string, text: string) => req<object>(`/api/social/messages/${id}/reply`, { ...json({ text }), method: 'POST' });
export const syncSocial            = ()                    => req<object>('/api/social/sync', { method: 'POST' });

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login  = (email: string, password: string) =>
  req<object>('/api/auth/login', { ...json({ email, password }), method: 'POST' });
export const logout = () =>
  req<object>('/api/auth/logout', { method: 'POST' });
export const signup = (data: { org_name: string; name: string; email: string; password: string }) =>
  req<object>('/api/auth/signup', { ...json(data), method: 'POST' });
export const getMe  = () => req<object>('/api/auth/me');
export const getSubscription = () => req<object>('/api/billing/subscription');
export const createCheckout  = (plan: string, interval: string) =>
  req<{ url: string }>('/api/billing/checkout', { ...json({ plan, interval }), method: 'POST' });
export const createPortal    = () =>
  req<{ url: string }>('/api/billing/portal', { method: 'POST' });
