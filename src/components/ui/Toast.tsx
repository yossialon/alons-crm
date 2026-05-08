'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { ToastState } from '@/types';

export default function Toast({ toast }: { toast: ToastState | null }) {
  const [display, setDisplay] = useState<ToastState | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setDisplay(toast);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      const t = setTimeout(() => setDisplay(null), 350);
      return () => clearTimeout(t);
    }
  }, [toast]);

  if (!display) return null;

  const ok = display.ok;

  return (
    <div
      className={`fixed top-5 right-5 z-[9999] flex items-start gap-3 px-4 py-3 rounded-2xl shadow-lg border max-w-sm transition-all duration-300 ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
      } ${
        ok
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-red-50 border-red-200 text-red-800'
      }`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {ok
          ? <CheckCircle2 size={16} className="text-emerald-500" />
          : <XCircle size={16} className="text-red-500" />
        }
      </div>
      <p className="text-sm font-semibold leading-snug flex-1">{display.msg}</p>
      <div className={`flex-shrink-0 w-1 self-stretch rounded-full ${ok ? 'bg-emerald-300' : 'bg-red-300'}`} />
    </div>
  );
}
