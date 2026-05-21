'use client';
import { useState, useEffect } from 'react';
import { JobCompletion } from '@/types';
import { Camera, Instagram, Star, RefreshCw, TrendingUp, TrendingDown, MessageSquare, Megaphone, Minus } from 'lucide-react';

type AdLeadRow = {
  id: string;
  created_at: string;
  campaign_name?: string;
  ad_name?: string;
};

type SocialMessageRow = {
  id: string;
  platform: string;
  thread_id: string;
  direction: string;
  created_at: string;
};

type InstagramInteraction = {
  id: string;
  created_at: string;
  dm_sent: boolean;
};

export default function MarketingTab() {
  const [jobs, setJobs]               = useState<JobCompletion[]>([]);
  const [adLeads, setAdLeads]         = useState<AdLeadRow[]>([]);
  const [waMessages, setWaMessages]   = useState<SocialMessageRow[]>([]);
  const [igMessages, setIgMessages]   = useState<SocialMessageRow[]>([]);
  const [igInteractions, setIgInteractions] = useState<InstagramInteraction[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/job-completions').then(r => r.json()).catch(() => []),
      fetch('/api/social/ad-leads').then(r => r.json()).catch(() => []),
      fetch('/api/social/messages?platform=whatsapp').then(r => r.json()).catch(() => []),
      fetch('/api/social/messages?platform=instagram').then(r => r.json()).catch(() => []),
      fetch('/api/social/instagram-interactions').then(r => r.json()).catch(() => []),
    ]).then(([jobData, adData, waData, igData, igInt]) => {
      setJobs(Array.isArray(jobData) ? (jobData as JobCompletion[]) : []);
      setAdLeads(Array.isArray(adData) ? (adData as AdLeadRow[]) : []);
      setWaMessages(Array.isArray(waData) ? (waData as SocialMessageRow[]) : []);
      setIgMessages(Array.isArray(igData) ? (igData as SocialMessageRow[]) : []);
      setIgInteractions(Array.isArray(igInt) ? (igInt as InstagramInteraction[]) : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Date boundaries
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const inRange = (iso: string, from: Date, to: Date) => {
    const d = new Date(iso);
    return d >= from && d < to;
  };

  const monthJobs     = jobs.filter(j => inRange(j.completed_at, monthStart, now));
  const igPosts       = monthJobs.filter(j => j.instagram_post_url).length;
  const googlePosts   = monthJobs.filter(j => j.google_post_url).length;
  const reviewsSent   = monthJobs.filter(j => j.review_request_sent).length;

  // This month vs last month
  const monthAdLeads     = adLeads.filter(a => inRange(a.created_at, monthStart, now)).length;
  const lastMonthAdLeads = adLeads.filter(a => inRange(a.created_at, lastMonthStart, monthStart)).length;

  const monthIgComments  = igInteractions.filter(i => inRange(i.created_at, monthStart, now)).length;
  const monthIgDMsSent   = igInteractions.filter(i => inRange(i.created_at, monthStart, now) && i.dm_sent).length;

  const waThreadsThis = new Set(
    waMessages.filter(m => inRange(m.created_at, monthStart, now) && m.direction === 'inbound').map(m => m.thread_id)
  ).size;
  const waThreadsLast = new Set(
    waMessages.filter(m => inRange(m.created_at, lastMonthStart, monthStart) && m.direction === 'inbound').map(m => m.thread_id)
  ).size;

  // Top campaign
  const campaignCounts = adLeads.reduce<Record<string, number>>((acc, a) => {
    const name = a.campaign_name || 'Unknown Campaign';
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});
  const topCampaign = Object.entries(campaignCounts).sort((a, b) => b[1] - a[1])[0];

  const delta = (curr: number, prev: number) => {
    if (prev === 0 && curr === 0) return null;
    if (prev === 0) return { pct: 100, up: true };
    const pct = Math.round(((curr - prev) / prev) * 100);
    return { pct: Math.abs(pct), up: pct >= 0 };
  };

  const adDelta = delta(monthAdLeads, lastMonthAdLeads);
  const waDelta = delta(waThreadsThis, waThreadsLast);

  return (
    <div className="space-y-5">
      {/* Job content stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<Instagram size={18} />} label="Instagram" value={igPosts}     color="purple" />
        <StatCard icon={<TrendingUp size={18} />} label="Google"   value={googlePosts} color="blue"   />
        <StatCard icon={<Star size={18} />}       label="Reviews"  value={reviewsSent} color="amber"  />
      </div>

      {/* Meta Performance */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700">Meta Performance</h3>
          <span className="text-xs text-slate-400">This month</span>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Ad Leads with MoM delta */}
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-center">
            <div className="flex justify-center mb-1 text-blue-700"><Megaphone size={18} /></div>
            <div className="text-2xl font-bold text-blue-700">{monthAdLeads}</div>
            <div className="text-xs text-blue-600/70 mb-1">Ad Leads</div>
            {adDelta && (
              <div className={`flex items-center justify-center gap-0.5 text-[10px] font-semibold ${adDelta.up ? 'text-green-600' : 'text-red-500'}`}>
                {adDelta.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {adDelta.pct}% vs last mo
              </div>
            )}
            {!adDelta && <div className="text-[10px] text-slate-400 flex justify-center items-center gap-0.5"><Minus size={8} /> no data</div>}
          </div>

          {/* IG comments + DMs */}
          <div className="rounded-xl border border-purple-100 bg-purple-50 p-3 text-center">
            <div className="flex justify-center mb-1 text-purple-700"><Instagram size={18} /></div>
            <div className="text-2xl font-bold text-purple-700">{monthIgComments}</div>
            <div className="text-xs text-purple-600/70 mb-1">IG Comments</div>
            <div className="text-[10px] text-purple-500">{monthIgDMsSent} DMs sent</div>
          </div>

          {/* WhatsApp convos with MoM delta */}
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center">
            <div className="flex justify-center mb-1 text-amber-700"><MessageSquare size={18} /></div>
            <div className="text-2xl font-bold text-amber-700">{waThreadsThis}</div>
            <div className="text-xs text-amber-600/70 mb-1">WA Convos</div>
            {waDelta && (
              <div className={`flex items-center justify-center gap-0.5 text-[10px] font-semibold ${waDelta.up ? 'text-green-600' : 'text-red-500'}`}>
                {waDelta.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {waDelta.pct}% vs last mo
              </div>
            )}
            {!waDelta && <div className="text-[10px] text-slate-400 flex justify-center items-center gap-0.5"><Minus size={8} /> no data</div>}
          </div>
        </div>

        {/* Top campaign */}
        {topCampaign && (
          <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Top Campaign (All Time)</p>
              <p className="text-sm font-semibold text-slate-800 truncate max-w-[180px]">{topCampaign[0]}</p>
            </div>
            <span className="text-sm font-bold text-brand-700">{topCampaign[1]} lead{topCampaign[1] !== 1 ? 's' : ''}</span>
          </div>
        )}
        {!topCampaign && !loading && (
          <p className="text-xs text-slate-400 text-center py-2">No ad campaign data yet</p>
        )}

        {/* Last month comparison row */}
        {(lastMonthAdLeads > 0 || waThreadsLast > 0) && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex gap-4 text-xs text-slate-400">
            <span>Last month: <strong className="text-slate-600">{lastMonthAdLeads} ad leads</strong></span>
            <span><strong className="text-slate-600">{waThreadsLast} WA convos</strong></span>
          </div>
        )}
      </div>

      {/* Completed jobs feed */}
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Completed Jobs</h2>
      {loading && <div className="text-center text-slate-400 py-10">Loading…</div>}
      {!loading && jobs.length === 0 && (
        <div className="text-center text-slate-400 py-10">
          <Camera size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No completed jobs yet.</p>
          <p className="text-xs mt-1">Mark a job complete from the Leads or Pipeline tab.</p>
        </div>
      )}
      {jobs.map(job => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    blue:   'bg-blue-50 text-blue-700 border-blue-100',
    amber:  'bg-amber-50 text-amber-700 border-amber-100',
  };
  return (
    <div className={`rounded-xl border p-3 text-center ${colors[color]}`}>
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-70">{label}</div>
    </div>
  );
}

function JobCard({ job }: { job: JobCompletion }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {(job.before_photo_url || job.after_photo_url) && (
        <div className="grid grid-cols-2 gap-0.5 bg-slate-100">
          {job.before_photo_url && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={job.before_photo_url} alt="Before" className="w-full h-36 object-cover" />
              <span className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">Before</span>
            </div>
          )}
          {job.after_photo_url && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={job.after_photo_url} alt="After" className="w-full h-36 object-cover" />
              <span className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">After</span>
            </div>
          )}
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-slate-800">{job.customer_name || 'Job'}</p>
            <p className="text-xs text-slate-500">{job.job_type} · {job.area}</p>
          </div>
          <p className="text-xs text-slate-400">{new Date(job.completed_at).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge active={!!job.instagram_post_url} label="Instagram"  />
          <Badge active={!!job.google_post_url}    label="Google"     />
          <Badge active={job.nextdoor_copied}      label="Nextdoor"   />
          <Badge active={job.review_request_sent}  label="Review SMS" />
        </div>
      </div>
    </div>
  );
}

function Badge({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
      {active ? '✓' : '○'} {label}
    </span>
  );
}
