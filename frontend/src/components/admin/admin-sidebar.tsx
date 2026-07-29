'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Camera,
  LayoutDashboard,
  Users,
  CalendarDays,
  Image as ImageIcon,
  FileSpreadsheet,
  Settings,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  BarChart3,
  BookOpen,
  Star,
  Bell,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/settings-context';
import { StudioLogo } from '@/components/brand/studio-logo';

export function AdminSidebar({ onCloseMobile }: { onCloseMobile?: () => void }) {
  const pathname = usePathname();
  const { settings } = useSettings();

  const navItems = [
    { href: '/admin/dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
    { href: '/admin/analytics', label: 'Analytics & KPIs', icon: BarChart3 },
    { href: '/admin/users', label: 'Gestion Utilisateurs', icon: UserCheck },
    { href: '/admin/prestations', label: 'Catalogue Prestations', icon: Camera },
    { href: '/admin/blog', label: 'CMS Blog & Articles', icon: BookOpen },
    { href: '/admin/crm', label: 'CRM & Fiches Clients', icon: Users },
    { href: '/admin/reservations', label: 'Agenda & Réservations', icon: CalendarDays },
    { href: '/admin/devis-factures', label: 'Devis & Factures', icon: FileSpreadsheet },
    { href: '/admin/galeries', label: 'Galeries Photos', icon: ImageIcon },
    { href: '/admin/temoignages', label: 'Témoignages & Avis', icon: Star },
    { href: '/admin/notifications', label: 'Centre Notifications', icon: Bell },
    { href: '/admin/settings', label: 'Paramètres Studio', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-zinc-900/95 border-r border-zinc-800 p-6 flex flex-col justify-between shrink-0 min-h-screen">
      <div className="space-y-8">
        <StudioLogo size="sm" showSubtitle={false} />

        <nav className="space-y-1 text-sm font-medium">
          {navItems.map((item) => {
            const IconComp = item.icon;
            const isActive = pathname === item.href;
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
                <IconComp className={`h-4 w-4 ${isActive ? 'text-amber-400' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
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
