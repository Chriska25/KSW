import React from 'react';
import { PublicDataSeed } from '@/components/public/public-data-seed';
import { fetchGalleriesServer } from '@/lib/server-fetch';

export default async function ContactLayout({ children }: { children: React.ReactNode }) {
  const initialGalleries = await fetchGalleriesServer();

  return (
    <>
      <PublicDataSeed galleries={initialGalleries} />
      {children}
    </>
  );
}
