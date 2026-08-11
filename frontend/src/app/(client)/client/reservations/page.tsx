'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, CreditCard, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/loading-state';
import { ClientPageHeader } from '@/components/client/client-page-header';
import { useSettings } from '@/context/settings-context';
import {
  fetchClientBookings,
  bookingStatusLabel,
  bookingStatusVariant,
  type ClientBooking,
} from '@/lib/client-api';
import { getApiErrorMessage } from '@/lib/api-error';

export default function ClientReservationsPage() {
  return <ClientReservationsContent />;
}

function ClientReservationsContent() {
  const { formatPrice } = useSettings();
  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await fetchClientBookings();
      setBookings(data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Impossible de charger vos réservations.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <LoadingState message="Chargement de vos réservations…" />;
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <ClientPageHeader
        title="Mes"
        accent="Réservations"
        description="Suivi de vos séances photo, acomptes et confirmations studio."
        icon={CalendarDays}
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={load} className="space-x-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Actualiser</span>
            </Button>
            <Link href="/reservation">
              <Button variant="gold" size="sm">Nouvelle réservation</Button>
            </Link>
          </>
        }
      />

      {error && (
        <p className="text-rose-400 text-sm rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          {error}
        </p>
      )}

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-lg">Historique</CardTitle>
          <CardDescription>{bookings.length} demande(s) enregistrée(s)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {bookings.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <CalendarDays className="h-12 w-12 text-zinc-600 mx-auto" />
              <p className="text-sm text-zinc-400">Aucune réservation pour le moment.</p>
              <Link href="/reservation">
                <Button variant="gold" size="sm">Réserver une séance</Button>
              </Link>
            </div>
          ) : (
            bookings.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white">{b.serviceTitle}</h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      {b.date} à {b.time}
                      {b.reference ? ` • Réf. ${b.reference}` : ''}
                    </p>
                  </div>
                  <Badge variant={bookingStatusVariant(b.status, b.paymentStatus)}>
                    {bookingStatusLabel(b.status, b.paymentStatus)}
                  </Badge>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800">
                    <p className="text-zinc-500">Total TTC</p>
                    <p className="font-bold text-white mt-0.5">{formatPrice(b.totalPrice || 0)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800">
                    <p className="text-zinc-500">Acompte</p>
                    <p className="font-bold text-amber-400 mt-0.5">{formatPrice(b.depositAmount || 0)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900/80 border border-zinc-800">
                    <p className="text-zinc-500">Créée le</p>
                    <p className="font-semibold text-zinc-300 mt-0.5">{b.createdAt || '—'}</p>
                  </div>
                </div>

                {b.paymentStatus !== 'paid' && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link href="/reservation">
                      <Button variant="gold" size="sm" className="text-xs h-8">
                        <CreditCard className="h-3.5 w-3.5 mr-1" />
                        Régler l&apos;acompte
                      </Button>
                    </Link>
                  </div>
                )}

                {b.invoiceNumber && (
                  <Link href="/client/documents" className="inline-flex items-center text-[11px] text-amber-400 hover:underline">
                    Facture {b.invoiceNumber} <ExternalLink className="h-3 w-3 ml-1" />
                  </Link>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
