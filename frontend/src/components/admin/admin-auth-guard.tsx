'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { RefreshCw, AlertCircle } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { clearSession, getSession, isAdminUser, persistSession } from '@/lib/session';
import { markAuthVerified } from '@/lib/auth-verify-cache';
import { LoadingState } from '@/components/common/loading-state';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage, isAuthApiError } from '@/lib/api-error';
import { buildLoginUrl } from '@/lib/auth-login-url';

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const [ready, setReady] = useState(false);
  const [denied, setDenied] = useState(false);
  const [networkError, setNetworkError] = useState('');
  const verifyingRef = useRef(false);

  const verify = useCallback(async (force = false) => {
    if (verifyingRef.current) return;
    setNetworkError('');

    const localUser = getSession();
    if (!localUser || !isAdminUser(localUser)) {
      router.replace(buildLoginUrl({ redirect: pathnameRef.current || '/admin/dashboard', admin: true }));
      return;
    }

    verifyingRef.current = true;
    try {
      const res = await apiClient.get('/auth/me');
      const user = res.data?.user;
      if (!user || !isAdminUser(user)) {
        clearSession();
        setDenied(true);
        router.replace(buildLoginUrl({ redirect: pathnameRef.current || '/admin/dashboard', admin: true }));
        return;
      }
      persistSession('', user);
      markAuthVerified();
      setReady(true);
    } catch (err: unknown) {
      if (isAuthApiError(err)) {
        clearSession();
        setDenied(true);
        router.replace(buildLoginUrl({ redirect: pathnameRef.current || '/admin/dashboard', admin: true }));
        return;
      }
      setNetworkError(getApiErrorMessage(err, 'Impossible de joindre l\'API backend.'));
    } finally {
      verifyingRef.current = false;
    }
  }, [router]);

  useEffect(() => {
    verify();
  }, [verify]);

  if (networkError) {
    return (
      <div className="min-h-screen flex items-center justify-center py-24 px-4 bg-background">
        <div className="max-w-md w-full surface rounded-lg p-8 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-warning mx-auto" aria-hidden />
          <h2 className="text-h2">API indisponible</h2>
          <p className="text-small text-muted-foreground">{networkError}</p>
          <Button type="button" variant="primary" size="sm" onClick={() => verify(true)}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (denied || !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center py-24 bg-background">
        <LoadingState message="Vérification de l'accès administrateur…" />
      </div>
    );
  }

  return <>{children}</>;
}
