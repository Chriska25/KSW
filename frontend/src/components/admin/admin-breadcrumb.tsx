'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, LayoutDashboard } from 'lucide-react';
import { getAdminPageMeta } from '@/lib/admin-page-meta';

export function AdminBreadcrumb() {
  const pathname = usePathname();
  const meta = getAdminPageMeta(pathname || '/admin/dashboard');
  const isDashboard = pathname === '/admin/dashboard' || pathname === '/admin';

  if (isDashboard) return null;

  return (
    <nav
      aria-label="Fil d'Ariane admin"
      className="mb-4 sm:mb-5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500"
    >
      <Link
        href="/admin/dashboard"
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:text-amber-400 hover:bg-zinc-900/60 transition-colors"
      >
        <LayoutDashboard className="h-3.5 w-3.5" />
        <span>Admin</span>
      </Link>
      {meta.section && (
        <>
          <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />
          <span className="text-zinc-600">{meta.section}</span>
        </>
      )}
      <ChevronRight className="h-3 w-3 opacity-40 shrink-0" />
      <span className="text-zinc-300 font-medium truncate max-w-[min(100%,20rem)]">{meta.title}</span>
    </nav>
  );
}
