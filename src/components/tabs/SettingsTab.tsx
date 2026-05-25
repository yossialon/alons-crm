'use client';
import { useEffect, useState, useCallback } from 'react';
import { getSubscription, createCheckout, createPortal } from '@/lib/api';
import {
  Copy, Check, ChevronDown, ChevronUp,
  Bot, Zap, Activity, Play, RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock,
  CreditCard, ShieldAlert,
} from 'lucide-react';

type Usage = {
  leads: number; campaigns: number; automations: number;
  social_connections: number; team_members: number;
};
type Limits = Usage;
type Plan = { id: string; price_monthly: number };
type SubData = {
  plan: Plan; status: string; trial_ends_at: string | null;
  usage: Usage; limits: Limits;
};

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit === Infinity || limit === -1 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const unlimited = limit === Infinity || limit === -1 || limit >= 999999;
  const color = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-brand-600';

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600 dark:text-slate-400">{label}</span>
        <span className="font-medium text-slate-800 dark:text-slate-200">
          {used} / {unlimited ? '∞' : limit}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

const PLAN_FEATURES: Record<string, string[]> = {
  free: ['50 leads', '2 campaigns', '1 automation', 'No social connections', '1 team member'],
  pro:  ['2,000 leads', '20 campaigns', '10 automations', '3 social connections', '5 team members'],
  enterprise: ['Unlimited leads', 'Unlimited campaigns', 'Unlimited automations', '10+ social connections', 'Unlimited team members'],
};

// ── Billing Status Banner ─────────────────────────────────────────────────

type BillingStatus = string | undefined;

function BillingStatusBanner({ status, trialEndsAt, onManageBilling, busy }: {
  status:          BillingStatus;
  trialEndsAt:     string | null | undefined;
  onManageBilling: () => void;
  busy:            boolean;
}) {
  if (!status) return null;

  // Trial: only show when ≤ 3 days left
  if (status === 'trialing') {
    const ms   = trialEndsAt ? new Date(trialEndsAt).getTime() - Date.now() : -1;
    const days = Math.ceil(ms / 86400000);
    if (days > 3) return null;
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-4">
        <Clock size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex-1 text-sm">
          <p className="font-semibold text-amber-800 dark:text-amber-300">
            {days <= 0 ? 'Your trial has expired' : `${days} day${days === 1 ? '' : 's'} left in your trial`}
          </p>
          <p className="text-amber-700 dark:text-amber-400 mt-0.5 text-xs">
            Upgrade now to keep access to all features.
          </p>
        </div>
      </div>
    );
  }

  // Active — no banner needed
  if (status === 'active') return null;

  const config: Record<string, { icon: React.ReactNode; title: string; body: string; color: string; borderColor: string; cta: string }> = {
    past_due: {
      icon:        <CreditCard size={16} className="mt-0.5 shrink-0 text-red-600" />,
      title:       'Payment past due',
      body:        'Your last payment failed. Update your billing details to avoid service interruption.',
      color:       'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-700',
      cta:         'Fix Payment',
    },
    incomplete: {
      icon:        <ShieldAlert size={16} className="mt-0.5 shrink-0 text-orange-600" />,
      title:       'Payment incomplete',
      body:        'Your subscription requires a payment action. Click below to complete it.',
      color:       'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-700',
      cta:         'Complete Payment',
    },
    unpaid: {
      icon:        <ShieldAlert size={16} className="mt-0.5 shrink-0 text-red-600" />,
      title:       'Subscription unpaid',
      body:        'Your subscription is unpaid. Update your payment method to restore access.',
      color:       'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-700',
      cta:         'Update Payment',
    },
    cancelled: {
      icon:        <XCircle size={16} className="mt-0.5 shrink-0 text-slate-500" />,
      title:       'Subscription cancelled',
      body:        'Your subscription has ended. Resubscribe below to restore full access.',
      color:       'bg-slate-50 dark:bg-slate-800/60',
      borderColor: 'border-slate-200 dark:border-slate-700',
      cta:         'Resubscribe',
    },
  };

  const c = config[status];
  if (!c) return null;

  return (
    <div className={`flex items-start gap-3 rounded-xl border ${c.borderColor} ${c.color} p-4`}>
      {c.icon}
      <div className="flex-1 text-sm">
        <p className="font-semibold text-slate-800 dark:text-slate-100">{c.title}</p>
        <p className="text-slate-600 dark:text-slate-400 mt-0.5 text-xs">{c.body}</p>
      </div>
      <button
        onClick={onManageBilling}
        disabled={busy}
        className="shrink-0 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-colors"
      >
        {busy ? 'Loading…' : c.cta}
      </button>
    </div>
  );
}

