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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/loading-state';
import { ClientPageHeader } from '@/components/client/client-page-header';
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
  const firstName = currentUser.name.split(' ')[0];

  if (loading) {
    return <LoadingState message="Chargement de votre espace client…" />;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <ClientPageHeader
        title={`Bonjour, ${firstName}`}
        description={`${settings.studioName} — ${normalizeClientEmail(currentUser.email)}`}
        actions={
          <>
            <Link href="/client/reservations">
              <Button variant="outline" size="sm">
                <CalendarDays className="h-4 w-4" aria-hidden /> Mes réservations
              </Button>
            </Link>
            <Link href="/galerie-privee">
              <Button variant="primary" size="sm">
                <KeyRound className="h-4 w-4" aria-hidden /> Accès par clé
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { value: clientGalleries.length, label: 'Galerie(s) privée(s)' },
          { value: totalPhotos, label: 'Photos disponibles', accent: true },
          { value: bookings.length, label: 'Réservation(s)' },
          { value: paidBookings, label: 'Acompte(s) réglé(s)', success: true },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-5 pb-5">
              <div
                className={`text-2xl font-semibold tabular-nums ${
                  stat.success ? 'text-success' : stat.accent ? 'text-primary' : 'text-foreground'
                }`}
              >
                {stat.value}
              </div>
              <p className="text-caption mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {upcoming && (
        <Card className="border-primary/20">
          <CardContent className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-caption font-semibold uppercase tracking-wider text-primary">
                Prochaine séance
              </p>
              <h2 className="text-h3 text-foreground">{upcoming.serviceTitle}</h2>
              <p className="text-small text-muted-foreground">
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
                  Détails <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {notifPreview.unread > 0 && (
        <Link href="/client/notifications">
          <Card className="hover:border-primary/30 transition-colors cursor-pointer">
            <CardContent className="py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-primary" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {notifPreview.unread} notification(s) non lue(s)
                  </p>
                  {notifPreview.latest && (
                    <p className="text-caption truncate">{notifPreview.latest}</p>
                  )}
                </div>
              </div>
              <Badge variant="accent">{notifPreview.unread}</Badge>
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
              <Card className="h-full hover:border-primary/25 transition-colors cursor-pointer">
                <CardContent className="pt-5 pb-5 space-y-2">
                  <Icon className="h-5 w-5 text-primary" aria-hidden />
                  <p className="font-medium text-foreground text-sm">{item.label}</p>
                  <p className="text-caption">{item.desc}</p>
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
