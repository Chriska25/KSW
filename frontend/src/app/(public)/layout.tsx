import React from 'react';
import { PublicHeader } from '@/components/layout/public-header';
import { PublicFooter } from '@/components/layout/public-footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-950 text-zinc-100">
      <PublicHeader />
      <main className="flex-grow flex flex-col">{children}</main>
      <PublicFooter />
    </div>
  );
}
