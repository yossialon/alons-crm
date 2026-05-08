'use client';
import { useState } from 'react';
import { Menu, Search, Bell, ChevronDown } from 'lucide-react';
import { useTab, AppTab } from '@/contexts/TabContext';

const TAB_LABELS: Record<AppTab, string> = {
  dashboard: 'Dashboard',
  leads:     'Leads',
  find:      'Find Leads',
  auto:      'Auto-Scan',
  customers: 'Customers',
  suppliers: 'Suppliers',
  employees: 'Employees',
  settings:  'Settings',
};

export default function Header() {
  const { tab, autoScanBadge, headerAction, setSidebarOpen } = useTab();
  const [searchVal, setSearchVal] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);

  // Sample notifications — in production these would come from your API
  const notifications = [
    autoScanBadge > 0
      ? { id: 1, text: `${autoScanBadge} new leads in Auto-Scan queue`, time: 'now', dot: 'bg-amber-500' }
      : null,
    { id: 2, text: 'David Cohen moved to Qualified', time: '2h ago', dot: 'bg-green-500' },
    { id: 3, text: 'New supplier added: WoodCraft', time: '1d ago', dot: 'bg-blue-500' },
  ].filter(Boolean) as { id: number; text: string; time: string; dot: string }[];

  const unread = notifications.length;

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center px-4 sm:px-6 gap-4 shadow-sm">
      {/* Hamburger — mobile only */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <div className="hidden sm:block">
        <h1 className="text-base font-semibold text-slate-800">
          {TAB_LABELS[tab]}
        </h1>
        <p className="text-[11px] text-slate-400">Alon&apos;s Kitchens · South Florida</p>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative hidden md:block w-64">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          placeholder="Search leads, suppliers…"
          className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-brand-700/20 transition-all placeholder:text-slate-400"
        />
      </div>

      {/* Contextual action button (injected by the active page) */}
      {headerAction}

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setNotifOpen((p) => !p)}
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
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
            <div className="absolute right-0 top-11 z-20 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">Notifications</span>
                <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">{unread} new</span>
              </div>
              <div className="divide-y divide-slate-50">
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.dot}`} />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-700 font-medium leading-snug">{n.text}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-slate-100">
                <button className="text-xs text-brand-700 font-semibold hover:underline">
                  View all notifications
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* User avatar */}
      <div className="flex items-center gap-2 pl-2 border-l border-slate-200 cursor-pointer group">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-brand-700 flex items-center justify-center text-sm font-bold text-white shadow-sm">
          A
        </div>
        <div className="hidden sm:block">
          <div className="text-xs font-semibold text-slate-700 leading-tight">Admin</div>
          <div className="text-[10px] text-slate-400">Owner</div>
        </div>
        <ChevronDown size={13} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
      </div>
    </header>
  );
}
