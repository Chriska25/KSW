'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AppLink } from '@/components/navigation/app-link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  ExternalLink,
  Search,
  X,
  Zap,
} from 'lucide-react';
import { ButtonLink } from '@/components/navigation/button-link';
import { Input } from '@/components/ui/input';
import { StudioLogo } from '@/components/brand/studio-logo';
import {
  ADMIN_NAV_SECTIONS,
  ADMIN_SHORTCUT_LINKS,
  findAdminNavSection,
  type AdminNavSection,
} from '@/lib/admin-nav';
import { AdminQuickActionsMenu } from '@/components/admin/admin-quick-actions';

const COLLAPSE_STORAGE_KEY = 'admin_nav_collapsed_sections';

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

export function AdminSidebar({ onCloseMobile }: { onCloseMobile?: () => void }) {
  const pathname = usePathname();
  const [navFilter, setNavFilter] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  useEffect(() => {
    setCollapsed(loadCollapsed());
  }, []);

  useEffect(() => {
    const active = findAdminNavSection(pathname || '');
    if (!active) return;
    setCollapsed((prev) => {
      const next = { ...prev, [active.id]: false };
      saveCollapsed(next);
      return next;
    });
  }, [pathname]);

  const filteredSections = useMemo(() => {
    const q = navFilter.trim().toLowerCase();
    if (!q) return ADMIN_NAV_SECTIONS;

    return ADMIN_NAV_SECTIONS.map((section) => ({
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

  const renderSection = (section: AdminNavSection) => {
    const isFiltering = navFilter.trim().length > 0;
    const isCollapsed = !isFiltering && collapsed[section.id];
    const hasActive = section.items.some(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    );

    return (
      <div key={section.id} className="space-y-0.5">
        <button
          type="button"
          onClick={() => toggleSection(section.id)}
          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-colors ${
            hasActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
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
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <AppLink
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                    isActive
                      ? 'bg-primary-muted text-primary font-medium border border-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-surface-muted border border-transparent'
                  }`}
                >
                  <IconComp
                    className={`h-4 w-4 shrink-0 transition-colors ${
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </AppLink>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-[17.5rem] bg-surface border-r border-border flex flex-col shrink-0 h-full max-h-screen overflow-hidden">
      <div className="p-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between gap-2 mb-4">
          <StudioLogo size="sm" showSubtitle={false} />
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={navFilter}
            onChange={(e) => setNavFilter(e.target.value)}
            placeholder="Filtrer le menu…"
            className="h-9 pl-8 pr-8 text-xs"
          />
          {navFilter && (
            <button
              type="button"
              onClick={() => setNavFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Effacer le filtre"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-1 admin-sidebar-scroll">
        {filteredSections.length === 0 ? (
          <p className="px-3 py-6 text-xs text-muted-foreground text-center">Aucun menu ne correspond.</p>
        ) : (
          filteredSections.map(renderSection)
        )}

        <div className="pt-3 mt-2 border-t border-border space-y-1">
          <button
            type="button"
            onClick={() => setShortcutsOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            <span>Raccourcis</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${shortcutsOpen ? 'rotate-180' : ''}`} />
          </button>
          {shortcutsOpen && (
            <div className="space-y-0.5 pb-2">
              {ADMIN_SHORTCUT_LINKS.map((item) => {
                const IconComp = item.icon;
                return (
                  <AppLink
                    key={item.href}
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    onClick={onCloseMobile}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-muted text-xs transition-colors"
                  >
                    <IconComp className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1">{item.label}</span>
                    {item.external && <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />}
                  </AppLink>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => setToolsOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-primary" /> Actions rapides
            </span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
          </button>
          {toolsOpen && (
            <div className="px-1 pb-2">
              <AdminQuickActionsMenu variant="inline" onDone={onCloseMobile} />
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-border shrink-0 space-y-2">
        <ButtonLink
          href="/"
          onClick={onCloseMobile}
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-2" /> Retour au site public
        </ButtonLink>
      </div>
    </aside>
  );
}
