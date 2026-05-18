'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  MessageTemplate, Campaign, ScheduledOutreach, AutomationRule, OutreachChannel,
} from '@/types';
import {
  getTemplates, createTemplate, updateTemplate, deleteTemplate,
  getCampaigns, createCampaign, deleteCampaign, sendCampaign, updateCampaign,
  getScheduled, createScheduled, cancelScheduled,
  getAutomations, createAutomation, updateAutomation, deleteAutomation,
} from '@/lib/api';
import {
  Send, Plus, Trash2, Play, Pencil, X, CheckCircle2,
  Mail, MessageSquare, Clock, Zap, RefreshCw, ToggleLeft, ToggleRight,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

const CHANNEL_ICON: Record<OutreachChannel, React.ReactNode> = {
  email:    <Mail size={13} />,
  sms:      <MessageSquare size={13} />,
  whatsapp: <span className="text-xs">💬</span>,
};

const CHANNEL_COLOR: Record<OutreachChannel, string> = {
  email:    'bg-blue-50 text-blue-700 border-blue-200',
  sms:      'bg-green-50 text-green-700 border-green-200',
  whatsapp: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const STATUS_COLOR: Record<string, string> = {
  draft:     'bg-slate-100 text-slate-500',
  scheduled: 'bg-amber-50 text-amber-700',
  sending:   'bg-blue-50 text-blue-700',
  sent:      'bg-emerald-50 text-emerald-700',
  paused:    'bg-red-50 text-red-600',
};

function ChannelPill({ channel }: { channel: OutreachChannel }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${CHANNEL_COLOR[channel]}`}>
      {CHANNEL_ICON[channel]} {channel}
    </span>
  );
}

type Section = 'templates' | 'campaigns' | 'scheduled' | 'automations';

// ── Template editor modal ─────────────────────────────────────────────────────

function TemplateModal({
  initial, onSave, onClose,
}: {
  initial?: MessageTemplate | null;
  onSave: (data: object) => Promise<void>;
  onClose: () => void;
}) {
  const [name,    setName]    = useState(initial?.name    ?? '');
  const [channel, setChannel] = useState<OutreachChannel>(initial?.channel ?? 'email');
  const [subject, setSubject] = useState(initial?.subject ?? '');
  const [body,    setBody]    = useState(initial?.body    ?? '');
  const [saving,  setSaving]  = useState(false);

  const submit = async () => {
    if (!name.trim() || !body.trim()) return;
    setSaving(true);
    try { await onSave({ name, channel, subject, body }); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <p className="font-bold text-slate-800">{initial ? 'Edit Template' : 'New Template'}</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="label">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. New Lead Welcome" className="input" />
          </div>
          <div>
            <label className="label">Channel</label>
            <div className="flex gap-2">
              {(['email', 'sms', 'whatsapp'] as OutreachChannel[]).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border transition-all capitalize ${
                    channel === ch ? 'bg-brand-700 text-white border-brand-700' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>
          {channel === 'email' && (
            <div>
              <label className="label">Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Hi {{name}}, about your kitchen project…" className="input" />
            </div>
          )}
          <div>
            <label className="label">Body</label>
            <textarea
              value={body} onChange={(e) => setBody(e.target.value)} rows={7}
              placeholder={channel === 'sms' ? 'Keep under 160 chars. Use {{name}}, {{area}}, {{type}}…' : 'Use {{name}}, {{area}}, {{type}}, {{phone}}, {{email}} as variables…'}
              className="input resize-y font-mono text-xs"
            />
            <p className="text-[10px] text-slate-400 mt-1">Variables: {'{{name}}'} {'{{area}}'} {'{{type}}'} {'{{source}}'} {'{{phone}}'} {'{{email}}'}</p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={submit} disabled={saving || !name.trim() || !body.trim()} className="btn-primary">
            {saving ? 'Saving…' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Campaign create modal ─────────────────────────────────────────────────────

function CampaignModal({
  templates, onSave, onClose,
}: {
  templates: MessageTemplate[];
  onSave: (data: object) => Promise<void>;
  onClose: () => void;
}) {
  const [name,       setName]       = useState('');
  const [templateId, setTemplateId] = useState('');
  const [channel,    setChannel]    = useState<OutreachChannel>('email');
  const [status,     setStatus]     = useState('new');
  const [potential,  setPotential]  = useState('');
  const [saving,     setSaving]     = useState(false);

  const filteredTmpl = templates.filter((t) => t.channel === channel);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const filter: Record<string, string> = {};
    if (status)    filter.status    = status;
    if (potential) filter.potential = potential;
    try {
      await onSave({ name, channel, template_id: templateId || null, target_filter: filter });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <p className="font-bold text-slate-800">New Campaign</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="label">Campaign Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. June New Leads Email" className="input" />
          </div>
          <div>
            <label className="label">Channel</label>
            <div className="flex gap-2">
              {(['email', 'sms', 'whatsapp'] as OutreachChannel[]).map((ch) => (
                <button key={ch} onClick={() => { setChannel(ch); setTemplateId(''); }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border capitalize transition-all ${
                    channel === ch ? 'bg-brand-700 text-white border-brand-700' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>{ch}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Template</label>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="input">
              <option value="">— No template (send blank) —</option>
              {filteredTmpl.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {filteredTmpl.length === 0 && (
              <p className="text-[10px] text-slate-400 mt-1">No {channel} templates yet — create one in Templates first.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Target: Lead Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
                <option value="">All statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
              </select>
            </div>
            <div>
              <label className="label">Target: Potential</label>
              <select value={potential} onChange={(e) => setPotential(e.target.value)} className="input">
                <option value="">All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={submit} disabled={saving || !name.trim()} className="btn-primary">
            {saving ? 'Creating…' : 'Create Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Schedule follow-up modal ──────────────────────────────────────────────────

function ScheduleModal({
  templates, leads, onSave, onClose,
}: {
  templates: MessageTemplate[];
  leads: { id: string; name: string }[];
  onSave: (data: object) => Promise<void>;
  onClose: () => void;
}) {
  const [leadId,   setLeadId]   = useState('');
  const [channel,  setChannel]  = useState<OutreachChannel>('email');
  const [tmplId,   setTmplId]   = useState('');
  const [subject,  setSubject]  = useState('');
  const [message,  setMessage]  = useState('');
  const [sendAt,   setSendAt]   = useState('');
  const [saving,   setSaving]   = useState(false);

  const filtered = templates.filter((t) => t.channel === channel);

  const applyTemplate = (id: string) => {
    setTmplId(id);
    const t = templates.find((x) => x.id === id);
    if (t) { setSubject(t.subject); setMessage(t.body); }
  };

  const submit = async () => {
    if (!leadId || !message.trim() || !sendAt) return;
    setSaving(true);
    try {
      await onSave({ lead_id: leadId, template_id: tmplId || null, channel, subject, message, scheduled_at: new Date(sendAt).toISOString() });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <p className="font-bold text-slate-800">Schedule Follow-up</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="label">Lead</label>
            <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="input">
              <option value="">— Select lead —</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Channel</label>
            <div className="flex gap-2">
              {(['email', 'sms', 'whatsapp'] as OutreachChannel[]).map((ch) => (
                <button key={ch} onClick={() => setChannel(ch)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border capitalize transition-all ${
                    channel === ch ? 'bg-brand-700 text-white border-brand-700' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>{ch}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Template (optional)</label>
            <select value={tmplId} onChange={(e) => applyTemplate(e.target.value)} className="input">
              <option value="">— Write manually —</option>
              {filtered.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {channel === 'email' && (
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="input" />
          )}
          <textarea
            value={message} onChange={(e) => setMessage(e.target.value)}
            rows={4} placeholder="Message…" className="input resize-none"
          />
          <div>
            <label className="label">Send At</label>
            <input type="datetime-local" value={sendAt} onChange={(e) => setSendAt(e.target.value)} className="input" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={submit} disabled={saving || !leadId || !message.trim() || !sendAt} className="btn-primary">
            {saving ? 'Scheduling…' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Automation rule modal ─────────────────────────────────────────────────────

function AutomationModal({
  templates, onSave, onClose,
}: {
  templates: MessageTemplate[];
  onSave: (data: object) => Promise<void>;
  onClose: () => void;
}) {
  const [name,       setName]       = useState('');
  const [trigger,    setTrigger]    = useState<'days_since_created' | 'days_since_contact' | 'status_is'>('days_since_created');
  const [trigVal,    setTrigVal]    = useState('');
  const [channel,    setChannel]    = useState<OutreachChannel>('email');
  const [templateId, setTemplateId] = useState('');
  const [filterSt,   setFilterSt]   = useState('');
  const [filterPot,  setFilterPot]  = useState('');
  const [saving,     setSaving]     = useState(false);

  const filtered = templates.filter((t) => t.channel === channel);

  const submit = async () => {
    if (!name.trim() || !trigVal.trim() || !templateId) return;
    setSaving(true);
    const filter: Record<string, string> = {};
    if (filterSt)  filter.status    = filterSt;
    if (filterPot) filter.potential = filterPot;
    try {
      await onSave({ name, trigger_type: trigger, trigger_value: trigVal, channel, template_id: templateId, lead_filter: filter });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <p className="font-bold text-slate-800">New Automation Rule</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="label">Rule Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 7-Day New Lead SMS" className="input" />
          </div>
          <div>
            <label className="label">Trigger</label>
            <select value={trigger} onChange={(e) => setTrigger(e.target.value as typeof trigger)} className="input">
              <option value="days_since_created">X days since lead created</option>
              <option value="days_since_contact">X days since last contact</option>
              <option value="status_is">Lead status equals</option>
            </select>
          </div>
          <div>
            <label className="label">
              {trigger === 'status_is' ? 'Status value' : 'Number of days'}
            </label>
            <input
              value={trigVal} onChange={(e) => setTrigVal(e.target.value)}
              placeholder={trigger === 'status_is' ? 'new / contacted / qualified' : '7'}
              className="input"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Filter: Status</label>
              <select value={filterSt} onChange={(e) => setFilterSt(e.target.value)} className="input">
                <option value="">Any</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
              </select>
            </div>
            <div>
              <label className="label">Filter: Potential</label>
              <select value={filterPot} onChange={(e) => setFilterPot(e.target.value)} className="input">
                <option value="">Any</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Channel</label>
            <div className="flex gap-2">
              {(['email', 'sms', 'whatsapp'] as OutreachChannel[]).map((ch) => (
                <button key={ch} onClick={() => { setChannel(ch); setTemplateId(''); }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border capitalize transition-all ${
                    channel === ch ? 'bg-brand-700 text-white border-brand-700' : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>{ch}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Template to send</label>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="input">
              <option value="">— Select template —</option>
              {filtered.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={submit} disabled={saving || !name.trim() || !trigVal.trim() || !templateId} className="btn-primary">
            {saving ? 'Saving…' : 'Create Rule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export default function OutreachTab({ leads }: { leads: { id: string; name: string }[] }) {
  const [section,     setSection]     = useState<Section>('templates');
  const [templates,   setTemplates]   = useState<MessageTemplate[]>([]);
  const [campaigns,   setCampaigns]   = useState<Campaign[]>([]);
  const [scheduled,   setScheduled]   = useState<ScheduledOutreach[]>([]);
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [modal,       setModal]       = useState<'template' | 'campaign' | 'schedule' | 'automation' | null>(null);
  const [editTmpl,    setEditTmpl]    = useState<MessageTemplate | null>(null);
  const [sending,     setSending]     = useState<string | null>(null);
  const [running,     setRunning]     = useState(false);
  const [flash,       setFlash]       = useState<string | null>(null);

  const showFlash = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(null), 3000); };

  const runAutomations = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/cron/outreach', { method: 'POST' });
      const data = await res.json() as { processed?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      showFlash(`Done — ${data.processed ?? 0} action(s) processed`);
      await load();
    } catch (e) {
      showFlash((e as Error).message);
    } finally {
      setRunning(false);
    }
  };;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, c, s, a] = await Promise.all([
        getTemplates(), getCampaigns(), getScheduled(), getAutomations(),
      ]);
      setTemplates(t as MessageTemplate[]);
      setCampaigns(c as Campaign[]);
      setScheduled(s as ScheduledOutreach[]);
      setAutomations(a as AutomationRule[]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSendCampaign = async (id: string) => {
    if (!confirm('Send this campaign to all matching leads now?')) return;
    setSending(id);
    try {
      const r = await sendCampaign(id) as { sent?: number; failed?: number; total?: number };
      showFlash(`Sent to ${r.sent ?? 0} leads (${r.failed ?? 0} failed)`);
      await load();
    } catch (e) {
      showFlash(`Send failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally { setSending(null); }
  };

  const TABS: { id: Section; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'templates',   label: 'Templates',   icon: <Mail size={14} />,      count: templates.length },
    { id: 'campaigns',   label: 'Campaigns',   icon: <Send size={14} />,      count: campaigns.length },
    { id: 'scheduled',   label: 'Scheduled',   icon: <Clock size={14} />,     count: scheduled.length },
    { id: 'automations', label: 'Automations', icon: <Zap size={14} />,       count: automations.filter((a) => a.enabled).length },
  ];

  return (
    <div className="space-y-4">
      {/* Flash */}
      {flash && (
        <div className="bg-slate-800 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> {flash}
        </div>
      )}

      {/* Section tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSection(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              section === t.id
                ? 'bg-white shadow-sm text-slate-800 border border-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            {t.count > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${section === t.id ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && <div className="text-center text-sm text-slate-400 py-8">Loading…</div>}

      {/* ── Templates ──────────────────────────────────────────────────────── */}
      {!loading && section === 'templates' && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-bold text-slate-700">Message Templates</p>
            <button onClick={() => { setEditTmpl(null); setModal('template'); }} className="btn-primary flex items-center gap-1.5 text-xs">
              <Plus size={13} /> New Template
            </button>
          </div>
          {templates.length === 0 ? (
            <Empty icon="✉️" title="No templates yet" desc="Create reusable message templates for email, SMS, and WhatsApp campaigns." />
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-slate-800">{t.name}</span>
                      <ChannelPill channel={t.channel} />
                    </div>
                    {t.subject && <p className="text-xs text-slate-500 mb-1">Subject: {t.subject}</p>}
                    <p className="text-xs text-slate-400 line-clamp-2">{t.body}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => { setEditTmpl(t); setModal('template'); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={async () => { await deleteTemplate(t.id); await load(); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Campaigns ──────────────────────────────────────────────────────── */}
      {!loading && section === 'campaigns' && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-bold text-slate-700">Campaigns</p>
            <button onClick={() => setModal('campaign')} className="btn-primary flex items-center gap-1.5 text-xs">
              <Plus size={13} /> New Campaign
            </button>
          </div>
          {campaigns.length === 0 ? (
            <Empty icon="🚀" title="No campaigns yet" desc="Create a campaign to send a template to a filtered list of leads in one click." />
          ) : (
            <div className="space-y-2">
              {campaigns.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-sm text-slate-800">{c.name}</span>
                        <ChannelPill channel={c.channel} />
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[c.status]}`}>
                          {c.status}
                        </span>
                      </div>
                      {c.template_name && (
                        <p className="text-xs text-slate-400">Template: {c.template_name}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span>📤 {c.sent_count} sent</span>
                        <span>👁 {c.open_count} opens</span>
                        <span>🖱 {c.click_count} clicks</span>
                        {c.sent_count > 0 && (
                          <span className="text-emerald-600 font-semibold">
                            {Math.round((c.open_count / c.sent_count) * 100)}% open rate
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {c.status !== 'sent' && (
                        <button
                          onClick={() => handleSendCampaign(c.id)}
                          disabled={!!sending}
                          className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-all"
                        >
                          {sending === c.id
                            ? <><RefreshCw size={11} className="animate-spin" /> Sending…</>
                            : <><Play size={11} /> Send Now</>
                          }
                        </button>
                      )}
                      <button
                        onClick={async () => { if (confirm('Delete campaign?')) { await deleteCampaign(c.id); await load(); } }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Scheduled ──────────────────────────────────────────────────────── */}
      {!loading && section === 'scheduled' && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-bold text-slate-700">Scheduled Follow-ups</p>
            <button onClick={() => setModal('schedule')} className="btn-primary flex items-center gap-1.5 text-xs">
              <Plus size={13} /> Schedule Follow-up
            </button>
          </div>
          {scheduled.length === 0 ? (
            <Empty icon="⏰" title="No follow-ups scheduled" desc="Schedule a message for a specific lead to send at a future time." />
          ) : (
            <div className="space-y-2">
              {scheduled.map((s) => (
                <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-slate-800">{s.lead_name ?? 'Lead'}</span>
                      <ChannelPill channel={s.channel} />
                    </div>
                    {s.subject && <p className="text-xs text-slate-500 mb-1">{s.subject}</p>}
                    <p className="text-xs text-slate-400 line-clamp-1">{s.message}</p>
                    <p className="text-[10px] text-amber-600 font-semibold mt-1.5">
                      ⏱ {new Date(s.scheduled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={async () => { await cancelScheduled(s.id); await load(); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Automations ────────────────────────────────────────────────────── */}
      {!loading && section === 'automations' && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm font-bold text-slate-700">Automation Rules</p>
            <div className="flex items-center gap-2">
              <button
                onClick={runAutomations}
                disabled={running}
                className="btn-ghost flex items-center gap-1.5 text-xs"
                title="Process automation rules now"
              >
                <RefreshCw size={13} className={running ? 'animate-spin' : ''} />
                {running ? 'Running…' : 'Run Now'}
              </button>
              <button onClick={() => setModal('automation')} className="btn-primary flex items-center gap-1.5 text-xs">
                <Plus size={13} /> New Rule
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-3">Rules run manually. Each lead is only triggered once per rule per day.</p>
          {automations.length === 0 ? (
            <Empty icon="⚡" title="No automations yet" desc="Create rules that automatically send messages when leads match a trigger condition." />
          ) : (
            <div className="space-y-2">
              {automations.map((a) => (
                <div key={a.id} className={`bg-white rounded-2xl border p-4 flex items-start gap-4 ${a.enabled ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-sm text-slate-800">{a.name}</span>
                      <ChannelPill channel={a.channel} />
                      {!a.enabled && <span className="text-[10px] text-slate-400 font-semibold">PAUSED</span>}
                    </div>
                    <p className="text-xs text-slate-500">
                      {a.trigger_type === 'days_since_created'  && `${a.trigger_value} days after lead created`}
                      {a.trigger_type === 'days_since_contact'  && `${a.trigger_value} days since last contact`}
                      {a.trigger_type === 'status_is'           && `When lead status = "${a.trigger_value}"`}
                      {' → '}
                      {a.template_name ?? 'No template'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={async () => { await updateAutomation(a.id, { enabled: !a.enabled }); await load(); }}
                      className="text-slate-400 hover:text-slate-700 transition-colors"
                      title={a.enabled ? 'Pause rule' : 'Enable rule'}
                    >
                      {a.enabled
                        ? <ToggleRight size={20} className="text-emerald-500" />
                        : <ToggleLeft size={20} />
                      }
                    </button>
                    <button
                      onClick={async () => { if (confirm('Delete rule?')) { await deleteAutomation(a.id); await load(); } }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {modal === 'template' && (
        <TemplateModal
          initial={editTmpl}
          onSave={async (data) => {
            if (editTmpl) await updateTemplate(editTmpl.id, data);
            else await createTemplate(data);
            await load();
          }}
          onClose={() => { setModal(null); setEditTmpl(null); }}
        />
      )}
      {modal === 'campaign' && (
        <CampaignModal
          templates={templates}
          onSave={async (data) => { await createCampaign(data); await load(); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'schedule' && (
        <ScheduleModal
          templates={templates}
          leads={leads}
          onSave={async (data) => { await createScheduled(data); await load(); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'automation' && (
        <AutomationModal
          templates={templates}
          onSave={async (data) => { await createAutomation(data); await load(); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ── Shared empty state ────────────────────────────────────────────────────────
function Empty({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="font-semibold text-slate-700 mb-1">{title}</p>
      <p className="text-xs text-slate-400 max-w-xs mx-auto">{desc}</p>
    </div>
  );
}
