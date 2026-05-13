'use client';
import { LayoutDashboard, Users, Columns2, Search, MoreHorizontal } from 'lucide-react';
import { useTab, AppTab } from '@/contexts/TabContext';

const ITEMS: { id: AppTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Home',     icon: LayoutDashboard },
  { id: 'leads',     label: 'Leads',    icon: Users },
  { id: 'kanban',    label: 'Pipeline', icon: Columns2 },
  { id: 'find',      label: 'Find',     icon: Search },
];

export default function BottomNav() {
  const { tab, setTab, autoScanBadge, setSidebarOpen } = useTab();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 safe-area-pb">
      <div className="flex items-stretch h-16">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors
                ${active
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
              {label}
            </button>
          );
        })}

        {/* More → opens full sidebar drawer */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors relative"
        >
          <span className="relative">
            <MoreHorizontal size={20} strokeWidth={1.75} />
            {autoScanBadge > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-white text-[8px] font-bold flex items-center justify-center">
                {autoScanBadge > 9 ? '9+' : autoScanBadge}
              </span>
            )}
          </span>
          More
        </button>
      </div>
    </nav>
  );
}
