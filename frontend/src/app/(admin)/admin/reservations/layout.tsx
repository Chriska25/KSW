'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, List } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/admin/reservations', label: 'Tableau de bord', icon: CalendarDays, exact: true },
  { href: '/admin/reservations/list', label: 'Liste détaillée', icon: List, exact: false },
];

export default function AdminReservationsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 border-b border-border pb-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-colors',
                active
                  ? 'border-primary bg-primary-muted text-primary'
                  : 'border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
