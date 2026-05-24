'use client';
import { useState, useEffect } from 'react';
import { Menu, Search, Bell, Sun, Moon, Plus } from 'lucide-react';
import { useTab, AppTab } from '@/contexts/TabContext';

/* ── Tab metadata ──────────────────────────────────────────────────────────── */
const TAB_META: Record<AppTab, { label: string; crumb?: string }> = {
  dashboard: { label: 'Dashboard'      },
  leads:     { label: 'Leads',         crumb: 'CRM' },
  kanban:    { label: 'Pipeline',      crumb: 'CRM' },
  find:      { label: 'Find Leads',    crumb: 'CRM' },
  audit:     { label: 'Lead Audit',    crumb: 'CRM' },
  social:    { label: 'Social Inbox',  crumb: 'Outreach' },
  outreach:  { label: 'Outreach',      crumb: 'Outreach' },
  marketing: { label: 'Marketing',     crumb: 'Outreach' },
  creative:  { label: 'Creative Studio', crumb: 'Outreach' },
  customers: { label: 'Customers',     crumb: 'Business' },
  projects:  { label: 'Projects',      crumb: 'Business' },
  tasks:     { label: 'Tasks',         crumb: 'Business' },
  suppliers: { label: 'Suppliers',     crumb: 'Business' },
  analytics: { label: 'Analytics',     crumb: 'Business' },
  employees: { label: 'Employees',     crumb: 'Business' },
  settings:  { label: 'Settings'       },
};

/* ── Notifications data (static for now) ──────────────────────────────────── */
const NOTIFICATIONS = [
  { id: 1, text: 'David Cohen moved to Qualified',  time: '2h ago', color: 'bg-brand-500'  },
  { id: 2, text: 'New supplier added: WoodCraft',   time: '1d ago', color: 'bg-info-500'   },
] as const;

/* ── Component ─────────────────────────────────────────────────────────────── */
export default function Header() {
  const { tab, setTab, headerAction, setSidebarOpen } = useTab();
  const [searchVal,  setSearchVal]  = useState('');
  const [notifOpen,  setNotifOpen]  = useState(false);
  const [dark,       setDark]       = useState(false);

  // Mirror the `dark` class that the no-flash script sets
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
  };

  const meta   = TAB_META[tab];
  const unread = NOTIFICATIONS.length;

  return (
    <header className="sticky top-0 z-30 h-[52px] bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 gap-3">

      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden p-1.5 rounded-[8px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Title + breadcrumb */}
      <div className="hidden sm:flex flex-col leading-none">
        {meta.crumb && (
          <span className="text-[10px] font-semibold tracking-widest text-zinc-400 dark:text-zinc-500 uppercase mb-0.5">
            {meta.crumb}
          </span>
        )}
        <h1 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {meta.label}
        </h1>
      </div>

      <div className="flex-1" />

      {/* Search — 180px, hidden on mobile */}
      <div className="relative hidden md:block">
        <Search
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
        />
        <input
          type="text"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          placeholder="Search…"
          className="w-[180px] pl-8 pr-3 py-1.5 text-xs rounded-[8px] transition-all
                     bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700
                     text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                     focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
        />
      </div>

      {/* Contextual action (injected by active tab) */}
      {headerAction}

      {/* New Lead — primary CTA shortcut */}
      <button
        onClick={() => setTab('leads')}
        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold
                   text-white bg-brand hover:bg-brand-700 transition-colors shadow-sm"
      >
        <Plus size={13} />
        New Lead
      </button>

      {/* Dark mode toggle */}
      <button
        onClick={toggleDark}
        className="p-1.5 rounded-[8px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        aria-label="Toggle dark mode"
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setNotifOpen((p) => !p)}
          className="relative p-1.5 rounded-[8px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={16} />
          {unread > 0 && (
            <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-coral text-white text-[8px] font-bold rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>

        {notifOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
            <div className="absolute right-0 top-10 z-20 w-72 card shadow-xl overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Notifications</span>
                <span className="text-[10px] bg-coral/10 text-coral font-bold px-2 py-0.5 rounded-full">
                  {unread} new
                </span>
              </div>
              <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
                {NOTIFICATIONS.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.color}`} />
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium leading-snug">{n.text}</p>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800">
                <button className="text-xs text-brand-700 dark:text-brand-400 font-semibold hover:underline">
                  View all notifications
                </button>
              </div>
            </div>
          </>
        )}
      </div>

    </header>
  );
}
