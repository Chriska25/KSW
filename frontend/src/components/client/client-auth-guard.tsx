'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { clearSession, getSession, isClientUser, persistSession } from '@/lib/session';
import { LoadingState } from '@/components/common/loading-state';

export function ClientAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const verify = async () => {
      const localUser = getSession();
      if (!localUser || !isClientUser(localUser)) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname || '/client/dashboard')}`);
        return;
      }

      try {
        const res = await apiClient.get('/auth/me');
        const user = res.data?.user;
        if (!user || !isClientUser(user)) {
          clearSession();
          setDenied(true);
          router.replace(`/login?redirect=${encodeURIComponent(pathname || '/client/dashboard')}`);
          return;
        }
        persistSession(localStorage.getItem('studio_token') || '', user);
        setReady(true);
      } catch {
        clearSession();
        setDenied(true);
        router.replace(`/login?redirect=${encodeURIComponent(pathname || '/client/dashboard')}`);
      }
    };

    verify();
  }, [router, pathname]);

  if (denied || !ready) {
    return (
      <div className="py-24">
        <LoadingState message="Vérification de votre espace client…" />
      </div>
    );
  }

  return <>{children}</>;
}
