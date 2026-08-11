import React from 'react';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';
import { VisitTracker } from '@/components/analytics/visit-tracker';
import { PublicDataSeed } from '@/components/public/public-data-seed';
import { PublicServicesProvider } from '@/components/public/public-services-provider';
import { fetchGalleriesServer, fetchServicesServer } from '@/lib/server-fetch';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [initialServices, initialGalleries] = await Promise.all([
    fetchServicesServer(),
    fetchGalleriesServer(),
  ]);

  return (
    <PublicServicesProvider initialServices={initialServices}>
      <div className="min-h-screen flex flex-col justify-between bg-zinc-950 text-zinc-100">
        <PublicDataSeed galleries={initialGalleries} />
        <VisitTracker />
        <PublicHeader />
        <main className="flex-grow flex flex-col">{children}</main>
        <PublicFooter />
      </div>
    </PublicServicesProvider>
  );
}
