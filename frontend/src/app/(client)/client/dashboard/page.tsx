'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FolderHeart,
  CalendarDays,
  FileSpreadsheet,
  Bell,
  KeyRound,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/loading-state';
import { ClientGalleriesList } from '@/components/client/client-galleries-list';
import { useSettings } from '@/context/settings-context';
import { getClientSession, normalizeClientEmail } from '@/lib/client-session';
import { fetchClientGalleries } from '@/lib/gallery-client';
import { fetchClientNotifications } from '@/lib/client-notifications';
import {
  fetchClientBookings,
  getUpcomingBooking,
  bookingStatusLabel,
  bookingStatusVariant,
} from '@/lib/client-api';
import type { GalleryAdminItem } from '@/lib/gallery-types';
import type { AuthUser } from '@/hooks/use-auth';
import type { ClientBooking } from '@/lib/client-api';
import { getApiErrorMessage } from '@/lib/api-error';

export default function ClientDashboardPage() {
  return <ClientDashboardContent />;
}

function ClientDashboardContent() {
  const { settings } = useSettings();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [clientGalleries, setClientGalleries] = useState<GalleryAdminItem[]>([]);
  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notifPreview, setNotifPreview] = useState<{ unread: number; latest?: string }>({ unread: 0 });

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const [galleries, bookingList, notifs] = await Promise.all([
        fetchClientGalleries(),
        fetchClientBookings().catch(() => []),
        fetchClientNotifications().catch(() => ({ data: [], unreadCount: 0 })),
      ]);
      setClientGalleries(galleries);
      setBookings(bookingList);
      setNotifPreview({
        unread: notifs.unreadCount,
        latest: notifs.data[0]?.title,
      });
    } catch (err: unknown) {
      setLoadError(getApiErrorMessage(err, 'Impossible de charger votre espace client.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setCurrentUser(getClientSession());
    load();
  }, [load]);

  if (!currentUser) return null;

  const totalPhotos = clientGalleries.reduce((acc, g) => acc + (g.photos?.length || 0), 0);
  const upcoming = getUpcomingBooking(bookings);
  const paidBookings = bookings.filter((b) => b.paymentStatus === 'paid').length;

  if (loading) {
    return <LoadingState message="Chargement de votre espace client…" />;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="glass-panel rounded-2xl border-amber-400/20 p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <Badge variant="gold" className="text-[10px]">
              <Sparkles className="h-3 w-3 mr-1 inline" />
              Espace client
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Bonjour, <span className="gold-gradient-text">{currentUser.name.split(' ')[0]}</span>
            </h1>
            <p className="text-zinc-400 text-sm">
              {settings.studioName} — {normalizeClientEmail(currentUser.email)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/client/reservations">
              <Button variant="outline" size="sm">
                <CalendarDays className="h-4 w-4 mr-1.5" /> Mes réservations
              </Button>
            </Link>
            <Link href="/galerie-privee">
              <Button variant="gold" size="sm">
                <KeyRound className="h-4 w-4 mr-1.5" /> Accès par clé
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="glass-panel">
          <CardContent className="pt-5 pb-5">
            <div className="text-2xl font-bold text-white">{clientGalleries.length}</div>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-1">Galerie(s) privée(s)</p>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="pt-5 pb-5">
            <div className="text-2xl font-bold text-amber-400">{totalPhotos}</div>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-1">Photos disponibles</p>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="pt-5 pb-5">
            <div className="text-2xl font-bold text-white">{bookings.length}</div>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-1">Réservation(s)</p>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="pt-5 pb-5">
            <div className="text-2xl font-bold text-emerald-400">{paidBookings}</div>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-1">Acompte(s) réglé(s)</p>
          </CardContent>
        </Card>
      </div>

      {upcoming && (
        <Card className="glass-panel border-amber-400/25">
          <CardContent className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold">Prochaine séance</p>
              <h2 className="font-bold text-white">{upcoming.serviceTitle}</h2>
              <p className="text-xs text-zinc-400">
                {upcoming.date} à {upcoming.time}
                {upcoming.reference ? ` • Réf. ${upcoming.reference}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={bookingStatusVariant(upcoming.status, upcoming.paymentStatus)}>
                {bookingStatusLabel(upcoming.status, upcoming.paymentStatus)}
              </Badge>
              <Link href="/client/reservations">
                <Button variant="outline" size="sm" className="text-xs">
                  Détails <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {notifPreview.unread > 0 && (
        <Link href="/client/notifications">
          <Card className="glass-panel border-amber-400/30 hover:border-amber-400/50 transition-colors cursor-pointer">
            <CardContent className="py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    {notifPreview.unread} notification(s) non lue(s)
                  </p>
                  {notifPreview.latest && (
                    <p className="text-xs text-zinc-400 truncate">{notifPreview.latest}</p>
                  )}
                </div>
              </div>
              <Badge variant="gold">{notifPreview.unread}</Badge>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { href: '/client/galeries', label: 'Mes galeries', icon: FolderHeart, desc: 'Photos HD' },
          { href: '/client/reservations', label: 'Réservations', icon: CalendarDays, desc: 'Agenda & statuts' },
          { href: '/client/documents', label: 'Factures', icon: FileSpreadsheet, desc: 'Devis & PDF' },
          { href: '/client/notifications', label: 'Notifications', icon: Bell, desc: 'Activité récente' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="glass-panel h-full hover:border-amber-400/30 transition-colors cursor-pointer group">
                <CardContent className="pt-5 pb-5 space-y-2">
                  <Icon className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
                  <p className="font-semibold text-white text-sm">{item.label}</p>
                  <p className="text-[11px] text-zinc-500">{item.desc}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <ClientGalleriesList
        galleries={clientGalleries}
        loading={false}
        error={loadError}
        onRetry={load}
        showHeader
      />
    </div>
  );
}
