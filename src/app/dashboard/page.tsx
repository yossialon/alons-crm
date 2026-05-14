'use client';
import dynamic from 'next/dynamic';

// ssr: false guarantees DashboardClient — which uses localStorage, window,
// and browser-only hooks — is never executed during next build's server pass.
// This wrapper itself has no browser-API calls so it is safe to SSR.
const DashboardClient = dynamic(() => import('@/components/DashboardClient'), {
  ssr: false,
  loading: () => null,
});

export default function DashboardPage() {
  return <DashboardClient />;
}
