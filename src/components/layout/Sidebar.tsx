'use client';
import {
  LayoutDashboard, Users, Columns2, Search, ClipboardList,
  MessageCircle, Send, Megaphone, Wand2,
  Building2, FolderOpen, CheckSquare, Package, BarChart2,
  Settings, LogOut, X, Bot,
} from 'lucide-react';
import { useTab, AppTab } from '@/contexts/TabContext';
import { logout } from '@/lib/api';

/* ── Nav structure ─────────────────────────────────────────────────────────── */
interface NavItem { id: AppTab; label: string; icon: React.ElementType }

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'MAIN',
    items: [
      { id: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard },
      { id: 'leads',     label: 'Leads',      icon: Users           },
      { id: 'kanban',    label: 'Pipeline',   icon: Columns2        },
      { id: 'find',      label: 'Find Leads', icon: Search          },
      { id: 'audit',     label: 'Lead Audit', icon: ClipboardList   },
    ],
  },
  {
    section: 'OUTREACH',
    items: [
      { id: 'social',    label: 'Social Inbox',    icon: MessageCircle },
      { id: 'outreach',  label: 'Outreach',        icon: Send          },
      { id: 'marketing', label: 'Marketing',       icon: Megaphone     },
      { id: 'creative',  label: 'Creative Studio', icon: Wand2         },
    ],
  },
  {
    section: 'BUSINESS',
    items: [
      { id: 'customers', label: 'Customers', icon: Building2  },
      { id: 'projects',  label: 'Projects',  icon: FolderOpen },
      { id: 'tasks',     label: 'Tasks',     icon: CheckSquare},
      { id: 'suppliers', label: 'Suppliers', icon: Package    },
      { id: 'analytics', label: 'Analytics', icon: BarChart2  },
    ],
  },
];

/* ── Agents shown at bottom (cosmetic for now) ─────────────────────────────── */
const AGENTS = [
  { name: 'Lead Hunter',  online: true  },
  { name: 'Ad Machine',   online: true  },
  { name: 'Boss Agent',   online: false },
];

/* ── Single nav button ─────────────────────────────────────────────────────── */
function NavLink({ item }: { item: NavItem }) {
  const { tab, setTab, setSidebarOpen } = useTab();
  const active = tab === item.id;
  const Icon   = item.icon;

  return (
    <button
      onClick={() => { setTab(item.id); setSidebarOpen(false); }}
      className={`
        w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-sm font-medium
        transition-all duration-150 text-left
        ${active
          ? 'bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-300'
          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
        }
      `}
    >
      <Icon
        size={16}
        className={`shrink-0 ${active ? 'text-brand-600 dark:text-brand-400' : 'text-zinc-400 dark:text-zinc-500'}`}
      />
      <span className="truncate">{item.label}</span>
    </button>
  );
}

/* ── Section heading ───────────────────────────────────────────────────────── */
function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-600 uppercase px-3 mb-1">
      {label}
    </p>
  );
}

/* ── Main content (shared desktop + mobile drawer) ─────────────────────────── */
function SidebarContent({ mobile = false }: { mobile?: boolean }) {
  const { setSidebarOpen } = useTab();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <div className="flex flex-col h-full">

      {/* Brand header */}
      <div className="h-[52px] flex items-center gap-3 px-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="w-7 h-7 rounded-[8px] bg-brand flex items-center justify-center text-sm shadow-sm shrink-0">
          🪵
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold tracking-wide text-zinc-800 dark:text-zinc-100 truncate">
            Alon&apos;s Kitchens
          </div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">Lead Hub</div>
        </div>
        {mobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="shrink-0 p-1 rounded-[6px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <SectionLabel label={section} />
            <div className="space-y-0.5">
              {items.map((item) => <NavLink key={item.id} item={item} />)}
            </div>
          </div>
        ))}
      </nav>

      {/* Agent roster */}
      <div className="px-2 py-3 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 px-3 mb-2">
          <Bot size={12} className="text-zinc-400 dark:text-zinc-600 shrink-0" />
          <span className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-600 uppercase">
            Agents
          </span>
        </div>
        <div className="space-y-0.5">
          {AGENTS.map((agent) => (
            <div
              key={agent.name}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-[8px] text-xs text-zinc-500 dark:text-zinc-400"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  agent.online
                    ? 'bg-brand-500 animate-[pulse-dot_2s_ease-in-out_infinite]'
                    : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
              />
              <span className="truncate">{agent.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Settings + logout */}
      <div className="px-2 py-2 border-t border-zinc-200 dark:border-zinc-800 space-y-0.5">
        <NavLink item={{ id: 'settings', label: 'Settings', icon: Settings }} />
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-sm font-medium
                     text-zinc-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/30
                     hover:text-red-600 dark:hover:text-red-400 transition-all duration-150"
        >
          <LogOut size={16} className="shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* User pill */}
      <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-700
                          flex items-center justify-center text-[11px] font-bold text-white shrink-0">
            A
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">Admin</div>
            <div className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">South Florida</div>
          </div>
        </div>
      </div>

    </div>
  );
}

/* ── Root export ───────────────────────────────────────────────────────────── */
export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useTab();

  return (
    <>
      {/* Desktop sidebar — always 200px, hidden on mobile */}
      <aside className="hidden md:flex flex-col w-[200px] shrink-0 bg-white dark:bg-zinc-900 h-screen sticky top-0 border-r border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-[200px]
          bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800
          flex flex-col md:hidden
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <SidebarContent mobile />
      </aside>
    </>
  );
}
