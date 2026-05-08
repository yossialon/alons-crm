'use client';
import { useEffect, useState } from 'react';
import { Lead } from '@/types';
import { AREAS, LEAD_TYPES, SOURCES } from '@/lib/constants';
import { X, ChevronRight, ChevronLeft, User, Phone, Mail, Globe, Loader2 } from 'lucide-react';

// ── Primitives ────────────────────────────────────────────────────────────────

function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
      {text}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-500 font-medium">{msg}</p>;
}

function inputCls(hasError?: boolean) {
  return `w-full px-3 py-2.5 text-sm rounded-xl border transition-all outline-none focus:ring-2 ${
    hasError
      ? 'border-red-300 bg-red-50 focus:ring-red-200 focus:border-red-400'
      : 'border-slate-200 bg-slate-50 text-slate-800 focus:ring-brand-700/20 focus:border-brand-700/50'
  }`;
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 bg-slate-50/60">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${step >= 1 ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-400'}`}>1</div>
      <span className={`text-xs font-semibold ${step === 1 ? 'text-slate-700' : 'text-slate-400'}`}>Contact Info</span>
      <div className={`flex-1 h-px mx-1 ${step >= 2 ? 'bg-brand-700' : 'bg-slate-200'}`} />
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${step >= 2 ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-400'}`}>2</div>
      <span className={`text-xs font-semibold ${step === 2 ? 'text-slate-700' : 'text-slate-400'}`}>Lead Details</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  lead: Lead | null;
  onClose: () => void;
  onSave: (data: Partial<Lead>) => Promise<void>;
}

type Errors = Partial<Record<keyof Lead, string>>;

export default function LeadModal({ lead, onClose, onSave }: Props) {
  const [step, setStep]     = useState<1 | 2>(1);
  const [form, setForm]     = useState<Partial<Lead>>(lead ?? {
    name: '', phone: '', email: '', website: '',
    type: 'Homeowner', area: 'Boca Raton',
    source: 'Manual', status: 'new', potential: 'medium', notes: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 200); };

  const set = (k: keyof Lead) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((p) => ({ ...p, [k]: e.target.value }));
      if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
    };

  const validateStep1 = (): boolean => {
    const e: Errors = {};
    if (!form.name?.trim())  e.name  = 'Full name is required';
    if (!form.phone?.trim()) e.phone = 'Phone number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validateStep1()) setStep(2); };

  const handleSave = async () => {
    if (!validateStep1()) { setStep(1); return; }
    setSaving(true);
    try { await onSave(form); handleClose(); }
    finally { setSaving(false); }
  };

  const isEdit = !!lead;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${visible ? 'bg-slate-900/50' : 'bg-slate-900/0'}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-md transition-all duration-200 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">{isEdit ? 'Edit Lead' : 'Add New Lead'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Step {step} of 2</p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <StepIndicator step={step} />

        {/* ── Step 1: Contact Info ── */}
        {step === 1 && (
          <div className="p-6 space-y-4">
            <div>
              <FieldLabel text="Full Name" required />
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  value={form.name ?? ''}
                  onChange={set('name')}
                  placeholder="John Smith"
                  autoFocus
                  className={`${inputCls(!!errors.name)} pl-9`}
                />
              </div>
              <FieldError msg={errors.name} />
            </div>

            <div>
              <FieldLabel text="Phone" required />
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  value={form.phone ?? ''}
                  onChange={set('phone')}
                  placeholder="954-555-0000"
                  className={`${inputCls(!!errors.phone)} pl-9`}
                />
              </div>
              <FieldError msg={errors.phone} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel text="Email" />
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input type="email" value={form.email ?? ''} onChange={set('email')} placeholder="email@example.com" className={`${inputCls()} pl-9`} />
                </div>
              </div>
              <div>
                <FieldLabel text="Website" />
                <div className="relative">
                  <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input value={form.website ?? ''} onChange={set('website')} placeholder="https://…" className={`${inputCls()} pl-9`} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleNext} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-600 transition-colors">
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Lead Details ── */}
        {step === 2 && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel text="Type" />
                <select value={form.type ?? 'Homeowner'} onChange={set('type')} className={`${inputCls()} cursor-pointer`}>
                  {LEAD_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel text="Status" />
                <select value={form.status ?? 'new'} onChange={set('status')} className={`${inputCls()} cursor-pointer`}>
                  {['new', 'contacted', 'qualified', 'closed'].map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel text="Area" />
                <select value={form.area ?? 'Boca Raton'} onChange={set('area')} className={`${inputCls()} cursor-pointer`}>
                  {AREAS.map((a) => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel text="Potential" />
                <select value={form.potential ?? 'medium'} onChange={set('potential')} className={`${inputCls()} cursor-pointer`}>
                  {['high', 'medium', 'low'].map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <FieldLabel text="Source" />
                <select value={form.source ?? 'Manual'} onChange={set('source')} className={`${inputCls()} cursor-pointer`}>
                  {SOURCES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <FieldLabel text="Notes" />
              <textarea
                value={form.notes ?? ''}
                onChange={set('notes')}
                rows={3}
                placeholder="Any relevant details about this lead…"
                className={`${inputCls()} resize-none leading-relaxed`}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">
                <ChevronLeft size={15} /> Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-brand-700 hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Lead'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
