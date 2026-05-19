'use client';
import { useEffect, useState, useRef } from 'react';
import { Lead, JobCompletion } from '@/types';
import {
  X, Upload, CheckCircle, XCircle, Loader2, Copy, ExternalLink,
  Instagram, Globe, MessageSquare,
} from 'lucide-react';

const JOB_TYPES = ['Kitchen Remodel', 'Cabinet Install', 'Vanity Install', 'Full Renovation', 'Other'];

type StepStatus = 'pending' | 'running' | 'done' | 'failed';

interface StepState {
  label: string;
  status: StepStatus;
  error?: string;
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'running') return <Loader2 size={16} className="animate-spin text-brand-700" />;
  if (status === 'done')    return <CheckCircle size={16} className="text-green-500" />;
  if (status === 'failed')  return <XCircle size={16} className="text-red-500" />;
  return <div className="w-4 h-4 rounded-full border-2 border-slate-300" />;
}

interface Props {
  lead?: Lead | null;
  project?: { id: string; name: string } | null;
  onClose: () => void;
  onComplete: (job: JobCompletion) => void;
}

export default function JobCompletionModal({ lead, project, onClose, onComplete }: Props) {
  const [visible, setVisible] = useState(false);

  // Form fields
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile]   = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string>('');
  const [afterPreview, setAfterPreview]   = useState<string>('');
  const [jobType, setJobType]         = useState('Kitchen Remodel');
  const [description, setDescription] = useState(lead?.notes ?? '');
  const [customerName, setCustomerName] = useState(lead?.name ?? '');
  const [customerPhone, setCustomerPhone] = useState(lead?.phone ?? '');
  const [area, setArea]               = useState(lead?.area ?? '');

  // Workflow state
  const [phase, setPhase] = useState<'form' | 'running' | 'captions' | 'done'>('form');
  const [steps, setSteps] = useState<StepState[]>([]);
  const [savedJob, setSavedJob]   = useState<JobCompletion | null>(null);
  const [igCaption, setIgCaption] = useState('');
  const [gmCaption, setGmCaption] = useState('');
  const [ndCaption, setNdCaption] = useState('');
  const [posting, setPosting]     = useState(false);

  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 200); };

  const setStep = (index: number, update: Partial<StepState>) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, ...update } : s));
  };

  const handleFileChange = (side: 'before' | 'after', file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (side === 'before') { setBeforeFile(file); setBeforePreview(url); }
    else                   { setAfterFile(file);  setAfterPreview(url);  }
  };

  const uploadFile = async (file: File, jobId: string, side: string): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('jobId', jobId);
    fd.append('side', side);
    const res = await fetch('/api/job-completions/upload', { method: 'POST', body: fd });
    const data = await res.json() as { url?: string; error?: string };
    if (!data.url) throw new Error(data.error ?? 'Upload failed');
    return data.url;
  };

  const handleLaunch = async () => {
    const tempId = crypto.randomUUID();
    const initialSteps: StepState[] = [
      { label: 'Upload before photo',    status: beforeFile ? 'pending' : 'done' },
      { label: 'Upload after photo',     status: afterFile  ? 'pending' : 'done' },
      { label: 'Save job record',        status: 'pending' },
      { label: 'Generate AI captions',   status: 'pending' },
    ];
    setSteps(initialSteps);
    setPhase('running');

    let beforeUrl = '';
    let afterUrl  = '';

    try {
      // Step 0: Upload before photo
      if (beforeFile) {
        setStep(0, { status: 'running' });
        beforeUrl = await uploadFile(beforeFile, tempId, 'before');
        setStep(0, { status: 'done' });
      }
    } catch (err) {
      setStep(0, { status: 'failed', error: String(err) });
      return;
    }

    try {
      // Step 1: Upload after photo
      if (afterFile) {
        setStep(1, { status: 'running' });
        afterUrl = await uploadFile(afterFile, tempId, 'after');
        setStep(1, { status: 'done' });
      }
    } catch (err) {
      setStep(1, { status: 'failed', error: String(err) });
      return;
    }

    let job: JobCompletion;
    try {
      // Step 2: Save job
      setStep(2, { status: 'running' });
      const saveRes = await fetch('/api/job-completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead?.id,
          project_id: project?.id,
          before_photo_url: beforeUrl,
          after_photo_url: afterUrl,
          job_type: jobType,
          description,
          customer_name: customerName,
          customer_phone: customerPhone,
          area,
        }),
      });
      const saveData = await saveRes.json() as JobCompletion & { error?: string };
      if (!saveRes.ok || saveData.error) throw new Error(saveData.error ?? 'Save failed');
      job = saveData;
      setSavedJob(job);
      setStep(2, { status: 'done' });
    } catch (err) {
      setStep(2, { status: 'failed', error: String(err) });
      return;
    }

    try {
      // Step 3: Generate captions
      setStep(3, { status: 'running' });
      const capRes = await fetch('/api/job-completions/captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_type: jobType, description, area, customer_name: customerName }),
      });
      const caps = await capRes.json() as { instagram?: string; google?: string; nextdoor?: string; error?: string };
      if (!capRes.ok || caps.error) throw new Error(caps.error ?? 'Caption generation failed');
      setIgCaption(caps.instagram ?? '');
      setGmCaption(caps.google ?? '');
      setNdCaption(caps.nextdoor ?? '');
      setStep(3, { status: 'done' });
    } catch (err) {
      setStep(3, { status: 'failed', error: String(err) });
      return;
    }

    setPhase('captions');
  };

  const handlePostEverything = async () => {
    if (!savedJob) return;
    setPosting(true);

    const updates: Record<string, unknown> = {};

    await Promise.allSettled([
      // Instagram
      fetch('/api/social/instagram-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: igCaption, imageUrl: savedJob.after_photo_url }),
      }).then(r => r.json()).then((d: { postUrl?: string }) => {
        if (d.postUrl) updates.instagram_post_url = d.postUrl;
      }).catch(() => {}),

      // Google Business
      fetch('/api/social/google-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: gmCaption, imageUrl: savedJob.after_photo_url }),
      }).then(r => r.json()).then((d: { postUrl?: string }) => {
        if (d.postUrl) updates.google_post_url = d.postUrl;
      }).catch(() => {}),

      // Review request SMS
      fetch('/api/job-completions/review-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_completion_id: savedJob.id,
          lead_id: savedJob.lead_id,
          customer_name: customerName,
          phone: customerPhone,
          job_type: jobType,
          area,
        }),
      }).catch(() => {}),

      // Nextdoor — copy to clipboard + open site
      navigator.clipboard.writeText(ndCaption).catch(() => {}),
    ]);

    // Open Nextdoor
    window.open('https://nextdoor.com', '_blank');
    updates.nextdoor_copied = true;

    // Patch job record with post URLs
    if (Object.keys(updates).length > 0) {
      await fetch(`/api/job-completions/${savedJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).catch(() => {});
    }

    setPosting(false);
    setPhase('done');
    onComplete({ ...savedJob, ...updates } as JobCompletion);
  };

  const copy = (text: string) => navigator.clipboard.writeText(text).catch(() => {});

  const inputCls = 'w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700/50 transition-all';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center transition-all duration-200 ${visible ? 'bg-slate-900/60' : 'bg-slate-900/0'}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className={`bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[95vh] transition-all duration-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">Complete Job</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {lead ? lead.name : project ? project.name : 'New job'}
            </p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── FORM PHASE ── */}
          {phase === 'form' && (
            <>
              {/* Before / After photos */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Job Photos</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['before', 'after'] as const).map((side) => {
                    const preview = side === 'before' ? beforePreview : afterPreview;
                    const inputRef = side === 'before' ? beforeInputRef : afterInputRef;
                    return (
                      <div key={side}>
                        <input
                          ref={inputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(side, e.target.files?.[0] ?? null)}
                        />
                        <button
                          type="button"
                          onClick={() => inputRef.current?.click()}
                          className="w-full h-32 rounded-xl border-2 border-dashed border-slate-200 hover:border-brand-700/50 hover:bg-brand-700/5 transition-all overflow-hidden relative group"
                        >
                          {preview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={preview} alt={side} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 group-hover:text-brand-700 transition-colors">
                              <Upload size={20} />
                              <span className="text-xs font-semibold capitalize">{side}</span>
                            </div>
                          )}
                          {preview && (
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white text-xs font-semibold">Change</span>
                            </div>
                          )}
                        </button>
                        <p className="text-center text-[10px] text-slate-400 mt-1 capitalize">{side} photo</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Job type */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Job Type</label>
                <select value={jobType} onChange={e => setJobType(e.target.value)} className={`${inputCls} cursor-pointer`}>
                  {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe the work done…"
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Customer info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Customer Name</label>
                  <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Jane Smith" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Phone</label>
                  <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="954-555-0000" className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Area</label>
                  <input value={area} onChange={e => setArea(e.target.value)} placeholder="Boca Raton" className={inputCls} />
                </div>
              </div>
            </>
          )}

          {/* ── RUNNING PHASE ── */}
          {(phase === 'running') && (
            <div className="space-y-4 py-4">
              <h3 className="text-sm font-semibold text-slate-700 text-center mb-2">Launching job…</h3>
              <div className="space-y-3">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0"><StepIcon status={step.status} /></div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${step.status === 'failed' ? 'text-red-600' : step.status === 'done' ? 'text-green-700' : 'text-slate-700'}`}>
                        {step.label}
                      </p>
                      {step.error && <p className="text-xs text-red-500 mt-0.5">{step.error}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CAPTIONS PHASE ── */}
          {phase === 'captions' && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-700">Review & edit captions</p>

              {/* Instagram */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Instagram size={16} className="text-purple-600" />
                    <span className="text-sm font-semibold text-purple-700">Instagram</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{igCaption.length} chars</span>
                    <button onClick={() => copy(igCaption)} className="p-1 rounded text-purple-500 hover:text-purple-700 transition-colors"><Copy size={13} /></button>
                  </div>
                </div>
                <textarea
                  value={igCaption}
                  onChange={e => setIgCaption(e.target.value)}
                  rows={4}
                  className="w-full text-sm bg-white/70 border border-purple-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-purple-400"
                />
              </div>

              {/* Google Business */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Globe size={16} className="text-blue-600" />
                    <span className="text-sm font-semibold text-blue-700">Google Business</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{gmCaption.length} chars</span>
                    <button onClick={() => copy(gmCaption)} className="p-1 rounded text-blue-500 hover:text-blue-700 transition-colors"><Copy size={13} /></button>
                  </div>
                </div>
                <textarea
                  value={gmCaption}
                  onChange={e => setGmCaption(e.target.value)}
                  rows={3}
                  className="w-full text-sm bg-white/70 border border-blue-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>

              {/* Nextdoor */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-green-600" />
                    <span className="text-sm font-semibold text-green-700">Nextdoor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{ndCaption.length} chars</span>
                    <button
                      onClick={() => { copy(ndCaption); window.open('https://nextdoor.com', '_blank'); }}
                      className="flex items-center gap-1 text-xs text-green-700 font-semibold hover:text-green-900 border border-green-300 rounded-lg px-2 py-1 transition-colors"
                    >
                      <ExternalLink size={11} /> Copy &amp; Open
                    </button>
                  </div>
                </div>
                <textarea
                  value={ndCaption}
                  onChange={e => setNdCaption(e.target.value)}
                  rows={3}
                  className="w-full text-sm bg-white/70 border border-green-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-green-400"
                />
              </div>
            </div>
          )}

          {/* ── DONE PHASE ── */}
          {phase === 'done' && (
            <div className="text-center py-8 space-y-3">
              <CheckCircle size={48} className="mx-auto text-green-500" />
              <p className="text-lg font-bold text-slate-800">Job Completed!</p>
              <p className="text-sm text-slate-500">Photos uploaded, captions posted, and review SMS sent.</p>
            </div>
          )}
        </div>

        {/* Fixed bottom action */}
        <div className="shrink-0 px-5 py-4 border-t border-slate-100 bg-white rounded-b-3xl sm:rounded-b-2xl">
          {phase === 'form' && (
            <button
              onClick={handleLaunch}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-brand-700 hover:bg-brand-600 transition-colors shadow-sm"
            >
              Generate Captions &amp; Launch
            </button>
          )}
          {phase === 'running' && (
            <button disabled className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-brand-700 opacity-60 cursor-not-allowed">
              <Loader2 size={16} className="animate-spin" /> Processing…
            </button>
          )}
          {phase === 'captions' && (
            <button
              onClick={handlePostEverything}
              disabled={posting}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {posting ? <><Loader2 size={16} className="animate-spin" /> Posting…</> : 'Post Everything'}
            </button>
          )}
          {phase === 'done' && (
            <button
              onClick={handleClose}
              className="w-full py-3 rounded-xl text-sm font-bold text-white bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
