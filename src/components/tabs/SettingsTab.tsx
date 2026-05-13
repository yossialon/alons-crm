'use client';
import { useEffect, useState } from 'react';
import { getSubscription, createCheckout, createPortal } from '@/lib/api';

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
    </div>
  );
}
