'use client';

import React, { useEffect, useState } from 'react';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminTopbar } from '@/components/admin/admin-topbar';
import { AdminAuthGuard } from '@/components/admin/admin-auth-guard';
import { AdminToastProvider } from '@/components/admin/admin-toast';
import { getToken, syncAuthCookie } from '@/lib/session';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) syncAuthCookie(token);
  }, []);

  return (
    <AdminToastProvider>
      <div className="min-h-screen bg-zinc-950 flex text-zinc-100">
        <div
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 md:z-auto transition-transform duration-300 ease-out shrink-0`}
        >
          <AdminSidebar onCloseMobile={() => setSidebarOpen(false)} />
        </div>

        {sidebarOpen && (
          <button
            type="button"
            aria-label="Fermer le menu"
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <AdminTopbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 p-4 sm:p-6 md:p-10 overflow-y-auto">
            <AdminAuthGuard>{children}</AdminAuthGuard>
          </main>
        </div>
      </div>
    </AdminToastProvider>
  );
}
