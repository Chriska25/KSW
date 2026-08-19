import React from 'react';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { VisitTracker } from '@/components/analytics/visit-tracker';
import { PublicServicesProvider } from '@/components/public/public-services-provider';
import { fetchServicesServer } from '@/lib/server-fetch';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const initialServices = await fetchServicesServer();

  return (
    <PublicServicesProvider initialServices={initialServices}>
      <div className="min-h-screen flex flex-col justify-between bg-surface-muted text-zinc-100">
        <VisitTracker />
        <PublicHeader />
        <main className="flex-grow flex flex-col pt-16 sm:pt-20">{children}</main>
        <PublicFooter />
      </div>
    </PublicServicesProvider>
  );
}
