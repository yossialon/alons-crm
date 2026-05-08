'use client';
import {
  LayoutDashboard, Users, Search, Bot,
  Building2, Package, UserCheck, Settings,
  LogOut, ChevronRight, X,
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
  // ── Main ────────────────────────────────────────────────
  { id: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard, section: 'MAIN' },
  { id: 'leads',     label: 'Leads',      icon: Users,           section: 'MAIN' },
  { id: 'find',      label: 'Find Leads', icon: Search,          section: 'MAIN' },
  { id: 'auto',      label: 'Auto-Scan',  icon: Bot,             section: 'MAIN', badge: true },
  // ── Business ─────────────────────────────────────────────
  { id: 'customers', label: 'Customers',  icon: Building2,       section: 'BUSINESS' },
  { id: 'suppliers', label: 'Suppliers',  icon: Package,         section: 'BUSINESS' },
  { id: 'employees', label: 'Employees',  icon: UserCheck,       section: 'BUSINESS' },
];

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const { tab, setTab, autoScanBadge, setSidebarOpen } = useTab();
  const isActive = tab === item.id;
  const Icon = item.icon;

  const handleClick = () => {
    setTab(item.id);
    setSidebarOpen(false); // close mobile sidebar on nav
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
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
      <span className="truncate">{item.label}</span>

      {/* Badge */}
      {item.badge && autoScanBadge > 0 && (
        <span className="ml-auto min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5">
          {autoScanBadge}
        </span>
      )}

      {/* Active indicator */}
      {isActive && (
        <ChevronRight size={14} className="ml-auto text-amber-500 shrink-0" />
      )}
    </button>
  );
}

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useTab();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-lg shadow-lg">
            🪵
          </div>
          <div>
            <div className="text-[10px] tracking-widest text-amber-500 uppercase font-semibold">
              Alon&apos;s Kitchens
            </div>
            <div className="text-xs text-slate-300 font-medium">Lead Hub</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Main section */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-slate-600 uppercase px-3 mb-2">
            Main
          </p>
          <div className="space-y-0.5">
            {NAV_ITEMS.filter((n) => n.section === 'MAIN').map((item) => (
              <NavLink key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Business section */}
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-slate-600 uppercase px-3 mb-2">
            Business
          </p>
          <div className="space-y-0.5">
            {NAV_ITEMS.filter((n) => n.section === 'BUSINESS').map((item) => (
              <NavLink key={item.id} item={item} />
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom: Settings + Logout */}
      <div className="px-3 py-4 border-t border-white/10 space-y-0.5">
        <NavLink item={{ id: 'settings', label: 'Settings', icon: Settings, section: 'BOTTOM' } as NavItem} />
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150 group"
        >
          <LogOut size={18} className="shrink-0 text-slate-500 group-hover:text-red-400 transition-colors" />
          Sign Out
        </button>

        {/* User pill */}
        <div className="mt-3 px-3 py-2.5 rounded-xl bg-white/5 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            A
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-200 truncate">Admin</div>
            <div className="text-[10px] text-slate-500 truncate">South Florida</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-slate-900 h-screen sticky top-0 overflow-hidden">
        <SidebarContent />
      </aside>

      {/* ── Mobile: overlay + drawer ─────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-64 bg-slate-900 flex flex-col
          transform transition-transform duration-300 ease-in-out lg:hidden
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={18} />
        </button>
        <SidebarContent />
      </aside>
    </>
  );
}
