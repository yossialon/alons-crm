'use client';
import { useState, useEffect, useCallback } from 'react';
import { Client, OutreachEntry } from '@/types';
import { getClients, getOutreach, createOutreach } from '@/lib/api';
import { Building2, Phone, Mail, ChevronDown, ChevronUp, Plus, Sparkles, RefreshCw } from 'lucide-react';

const METHOD_ICONS: Record<string, string> = {
  email: '📧', phone: '📞', sms: '💬', in_person: '🤝', social: '💼',
};

const OUTCOME_STYLES: Record<string, string> = {
  interested:     'text-emerald-700 bg-emerald-50',
  converted:      'text-emerald-800 bg-emerald-100 font-bold',
  follow_up:      'text-amber-700 bg-amber-50',
  callback:       'text-blue-700 bg-blue-50',
  no_answer:      'text-slate-500 bg-slate-100',
  not_interested: 'text-red-600 bg-red-50',
};

type OutreachForm = { method: string; direction: string; outcome: string; notes: string };
const EMPTY_FORM: OutreachForm = { method: 'phone', direction: 'outbound', outcome: '', notes: '' };

export default function CustomersTab() {
  const [clients,     setClients]     = useState<Client[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [outreachMap, setOutreachMap] = useState<Record<string, OutreachEntry[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try { setClients((await getClients()) as Client[]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = async (client: Client) => {
    if (expanded === client.id) { setExpanded(null); return; }
    setExpanded(client.id);
    if (client.lead_id && !outreachMap[client.id]) {
      try {
        const entries = (await getOutreach(client.lead_id)) as OutreachEntry[];
        setOutreachMap((prev) => ({ ...prev, [client.id]: entries }));
      } catch {}
    }
  };

  const refreshOutreach = async (clientId: string, leadId: string) => {
    const entries = (await getOutreach(leadId)) as OutreachEntry[];
    setOutreachMap((prev) => ({ ...prev, [clientId]: entries }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Customers</h2>
        <span className="text-sm text-slate-400">{clients.length} total</span>
      </div>

      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-400">
          Loading…
        </div>
      )}

      {!loading && clients.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Building2 size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">No customers yet</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Customers are created when you promote a qualified lead to a client.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {clients.map((client) => (
          <div key={client.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              onClick={() => toggleExpand(client)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800">{client.name}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {client.phone && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Phone size={10} />{client.phone}
                    </span>
                  )}
                  {client.email && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Mail size={10} />{client.email}
                    </span>
                  )}
                </div>
              </div>
              {expanded === client.id
                ? <ChevronUp size={16} className="text-slate-400 shrink-0" />
                : <ChevronDown size={16} className="text-slate-400 shrink-0" />
              }
            </button>

            {expanded === client.id && (
              <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/60">
                {client.address && (
                  <p className="text-xs text-slate-500 mb-3">📍 {client.address}</p>
                )}
                {client.notes && (
                  <p className="text-xs text-slate-500 mb-3 italic">{client.notes}</p>
                )}
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                  Communication History
                </p>
                {client.lead_id ? (
                  <OutreachHistory
                    leadId={client.lead_id}
                    clientName={client.name}
                    entries={outreachMap[client.id] ?? []}
                    onAdd={async (data) => {
                      await createOutreach({ ...data, lead_id: client.lead_id });
                      await refreshOutreach(client.id, client.lead_id!);
                    }}
                  />
                ) : (
                  <p className="text-xs text-slate-400">No linked lead — communication history unavailable.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function OutreachHistory({ leadId: _leadId, entries, onAdd, clientName }: {
  leadId: string;
  entries: OutreachEntry[];
  onAdd: (data: object) => Promise<void>;
  clientName: string;
}) {
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState<OutreachForm>(EMPTY_FORM);
  const [summary,    setSummary]    = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [saving,   setSaving]   = useState(false);

  const handleAdd = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onAdd({
        method:       form.method,
        direction:    form.direction,
        outcome:      form.outcome || null,
        notes:        form.notes,
        contacted_at: new Date().toISOString(),
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
    } finally { setSaving(false); }
  };

  const summarize = async () => {
    if (entries.length === 0) return;
    setSummarizing(true);
    setSummary(null);
    try {
      const history = entries.map((e) =>
        `[${new Date(e.contacted_at).toLocaleDateString()}] ${e.direction} ${e.method}${e.outcome ? ` → ${e.outcome}` : ''}${e.notes ? `: "${e.notes}"` : ''}`
      ).join('\n');

      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-6', // FIXED: upgraded from stale date-versioned ID
          max_tokens: 250,
          messages: [{
            role: 'user',
            content: `Summarize this communication history with customer "${clientName}" for Alon's Kitchens sales team. Be concise (3–4 sentences). Include: relationship status, key moments, and the single best next step.

History:
${history}`,
          }],
        }),
      });
      const data = await res.json();
      setSummary(data.content?.[0]?.text ?? 'Could not generate summary.');
    } catch {
      setSummary('Error generating summary.');
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div className="space-y-2.5">
      {entries.length === 0 && !showForm && (
        <p className="text-xs text-slate-400">No communications logged yet.</p>
      )}

      {entries.map((e) => (
        <div key={e.id} className="flex items-start gap-2.5 text-sm">
          <span className="text-base w-5 shrink-0 mt-0.5">{METHOD_ICONS[e.method] ?? '📝'}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-slate-700 capitalize text-xs">{e.method}</span>
              <span className="text-slate-300 text-xs">·</span>
              <span className="text-xs text-slate-400 capitalize">{e.direction}</span>
              {e.outcome && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${OUTCOME_STYLES[e.outcome] ?? 'text-slate-600 bg-slate-100'}`}>
                  {e.outcome.replace('_', ' ')}
                </span>
              )}
              <span className="text-xs text-slate-400 ml-auto shrink-0">
                {new Date(e.contacted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            {e.notes && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{e.notes}</p>}
          </div>
        </div>
      ))}

      {showForm ? (
        <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 mt-1">
          <div className="flex flex-wrap gap-1.5">
            <select
              value={form.method}
              onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-300"
            >
              {['phone', 'email', 'sms', 'in_person', 'social'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              value={form.direction}
              onChange={(e) => setForm((p) => ({ ...p, direction: e.target.value }))}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-300"
            >
              <option value="outbound">Outbound</option>
              <option value="inbound">Inbound</option>
            </select>
            <select
              value={form.outcome}
              onChange={(e) => setForm((p) => ({ ...p, outcome: e.target.value }))}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-300"
            >
              <option value="">No outcome</option>
              {['no_answer', 'callback', 'interested', 'not_interested', 'follow_up', 'converted'].map((o) => (
                <option key={o} value={o}>{o.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <input
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Notes…"
            className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-300"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-700 text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Log'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-600 font-semibold"
          >
            <Plus size={12} /> Log communication
          </button>
          {entries.length > 0 && (
            <button
              onClick={summarize}
              disabled={summarizing}
              className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-semibold disabled:opacity-50"
            >
              {summarizing
                ? <><RefreshCw size={11} className="animate-spin" /> Summarizing…</>
                : <><Sparkles size={11} /> AI Summary</>
              }
            </button>
          )}
        </div>
      )}

      {/* AI summary card */}
      {summary && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 mt-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles size={11} className="text-violet-400" />
            <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wide">AI Summary</p>
          </div>
          <p className="text-xs text-violet-900 leading-relaxed">{summary}</p>
        </div>
      )}
    </div>
  );
}
