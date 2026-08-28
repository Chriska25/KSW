'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';

function KpiSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="h-3 w-24 rounded bg-surface-muted animate-pulse" />
        <div className="h-4 w-4 rounded bg-surface-muted animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-8 w-28 rounded bg-surface-muted animate-pulse" />
        <div className="h-3 w-36 rounded bg-surface-muted animate-pulse" />
      </CardContent>
    </Card>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-pulse">
      <div className="space-y-2">
        <div className="h-9 w-56 rounded-lg bg-surface-muted" />
        <div className="h-4 w-full max-w-xl rounded bg-surface-muted" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>

      <div className="h-72 rounded-lg bg-surface-muted" />

      <Card>
        <CardHeader>
          <div className="h-5 w-48 rounded bg-surface-muted" />
          <div className="h-3 w-64 rounded bg-surface-muted mt-2" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-surface-muted" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
