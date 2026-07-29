'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Calendar,
  FolderHeart,
  LogOut,
  ArrowLeft,
  KeyRound,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudioLogo } from '@/components/brand/studio-logo';
import { clearClientSession, getClientInitials, getClientSession } from '@/lib/client-session';
import type { AuthUser } from '@/hooks/use-auth';
import { fetchClientNotifications } from '@/lib/client-notifications';

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    setUser(getClientSession());
    fetchClientNotifications()
      .then((r) => setUnreadNotifs(r.unreadCount))
      .catch(() => {});
  }, [pathname]);

  const handleLogout = () => {
    clearClientSession();
    router.push('/login');
  };

  const navItems: Array<{
    href: string;
    label: string;
    icon: typeof Calendar;
    badge?: number;
  }> = [
    { href: '/client/dashboard', label: 'Tableau de bord', icon: Calendar },
    { href: '/client/notifications', label: 'Notifications', icon: Bell, badge: unreadNotifs },
    { href: '/galerie-privee', label: 'Accès par clé', icon: KeyRound },
  ];

  const initials = user ? getClientInitials(user.name) : '?';

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col md:flex-row text-zinc-100">
      <aside className="w-full md:w-64 bg-zinc-900/80 border-b md:border-b-0 md:border-r border-zinc-800 p-5 md:p-6 flex flex-col gap-8 shrink-0">
        <StudioLogo size="sm" showSubtitle={false} />

        <nav className="space-y-1 text-sm font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors ${
                  active
                    ? 'bg-amber-400/10 text-amber-400 font-semibold border border-amber-400/25'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {'badge' in item && (item.badge ?? 0) > 0 && (
                  <span className="text-[10px] bg-amber-400 text-zinc-950 font-bold px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
          {user && (
            <Link
              href="/client/dashboard#galleries"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
            >
              <FolderHeart className="h-4 w-4 shrink-0" />
              <span>Mes galeries</span>
            </Link>
          )}
        </nav>

        <div className="md:mt-auto pt-4 border-t border-zinc-800 space-y-3">
          {user ? (
            <>
              <div className="flex items-center gap-3 px-1">
                <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-amber-400 text-xs shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 text-xs">
                  <div className="font-semibold text-white truncate">{user.name}</div>
                  <div className="text-zinc-500 truncate">{user.email}</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start text-xs text-zinc-400 hover:text-red-300"
              >
                <LogOut className="h-3.5 w-3.5 mr-2" /> Déconnexion
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Se connecter
              </Button>
            </Link>
          )}
          <Link href="/">
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-zinc-400">
              <ArrowLeft className="h-3.5 w-3.5 mr-2" /> Retour au site
            </Button>
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 md:p-10 overflow-y-auto">{children}</main>
    </div>
  );
}
