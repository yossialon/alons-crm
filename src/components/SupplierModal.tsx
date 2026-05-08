'use client';
import { useEffect, useState } from 'react';
import { Supplier } from '@/types';
import { SUPPLIER_CATS } from '@/lib/constants';
import { X, ChevronRight, ChevronLeft, Building2, User, Phone, Mail, Loader2 } from 'lucide-react';

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
      <span className={`text-xs font-semibold ${step === 1 ? 'text-slate-700' : 'text-slate-400'}`}>Company & Contact</span>
      <div className={`flex-1 h-px mx-1 ${step >= 2 ? 'bg-brand-700' : 'bg-slate-200'}`} />
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${step >= 2 ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-400'}`}>2</div>
      <span className={`text-xs font-semibold ${step === 2 ? 'text-slate-700' : 'text-slate-400'}`}>Details</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  supplier: Supplier | null;
  onClose: () => void;
  onSave: (data: Partial<Supplier>) => Promise<void>;
}

type Errors = Partial<Record<keyof Supplier, string>>;

export default function SupplierModal({ supplier, onClose, onSave }: Props) {
  const [step, setStep]     = useState<1 | 2>(1);
  const [form, setForm]     = useState<Partial<Supplier>>(supplier ?? {
    name: '', contact: '', phone: '', email: '',
    category: 'Hardware', status: 'active', notes: '', last_contact: '',
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

  const set = (k: keyof Supplier) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((p) => ({ ...p, [k]: e.target.value }));
      if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
    };

  const validateStep1 = (): boolean => {
    const e: Errors = {};
    if (!form.name?.trim()) e.name = 'Company name is required';
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

  const isEdit = !!supplier;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${visible ? 'bg-slate-900/50' : 'bg-slate-900/0'}`}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-md transition-all duration-200 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">{isEdit ? 'Edit Supplier' : 'Add New Supplier'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Step {step} of 2</p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <StepIndicator step={step} />

        {/* ── Step 1: Company & Contact ── */}
        {step === 1 && (
          <div className="p-6 space-y-4">
            <div>
              <FieldLabel text="Company Name" required />
              <div className="relative">
                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  value={form.name ?? ''}
                  onChange={set('name')}
                  placeholder="ABC Materials Inc."
                  autoFocus
                  className={`${inputCls(!!errors.name)} pl-9`}
                />
              </div>
              <FieldError msg={errors.name} />
            </div>

            <div>
              <FieldLabel text="Contact Person" />
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  value={form.contact ?? ''}
                  onChange={set('contact')}
                  placeholder="Jane Smith"
                  className={`${inputCls()} pl-9`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel text="Phone" />
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input value={form.phone ?? ''} onChange={set('phone')} placeholder="954-555-0000" className={`${inputCls()} pl-9`} />
                </div>
              </div>
              <div>
                <FieldLabel text="Email" />
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input type="email" value={form.email ?? ''} onChange={set('email')} placeholder="jane@abc.com" className={`${inputCls()} pl-9`} />
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

        {/* ── Step 2: Details ── */}
        {step === 2 && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel text="Category" />
                <select value={form.category ?? 'Hardware'} onChange={set('category')} className={`${inputCls()} cursor-pointer`}>
                  {SUPPLIER_CATS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel text="Status" />
                <select value={form.status ?? 'active'} onChange={set('status')} className={`${inputCls()} cursor-pointer`}>
                  {['active', 'pending', 'inactive'].map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <FieldLabel text="Last Contact Date" />
                <input type="date" value={form.last_contact ?? ''} onChange={set('last_contact')} className={inputCls()} />
              </div>
            </div>

            <div>
              <FieldLabel text="Notes" />
              <textarea
                value={form.notes ?? ''}
                onChange={set('notes')}
                rows={3}
                placeholder="Terms, lead times, special agreements…"
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
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Supplier'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
