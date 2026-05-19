'use client';
import { useEffect, useState, useCallback } from 'react';
import { getSubscription, createCheckout, createPortal } from '@/lib/api';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

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

// ── Main SettingsTab ───────────────────────────────────────────────────────

export default function SettingsTab() {
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

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
      </div>
    );
  }

  const planId = data?.plan?.id ?? 'free';
  const trialEnd = data?.trial_ends_at ? new Date(data.trial_ends_at) : null;
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)) : 0;
  const isTrialing = data?.status === 'trialing';
  const isPro = planId === 'pro';
  const isEnterprise = planId === 'enterprise';
  const isPaid = isPro || isEnterprise;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      {/* Current Plan */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Current Plan</p>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-50 capitalize">
              {planId}
              {isTrialing && (
                <span className="ml-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                  · {daysLeft}d trial left
                </span>
              )}
            </h2>
            {data?.plan?.price_monthly != null && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {data.plan.price_monthly === 0 ? 'Free forever' : `$${data.plan.price_monthly}/mo`}
              </p>
            )}
          </div>

          {isPaid ? (
            <button
              onClick={portal}
              disabled={busy === 'portal'}
              className="btn-ghost text-sm"
            >
              {busy === 'portal' ? 'Loading…' : 'Manage Billing'}
            </button>
          ) : (
            <button
              onClick={() => upgrade('pro')}
              disabled={busy.startsWith('pro')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-700 to-amber-600 text-white text-sm font-bold shadow hover:opacity-90 disabled:opacity-50"
            >
              {busy.startsWith('pro') ? 'Loading…' : 'Upgrade to Pro'}
            </button>
          )}
        </div>

        {/* Features */}
        <ul className="mt-4 space-y-1.5">
          {(PLAN_FEATURES[planId] ?? PLAN_FEATURES.free).map((f) => (
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
      {!isPaid && (
        <div className="bg-gradient-to-br from-brand-700/10 to-amber-500/10 border border-brand-700/20 dark:border-brand-700/30 rounded-2xl p-5">
          <h3 className="font-extrabold text-slate-900 dark:text-slate-50 mb-1">Upgrade to Pro</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Unlock 2,000 leads, 20 campaigns, automations, and team collaboration.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => upgrade('pro', 'monthly')}
              disabled={!!busy}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-700 to-amber-600 text-white text-sm font-bold shadow disabled:opacity-50"
            >
              {busy === 'pro_monthly' ? 'Loading…' : '$49/mo'}
            </button>
            <button
              onClick={() => upgrade('pro', 'yearly')}
              disabled={!!busy}
              className="px-5 py-2.5 rounded-xl border border-brand-700 text-brand-700 dark:text-amber-500 dark:border-amber-500 text-sm font-bold disabled:opacity-50"
            >
              {busy === 'pro_yearly' ? 'Loading…' : '$470/yr · Save 20%'}
            </button>
          </div>
        </div>
      )}

      {/* Enterprise CTA */}
      {!isEnterprise && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200">Need Enterprise?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Unlimited everything · Custom onboarding · Priority support</p>
          </div>
          <button
            onClick={() => upgrade('enterprise', 'monthly')}
            disabled={!!busy}
            className="btn-ghost text-sm"
          >
            {busy.startsWith('enterprise') ? 'Loading…' : '$149/mo →'}
          </button>
        </div>
      )}

      {/* Meta & Social */}
      <MetaSocialSection />
    </div>
  );
}
