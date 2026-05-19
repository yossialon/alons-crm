'use client';
import { useState, useEffect } from 'react';
import { JobCompletion } from '@/types';
import { Camera, Instagram, Star, RefreshCw, TrendingUp, MessageSquare, Megaphone } from 'lucide-react';

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
  created_at: string;
};

export default function MarketingTab() {
  const [jobs, setJobs]             = useState<JobCompletion[]>([]);
  const [adLeads, setAdLeads]       = useState<AdLeadRow[]>([]);
  const [waMessages, setWaMessages] = useState<SocialMessageRow[]>([]);
  const [igMessages, setIgMessages] = useState<SocialMessageRow[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/job-completions').then(r => r.json()).catch(() => []),
      fetch('/api/social/ad-leads').then(r => r.json()).catch(() => []),
      fetch('/api/social/messages?platform=whatsapp').then(r => r.json()).catch(() => []),
      fetch('/api/social/messages?platform=instagram').then(r => r.json()).catch(() => []),
    ]).then(([jobData, adData, waData, igData]) => {
      setJobs(Array.isArray(jobData) ? (jobData as JobCompletion[]) : []);
      setAdLeads(Array.isArray(adData) ? (adData as AdLeadRow[]) : []);
      setWaMessages(Array.isArray(waData) ? (waData as SocialMessageRow[]) : []);
      setIgMessages(Array.isArray(igData) ? (igData as SocialMessageRow[]) : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const monthJobs = jobs.filter(j => new Date(j.completed_at) >= thisMonth);
  const igPosts     = monthJobs.filter(j => j.instagram_post_url).length;
  const googlePosts = monthJobs.filter(j => j.google_post_url).length;
  const reviewsSent = monthJobs.filter(j => j.review_request_sent).length;

  // Meta performance stats
  const monthAdLeads = adLeads.filter(a => new Date(a.created_at) >= thisMonth).length;
  const monthIgInteractions = igMessages.filter(m => new Date(m.created_at) >= thisMonth).length;

  // WhatsApp unique threads started this month
  const waThreadsThisMonth = new Set(
    waMessages
      .filter(m => new Date(m.created_at) >= thisMonth)
      .map(m => m.thread_id)
  ).size;

  // Top campaign by ad lead count
  const campaignCounts = adLeads.reduce<Record<string, number>>((acc, a) => {
    const name = a.campaign_name || 'Unknown Campaign';
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});
  const topCampaign = Object.entries(campaignCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<Instagram size={18} />} label="Instagram" value={igPosts}     color="purple" />
        <StatCard icon={<TrendingUp size={18} />} label="Google"    value={googlePosts} color="blue"   />
        <StatCard icon={<Star size={18} />}       label="Reviews"   value={reviewsSent} color="amber"  />
      </div>

      {/* Meta Performance */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Meta Performance (This Month)</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <StatCard icon={<Megaphone size={18} />}    label="Ad Leads"   value={monthAdLeads}       color="blue"   />
          <StatCard icon={<Instagram size={18} />}    label="IG Msgs"    value={monthIgInteractions} color="purple" />
          <StatCard icon={<MessageSquare size={18} />} label="WA Convos" value={waThreadsThisMonth}  color="amber"  />
        </div>
        {topCampaign && (
          <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Top Campaign</p>
              <p className="text-sm font-semibold text-slate-800 truncate max-w-[180px]">{topCampaign[0]}</p>
            </div>
            <span className="text-sm font-bold text-brand-700">{topCampaign[1]} lead{topCampaign[1] !== 1 ? 's' : ''}</span>
          </div>
        )}
        {!topCampaign && !loading && (
          <p className="text-xs text-slate-400 text-center py-2">No ad campaign data yet</p>
        )}
      </div>

      {/* Jobs feed */}
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
        <JobCard key={job.id} job={job} onRepost={() => { /* TODO: open modal pre-filled */ }} />
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

function JobCard({ job, onRepost }: { job: JobCompletion; onRepost: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Before/after photos */}
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
        {/* Platform badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge active={!!job.instagram_post_url} label="Instagram"   />
          <Badge active={!!job.google_post_url}    label="Google"      />
          <Badge active={job.nextdoor_copied}      label="Nextdoor"    />
          <Badge active={job.review_request_sent}  label="Review SMS"  />
        </div>
        <button
          onClick={onRepost}
          className="flex items-center gap-1 text-xs text-brand-700 hover:text-brand-600 font-medium"
        >
          <RefreshCw size={12} /> Repost
        </button>
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
