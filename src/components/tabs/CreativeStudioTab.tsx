'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Palette, Wand2, Library, Upload, Download, Loader2, Star,
  Sparkles, RefreshCw, Heart, Archive, Copy, Package, Printer,
  ChevronDown, ChevronUp, Check, ImageIcon, Layers,
} from 'lucide-react';
import type { BrandConfig, TemplateConfig, FontPair, TemplateType, StyleVariant } from '@/lib/canvas-templates';
import { FONT_PAIRS, PLATFORM_SIZES, CAMPAIGN_SIZES } from '@/lib/canvas-templates';
import { JobCompletion } from '@/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const TEMPLATE_TYPES: { id: TemplateType; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'before-after',  label: 'Before & After',    desc: 'Split-screen transformation reveal', icon: <Layers size={16} /> },
  { id: 'showcase',      label: 'Photo Showcase',     desc: 'Full-bleed photo with overlay text',  icon: <ImageIcon size={16} /> },
  { id: 'promotion',     label: 'Promotion',          desc: 'Special offer or seasonal campaign',  icon: <Star size={16} /> },
  { id: 'testimonial',   label: 'Testimonial',        desc: 'Customer quote with star rating',     icon: <Star size={16} /> },
  { id: 'service',       label: 'Service Highlight',  desc: 'Feature a specific service offering', icon: <Sparkles size={16} /> },
  { id: 'print-flyer',   label: 'Print Flyer',        desc: '8.5×11 door hanger / direct mail',    icon: <Printer size={16} /> },
];

const STYLE_VARIANTS: { id: StyleVariant; label: string; desc: string }[] = [
  { id: 'luxury-dark',   label: 'Luxury Dark',    desc: 'Dark overlays, gold accents, elegant' },
  { id: 'clean-modern',  label: 'Clean Modern',   desc: 'Light overlays, minimal text'         },
  { id: 'bold-impact',   label: 'Bold Impact',    desc: 'High contrast, strong CTA'            },
];

const FONT_OPTIONS: { id: FontPair; label: string; display: string; body: string }[] = [
  { id: 'modern-luxury',   label: 'Modern Luxury',    display: 'Playfair Display', body: 'Lato'             },
  { id: 'clean-premium',   label: 'Clean Premium',    display: 'Montserrat',        body: 'Open Sans'        },
  { id: 'bold-impact',     label: 'Bold Impact',      display: 'Bebas Neue',        body: 'Raleway'          },
  { id: 'classic-elegant', label: 'Classic Elegant',  display: 'Cormorant Garamond', body: 'Jost'           },
];

const BRAND_VOICES = [
  { id: 'luxury-sophisticated', label: 'Luxury & Sophisticated' },
  { id: 'friendly-local',       label: 'Friendly & Local'       },
  { id: 'bold-confident',       label: 'Bold & Confident'       },
  { id: 'warm-trustworthy',     label: 'Warm & Trustworthy'     },
];

const DEFAULT_BRAND: BrandConfig = {
  businessName:   "Alon's Kitchens",
  tagline:        'Custom Cabinets & Vanities · South Florida',
  primaryColor:   '#92400E',
  secondaryColor: '#D97706',
  bgColor:        '#FFFFFF',
  textColor:      '#1C0A00',
  fontPair:       'modern-luxury',
  logoUrl:        null,
};

// ── ColorInput ────────────────────────────────────────────────────────────────

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-slate-500 w-28 shrink-0">{label}</label>
      <div className="flex items-center gap-2 flex-1">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={e => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && onChange(e.target.value)}
          className="w-24 text-xs font-mono border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-700"
        />
      </div>
    </div>
  );
}

// ── PhotoUpload ───────────────────────────────────────────────────────────────

function PhotoUpload({
  label, url, onUrl, accept = 'image/*',
}: { label: string; url: string | null; onUrl: (u: string) => void; accept?: string }) {
  return (
    <label className="block cursor-pointer group">
      <span className="text-xs font-medium text-slate-600 mb-1.5 block">{label}</span>
      {url ? (
        <div className="relative w-full h-28 rounded-xl overflow-hidden border-2 border-brand-300">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xs font-semibold">Change photo</span>
          </div>
        </div>
      ) : (
        <div className="w-full h-28 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-brand-400 hover:text-brand-600 transition-colors bg-slate-50">
          <Upload size={20} />
          <span className="text-xs font-medium">Upload photo</span>
        </div>
      )}
      <input type="file" accept={accept} className="sr-only" onChange={e => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => onUrl(ev.target?.result as string);
        reader.readAsDataURL(file);
      }} />
    </label>
  );
}

