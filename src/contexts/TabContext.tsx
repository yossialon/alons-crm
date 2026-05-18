'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

export type AppTab =
  | 'dashboard'
  | 'leads'
  | 'kanban'
  | 'find'
  | 'audit'
  | 'customers'
  | 'projects'
  | 'tasks'
  | 'suppliers'
  | 'analytics'
  | 'employees'
  | 'social'
  | 'outreach'
  | 'settings';

interface TabContextValue {
  tab: AppTab;
  setTab: (t: AppTab) => void;
  // Action button(s) injected into the top header by the active page
  headerAction: ReactNode;
  setHeaderAction: (node: ReactNode) => void;
  // Mobile sidebar toggle
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const TabContext = createContext<TabContextValue>({
  tab: 'dashboard',
  setTab: () => {},
  headerAction: null,
  setHeaderAction: () => {},
  sidebarOpen: false,
  setSidebarOpen: () => {},
});

export const useTab = () => useContext(TabContext);

export function TabProvider({ children }: { children: ReactNode }) {
  const [tab, setTab]               = useState<AppTab>('dashboard');
  const [headerAction, setHeaderAction]   = useState<ReactNode>(null);
  const [sidebarOpen, setSidebarOpen]     = useState(false);

  return (
    <TabContext.Provider value={{ tab, setTab, headerAction, setHeaderAction, sidebarOpen, setSidebarOpen }}>
      {children}
    </TabContext.Provider>
  );
}
