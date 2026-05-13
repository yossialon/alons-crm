'use client';
import { useState, useEffect } from 'react';
import { Menu, Search, Bell, ChevronDown, Sun, Moon } from 'lucide-react';
import { useTab, AppTab } from '@/contexts/TabContext';

const TAB_LABELS: Record<AppTab, string> = {
  dashboard: 'Dashboard',
  leads:     'Leads',
  kanban:    'Pipeline',
  find:      'Find Leads',
  auto:      'Auto-Scan',
  customers: 'Customers',
  projects:  'Projects',
  tasks:     'Tasks',
  suppliers: 'Suppliers',
  analytics: 'Analytics',
  employees: 'Employees',
  social:    'Social Inbox',
  outreach:  'Outreach',
  settings:  'Settings',
};

export default function Header() {
  const { tab, autoScanBadge, headerAction, setSidebarOpen } = useTab();
  const [searchVal, setSearchVal] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [dark, setDark] = useState(false);

  // Sync dark state with the DOM class (set by the no-flash script)
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
  };

  const notifications = [
    autoScanBadge > 0
      ? { id: 1, text: `${autoScanBadge} new leads in Auto-Scan queue`, time: 'now', dot: 'bg-amber-500' }
      : null,
    { id: 2, text: 'David Cohen moved to Qualified', time: '2h ago', dot: 'bg-green-500' },
    { id: 3, text: 'New supplier added: WoodCraft', time: '1d ago', dot: 'bg-blue-500' },
  ].filter(Boolean) as { id: number; text: string; time: string; dot: string }[];

  const unread = notifications.length;

  return (
    <header className="sticky top-0 z-30 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 sm:px-6 gap-3 shadow-sm">
      {/* Hamburger — tablet & mobile (hidden on desktop) */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <div className="hidden sm:block">
        <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          {TAB_LABELS[tab]}
        </h1>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">Alon&apos;s Kitchens · South Florida</p>
      </div>

      <div className="flex-1" />

      {/* Search — hidden on mobile */}
      <div className="relative hidden md:block w-56 lg:w-72">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          placeholder="Search leads, suppliers…"
          className="w-full pl-9 pr-3 py-2 text-sm rounded-xl transition-all
                     bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400
                     focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-brand-700/20
                     dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      {/* Contextual action button */}
      {headerAction}

      {/* Theme toggle */}
      <button
        onClick={toggleDark}
        className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Toggle dark mode"
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setNotifOpen((p) => !p)}
          className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={19} />
          {unread > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>

        {notifOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
            <div className="absolute right-0 top-11 z-20 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Notifications</span>
                <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-bold px-2 py-0.5 rounded-full">{unread} new</span>
              </div>
              <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.dot}`} />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-snug">{n.text}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800">
                <button className="text-xs text-brand-700 dark:text-amber-500 font-semibold hover:underline">
                  View all notifications
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* User avatar */}
      <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800 cursor-pointer group">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-brand-700 flex items-center justify-center text-sm font-bold text-white shadow-sm">
          A
        </div>
        <div className="hidden sm:block">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-tight">Admin</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500">Owner</div>
        </div>
        <ChevronDown size={13} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
      </div>
    </header>
  );
}