// ── Brand Setup Section ───────────────────────────────────────────────────────

function BrandSetupSection({
  brand, setBrand, onSave, saving,
}: {
  brand: BrandConfig;
  setBrand: React.Dispatch<React.SetStateAction<BrandConfig>>;
  onSave: () => void;
  saving: boolean;
}) {
  const [logoUploading, setLogoUploading] = useState(false);
  const fonts = FONT_PAIRS[brand.fontPair];

  // Inject Google Font for live preview
  useEffect(() => {
    const link = document.getElementById('gf-preview') as HTMLLinkElement | null;
    const url = fonts.googleUrl;
    if (link) { link.href = url; } else {
      const l = document.createElement('link');
      l.id = 'gf-preview'; l.rel = 'stylesheet'; l.href = url;
      document.head.appendChild(l);
    }
  }, [fonts.googleUrl]);

  const uploadLogo = async (file: File) => {
    setLogoUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/brand/upload', { method: 'POST', body: fd });
    const { url } = await res.json() as { url: string };
    setBrand(b => ({ ...b, logoUrl: url }));
    setLogoUploading(false);
  };

  return (
    <div className="space-y-5">
      {/* Live Brand Preview Card */}
      <div
        className="rounded-2xl overflow-hidden shadow-lg border"
        style={{ borderColor: brand.primaryColor, backgroundColor: brand.bgColor }}
      >
        <div className="h-2" style={{ background: `linear-gradient(to right, ${brand.primaryColor}, ${brand.secondaryColor})` }} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3
                className="text-xl font-bold leading-tight"
                style={{ color: brand.primaryColor, fontFamily: `'${fonts.display}', serif` }}
              >
                {brand.businessName || 'Your Business Name'}
              </h3>
              <p
                className="text-xs mt-1 font-light"
                style={{ color: brand.textColor, opacity: 0.7, fontFamily: `'${fonts.body}', sans-serif` }}
              >
                {brand.tagline || 'Your tagline here'}
              </p>
            </div>
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt="Logo" className="h-12 w-auto object-contain" />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow"
                style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})` }}
              >
                {brand.businessName?.charAt(0) ?? 'B'}
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <span
              className="text-xs px-3 py-1.5 rounded-full font-semibold text-white"
              style={{ backgroundColor: brand.primaryColor, fontFamily: `'${fonts.body}', sans-serif` }}
            >
              Free Estimate
            </span>
            <span
              className="text-xs px-3 py-1.5 rounded-full font-semibold"
              style={{ backgroundColor: brand.secondaryColor, color: '#fff', fontFamily: `'${fonts.body}', sans-serif` }}
            >
              Call Today
            </span>
          </div>
        </div>
        <div className="h-1" style={{ backgroundColor: brand.secondaryColor, opacity: 0.4 }} />
      </div>

      {/* Business Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Business Info</p>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Business Name</label>
          <input
            type="text"
            value={brand.businessName}
            onChange={e => setBrand(b => ({ ...b, businessName: e.target.value }))}
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-700"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Tagline</label>
          <input
            type="text"
            value={brand.tagline}
            onChange={e => setBrand(b => ({ ...b, tagline: e.target.value }))}
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-700"
          />
        </div>
      </div>

      {/* Logo */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Logo</p>
        <label className="block cursor-pointer">
          <div className={`w-full h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${brand.logoUrl ? 'border-brand-300 bg-brand-50/30' : 'border-slate-200 bg-slate-50 hover:border-brand-400'}`}>
            {logoUploading ? (
              <Loader2 size={20} className="animate-spin text-brand-600" />
            ) : brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt="Logo" className="h-14 w-auto object-contain" />
            ) : (
              <>
                <Upload size={20} className="text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">Upload PNG with transparent background</span>
              </>
            )}
          </div>
          <input type="file" accept="image/png,image/svg+xml,image/webp" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
        </label>
        {brand.logoUrl && (
          <button onClick={() => setBrand(b => ({ ...b, logoUrl: null }))} className="text-xs text-red-500 hover:text-red-700">Remove logo</button>
        )}
      </div>

      {/* Brand Colors */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Brand Colors</p>
        <ColorInput label="Primary"    value={brand.primaryColor}   onChange={v => setBrand(b => ({ ...b, primaryColor: v }))} />
        <ColorInput label="Secondary"  value={brand.secondaryColor} onChange={v => setBrand(b => ({ ...b, secondaryColor: v }))} />
        <ColorInput label="Background" value={brand.bgColor}        onChange={v => setBrand(b => ({ ...b, bgColor: v }))} />
        <ColorInput label="Text"       value={brand.textColor}      onChange={v => setBrand(b => ({ ...b, textColor: v }))} />
      </div>

      {/* Fonts */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Font Pair</p>
        <div className="grid grid-cols-2 gap-2">
          {FONT_OPTIONS.map(f => (
            <button
              key={f.id}
              onClick={() => setBrand(b => ({ ...b, fontPair: f.id }))}
              className={`p-3 rounded-xl border-2 text-left transition-all ${brand.fontPair === f.id ? 'border-brand-700 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <p className="text-sm font-bold text-slate-800" style={{ fontFamily: `'${f.display}', serif` }}>{f.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{f.display} + {f.body}</p>
              {brand.fontPair === f.id && <Check size={12} className="text-brand-700 mt-1" />}
            </button>
          ))}
        </div>
      </div>

      {/* Brand Voice */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Brand Voice</p>
        <div className="space-y-2">
          {BRAND_VOICES.map(v => (
            <label key={v.id} className="flex items-center gap-3 cursor-pointer">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${(brand as BrandConfig & { brandVoice?: string }).brandVoice === v.id ? 'border-brand-700 bg-brand-700' : 'border-slate-300'}`}>
                {(brand as BrandConfig & { brandVoice?: string }).brandVoice === v.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <span className="text-sm text-slate-700">{v.label}</span>
              <input type="radio" className="sr-only" checked={(brand as BrandConfig & { brandVoice?: string }).brandVoice === v.id} onChange={() => setBrand(b => ({ ...b, brandVoice: v.id } as BrandConfig & { brandVoice: string }))} />
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-700 to-amber-600 text-white text-sm font-bold shadow hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
      >
        {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Check size={16} /> Save Brand Settings</>}
      </button>
    </div>
  );
}

// ── Template Creator ──────────────────────────────────────────────────────────

function TemplateCreatorSection({ brand }: { brand: BrandConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedType, setSelectedType]     = useState<TemplateType>('before-after');
  const [selectedPlatform, setSelectedPlatform] = useState('instagram-feed');
  const [styleVariant, setStyleVariant]     = useState<StyleVariant>('luxury-dark');
  const [headline, setHeadline]             = useState('From Dated to Stunning');
  const [subheadline, setSubheadline]       = useState('Custom kitchen transformation in South Florida');
  const [ctaText, setCtaText]               = useState('Get Free Estimate');
  const [phone, setPhone]                   = useState('(561) 555-0100');
  const [photoUrl, setPhotoUrl]             = useState<string | null>(null);
  const [beforeUrl, setBeforeUrl]           = useState<string | null>(null);
  const [afterUrl, setAfterUrl]             = useState<string | null>(null);
  const [testimonialText, setTestimonialText] = useState('');
  const [rating, setRating]                 = useState(5);
  const [jobCompletions, setJobCompletions] = useState<JobCompletion[]>([]);
  const [selectedJobId, setSelectedJobId]   = useState<string>('');
  const [campaignName, setCampaignName]     = useState('');
  const [templateName, setTemplateName]     = useState('');
  const [copyVariations, setCopyVariations] = useState<{ headline: string; subheadline: string; cta: string }[]>([]);
  const [generating, setGenerating]         = useState(false);
  const [rendering, setRendering]           = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [downloading, setDownloading]       = useState(false);
  const [zipping, setZipping]               = useState(false);
  const [saved, setSaved]                   = useState(false);
  const [showCopy, setShowCopy]             = useState(false);

  const platformSize = PLATFORM_SIZES.find(p => p.id === selectedPlatform) ?? PLATFORM_SIZES[0];

  // Load job completions for before/after selector
  useEffect(() => {
    fetch('/api/job-completions').then(r => r.json()).then((d: JobCompletion[]) => {
      if (Array.isArray(d)) setJobCompletions(d);
    }).catch(() => {});
  }, []);

  // When a job is selected, populate before/after URLs
  useEffect(() => {
    if (!selectedJobId) return;
    const job = jobCompletions.find(j => j.id === selectedJobId);
    if (job) {
      setBeforeUrl(job.before_photo_url || null);
      setAfterUrl(job.after_photo_url || null);
      setHeadline(
        job.job_type && job.area
          ? `${job.job_type} Transformation — ${job.area}`
          : 'Stunning Transformation'
      );
    }
  }, [selectedJobId, jobCompletions]);

  const buildConfig = useCallback((): TemplateConfig => ({
    type: selectedType,
    width: platformSize.width,
    height: platformSize.height,
    headline,
    subheadline,
    ctaText,
    phone,
    styleVariant,
    photoUrl,
    beforePhotoUrl: beforeUrl,
    afterPhotoUrl:  afterUrl,
    testimonialText: testimonialText || headline,
    rating,
  }), [selectedType, platformSize, headline, subheadline, ctaText, phone, styleVariant, photoUrl, beforeUrl, afterUrl, testimonialText, rating]);

  // Re-render canvas preview on any change
  const renderPreview = useCallback(async () => {
    if (!canvasRef.current) return;
    setRendering(true);
    try {
      const { renderTemplate } = await import('@/lib/canvas-templates');
      const previewCanvas = canvasRef.current;
      // Render at preview scale (800px wide max, proportional height)
      const scale = 800 / platformSize.width;
      const cfg: TemplateConfig = { ...buildConfig(), width: 800, height: Math.round(platformSize.height * scale) };
      await renderTemplate(previewCanvas, brand, cfg);
    } catch {}
    setRendering(false);
  }, [buildConfig, brand, platformSize]);

  useEffect(() => {
    const t = setTimeout(renderPreview, 400);
    return () => clearTimeout(t);
  }, [renderPreview]);

  const generateCopy = async () => {
    setGenerating(true); setShowCopy(true);
    const job = selectedJobId ? jobCompletions.find(j => j.id === selectedJobId) : null;
    const res = await fetch('/api/creative/generate-copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateType: selectedType,
        jobType:   job?.job_type,
        area:      job?.area || 'South Florida',
        brandVoice: (brand as BrandConfig & { brandVoice?: string }).brandVoice ?? 'luxury-sophisticated',
        businessName: brand.businessName,
        tagline:   brand.tagline,
      }),
    });
    const { variations } = await res.json() as { variations: typeof copyVariations };
    setCopyVariations(Array.isArray(variations) ? variations : []);
    setGenerating(false);
  };

  const applyCopy = (v: { headline: string; subheadline: string; cta: string }) => {
    setHeadline(v.headline);
    setSubheadline(v.subheadline);
    setCtaText(v.cta);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { renderTemplate, downloadCanvas } = await import('@/lib/canvas-templates');
      const exp = document.createElement('canvas');
      await renderTemplate(exp, brand, buildConfig());
      downloadCanvas(exp, `${selectedType}-${selectedPlatform}.png`);
    } catch {}
    setDownloading(false);
  };

  const handleDownloadAllSizes = async () => {
    setZipping(true);
    try {
      const JSZip = (await import('jszip')).default;
      const { renderTemplate, canvasToBlob } = await import('@/lib/canvas-templates');
      const zip = new JSZip();
      for (const size of CAMPAIGN_SIZES) {
        const exp = document.createElement('canvas');
        const cfg: TemplateConfig = { ...buildConfig(), width: size.width, height: size.height };
        await renderTemplate(exp, brand, cfg);
        const blob = await canvasToBlob(exp);
        zip.file(size.filename, blob);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a'); a.href = url; a.download = `${campaignName || 'campaign'}-package.zip`; a.click();
      URL.revokeObjectURL(url);
    } catch {}
    setZipping(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch('/api/creative-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:          templateName || `${selectedType} — ${new Date().toLocaleDateString()}`,
        template_type: selectedType,
        platform:      selectedPlatform,
        style_variant: styleVariant,
        headline, subheadline, cta_text: ctaText, phone,
        photo_url:     photoUrl,
        before_photo_url: beforeUrl,
        after_photo_url:  afterUrl,
        campaign_name: campaignName,
        thumbnail_url: canvasRef.current?.toDataURL('image/jpeg', 0.7) ?? null,
      }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Template Type */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Template Type</p>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATE_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${selectedType === t.id ? 'border-brand-700 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={selectedType === t.id ? 'text-brand-700' : 'text-slate-400'}>{t.icon}</span>
                <span className="text-xs font-semibold text-slate-800">{t.label}</span>
              </div>
              <p className="text-[10px] text-slate-400">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Platform */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Platform & Size</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORM_SIZES.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPlatform(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedPlatform === p.id ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
            >
              {p.label}
              <span className="ml-1 opacity-60">{p.width}×{p.height}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Style Variant */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Style</p>
        <div className="grid grid-cols-3 gap-2">
          {STYLE_VARIANTS.map(s => (
            <button
              key={s.id}
              onClick={() => setStyleVariant(s.id)}
              className={`p-2.5 rounded-xl border-2 text-center transition-all ${styleVariant === s.id ? 'border-brand-700 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <p className="text-xs font-semibold text-slate-800">{s.label}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Photos */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Photos</p>

        {/* Before/After job selector */}
        {(selectedType === 'before-after' || selectedType === 'print-flyer') && jobCompletions.length > 0 && (
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1.5">Auto-fill from completed job</label>
            <select
              value={selectedJobId}
              onChange={e => setSelectedJobId(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-700"
            >
              <option value="">Select a job…</option>
              {jobCompletions.map(j => (
                <option key={j.id} value={j.id}>{j.customer_name} — {j.job_type} · {j.area}</option>
              ))}
            </select>
          </div>
        )}

        {(selectedType === 'before-after' || selectedType === 'print-flyer') ? (
          <div className="grid grid-cols-2 gap-3">
            <PhotoUpload label="Before Photo" url={beforeUrl} onUrl={setBeforeUrl} />
            <PhotoUpload label="After Photo"  url={afterUrl}  onUrl={setAfterUrl}  />
          </div>
        ) : (
          <PhotoUpload label="Photo" url={photoUrl} onUrl={setPhotoUrl} />
        )}
      </div>

      {/* Text Fields */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Copy</p>
          <button
            onClick={generateCopy}
            disabled={generating}
            className="flex items-center gap-1.5 text-xs text-purple-600 font-semibold hover:text-purple-700 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            AI Generate 3 Variations
          </button>
        </div>

        {/* AI Copy Variations */}
        {showCopy && copyVariations.length > 0 && (
          <div className="space-y-2 pb-2 border-b border-slate-100">
            {copyVariations.map((v, i) => (
              <button
                key={i}
                onClick={() => applyCopy(v)}
                className="w-full text-left p-3 rounded-xl bg-purple-50 border border-purple-100 hover:border-purple-300 transition-colors group"
              >
                <p className="text-xs font-bold text-slate-800 group-hover:text-purple-800">{v.headline}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{v.subheadline}</p>
                <span className="text-[10px] text-purple-600 font-semibold">CTA: {v.cta} · Click to use</span>
              </button>
            ))}
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Headline</label>
          <input value={headline} onChange={e => setHeadline(e.target.value)} className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-700" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Subheadline</label>
          <input value={subheadline} onChange={e => setSubheadline(e.target.value)} className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-700" />
        </div>
        {selectedType === 'testimonial' && (
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Customer Quote</label>
            <textarea value={testimonialText} onChange={e => setTestimonialText(e.target.value)} rows={2} className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-brand-700" />
            <div className="flex gap-1 mt-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRating(n)} className={`text-lg ${n <= rating ? 'text-amber-400' : 'text-slate-200'}`}>★</button>
              ))}
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">CTA Button</label>
            <input value={ctaText} onChange={e => setCtaText(e.target.value)} className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-700" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-700" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Campaign Name</label>
            <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Spring Kitchen Special" className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-700" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Template Name</label>
            <input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Auto-named if blank" className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-700" />
          </div>
        </div>
      </div>

      {/* Canvas Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Live Preview</p>
          {rendering && <Loader2 size={13} className="animate-spin text-slate-400" />}
        </div>
        <div className="relative rounded-xl overflow-hidden bg-slate-100 w-full" style={{ aspectRatio: `${platformSize.width}/${platformSize.height}` }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ display: 'block' }}
          />
          {rendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/40">
              <Loader2 size={24} className="animate-spin text-brand-700" />
            </div>
          )}
        </div>
        <p className="text-center text-[10px] text-slate-400 mt-2">{platformSize.width}×{platformSize.height}px · {platformSize.label}</p>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-700 text-white text-sm font-bold hover:bg-brand-800 disabled:opacity-50 transition-colors shadow"
        >
          {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          Download PNG
        </button>
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 disabled:opacity-50 transition-colors border border-slate-200"
        >
          {saved ? <Check size={15} className="text-green-600" /> : saving ? <Loader2 size={15} className="animate-spin" /> : <Library size={15} />}
          {saved ? 'Saved!' : 'Save to Library'}
        </button>
      </div>

      {/* Campaign Package */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-4">
        <div className="flex items-start gap-3">
          <Package size={20} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-900">Campaign Package</p>
            <p className="text-xs text-amber-700 mt-0.5">Download all 5 platform sizes as a ZIP — Instagram Feed, Story, Facebook, Google 300×250, WhatsApp</p>
          </div>
        </div>
        <button
          onClick={handleDownloadAllSizes}
          disabled={zipping}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-700 text-white text-sm font-bold hover:bg-amber-800 disabled:opacity-50 transition-colors"
        >
          {zipping ? <><Loader2 size={14} className="animate-spin" /> Generating ZIP…</> : <><Download size={14} /> Download All Sizes (.zip)</>}
        </button>
      </div>
    </div>
  );
}

// ── Library Section ───────────────────────────────────────────────────────────

type SavedTemplate = {
  id: string;
  name: string;
  template_type: string;
  platform: string;
  campaign_name?: string;
  thumbnail_url?: string;
  is_favorite: boolean;
  created_at: string;
};

function LibrarySection() {
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filterType, setFilterType]       = useState('');
  const [filterPlatform, setFilterPlatform] = useState('');
  const [favOnly, setFavOnly]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterType)     params.set('type', filterType);
    if (filterPlatform) params.set('platform', filterPlatform);
    if (favOnly)        params.set('favorites', 'true');
    const res = await fetch(`/api/creative-templates?${params}`);
    const data = await res.json() as SavedTemplate[];
    setTemplates(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filterType, filterPlatform, favOnly]);

  useEffect(() => { load(); }, [load]);

  const toggleFav = async (id: string, current: boolean) => {
    await fetch(`/api/creative-templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: !current }),
    });
    load();
  };

  const archive = async (id: string) => {
    await fetch(`/api/creative-templates/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2">
        <div className="flex gap-2">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="flex-1 text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-brand-700">
            <option value="">All types</option>
            {TEMPLATE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} className="flex-1 text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-brand-700">
            <option value="">All platforms</option>
            {PLATFORM_SIZES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <button onClick={load} className="text-slate-400 hover:text-slate-600 p-1.5"><RefreshCw size={14} /></button>
        </div>
        <button
          onClick={() => setFavOnly(f => !f)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${favOnly ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-500'}`}
        >
          <Heart size={11} fill={favOnly ? 'currentColor' : 'none'} /> Favorites only
        </button>
      </div>

      {loading && <div className="text-center text-slate-400 py-10 text-sm">Loading library…</div>}
      {!loading && templates.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
          <Library size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No saved templates yet</p>
          <p className="text-xs mt-1">Create a template and click "Save to Library"</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {templates.map(t => (
          <div key={t.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Thumbnail */}
            <div className="w-full aspect-square bg-slate-100 relative overflow-hidden">
              {t.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.thumbnail_url} alt={t.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon size={28} className="text-slate-300" />
                </div>
              )}
              {/* Fav badge */}
              <button
                onClick={() => toggleFav(t.id, t.is_favorite)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow"
              >
                <Heart size={13} className={t.is_favorite ? 'text-red-500 fill-red-500' : 'text-slate-400'} />
              </button>
            </div>
            <div className="p-2.5">
              <p className="text-xs font-semibold text-slate-800 truncate">{t.name}</p>
              {t.campaign_name && <p className="text-[10px] text-slate-400 truncate">{t.campaign_name}</p>}
              <div className="flex gap-1 mt-1.5 flex-wrap">
                <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">{t.template_type}</span>
                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{t.platform}</span>
              </div>
              <div className="flex gap-1 mt-2">
                <button
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  title="Duplicate"
                >
                  <Copy size={10} /> Duplicate
                </button>
                <button
                  onClick={() => archive(t.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Archive"
                >
                  <Archive size={10} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export default function CreativeStudioTab() {
  const [section, setSection] = useState<'brand' | 'create' | 'library'>('brand');
  const [brand, setBrand]     = useState<BrandConfig & { brandVoice?: string }>({ ...DEFAULT_BRAND, brandVoice: 'luxury-sophisticated' });
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandLoaded, setBrandLoaded] = useState(false);

  // Load saved brand on mount
  useEffect(() => {
    fetch('/api/brand').then(r => r.json()).then((d: Record<string, string | null>) => {
      if (d && !d.error) {
        setBrand(prev => ({
          ...prev,
          businessName:   (d.business_name   as string) || prev.businessName,
          tagline:        (d.tagline          as string) || prev.tagline,
          primaryColor:   (d.primary_color    as string) || prev.primaryColor,
          secondaryColor: (d.secondary_color  as string) || prev.secondaryColor,
          bgColor:        (d.bg_color         as string) || prev.bgColor,
          textColor:      (d.text_color       as string) || prev.textColor,
          fontPair:       (d.font_pair        as FontPair) || prev.fontPair,
          brandVoice:     (d.brand_voice      as string) || 'luxury-sophisticated',
          logoUrl:        d.logo_url ?? null,
        }));
      }
      setBrandLoaded(true);
    }).catch(() => setBrandLoaded(true));
  }, []);

  const saveBrand = async () => {
    setBrandSaving(true);
    await fetch('/api/brand', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name:   brand.businessName,
        tagline:         brand.tagline,
        primary_color:   brand.primaryColor,
        secondary_color: brand.secondaryColor,
        bg_color:        brand.bgColor,
        text_color:      brand.textColor,
        font_pair:       brand.fontPair,
        brand_voice:     brand.brandVoice,
        logo_url:        brand.logoUrl,
      }),
    });
    setBrandSaving(false);
    setSection('create');
  };

  const TABS = [
    { id: 'brand'   as const, label: 'Brand',    icon: <Palette size={14} />,  desc: 'Colors & fonts' },
    { id: 'create'  as const, label: 'Create',   icon: <Wand2 size={14} />,    desc: 'Make ad creatives' },
    { id: 'library' as const, label: 'Library',  icon: <Library size={14} />,  desc: 'Saved templates' },
  ];

  return (
    <div className="space-y-4 pb-8">
      {/* Sub-tab navigation */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setSection(t.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-semibold transition-colors relative ${
                section === t.id
                  ? 'text-brand-700 border-b-2 border-brand-700 bg-brand-50/30'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.icon}
              {t.label}
              {section === t.id && (
                <span className="absolute bottom-0.5 text-[9px] text-brand-500 font-normal">{t.desc}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Section warning if brand not saved yet */}
      {!brandLoaded && (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading brand…
        </div>
      )}

      {brandLoaded && section === 'brand' && (
        <BrandSetupSection brand={brand} setBrand={setBrand} onSave={saveBrand} saving={brandSaving} />
      )}
      {brandLoaded && section === 'create' && (
        <TemplateCreatorSection brand={brand} />
      )}
      {brandLoaded && section === 'library' && (
        <LibrarySection />
      )}
    </div>
  );
}
