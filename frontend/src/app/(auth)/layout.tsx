'use client';

import React from 'react';
import { StudioLogo } from '@/components/brand/studio-logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 selection:bg-amber-400 selection:text-zinc-950">
      <div className="mb-8 hover:scale-105 transition-transform duration-300">
        <StudioLogo size="lg" />
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
