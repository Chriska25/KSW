'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { clearSession, getSession, isAdminUser } from '@/lib/session';
import { LoadingState } from '@/components/common/loading-state';

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const verify = async () => {
      const localUser = getSession();
      if (!localUser || !isAdminUser(localUser)) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname || '/admin/dashboard')}`);
        return;
      }

      try {
        const res = await apiClient.get('/auth/me');
        const user = res.data?.user;
        if (!user || !isAdminUser(user)) {
          clearSession();
          setDenied(true);
          router.replace(`/login?redirect=${encodeURIComponent(pathname || '/admin/dashboard')}`);
          return;
        }
        setReady(true);
      } catch {
        clearSession();
        setDenied(true);
        router.replace(`/login?redirect=${encodeURIComponent(pathname || '/admin/dashboard')}`);
      }
    };

    verify();
  }, [router, pathname]);

  if (denied || !ready) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <LoadingState message="Vérification de l'accès administrateur…" />
      </div>
    );
  }

  return <>{children}</>;
}
