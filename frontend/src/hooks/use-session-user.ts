'use client';

import { useEffect, useState } from 'react';
import type { AuthUser } from '@/hooks/use-auth';
import { getSession } from '@/lib/session';

/** Session utilisateur lue après montage — évite les erreurs d'hydratation SSR/client. */
export function useSessionUser(): { user: AuthUser | null; ready: boolean } {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(getSession());
    setReady(true);
  }, []);

  return { user, ready };
}

export function getUserInitials(name: string | undefined, fallback = '—'): string {
  if (!name?.trim()) return fallback;
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}
