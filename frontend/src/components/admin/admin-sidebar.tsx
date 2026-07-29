'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  ShieldCheck,
  Zap,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudioLogo } from '@/components/brand/studio-logo';
import { ADMIN_MAIN_NAV, ADMIN_SHORTCUT_LINKS } from '@/lib/admin-nav';
import { AdminQuickActionsMenu } from '@/components/admin/admin-quick-actions';

export function AdminSidebar({ onCloseMobile }: { onCloseMobile?: () => void }) {
  const pathname = usePathname();
  const [shortcutsOpen, setShortcutsOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(false);

  return (
    <aside className="w-64 bg-zinc-900/95 border-r border-zinc-800 p-6 flex flex-col justify-between shrink-0 min-h-screen overflow-y-auto">
      <div className="space-y-6">
        <StudioLogo size="sm" showSubtitle={false} />

        <nav className="space-y-1 text-sm font-medium">
          <p className="px-3.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Navigation
          </p>
          {ADMIN_MAIN_NAV.map((item) => {
            const IconComp = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-400/10 text-amber-400 font-semibold border border-amber-400/30 shadow-md shadow-amber-400/5'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <IconComp className={`h-4 w-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-zinc-400'}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setShortcutsOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
          >
            <span>Raccourcis</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${shortcutsOpen ? 'rotate-180' : ''}`} />
          </button>
          {shortcutsOpen && (
            <div className="space-y-0.5">
              {ADMIN_SHORTCUT_LINKS.map((item) => {
                const IconComp = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    onClick={onCloseMobile}
                    className="flex items-center space-x-3 px-3.5 py-2 rounded-xl text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/40 text-xs transition-colors"
                  >
                    <IconComp className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                    <span className="truncate flex-1">{item.label}</span>
                    {item.external && <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setToolsOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
          >
            <span className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-amber-400/80" /> Outils rapides
            </span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${toolsOpen ? 'rotate-180' : ''}`} />
          </button>
          {toolsOpen && (
            <div className="px-1">
              <AdminQuickActionsMenu variant="inline" onDone={onCloseMobile} />
            </div>
          )}
        </div>
      </div>

      <div className="pt-6 border-t border-zinc-800 space-y-4">
        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1">
          <div className="font-semibold text-white flex items-center">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400 mr-1" /> Licence Pro Active
          </div>
          <p className="text-[11px] text-zinc-400">FastAPI + Next.js • PostgreSQL</p>
        </div>

        <Link href="/">
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-zinc-400">
            <ArrowLeft className="h-3.5 w-3.5 mr-2" /> Retour au site public
          </Button>
        </Link>
      </div>
    </aside>
  );
}
