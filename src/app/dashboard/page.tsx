import dynamic from 'next/dynamic';
import DashboardSkeleton from '@/components/DashboardSkeleton';

// ssr: false — DashboardClient uses localStorage, window, and browser-only
// hooks. This wrapper is server-safe and provides the skeleton while loading.
const DashboardClient = dynamic(() => import('@/components/DashboardClient'), {
  ssr:     false,
  loading: () => <DashboardSkeleton />,
});

export default function DashboardPage() {
  return <DashboardClient />;
}
