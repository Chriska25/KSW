'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertCircle,
  Heart,
  Wallet,
  List,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/loading-state';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { useSettings } from '@/context/settings-context';
import { fetchAdminBookings } from '@/lib/admin-crm-api';
import { exportBookingsCsv } from '@/lib/admin-dashboard';
import { DEFAULT_TIME_SLOTS } from '@/lib/booking-availability';
import {
  addDays,
  computeBookingScheduleStats,
  formatFullDay,
  paymentLabelFr,
  startOfWeek,
  statusBadgeVariant,
  statusLabelFr,
  type DaySchedule,
  type ScheduleBooking,
} from '@/lib/booking-schedule-utils';
import { getApiErrorMessage } from '@/lib/api-error';

function SlotGrid({ day }: { day: DaySchedule }) {
  const bookedMap = new Map(day.bookings.map((b) => [b.time, b]));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {DEFAULT_TIME_SLOTS.map((slot) => {
        const booking = bookedMap.get(slot);
        const free = !booking;
        return (
          <div
            key={slot}
            className={`rounded-xl border p-3 min-h-[88px] flex flex-col justify-between ${
              free
                ? 'border-emerald-500/20 bg-emerald-500/5'
                : booking.isWedding
                  ? 'border-rose-400/30 bg-rose-500/10'
                  : 'border-amber-400/30 bg-amber-400/10'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-bold text-white font-mono">{slot}</span>
              <Badge variant={free ? 'success' : booking.isWedding ? 'warning' : 'gold'} className="text-[10px]">
                {free ? 'Libre' : booking.isWedding ? 'Mariage' : 'Réservé'}
              </Badge>
            </div>
            {booking ? (
              <div className="mt-2 space-y-0.5 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{booking.clientName}</p>
                <p className="text-[10px] text-zinc-400 truncate">{booking.serviceTitle}</p>
                <p className="text-[10px] font-mono text-amber-400/80">{booking.reference}</p>
              </div>
            ) : (
              <p className="text-[11px] text-emerald-300/80 mt-2">Créneau disponible</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function UpcomingRow({ booking }: { booking: ScheduleBooking }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-zinc-800/60 last:border-0">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-amber-400">{booking.reference}</span>
          <Badge variant={statusBadgeVariant(booking.status)} className="text-[10px]">
            {statusLabelFr(booking.status)}
          </Badge>
          {booking.isWedding && (
            <Badge variant="warning" className="text-[10px]">Mariage</Badge>
          )}
        </div>
        <p className="text-sm font-semibold text-white truncate">{booking.clientName}</p>
        <p className="text-xs text-zinc-400 truncate">{booking.serviceTitle}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-white">{formatFullDay(booking.date)}</p>
        <p className="text-xs text-zinc-400 flex items-center justify-end gap-1">
          <Clock className="h-3 w-3" /> {booking.time}
        </p>
        <p className="text-[10px] text-zinc-500 mt-1">{paymentLabelFr(booking.paymentStatus)}</p>
      </div>
    </div>
  );
}

export default function AdminReservationsDashboardPage() {
  const { formatPrice } = useSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState<Awaited<ReturnType<typeof fetchAdminBookings>>>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await fetchAdminBookings();
      setBookings(data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Impossible de charger les réservations.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () => computeBookingScheduleStats(bookings, weekStart),
    [bookings, weekStart]
  );

  const selectedDay =
    stats.weekDays.find((d) => d.date === selectedDate) ||
    stats.weekDays.find((d) => d.isToday) ||
    stats.weekDays[0];

  const weekLabel = `${formatFullDay(stats.weekDays[0]?.date || '')} → ${formatFullDay(stats.weekDays[6]?.date || '')}`;

  if (loading) {
    return <LoadingState message="Chargement du planning séances…" />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <AdminPageHeader
        title="Planning"
        accent="Séances"
        description="Vue agenda des réservations — créneaux, mariages et disponibilités."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Actualiser
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportBookingsCsv(bookings)} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
            <Link href="/admin/reservations/list">
              <Button variant="gold" size="sm" className="gap-1.5">
                <List className="h-3.5 w-3.5" /> Liste complète
              </Button>
            </Link>
          </>
        }
      />

      {error && (
        <p className="text-rose-400 text-sm rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="glass-panel border-amber-400/30">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Aujourd&apos;hui</span>
              <CalendarDays className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-2xl font-extrabold text-white mt-2">{stats.todayCount}</p>
            <p className="text-[11px] text-zinc-500">séance(s)</p>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Cette semaine</span>
              <Users className="h-4 w-4 text-zinc-400" />
            </div>
            <p className="text-2xl font-extrabold text-white mt-2">{stats.weekCount}</p>
            <p className="text-[11px] text-zinc-500">réservation(s) actives</p>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">En attente</span>
              <AlertCircle className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-2xl font-extrabold text-white mt-2">{stats.pendingCount}</p>
            <p className="text-[11px] text-zinc-500">à confirmer</p>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Acomptes</span>
              <Wallet className="h-4 w-4 text-rose-400" />
            </div>
            <p className="text-2xl font-extrabold text-white mt-2">{stats.unpaidCount}</p>
            <p className="text-[11px] text-zinc-500">non payés</p>
          </CardContent>
        </Card>
        <Card className="glass-panel border-rose-400/20">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Mariages</span>
              <Heart className="h-4 w-4 text-rose-400" />
            </div>
            <p className="text-2xl font-extrabold text-white mt-2">{stats.weddingWeekCount}</p>
            <p className="text-[11px] text-zinc-500">cette semaine</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Semaine en cours</CardTitle>
            <CardDescription className="capitalize">{weekLabel}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const prev = addDays(weekStart, -7);
                setWeekStart(prev);
                setSelectedDate(prev.toISOString().slice(0, 10));
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = startOfWeek(new Date());
                setWeekStart(now);
                setSelectedDate(new Date().toISOString().slice(0, 10));
              }}
            >
              Aujourd&apos;hui
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const next = addDays(weekStart, 7);
                setWeekStart(next);
                setSelectedDate(next.toISOString().slice(0, 10));
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {stats.weekDays.map((day) => {
              const selected = day.date === selectedDate;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    selected
                      ? 'border-amber-400 bg-amber-400/15 ring-1 ring-amber-400/40'
                      : day.isToday
                        ? 'border-amber-400/40 bg-zinc-900/60'
                        : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-600'
                  }`}
                >
                  <p className="text-[10px] uppercase text-zinc-500 font-semibold">{day.label.split(' ')[0]}</p>
                  <p className="text-lg font-extrabold text-white mt-1">{day.label.split(' ').slice(1).join(' ')}</p>
                  <p className="text-[11px] mt-2 text-zinc-400">
                    {day.bookings.length} séance{day.bookings.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-[10px] text-emerald-400/90">{day.freeSlots.length} créneau(x) libre(s)</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDay && (
        <Card className="glass-panel border-amber-400/20">
          <CardHeader>
            <CardTitle className="text-lg capitalize">{formatFullDay(selectedDay.date)}</CardTitle>
            <CardDescription>
              {selectedDay.bookings.length} réservation(s) · {selectedDay.freeSlots.length} créneau(x) disponible(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SlotGrid day={selectedDay} />
            {selectedDay.bookings.length > 0 && (
              <div className="rounded-xl border border-zinc-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-950/80 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Heure</th>
                      <th className="py-2.5 px-4 text-left">Client</th>
                      <th className="py-2.5 px-4 text-left">Prestation</th>
                      <th className="py-2.5 px-4 text-left">Statut</th>
                      <th className="py-2.5 px-4 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {selectedDay.bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-zinc-900/40">
                        <td className="py-3 px-4 font-mono text-amber-400">{b.time}</td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-white">{b.clientName}</div>
                          <div className="text-xs text-zinc-500">{b.clientEmail}</div>
                        </td>
                        <td className="py-3 px-4 text-zinc-300">{b.serviceTitle}</td>
                        <td className="py-3 px-4">
                          <Badge variant={statusBadgeVariant(b.status)} className="text-[10px]">
                            {statusLabelFr(b.status)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-300">{formatPrice(b.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-lg">Prochaines séances</CardTitle>
          <CardDescription>Les 12 prochaines réservations à venir.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.upcoming.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">Aucune séance à venir.</p>
          ) : (
            stats.upcoming.map((b) => (
              <UpcomingRow key={b.id} booking={b} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
