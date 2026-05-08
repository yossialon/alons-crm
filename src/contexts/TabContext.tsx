'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

export type AppTab =
  | 'dashboard'
  | 'leads'
  | 'find'
  | 'auto'
  | 'customers'
  | 'suppliers'
  | 'employees'
  | 'settings';

interface TabContextValue {
  tab: AppTab;
  setTab: (t: AppTab) => void;
  // Badge count shown on Auto-Scan nav item — updated by dashboard page
  autoScanBadge: number;
  setAutoScanBadge: (n: number) => void;
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
  autoScanBadge: 0,
  setAutoScanBadge: () => {},
  headerAction: null,
  setHeaderAction: () => {},
  sidebarOpen: false,
  setSidebarOpen: () => {},
});

export const useTab = () => useContext(TabContext);

export function TabProvider({ children }: { children: ReactNode }) {
  const [tab, setTab]               = useState<AppTab>('dashboard');
  const [autoScanBadge, setAutoScanBadge] = useState(0);
  const [headerAction, setHeaderAction]   = useState<ReactNode>(null);
  const [sidebarOpen, setSidebarOpen]     = useState(false);

  return (
    <TabContext.Provider value={{ tab, setTab, autoScanBadge, setAutoScanBadge, headerAction, setHeaderAction, sidebarOpen, setSidebarOpen }}>
      {children}
    </TabContext.Provider>
  );
}
