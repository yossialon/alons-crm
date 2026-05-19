'use client';
import {
  LayoutDashboard, Users, Search, ClipboardList,
  Building2, Package, Settings,
  LogOut, ChevronRight, X,
  Columns2, FolderOpen, CheckSquare, BarChart2, MessageCircle, Send, Megaphone,
} from 'lucide-react';
import { useTab, AppTab } from '@/contexts/TabContext';
import { logout } from '@/lib/api';

interface NavItem {
  id: AppTab;
  label: string;
  icon: React.ElementType;
  section: string;
  badge?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard',    icon: LayoutDashboard, section: 'MAIN' },
  { id: 'leads',     label: 'Leads',        icon: Users,           section: 'MAIN' },
  { id: 'kanban',    label: 'Pipeline',     icon: Columns2,        section: 'MAIN' },
  { id: 'find',      label: 'Find Leads',   icon: Search,          section: 'MAIN' },
  { id: 'audit',     label: 'Lead Audit',   icon: ClipboardList,   section: 'MAIN' },
  { id: 'customers', label: 'Customers',    icon: Building2,       section: 'BUSINESS' },
  { id: 'projects',  label: 'Projects',     icon: FolderOpen,      section: 'BUSINESS' },
  { id: 'tasks',     label: 'Tasks',        icon: CheckSquare,     section: 'BUSINESS' },
  { id: 'suppliers', label: 'Suppliers',    icon: Package,         section: 'BUSINESS' },
  { id: 'outreach',  label: 'Outreach',     icon: Send,            section: 'BUSINESS' },
  { id: 'analytics',  label: 'Analytics',    icon: BarChart2,     section: 'INSIGHTS' },
  { id: 'social',     label: 'Social Inbox', icon: MessageCircle, section: 'INSIGHTS' },
  { id: 'marketing',  label: 'Marketing',    icon: Megaphone,     section: 'INSIGHTS' },
];

function NavLink({ item }: { item: NavItem }) {
  const { tab, setTab, setSidebarOpen } = useTab();
  const isActive = tab === item.id;
  const Icon = item.icon;

  return (
    <button
      onClick={() => { setTab(item.id); setSidebarOpen(false); }}
      title={item.label}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
        transition-all duration-150 group relative
        ${isActive
          ? 'bg-brand-700/20 text-amber-400 shadow-sm'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        }
      `}
    >
      <Icon
        size={18}
        className={`shrink-0 transition-colors ${isActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'}`}
      />
      {/* Label hidden on icon-only tablet view */}
      <span className="hidden lg:inline truncate">{item.label}</span>

      {isActive && (
        <ChevronRight size={14} className="hidden lg:block ml-auto text-amber-500 shrink-0" />
      )}
    </button>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="hidden lg:block text-[10px] font-semibold tracking-widest text-slate-600 uppercase px-3 mb-2">
      {label}
    </p>
  );
}

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useTab();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-3 lg:px-4 py-4 lg:py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-lg shadow-lg shrink-0">
            🪵
          </div>
          <div className="hidden lg:block">
            <div className="text-[10px] tracking-widest text-amber-500 uppercase font-semibold">
              Alon&apos;s Kitchens
            </div>
            <div className="text-xs text-slate-300 font-medium">Lead Hub</div>
          </div>
          {/* Mobile close button */}
          {mobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 lg:px-3 py-4 space-y-5">
        <div>
          <SectionLabel label="Main" />
          <div className="space-y-0.5">
            {NAV_ITEMS.filter((n) => n.section === 'MAIN').map((item) => (
              <NavLink key={item.id} item={item} />
            ))}
          </div>
        </div>
        <div>
          <SectionLabel label="Business" />
          <div className="space-y-0.5">
            {NAV_ITEMS.filter((n) => n.section === 'BUSINESS').map((item) => (
              <NavLink key={item.id} item={item} />
            ))}
          </div>
        </div>
        <div>
          <SectionLabel label="Insights" />
          <div className="space-y-0.5">
            {NAV_ITEMS.filter((n) => n.section === 'INSIGHTS').map((item) => (
              <NavLink key={item.id} item={item} />
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom */}
      <div className="px-2 lg:px-3 py-4 border-t border-white/10 space-y-0.5">
        <NavLink item={{ id: 'settings', label: 'Settings', icon: Settings, section: 'BOTTOM' } as NavItem} />
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150 group"
        >
          <LogOut size={18} className="shrink-0 text-slate-500 group-hover:text-red-400 transition-colors" />
          <span className="hidden lg:inline">Sign Out</span>
        </button>

        {/* User pill — full width only on lg */}
        <div className="hidden lg:flex mt-3 px-3 py-2.5 rounded-xl bg-white/5 items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            A
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-200 truncate">Admin</div>
            <div className="text-[10px] text-slate-500 truncate">South Florida</div>
          </div>
        </div>
        {/* Icon-only user pill at md */}
        <div className="flex lg:hidden mt-2 justify-center">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xs font-bold text-white">
            A
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Tablet + desktop sidebar (md: icon-only, lg: full) ── */}
      <aside className="hidden md:flex flex-col md:w-16 lg:w-60 shrink-0 bg-slate-900 h-screen sticky top-0 overflow-hidden transition-all duration-300">
        <SidebarContent />
      </aside>

      {/* ── Mobile: overlay + drawer ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-64 bg-slate-900 flex flex-col
          transform transition-transform duration-300 ease-in-out md:hidden
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <SidebarContent mobile />
      </aside>
    </>
  );
}
