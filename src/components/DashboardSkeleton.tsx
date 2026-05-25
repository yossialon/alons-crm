'use client';
/**
 * Full-page skeleton shown while DashboardClient is loading.
 * Matches the rough layout of the Header + three stat cards + table.
 */
export default function DashboardSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header bar */}
      <div className="h-14 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>

        {/* Main content area */}
        <div className="space-y-3">
          <div className="h-10 w-48 rounded-xl bg-slate-100 dark:bg-slate-800" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    </div>
  );
}
