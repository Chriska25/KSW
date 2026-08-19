'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { galleryAccessPath } from '@/lib/gallery-access-path';
import {
  Bell,
  Calendar,
  CreditCard,
  FolderHeart,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/loading-state';
import { ClientPageHeader } from '@/components/client/client-page-header';
import {
  fetchClientNotifications,
  markClientNotificationsRead,
  type ClientNotification,
} from '@/lib/client-notifications';
import { getApiErrorMessage } from '@/lib/api-error';

export default function ClientNotificationsPage() {
  return <ClientNotificationsContent />;
}

function iconFor(type: ClientNotification['type']) {
  switch (type) {
    case 'payment':
      return CreditCard;
    case 'gallery':
      return FolderHeart;
    default:
      return Calendar;
  }
}

function ClientNotificationsContent() {
  const [items, setItems] = useState<ClientNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await fetchClientNotifications();
      setItems(res.data);
      setUnreadCount(res.unreadCount);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Impossible de charger vos notifications.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkAll = async () => {
    try {
      await markClientNotificationsRead({ all: true });
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const handleMarkOne = async (id: string) => {
    try {
      await markClientNotificationsRead({ ids: [id] });
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  if (loading) {
    return <LoadingState message="Chargement de vos notifications…" />;
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <ClientPageHeader
        title="Mes"
        accent="Notifications"
        description="Réservations, paiements et galeries associées à votre compte."
        icon={Bell}
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={handleMarkAll}>
              Tout marquer lu ({unreadCount})
            </Button>
          ) : undefined
        }
      />

      {error && (
        <p className="text-danger text-sm rounded-xl border border-danger/30 bg-danger/10 px-4 py-3">
          {error}
        </p>
      )}

      <Card className="">
        <CardHeader>
          <CardTitle className="text-lg">Activité récente</CardTitle>
          <CardDescription>
            Les confirmations par email sont également envoyées à votre adresse si SMTP est configuré.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-10">Aucune notification pour le moment.</p>
          ) : (
            items.map((n) => {
              const Icon = iconFor(n.type);
              return (
                <div
                  key={n.id}
                  className={`rounded-xl border p-4 flex gap-4 ${
                    n.read ? 'border-border bg-surface-muted' : 'border-primary/30 bg-primary-muted'
                  }`}
                >
                  <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground text-sm">{n.title}</h3>
                      {!n.read && <Badge variant="primary" className="text-[10px] shrink-0">Nouveau</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground">{n.createdAt}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {n.type === 'gallery' && n.accessKey && (
                        <Link href={galleryAccessPath(n.accessKey)}>
                          <Button variant="primary" size="sm" className="text-xs h-8">
                            Ouvrir la galerie <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      )}
                      {n.type === 'booking' && (
                        <Link href="/client/reservations">
                          <Button variant="outline" size="sm" className="text-xs h-8">
                            Voir mes réservations
                          </Button>
                        </Link>
                      )}
                      {!n.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => handleMarkOne(n.id)}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Marquer lu
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
