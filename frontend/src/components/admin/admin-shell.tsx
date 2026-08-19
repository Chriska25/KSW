'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminTopbar } from '@/components/admin/admin-topbar';
import { AdminAuthGuard } from '@/components/admin/admin-auth-guard';
import { AdminToastProvider } from '@/components/admin/admin-toast';
import { AdminBreadcrumb } from '@/components/admin/admin-breadcrumb';
import { getToken, syncAuthCookie } from '@/lib/session';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (token) syncAuthCookie(token);
  }, []);

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

  return (
    <AdminAuthGuard>
      <AdminToastProvider>
        <div className="min-h-screen h-[100dvh] bg-background flex text-foreground overflow-hidden">
          <div
            className={`${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 md:z-auto transition-transform duration-200 ease-out shrink-0 md:shadow-none`}
          >
            <AdminSidebar onCloseMobile={() => setSidebarOpen(false)} />
          </div>

          {sidebarOpen && (
            <button
              type="button"
              aria-label="Fermer le menu"
              className="md:hidden fixed inset-0 z-40 bg-background/80"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <AdminTopbar onToggleSidebar={() => setSidebarOpen((open) => !open)} />
            <main className="flex-1 overflow-y-auto overscroll-contain admin-main-scroll">
              <div className="max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-6 lg:py-8">
                <AdminBreadcrumb />
                <div className="admin-page-enter">{children}</div>
              </div>
            </main>
          </div>
        </div>
      </AdminToastProvider>
    </AdminAuthGuard>
  );
}
