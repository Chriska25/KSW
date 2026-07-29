'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageVisit } from '@/lib/visit-analytics';

/** Enregistre une visite à chaque navigation sur le site public. */
export function VisitTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;
    trackPageVisit(pathname).catch(() => {
      // silencieux — ne pas bloquer la navigation
    });
  }, [pathname]);

  return null;
}
