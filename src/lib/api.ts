// Client-side helpers for talking to our own API routes.
// The API key never touches the browser — all Claude calls go through /api/claude.

import { MODEL } from './constants';

async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
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
  const data = await req<{ content?: { type: string; text: string }[]; error?: { message: string } }>(
    '/api/claude',
    {
      ...json({
        model: MODEL,
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
      method: 'POST',
    }
  );
  if (data.error) throw new Error(data.error.message);
  return (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
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

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login  = (username: string, password: string) =>
  req<object>('/api/auth/login', { ...json({ username, password }), method: 'POST' });
export const logout = () =>
  req<object>('/api/auth/logout', { method: 'POST' });