// ── Meta & Social Section ──────────────────────────────────────────────────

type MetaSettings = {
  whatsapp_auto_reply?: string;
  instagram_auto_reply?: string;
};

type AdLeadRow = {
  id: string;
  created_at: string;
  campaign_name?: string;
};

function MetaSocialSection() {
  const [settings, setSettings] = useState<MetaSettings>({});
  const [adLeads, setAdLeads]   = useState<AdLeadRow[]>([]);
  const [copied, setCopied]     = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const [saving, setSaving]     = useState<string | null>(null);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/meta/leads`
    : 'https://your-domain.com/api/webhooks/meta/leads';

  const loadData = useCallback(async () => {
    const [sRes, aRes] = await Promise.all([
      fetch('/api/settings'),
      fetch('/api/social/ad-leads'),
    ]);
    if (sRes.ok) setSettings(await sRes.json() as MetaSettings);
    if (aRes.ok) setAdLeads(await aRes.json() as AdLeadRow[]);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggle = async (key: string, current: string) => {
    const next = current === 'false' ? 'true' : 'false';
    setSaving(key);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: next }),
    });
    setSettings(prev => ({ ...prev, [key]: next }));
    setSaving(null);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const thisMonth = new Date();
  thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
  const monthCount = adLeads.filter(a => new Date(a.created_at) >= thisMonth).length;
  const lastLead   = adLeads[0];

  const guideSteps = [
    'Go to developers.facebook.com → Create App → Business type',
    `Add webhook URL shown below and set Verify Token to your META_WEBHOOK_VERIFY_TOKEN value`,
    'Subscribe to "leadgen" (Lead Ads) and "messages" (WhatsApp/Instagram)',
    'Paste META_PAGE_ACCESS_TOKEN, META_APP_SECRET, META_WEBHOOK_VERIFY_TOKEN in .env.local',
    'In Meta Ads Manager → Create campaign → Lead Generation objective → Create form',
  ];

  const waEnabled  = (settings.whatsapp_auto_reply  ?? 'true') !== 'false';
  const igEnabled  = (settings.instagram_auto_reply ?? 'true') !== 'false';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Meta &amp; Social</p>
        <h3 className="font-bold text-slate-800 dark:text-slate-200">Facebook, Instagram &amp; WhatsApp</h3>
      </div>

      {/* Auto-reply toggles */}
      <div className="space-y-3">
        {[
          { key: 'whatsapp_auto_reply',  label: 'WhatsApp Auto-Reply',  enabled: waEnabled },
          { key: 'instagram_auto_reply', label: 'Instagram Auto-Reply', enabled: igEnabled },
        ].map(({ key, label, enabled }) => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
              <p className="text-xs text-slate-400">AI-generated replies sent automatically</p>
            </div>
            <button
              onClick={() => toggle(key, enabled ? 'true' : 'false')}
              disabled={saving === key}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-brand-700' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        ))}
      </div>

      {/* Facebook Lead Ads status */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Facebook Lead Ads</p>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${adLeads.length > 0 ? 'bg-green-500' : 'bg-slate-300'}`} />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {adLeads.length > 0 ? 'Connected — receiving leads' : 'Not yet connected'}
          </span>
        </div>
        {adLeads.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
            <span>This month: <strong className="text-slate-700">{monthCount}</strong></span>
            {lastLead && <span>Last lead: <strong className="text-slate-700">{new Date(lastLead.created_at).toLocaleDateString()}</strong></span>}
          </div>
        )}
      </div>

      {/* Webhook URL */}
      <div>
        <p className="text-xs font-medium text-slate-500 mb-1.5">Lead Ads Webhook URL</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 text-slate-600 dark:text-slate-300 truncate">
            {webhookUrl}
          </code>
          <button
            onClick={copyUrl}
            className="shrink-0 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            title="Copy URL"
          >
            {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} className="text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Setup Guide */}
      <div>
        <button
          onClick={() => setGuideOpen(o => !o)}
          className="flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-600 transition-colors"
        >
          {guideOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {guideOpen ? 'Hide' : 'Show'} Setup Guide
        </button>
        {guideOpen && (
          <div className="mt-3 space-y-3 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">5-Step Meta Setup</p>
            {guideSteps.map((step, i) => (
              <label key={i} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!checkedSteps[i]}
                  onChange={() => setCheckedSteps(prev => ({ ...prev, [i]: !prev[i] }))}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-700"
                />
                <span className={`text-xs leading-relaxed ${checkedSteps[i] ? 'line-through text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                  <strong>Step {i + 1}:</strong> {step}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Agents Section ────────────────────────────────────────────────────────────

type AgentRun = {
  id: string;
  agent_name: string;
  status: 'running' | 'success' | 'error' | 'partial';
  started_at: string;
  finished_at?: string;
  duration_ms?: number;
  summary?: string;
  leads_found: number;
  leads_imported: number;
  errors: string[];
  trigger: string;
};

const AGENTS = [
  {
    id:    'lead-hunter',
    name:  'Lead Hunter',
    icon:  '🎯',
    desc:  'Finds new leads daily from 4 sources: FL permits, competitor reviews, Google Places, web search',
    schedule: 'Daily at 7 AM',
    endpoint: '/api/agents/lead-hunter',
  },
  {
    id:    'ad-machine',
    name:  'Ad Machine',
    icon:  '📣',
    desc:  'Auto-posts job completions to Instagram & Google. Weekly campaign performance analysis.',
    schedule: 'Weekly review on Mondays',
    endpoint: '/api/agents/ad-machine/weekly-review',
  },
  {
    id:    'tech-manager',
    name:  'Tech Manager',
    icon:  '🔧',
    desc:  '9 health checks every 10 minutes. Weekly optimization report with Claude AI.',
    schedule: 'Every 10 min (health) + Weekly (optimize)',
    endpoint: '/api/agents/tech-manager/health',
  },
  {
    id:    'boss',
    name:  'Boss Agent',
    icon:  '🧠',
    desc:  'Sends daily Hebrew briefing to owner via WhatsApp. Orchestrates all other agents.',
    schedule: 'Daily at 7:30 AM (after others)',
    endpoint: '/api/agents/boss',
  },
];

function AgentsSection() {
  const [runs, setRuns]       = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [toast, setToast]     = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/runs?limit=20');
      if (res.ok) setRuns(await res.json() as AgentRun[]);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const runAgent = async (agent: typeof AGENTS[0]) => {
    setRunning(agent.id);
    try {
      const res = await fetch(agent.endpoint, { method: 'GET' });
      const data = await res.json() as { ok?: boolean; error?: string; imported?: number; found?: number };
      if (data.ok) {
        showToast(`✅ ${agent.name} completed! ${data.imported != null ? `Imported: ${data.imported}` : ''}`);
      } else {
        showToast(`❌ ${agent.name} failed: ${data.error ?? 'unknown error'}`);
      }
      await loadRuns();
    } catch (err) {
      showToast(`❌ Network error: ${String(err)}`);
    }
    setRunning(null);
  };

  const getLastRun = (agentId: string) => runs.find((r) => r.agent_name === agentId);

  const StatusIcon = ({ status }: { status: AgentRun['status'] }) => {
    if (status === 'success') return <CheckCircle size={13} className="text-green-500" />;
    if (status === 'error')   return <XCircle size={13} className="text-red-500" />;
    if (status === 'partial') return <AlertTriangle size={13} className="text-amber-500" />;
    return <Clock size={13} className="text-blue-500 animate-pulse" />;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed top-20 right-4 z-50 px-4 py-3 rounded-xl bg-slate-900 text-white text-sm shadow-2xl animate-in fade-in">
          {toast}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-brand-700 flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">AI Agents</p>
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Autonomous Business Agents</h3>
          </div>
          <button
            onClick={loadRuns}
            className="ml-auto p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {AGENTS.map((agent) => {
              const last = getLastRun(agent.id);
              return (
                <div key={agent.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">{agent.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{agent.name}</span>
                        {last && (
                          <span className="flex items-center gap-1 text-[10px] text-slate-500">
                            <StatusIcon status={last.status} />
                            {last.status} · {formatTime(last.started_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{agent.desc}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          <Clock size={9} className="inline mr-1" />{agent.schedule}
                        </span>
                        {last?.leads_imported != null && last.leads_imported > 0 && (
                          <span className="text-[10px] text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                            {last.leads_imported} leads imported
                          </span>
                        )}
                      </div>
                      {last?.summary && (
                        <p className="text-[10px] text-slate-400 mt-1 truncate">{last.summary}</p>
                      )}
                    </div>
                    <button
                      onClick={() => runAgent(agent)}
                      disabled={running === agent.id}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-700/10 text-brand-700 dark:text-amber-500 text-xs font-semibold hover:bg-brand-700/20 disabled:opacity-50 transition-colors"
                    >
                      {running === agent.id
                        ? <><RefreshCw size={11} className="animate-spin" /> Running…</>
                        : <><Play size={11} /> Run Now</>
                      }
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Run Log */}
      {runs.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3 text-sm">Recent Run Log</h3>
          <div className="space-y-2">
            {runs.slice(0, 8).map((run) => (
              <div key={run.id} className="flex items-center gap-3 text-xs">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  run.status === 'success' ? 'bg-green-500' :
                  run.status === 'error' ? 'bg-red-500' :
                  run.status === 'partial' ? 'bg-amber-500' : 'bg-blue-500'
                }`} />
                <span className="font-medium text-slate-700 dark:text-slate-300 w-24 shrink-0">{run.agent_name}</span>
                <span className="text-slate-400 shrink-0">{formatTime(run.started_at)}</span>
                <span className="text-slate-500 truncate">{run.summary ?? run.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── System Health Section ─────────────────────────────────────────────────────

type HealthCheck = {
  name: string;
  status: 'ok' | 'warn' | 'error';
  value_ms?: number;
  details?: string;
};

const CHECK_LABELS: Record<string, string> = {
  db_latency:      'Database',
  lead_api:        'Leads API',
  claude_api:      'Claude AI',
  whatsapp_api:    'WhatsApp',
  instagram_api:   'Instagram',
  storage:         'File Storage',
  agent_table:     'Agent Logs',
  social_messages: 'Social Messages',
  config:          'Configuration',
};

function SystemSection() {
  const [checks, setChecks]   = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const loadChecks = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/system-health');
      if (res.ok) setChecks(await res.json() as HealthCheck[]);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadChecks(); }, [loadChecks]);

  const runCheck = async () => {
    setRunning(true);
    try {
      await fetch('/api/agents/tech-manager/health');
      await loadChecks();
    } catch {}
    setRunning(false);
  };

  const statusColor = (s: string) =>
    s === 'ok' ? 'text-green-500' : s === 'warn' ? 'text-amber-500' : 'text-red-500';
  const statusBg = (s: string) =>
    s === 'ok' ? 'bg-green-500' : s === 'warn' ? 'bg-amber-500' : 'bg-red-500';
  const StatusDot = ({ status }: { status: string }) => (
    <div className={`w-2 h-2 rounded-full shrink-0 ${statusBg(status)}`} />
  );

  const ok    = checks.filter((c) => c.status === 'ok').length;
  const warns = checks.filter((c) => c.status === 'warn').length;
  const errs  = checks.filter((c) => c.status === 'error').length;

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
            <Activity size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">System</p>
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Health Dashboard</h3>
          </div>
          <button
            onClick={runCheck}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={11} className={running ? 'animate-spin' : ''} />
            {running ? 'Checking…' : 'Run Check'}
          </button>
        </div>

        {/* Summary bar */}
        {checks.length > 0 && (
          <div className="flex items-center gap-4 mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400">{ok} healthy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400">{warns} warnings</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400">{errs} errors</span>
            </div>
            <div className="ml-auto">
              {errs === 0 && warns === 0 ? (
                <span className="text-xs font-semibold text-green-600">All systems nominal ✓</span>
              ) : errs > 0 ? (
                <span className="text-xs font-semibold text-red-600">Issues detected</span>
              ) : (
                <span className="text-xs font-semibold text-amber-600">Warnings present</span>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
          </div>
        ) : checks.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            <Activity size={32} className="mx-auto mb-2 opacity-30" />
            No health data yet. Click &quot;Run Check&quot; to start.
          </div>
        ) : (
          <div className="space-y-2">
            {checks.map((check) => (
              <div key={check.name} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <StatusDot status={check.status} />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">
                  {CHECK_LABELS[check.name] ?? check.name}
                </span>
                {check.value_ms != null && (
                  <span className={`text-xs font-mono ${
                    check.value_ms > 3000 ? 'text-red-500' :
                    check.value_ms > 1000 ? 'text-amber-500' : 'text-slate-400'
                  }`}>
                    {check.value_ms}ms
                  </span>
                )}
                <span className={`text-xs font-semibold uppercase ${statusColor(check.status)}`}>
                  {check.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Response time chart (CSS bars) */}
        {checks.filter(c => c.value_ms).length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Response Times</p>
            <div className="space-y-2">
              {checks
                .filter((c) => c.value_ms != null)
                .sort((a, b) => (b.value_ms ?? 0) - (a.value_ms ?? 0))
                .map((check) => {
                  const maxMs = 5000;
                  const pct   = Math.min(100, Math.round(((check.value_ms ?? 0) / maxMs) * 100));
                  const color = (check.value_ms ?? 0) > 3000 ? 'bg-red-500'
                              : (check.value_ms ?? 0) > 1000 ? 'bg-amber-500' : 'bg-green-500';
                  return (
                    <div key={check.name}>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                        <span>{CHECK_LABELS[check.name] ?? check.name}</span>
                        <span>{check.value_ms}ms</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Tech Recommendations */}
      <TechRecommendationsSection />
    </div>
  );
}

type TechRec = {
  id: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
};

function TechRecommendationsSection() {
  const [recs, setRecs]       = useState<TechRec[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agents/system-health')
      .then(() => {}) // just warm up; load recs separately
      .catch(() => {});

    // Load tech recommendations from Supabase via a simple fetch
    // We'd need an endpoint for this — for now show a placeholder
    setLoading(false);
  }, []);

  if (loading) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Zap size={16} className="text-amber-500" />
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">AI Recommendations</h3>
      </div>
      {recs.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">
          Run the Tech Manager optimization report to generate AI-powered recommendations.
        </p>
      ) : (
        <div className="space-y-3">
          {recs.map((rec) => (
            <div key={rec.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  rec.priority === 'critical' ? 'bg-red-100 text-red-700' :
                  rec.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                  rec.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-600'
                }`}>{rec.priority}</span>
                <span className="text-xs text-slate-500">{rec.category}</span>
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{rec.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{rec.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main SettingsTab ───────────────────────────────────────────────────────

type SettingsSubTab = 'general' | 'agents' | 'system';

export default function SettingsTab() {
  const [subTab, setSubTab]   = useState<SettingsSubTab>('general');
  const [data, setData]       = useState<SubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState('');

  useEffect(() => {
    getSubscription()
      .then((d) => setData(d as SubData))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const upgrade = async (plan: string, interval = 'monthly') => {
    setBusy(`${plan}_${interval}`);
    try {
      const { url } = await createCheckout(plan, interval);
      if (url) window.location.href = url;
    } catch { /* noop */ } finally { setBusy(''); }
  };

  const portal = async () => {
    setBusy('portal');
    try {
      const { url } = await createPortal();
      if (url) window.location.href = url;
    } catch { /* noop */ } finally { setBusy(''); }
  };

  const SUB_TABS: { id: SettingsSubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'general', label: 'General',  icon: <Check size={14} /> },
    { id: 'agents',  label: 'Agents',   icon: <Bot size={14} /> },
    { id: 'system',  label: 'System',   icon: <Activity size={14} /> },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      {/* Sub-tab bar */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              subTab === t.id
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* General tab */}
      {subTab === 'general' && (
        <div className="space-y-6">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
            </div>
          ) : (
            <>
              {/* Billing status banner — trial expiring, past due, incomplete, etc. */}
              <BillingStatusBanner
                status={data?.status}
                trialEndsAt={data?.trial_ends_at}
                onManageBilling={portal}
                busy={busy === 'portal'}
              />

              {/* Current Plan */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Current Plan</p>
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 capitalize">
                      {data?.plan?.id ?? 'free'}
                      {data?.status === 'trialing' && (
                        <span className="ml-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                          · {Math.max(0, Math.ceil(((data?.trial_ends_at ? new Date(data.trial_ends_at).getTime() : 0) - Date.now()) / 86400000))}d trial left
                        </span>
                      )}
                      {data?.status === 'past_due' && (
                        <span className="ml-2 text-sm font-semibold text-red-600 dark:text-red-400">· Payment due</span>
                      )}
                    </h2>
                    {data?.plan?.price_monthly != null && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {data.plan.price_monthly === 0 ? 'Free forever' : `$${data.plan.price_monthly}/mo`}
                      </p>
                    )}
                  </div>
                  {(data?.plan?.id === 'pro' || data?.plan?.id === 'enterprise' || data?.status === 'past_due') ? (
                    <button onClick={portal} disabled={busy === 'portal'} className="btn-ghost text-sm">
                      {busy === 'portal' ? 'Loading…' : 'Manage Billing'}
                    </button>
                  ) : (
                    <button onClick={() => upgrade('pro')} disabled={busy.startsWith('pro')}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-700 to-amber-600 text-white text-sm font-bold shadow hover:opacity-90 disabled:opacity-50">
                      {busy.startsWith('pro') ? 'Loading…' : 'Upgrade to Pro'}
                    </button>
                  )}
                </div>
                <ul className="mt-4 space-y-1.5">
                  {(PLAN_FEATURES[data?.plan?.id ?? 'free'] ?? PLAN_FEATURES.free).map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <span className="text-green-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Usage */}
              {data && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4">Usage</h3>
                  <div className="space-y-4">
                    <UsageBar label="Leads"              used={data.usage.leads}              limit={data.limits.leads} />
                    <UsageBar label="Campaigns"          used={data.usage.campaigns}          limit={data.limits.campaigns} />
                    <UsageBar label="Automations"        used={data.usage.automations}        limit={data.limits.automations} />
                    <UsageBar label="Social Connections" used={data.usage.social_connections} limit={data.limits.social_connections} />
                    <UsageBar label="Team Members"       used={data.usage.team_members}       limit={data.limits.team_members} />
                  </div>
                </div>
              )}

              {/* Upgrade CTA */}
              {!(data?.plan?.id === 'pro' || data?.plan?.id === 'enterprise') && (
                <div className="bg-gradient-to-br from-brand-700/10 to-amber-500/10 border border-brand-700/20 dark:border-brand-700/30 rounded-2xl p-5">
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-50 mb-1">Upgrade to Pro</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Unlock 2,000 leads, 20 campaigns, automations, and team collaboration.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => upgrade('pro', 'monthly')} disabled={!!busy}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-700 to-amber-600 text-white text-sm font-bold shadow disabled:opacity-50">
                      {busy === 'pro_monthly' ? 'Loading…' : '$49/mo'}
                    </button>
                    <button onClick={() => upgrade('pro', 'yearly')} disabled={!!busy}
                      className="px-5 py-2.5 rounded-xl border border-brand-700 text-brand-700 dark:text-amber-500 dark:border-amber-500 text-sm font-bold disabled:opacity-50">
                      {busy === 'pro_yearly' ? 'Loading…' : '$470/yr · Save 20%'}
                    </button>
                  </div>
                </div>
              )}

              {/* Enterprise CTA */}
              {data?.plan?.id !== 'enterprise' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Need Enterprise?</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Unlimited everything · Custom onboarding · Priority support</p>
                  </div>
                  <button onClick={() => upgrade('enterprise', 'monthly')} disabled={!!busy} className="btn-ghost text-sm">
                    {busy.startsWith('enterprise') ? 'Loading…' : '$149/mo →'}
                  </button>
                </div>
              )}

              {/* Meta & Social */}
              <MetaSocialSection />
            </>
          )}
        </div>
      )}

      {/* Agents tab */}
      {subTab === 'agents' && <AgentsSection />}

      {/* System tab */}
      {subTab === 'system' && <SystemSection />}
    </div>
  );
}
