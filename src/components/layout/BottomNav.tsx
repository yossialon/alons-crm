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
  const { tab, setTab, setSidebarOpen } = useTab();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 safe-area-pb">
      <div className="flex items-stretch h-16">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors
                ${active
                  ? 'text-brand-700 dark:text-brand-400'
                  : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
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
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
        >
          <MoreHorizontal size={20} strokeWidth={1.75} />
          More
        </button>
      </div>
    </nav>
  );
}
