'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  ChevronDown,
  Zap,
  ExternalLink,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { isAdminUser } from '@/lib/session';
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
import { ADMIN_USER_MENU } from '@/lib/admin-nav';
import { getAdminPageMeta } from '@/lib/admin-page-meta';
import { AdminQuickActionsMenu, AdminLogoutButton } from '@/components/admin/admin-quick-actions';
import { ThemeSwitcher } from '@/components/theme/theme-switcher';
import { useSessionUser, getUserInitials } from '@/hooks/use-session-user';
import { runWhenIdle } from '@/lib/run-when-idle';

interface AdminTopbarProps {
  onToggleSidebar?: () => void;
}

function iconForNotification(n: AdminNotification) {
  switch (n.type) {
    case 'payment':
      return { Icon: CreditCard, color: 'text-success' };
    case 'contact':
      return { Icon: MessageSquare, color: 'text-primary' };
    case 'system':
      return { Icon: AlertCircle, color: 'text-muted-foreground' };
    default:
      return { Icon: Calendar, color: 'text-primary' };
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

function AdminSearchDropdown({
  searchLoading,
  searchResults,
  onSelect,
}: {
  searchLoading: boolean;
  searchResults: AdminSearchResult[];
  onSelect: (result: AdminSearchResult) => void;
}) {
  if (searchLoading) {
    return <p className="text-xs text-muted-foreground p-4 text-center">Recherche…</p>;
  }
  if (searchResults.length === 0) {
    return <p className="text-xs text-muted-foreground p-4 text-center">Aucun résultat.</p>;
  }
  return (
    <ul className="py-2">
      {searchResults.map((result) => {
        const Icon = iconForSearch(result.type);
        return (
          <li key={result.id}>
            <button
              type="button"
              onClick={() => onSelect(result)}
              className="w-full text-left px-4 py-2.5 hover:bg-surface-muted transition-colors flex items-start gap-3"
            >
              <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-foreground truncate">{result.title}</div>
                <div className="text-[10px] text-muted-foreground truncate">{result.subtitle}</div>
              </div>
              <Badge variant="outline" className="text-[9px] shrink-0">
                {ADMIN_SEARCH_TYPE_LABELS[result.type]}
              </Badge>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function AdminTopbar({ onToggleSidebar }: AdminTopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const pageMeta = getAdminPageMeta(pathname || '/admin/dashboard');
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<AdminSearchResult[]>([]);
  const { user, ready: sessionReady } = useSessionUser();

  const closePanels = useCallback(() => {
    setNotificationsOpen(false);
    setActionsOpen(false);
    setUserMenuOpen(false);
    setSearchOpen(false);
    setMobileSearchOpen(false);
  }, []);

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
    runWhenIdle(() => {
      loadNotifications();
    });
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
      const target = e.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
      if (actionsRef.current && !actionsRef.current.contains(target)) {
        setActionsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        closePanels();
        if (typeof window !== 'undefined' && window.innerWidth < 640) {
          setMobileSearchOpen(true);
        } else {
          searchInputRef.current?.focus();
        }
      }
      if (e.key === 'Escape') {
        if (mobileSearchOpen) {
          setMobileSearchOpen(false);
          setSearchQuery('');
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closePanels, mobileSearchOpen]);

  useEffect(() => {
    if (!mobileSearchOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => mobileSearchInputRef.current?.focus(), 50);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = prev;
    };
  }, [mobileSearchOpen]);

  const handleOpenNotifications = () => {
    setActionsOpen(false);
    setUserMenuOpen(false);
    setMobileSearchOpen(false);
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
    closePanels();
    setSearchQuery('');
    router.push(result.href);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setSearchOpen(false);
      setMobileSearchOpen(false);
      setSearchQuery('');
    } else if (e.key === 'Enter' && searchResults[0]) {
      handleSelectResult(searchResults[0]);
    }
  };

  const initials = sessionReady ? getUserInitials(user?.name, '—') : '—';
  const displayName = sessionReady ? user?.name || 'Administrateur' : 'Administrateur';
  const displayRole = sessionReady && isAdminUser(user) ? 'Administrateur' : sessionReady ? 'Staff' : '…';

  return (
    <>
      <header className="h-14 sm:h-16 bg-surface border-b border-border px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40 gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden p-2 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-muted shrink-0"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1 md:hidden">
            <p className="text-sm font-medium text-foreground truncate leading-tight">{pageMeta.title}</p>
            {pageMeta.section && (
              <p className="text-caption truncate">{pageMeta.section}</p>
            )}
          </div>

          <div ref={searchRef} className="relative w-full max-w-md hidden sm:block min-w-0">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchInputRef}
              placeholder="Rechercher clients, réservations, galeries…"
              className="pl-9 pr-16 h-10 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim().length >= 2) setSearchOpen(true);
              }}
              onKeyDown={handleSearchKeyDown}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-0.5 pointer-events-none">
              <kbd className="admin-kbd">⌘</kbd>
              <kbd className="admin-kbd">K</kbd>
            </span>

            {searchOpen && searchQuery.trim().length >= 2 && (
              <div className="absolute left-0 right-0 mt-2 surface-elevated rounded-lg z-50 max-h-80 overflow-y-auto admin-main-scroll">
                <AdminSearchDropdown
                  searchLoading={searchLoading}
                  searchResults={searchResults}
                  onSelect={handleSelectResult}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              closePanels();
              setMobileSearchOpen(true);
            }}
            className="sm:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-colors"
            aria-label="Rechercher"
          >
            <Search className="h-5 w-5" />
          </button>

          <ThemeSwitcher variant="compact" />

          <div ref={actionsRef} className="relative hidden md:block">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen(false);
                setUserMenuOpen(false);
                setMobileSearchOpen(false);
                setActionsOpen((o) => !o);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg surface-muted text-foreground hover:bg-muted text-xs font-medium transition-colors"
            >
              <Zap className="h-4 w-4 text-primary" />
              <span className="hidden lg:inline">Actions</span>
              <ChevronDown className={`h-3.5 w-3.5 opacity-60 transition-transform ${actionsOpen ? 'rotate-180' : ''}`} />
            </button>

            {actionsOpen && (
              <div className="absolute right-0 mt-2 w-56 surface-elevated rounded-lg z-50 p-2">
                <p className="px-3 py-1.5 text-caption font-semibold uppercase tracking-wider">
                  Actions rapides
                </p>
                <AdminQuickActionsMenu variant="menu" onDone={() => setActionsOpen(false)} />
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={handleOpenNotifications}
              className="relative p-2 rounded-lg surface-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-3 w-[min(100vw-1.5rem,24rem)] surface-elevated rounded-lg p-4 space-y-3 z-50">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="font-medium text-foreground text-sm flex items-center">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <Badge variant="accent" className="ml-2 text-[10px]">
                        {unreadCount} nouvelle(s)
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-caption text-primary hover:underline"
                      >
                        Tout lu
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Fermer
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto admin-main-scroll">
                  {notifications.length === 0 ? (
                    <p className="text-muted-foreground text-xs text-center py-4">Aucune activité récente.</p>
                  ) : (
                    notifications.map((n) => {
                      const { Icon, color } = iconForNotification(n);
                      return (
                        <div
                          key={n.id}
                          className={`p-3 rounded-lg border text-xs space-y-1 ${
                            !n.read ? 'bg-primary-muted border-primary/25' : 'bg-surface-muted border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between font-medium text-foreground">
                            <span className="flex items-center">
                              <Icon className={`h-3.5 w-3.5 mr-1.5 ${color}`} />
                              {n.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{n.createdAt}</span>
                          </div>
                          <p className="text-muted-foreground leading-relaxed line-clamp-2">{n.message}</p>
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

          <div ref={userMenuRef} className="relative pl-1.5 sm:pl-3 border-l border-border">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen(false);
                setActionsOpen(false);
                setMobileSearchOpen(false);
                setUserMenuOpen((o) => !o);
              }}
              className="flex items-center gap-2 sm:gap-3 rounded-lg py-1 pr-1 hover:bg-surface-muted transition-colors"
            >
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary-muted border border-primary/25 flex items-center justify-center shrink-0">
                <span
                  className="font-semibold text-primary text-xs"
                  suppressHydrationWarning
                >
                  {initials}
                </span>
              </div>
              <div className="hidden sm:block text-left text-xs min-w-0">
                <div className="font-medium text-foreground truncate max-w-[120px]" suppressHydrationWarning>
                  {displayName}
                </div>
                <div className="text-caption font-mono" suppressHydrationWarning>
                  {displayRole}
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground hidden sm:block transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 surface-elevated rounded-lg z-50 p-2">
                <p className="px-3 py-1.5 text-caption font-semibold uppercase tracking-wider truncate">
                  {user?.email || 'Compte admin'}
                </p>
                <div className="space-y-0.5 pb-2 border-b border-border mb-2">
                  {ADMIN_USER_MENU.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        target={item.external ? '_blank' : undefined}
                        rel={item.external ? 'noopener noreferrer' : undefined}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-colors"
                      >
                        <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.external && <ExternalLink className="h-3 w-3 opacity-50 shrink-0" />}
                      </Link>
                    );
                  })}
                </div>
                <AdminLogoutButton onDone={() => setUserMenuOpen(false)} />
              </div>
            )}
          </div>
        </div>
      </header>

      {mobileSearchOpen && (
        <div className="sm:hidden fixed inset-0 z-[60] flex flex-col bg-background">
          <div className="flex items-center gap-2 p-3 border-b border-border">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={mobileSearchInputRef}
                placeholder="Rechercher…"
                className="pl-9 h-11 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileSearchOpen(false);
                setSearchQuery('');
              }}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="Fermer la recherche"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto admin-main-scroll p-2">
            {searchQuery.trim().length < 2 ? (
              <p className="text-xs text-muted-foreground text-center py-8 px-4">
                Saisissez au moins 2 caractères pour lancer la recherche globale.
              </p>
            ) : (
              <div className="surface rounded-lg overflow-hidden">
                <AdminSearchDropdown
                  searchLoading={searchLoading}
                  searchResults={searchResults}
                  onSelect={handleSelectResult}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
