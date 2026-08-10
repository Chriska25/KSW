'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AppLink } from '@/components/navigation/app-link';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudioLogo } from '@/components/brand/studio-logo';
import { ClientSidebar } from '@/components/client/client-sidebar';
import { ClientTopbar } from '@/components/client/client-topbar';
import { ClientBreadcrumb } from '@/components/client/client-breadcrumb';
import { fetchClientNotifications } from '@/lib/client-notifications';
import { useSessionUser } from '@/hooks/use-session-user';
import { runWhenIdle } from '@/lib/run-when-idle';

export function ClientShell({
  children,
  keyOnlyGallery = false,
}: {
  children: React.ReactNode;
  keyOnlyGallery?: boolean;
}) {
  const pathname = usePathname();
  const { user } = useSessionUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const guestGalleryView = keyOnlyGallery && !user;

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (guestGalleryView) return;
    let cancelled = false;
    const load = () => {
      fetchClientNotifications()
        .then((r) => {
          if (!cancelled) setUnreadNotifs(r.unreadCount);
        })
        .catch(() => {});
    };
    runWhenIdle(load);
    const interval = window.setInterval(load, 60000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [guestGalleryView]);

  useEffect(() => {
    if (guestGalleryView) return;
    let cancelled = false;
    const ping = () => {
      if (cancelled) return;
      void import('@/lib/client-presence').then(({ sendClientPresenceHeartbeat }) =>
        sendClientPresenceHeartbeat(pathname || '/client/dashboard')
      );
    };
    runWhenIdle(ping);
    const interval = window.setInterval(ping, 90000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [guestGalleryView, pathname]);

  if (guestGalleryView) {
    return (
      <div className="min-h-screen h-[100dvh] bg-zinc-950 text-zinc-100 overflow-hidden flex flex-col">
        <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40 shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <StudioLogo size="sm" showSubtitle={false} />
            <div className="flex items-center gap-2">
              <AppLink href="/galerie-privee">
                <Button variant="ghost" size="sm" className="text-zinc-400 text-xs">
                  <KeyRound className="h-3.5 w-3.5 mr-1" /> Autre clé
                </Button>
              </AppLink>
              <AppLink href="/">
                <Button variant="ghost" size="sm" className="text-zinc-400 text-xs">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Site
                </Button>
              </AppLink>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overscroll-contain admin-main-scroll p-4 sm:p-6 md:p-10">
          <div className="admin-page-enter max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-[100dvh] bg-zinc-950 flex text-zinc-100 overflow-hidden">
      <div
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 md:z-auto transition-transform duration-200 ease-out shrink-0 shadow-2xl md:shadow-none`}
      >
        <ClientSidebar unreadNotifs={unreadNotifs} onCloseMobile={() => setSidebarOpen(false)} />
      </div>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="md:hidden fixed inset-0 z-40 bg-black/65 backdrop-blur-[2px]"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <ClientTopbar
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          unreadNotifs={unreadNotifs}
        />
        <main className="flex-1 overflow-y-auto overscroll-contain admin-main-scroll">
          <div className="max-w-[1200px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-6 lg:py-8">
            <ClientBreadcrumb />
            <div className="admin-page-enter">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
