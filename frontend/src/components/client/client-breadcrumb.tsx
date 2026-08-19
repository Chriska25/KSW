'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, LayoutDashboard } from 'lucide-react';
import { getClientPageMeta } from '@/lib/client-page-meta';

export function ClientBreadcrumb() {
  const pathname = usePathname();
  const meta = getClientPageMeta(pathname || '/client/dashboard');
  const isDashboard = pathname === '/client/dashboard' || pathname === '/client';

  if (isDashboard) return null;

  return (
    <nav
      aria-label="Fil d'Ariane client"
      className="mb-4 sm:mb-5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
    >
      <Link
        href="/client/dashboard"
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:text-primary hover:bg-surface-muted/60 transition-colors"
      >
        <LayoutDashboard className="h-3.5 w-3.5" />
        <span>Espace client</span>
      </Link>
      {meta.section && (
        <>
          <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />
          <span className="text-muted-foreground">{meta.section}</span>
        </>
      )}
      <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />
      <span className="text-foreground font-medium truncate max-w-[min(100%,20rem)]">{meta.title}</span>
    </nav>
  );
}
