'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChevronDown, ExternalLink, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CLIENT_USER_MENU } from '@/lib/client-nav';
import { getClientPageMeta } from '@/lib/client-page-meta';
import { clearClientSession, getClientInitials } from '@/lib/client-session';
import { resolveAvatarUrl } from '@/lib/profile-api';
import { useSessionUser, getUserInitials } from '@/hooks/use-session-user';

interface ClientTopbarProps {
  onToggleSidebar?: () => void;
  unreadNotifs?: number;
}

export function ClientTopbar({ onToggleSidebar, unreadNotifs = 0 }: ClientTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const pageMeta = getClientPageMeta(pathname || '/client/dashboard');
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, ready: sessionReady } = useSessionUser();

  const closePanels = useCallback(() => {
    setUserMenuOpen(false);
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleLogout = () => {
    clearClientSession();
    closePanels();
    router.push('/login');
  };

  const initials = sessionReady
    ? user?.name
      ? getClientInitials(user.name)
      : getUserInitials(user?.name, '—')
    : '—';
  const avatarSrc = user?.avatarUrl ? resolveAvatarUrl(user.avatarUrl) : undefined;
  const displayName = sessionReady ? user?.name || 'Client' : 'Client';

  return (
    <header className="h-14 sm:h-16 bg-zinc-900/85 border-b border-zinc-800 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md gap-2 sm:gap-3 shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="md:hidden p-2 -ml-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 shrink-0"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1 md:hidden">
          <p className="text-sm font-semibold text-white truncate leading-tight">{pageMeta.title}</p>
          {pageMeta.section && (
            <p className="text-[10px] text-zinc-500 truncate">{pageMeta.section}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <Link
          href="/client/notifications"
          className="relative p-2 rounded-xl text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/50 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadNotifs > 0 && (
            <span className="absolute top-1 right-1 min-w-[0.625rem] h-2.5 px-0.5 rounded-full bg-amber-400 text-[9px] font-bold text-zinc-950 flex items-center justify-center">
              {unreadNotifs > 9 ? '9+' : unreadNotifs}
            </span>
          )}
        </Link>

        <div ref={userMenuRef} className="relative pl-1.5 sm:pl-3 border-l border-zinc-800">
          <button
            type="button"
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex items-center gap-2 sm:gap-3 rounded-xl py-1 pr-1 hover:bg-zinc-800/40 transition-colors"
          >
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shrink-0">
              <div className="h-full w-full bg-zinc-950 rounded-full flex items-center justify-center overflow-hidden font-bold text-amber-400 text-xs">
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span suppressHydrationWarning>{initials}</span>
                )}
              </div>
            </div>
            <div className="hidden sm:block text-left text-xs min-w-0">
              <div className="font-bold text-white truncate max-w-[120px]" suppressHydrationWarning>
                {displayName}
              </div>
              <div className="text-amber-400/90 text-[10px] font-mono" suppressHydrationWarning>
                Espace client
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-zinc-500 hidden sm:block transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 glass-panel rounded-2xl border border-zinc-800 shadow-2xl z-50 p-2">
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 truncate">
                {user?.email || 'Compte client'}
              </p>
              <div className="space-y-0.5 pb-2 border-b border-zinc-800 mb-2">
                {CLIENT_USER_MENU.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:bg-zinc-800/80 hover:text-white transition-colors"
                    >
                      <Icon className="h-3.5 w-3.5 text-amber-400/90 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.external && <ExternalLink className="h-3 w-3 opacity-50 shrink-0" />}
                    </Link>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:bg-red-500/10 hover:text-red-300 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
