'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Search,
  Menu,
  AlertCircle,
  Calendar,
  CreditCard,
  MessageSquare,
  User,
  BookOpen,
  ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getSession, isAdminUser } from '@/lib/session';
import {
  fetchAdminNotifications,
  markNotificationsRead,
  type AdminNotification,
} from '@/lib/admin-notifications';
import {
  searchAdmin,
  ADMIN_SEARCH_TYPE_LABELS,
  type AdminSearchResult,
  type AdminSearchResultType,
} from '@/lib/admin-search';

interface AdminTopbarProps {
  onToggleSidebar?: () => void;
}

function iconForNotification(n: AdminNotification) {
  switch (n.type) {
    case 'payment':
      return { Icon: CreditCard, color: 'text-emerald-400' };
    case 'contact':
      return { Icon: MessageSquare, color: 'text-amber-400' };
    case 'system':
      return { Icon: AlertCircle, color: 'text-zinc-400' };
    default:
      return { Icon: Calendar, color: 'text-amber-400' };
  }
}

function iconForSearch(type: AdminSearchResultType) {
  switch (type) {
    case 'user':
      return User;
    case 'booking':
      return Calendar;
    case 'contact':
      return MessageSquare;
    case 'blog':
      return BookOpen;
    case 'gallery':
      return ImageIcon;
    default:
      return Search;
  }
}

export function AdminTopbar({ onToggleSidebar }: AdminTopbarProps) {
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<AdminSearchResult[]>([]);
  const user = getSession();

  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetchAdminNotifications();
      setNotifications(res.data.slice(0, 8));
      setUnreadCount(res.unreadCount);
    } catch {
      // silencieux dans la topbar
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchAdmin(q);
        setSearchResults(results);
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleOpen = () => {
    setNotificationsOpen((o) => !o);
    if (!notificationsOpen) loadNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await markNotificationsRead({ all: true });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  const handleSelectResult = (result: AdminSearchResult) => {
    setSearchOpen(false);
    setSearchQuery('');
    router.push(result.href);
  };

  const initials = user?.name
    ? user.name
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('')
    : 'AD';

  return (
    <header className="h-16 bg-zinc-900/80 border-b border-zinc-800 px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">
      <div className="flex items-center space-x-4 flex-1 max-w-md">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="md:hidden p-2 text-zinc-400 hover:text-white"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div ref={searchRef} className="relative w-full hidden sm:block">
          <Search className="h-4 w-4 absolute left-3 top-3 text-zinc-500" />
          <Input
            placeholder="Rechercher clients, réservations, galeries…"
            className="pl-9 h-10 bg-zinc-950/80 border-zinc-800 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchQuery.trim().length >= 2) setSearchOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchOpen(false);
                setSearchQuery('');
              } else if (e.key === 'Enter' && searchResults[0]) {
                handleSelectResult(searchResults[0]);
              }
            }}
          />

          {searchOpen && searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 right-0 mt-2 glass-panel rounded-2xl border border-zinc-800 shadow-2xl z-50 max-h-80 overflow-y-auto">
              {searchLoading ? (
                <p className="text-xs text-zinc-500 p-4 text-center">Recherche…</p>
              ) : searchResults.length === 0 ? (
                <p className="text-xs text-zinc-500 p-4 text-center">Aucun résultat.</p>
              ) : (
                <ul className="py-2">
                  {searchResults.map((result) => {
                    const Icon = iconForSearch(result.type);
                    return (
                      <li key={result.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectResult(result)}
                          className="w-full text-left px-4 py-2.5 hover:bg-zinc-900/60 transition-colors flex items-start gap-3"
                        >
                          <Icon className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-white truncate">{result.title}</div>
                            <div className="text-[10px] text-zinc-500 truncate">{result.subtitle}</div>
                          </div>
                          <Badge variant="outline" className="text-[9px] shrink-0">
                            {ADMIN_SEARCH_TYPE_LABELS[result.type]}
                          </Badge>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative">
          <button
            type="button"
            onClick={handleOpen}
            className="relative p-2 rounded-xl glass-panel text-zinc-400 hover:text-amber-400 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 glass-panel rounded-2xl p-4 space-y-3 shadow-2xl border-zinc-800 z-50">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="font-semibold text-white text-sm flex items-center">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <Badge variant="gold" className="ml-2 text-[10px]">
                      {unreadCount} nouvelle(s)
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-amber-400 hover:underline"
                    >
                      Tout lu
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen(false)}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Fermer
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-zinc-500 text-xs text-center py-4">Aucune activité récente.</p>
                ) : (
                  notifications.map((n) => {
                    const { Icon, color } = iconForNotification(n);
                    return (
                      <div
                        key={n.id}
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          !n.read ? 'bg-amber-400/5 border-amber-400/30' : 'bg-zinc-950/40 border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center justify-between font-medium text-white">
                          <span className="flex items-center">
                            <Icon className={`h-3.5 w-3.5 mr-1.5 ${color}`} />
                            {n.title}
                          </span>
                          <span className="text-[10px] text-zinc-500">{n.createdAt}</span>
                        </div>
                        <p className="text-zinc-400 leading-relaxed line-clamp-2">{n.message}</p>
                      </div>
                    );
                  })
                )}
              </div>

              <Link href="/admin/notifications" onClick={() => setNotificationsOpen(false)}>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Voir tout le centre notifications
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3 pl-3 border-l border-zinc-800">
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5">
            <div className="h-full w-full bg-zinc-950 rounded-full flex items-center justify-center font-bold text-amber-400 text-xs">
              {initials}
            </div>
          </div>
          <div className="hidden sm:block text-xs">
            <div className="font-bold text-white">{user?.name || 'Administrateur'}</div>
            <div className="text-amber-400/90 text-[10px] font-mono">
              {isAdminUser(user) ? 'Administrateur' : 'Staff'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
