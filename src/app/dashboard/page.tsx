'use client';
// FIXED: ssr:false is only allowed in Client Components (Next.js 15 App Router).
// Adding 'use client' makes this a Client Component so next/dynamic + ssr:false work correctly.
import dynamic from 'next/dynamic';
import DashboardSkeleton from '@/components/DashboardSkeleton';

// DashboardClient uses localStorage, window, and browser-only hooks — SSR must be disabled.
const DashboardClient = dynamic(() => import('@/components/DashboardClient'), {
  ssr:     false,
  loading: () => <DashboardSkeleton />,
});

export default function DashboardPage() {
  return <DashboardClient />;
}
