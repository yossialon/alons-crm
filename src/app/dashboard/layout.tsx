import { TabProvider } from '@/contexts/TabContext';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TabProvider>
      <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
        {/* Sidebar */}
        <Sidebar />

        {/* Main column */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />

          {/* Scrollable content area */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </TabProvider>
  );
}
