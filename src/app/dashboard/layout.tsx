// Dashboard is auth-protected and personalized — never statically generate.
export const dynamic = 'force-dynamic';

import { TabProvider } from '@/contexts/TabContext';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TabProvider>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />

          {/* pb-16 on mobile reserves space for the fixed bottom nav */}
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
            {children}
          </main>
        </div>
      </div>

      {/* Fixed bottom nav — phones only */}
      <BottomNav />
    </TabProvider>
  );
}
