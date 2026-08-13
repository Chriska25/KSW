'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AppLink } from '@/components/navigation/app-link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ExternalLink, LogOut, Search, X } from 'lucide-react';
import { ButtonLink } from '@/components/navigation/button-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StudioLogo } from '@/components/brand/studio-logo';
import {
  CLIENT_NAV_SECTIONS,
  CLIENT_SHORTCUT_LINKS,
  findClientNavSection,
  isClientNavItemActive,
  type ClientNavSection,
} from '@/lib/client-nav';
import { clearClientSession, getClientInitials } from '@/lib/client-session';
import { resolveAvatarUrl } from '@/lib/profile-api';
import { useSessionUser } from '@/hooks/use-session-user';

const COLLAPSE_STORAGE_KEY = 'client_nav_collapsed_sections';

function loadCollapsed(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(COLLAPSE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function saveCollapsed(state: Record<string, boolean>) {
  try {
    localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function itemMatchesFilter(label: string, keywords: string | undefined, filter: string): boolean {
  const q = filter.trim().toLowerCase();
  if (!q) return true;
  return label.toLowerCase().includes(q) || Boolean(keywords?.toLowerCase().includes(q));
}

export function ClientSidebar({
  unreadNotifs = 0,
  onCloseMobile,
}: {
  unreadNotifs?: number;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useSessionUser();
  const [navFilter, setNavFilter] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    setCollapsed(loadCollapsed());
  }, []);

  useEffect(() => {
    const active = findClientNavSection(pathname || '');
    if (!active) return;
    setCollapsed((prev) => {
      const next = { ...prev, [active.id]: false };
      saveCollapsed(next);
      return next;
    });
  }, [pathname]);

  const filteredSections = useMemo(() => {
    const q = navFilter.trim().toLowerCase();
    if (!q) return CLIENT_NAV_SECTIONS;

    return CLIENT_NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => itemMatchesFilter(item.label, item.keywords, q)),
    })).filter((section) => section.items.length > 0);
  }, [navFilter]);

  const toggleSection = (sectionId: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      saveCollapsed(next);
      return next;
    });
  };

  const getBadge = (badgeKey?: string) => {
    if (badgeKey === 'notifications' && unreadNotifs > 0) return unreadNotifs;
    return 0;
  };

  const initials = user ? getClientInitials(user.name) : '?';
  const avatarSrc = user?.avatarUrl ? resolveAvatarUrl(user.avatarUrl) : undefined;

  const handleLogout = () => {
    clearClientSession();
    router.push('/login');
    onCloseMobile?.();
  };

  const renderSection = (section: ClientNavSection) => {
    const isFiltering = navFilter.trim().length > 0;
    const isCollapsed = !isFiltering && collapsed[section.id];
    const hasActive = section.items.some((item) => isClientNavItemActive(pathname || '', item));

    return (
      <div key={section.id} className="space-y-0.5">
        <button
          type="button"
          onClick={() => toggleSection(section.id)}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
            hasActive ? 'text-amber-400/90' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <span>{section.label}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
          />
        </button>

        {!isCollapsed && (
          <div className="space-y-0.5 pb-2">
            {section.items.map((item) => {
              const IconComp = item.icon;
              const active = isClientNavItemActive(pathname || '', item);
              const badge = getBadge(item.badgeKey);
              return (
                <AppLink
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-150 ${
                    active
                      ? 'bg-amber-400/10 text-amber-300 font-semibold border border-amber-400/25 shadow-sm shadow-amber-400/5'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent'
                  }`}
                >
                  <IconComp
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      active ? 'text-amber-400' : 'text-zinc-500 group-hover:text-zinc-300'
                    }`}
                  />
                  <span className="truncate flex-1">{item.label}</span>
                  {badge > 0 && (
                    <span className="text-[10px] bg-amber-400 text-zinc-950 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                      {badge}
                    </span>
                  )}
                </AppLink>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-[17.5rem] bg-zinc-900/98 border-r border-zinc-800 flex flex-col shrink-0 h-full max-h-screen overflow-hidden">
      <div className="p-4 border-b border-zinc-800/80 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-4">
          <StudioLogo size="sm" showSubtitle={false} />
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            value={navFilter}
            onChange={(e) => setNavFilter(e.target.value)}
            placeholder="Filtrer le menu…"
            className="h-9 pl-8 pr-8 bg-zinc-950/80 border-zinc-800 text-xs"
          />
          {navFilter && (
            <button
              type="button"
              onClick={() => setNavFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              aria-label="Effacer le filtre"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-1 admin-sidebar-scroll">
        {filteredSections.length === 0 ? (
          <p className="px-3 py-6 text-xs text-zinc-500 text-center">Aucun menu ne correspond.</p>
        ) : (
          filteredSections.map(renderSection)
        )}

        <div className="pt-3 mt-2 border-t border-zinc-800/80 space-y-1">
          <button
            type="button"
            onClick={() => setShortcutsOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
          >
            <span>Raccourcis</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${shortcutsOpen ? 'rotate-180' : ''}`} />
          </button>
          {shortcutsOpen && (
            <div className="space-y-0.5 pb-2">
              {CLIENT_SHORTCUT_LINKS.map((item) => {
                const IconComp = item.icon;
                return (
                  <AppLink
                    key={item.href}
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    onClick={onCloseMobile}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/40 text-xs transition-colors"
                  >
                    <IconComp className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1">{item.label}</span>
                    {item.external && <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />}
                  </AppLink>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-zinc-800 shrink-0 space-y-2">
        {user ? (
          <>
            <AppLink
              href="/client/profile"
              onClick={onCloseMobile}
              className="flex items-center gap-3 px-1 rounded-lg hover:bg-zinc-800/40 py-1.5 transition-colors"
            >
              <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-amber-400 text-xs shrink-0 overflow-hidden border border-zinc-700">
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0 text-xs">
                <div className="font-semibold text-white truncate">{user.name}</div>
                <div className="text-zinc-500 truncate">{user.email}</div>
              </div>
            </AppLink>
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
          <AppLink href="/login" onClick={onCloseMobile}>
            <Button variant="outline" size="sm" className="w-full text-xs">
              Se connecter
            </Button>
          </AppLink>
        )}
        <ButtonLink
          href="/"
          onClick={onCloseMobile}
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs text-zinc-400"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-2" /> Retour au site public
        </ButtonLink>
      </div>
    </aside>
  );
}
