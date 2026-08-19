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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
            className={`rounded-lg border p-3 min-h-[88px] flex flex-col justify-between ${
              free
                ? 'border-success/30 bg-success/5'
                : booking.isWedding
                  ? 'border-danger/30 bg-danger/5'
                  : 'border-primary/30 bg-primary-muted'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground font-mono tabular-nums">{slot}</span>
              <Badge variant={free ? 'success' : booking.isWedding ? 'warning' : 'accent'} className="text-[10px]">
                {free ? 'Libre' : booking.isWedding ? 'Mariage' : 'Réservé'}
              </Badge>
            </div>
            {booking ? (
              <div className="mt-2 space-y-0.5 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{booking.clientName}</p>
                <p className="text-caption truncate">{booking.serviceTitle}</p>
                <p className="text-caption font-mono text-primary">{booking.reference}</p>
              </div>
            ) : (
              <p className="text-caption text-success mt-2">Créneau disponible</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function UpcomingRow({ booking }: { booking: ScheduleBooking }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-border last:border-0">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-caption text-primary">{booking.reference}</span>
          <Badge variant={statusBadgeVariant(booking.status)} className="text-[10px]">
            {statusLabelFr(booking.status)}
          </Badge>
          {booking.isWedding && (
            <Badge variant="warning" className="text-[10px]">Mariage</Badge>
          )}
        </div>
        <p className="text-sm font-semibold text-foreground truncate">{booking.clientName}</p>
        <p className="text-xs text-muted-foreground truncate">{booking.serviceTitle}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-foreground">{formatFullDay(booking.date)}</p>
        <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
          <Clock className="h-3 w-3" /> {booking.time}
        </p>
        <p className="text-caption mt-1">{paymentLabelFr(booking.paymentStatus)}</p>
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
              <Button variant="primary" size="sm" className="gap-1.5">
                <List className="h-3.5 w-3.5" /> Liste complète
              </Button>
            </Link>
          </>
        }
      />

      {error && (
        <p className="text-danger text-sm rounded-lg border border-danger/30 bg-danger/10 px-4 py-3">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-caption font-semibold uppercase">Aujourd&apos;hui</CardTitle>
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground tabular-nums">{stats.todayCount}</div>
            <div className="text-caption mt-1">séance(s)</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-caption font-semibold uppercase">Cette semaine</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground tabular-nums">{stats.weekCount}</div>
            <div className="text-caption mt-1">réservation(s) active(s)</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-caption font-semibold uppercase">En attente</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground tabular-nums">{stats.pendingCount}</div>
            <div className="text-caption mt-1">à confirmer</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-caption font-semibold uppercase">Acomptes</CardTitle>
            <Wallet className="h-4 w-4 text-danger" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground tabular-nums">{stats.unpaidCount}</div>
            <div className="text-caption mt-1">non payés</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-caption font-semibold uppercase">Mariages</CardTitle>
            <Heart className="h-4 w-4 text-danger" aria-hidden />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground tabular-nums">{stats.weddingWeekCount}</div>
            <div className="text-caption mt-1">cette semaine</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-h2">Semaine en cours</CardTitle>
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
              aria-label="Semaine précédente"
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
              aria-label="Semaine suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {stats.weekDays.map((day) => {
              const selected = day.date === selectedDate;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    selected
                      ? 'border-primary bg-primary-muted ring-1 ring-primary/40'
                      : day.isToday
                        ? 'border-primary/40 bg-surface-muted'
                        : 'border-border bg-surface hover:border-muted-foreground/40'
                  }`}
                >
                  <p className="text-caption font-semibold uppercase">{day.label.split(' ')[0]}</p>
                  <p className="text-lg font-semibold text-foreground mt-1 tabular-nums">{day.label.split(' ').slice(1).join(' ')}</p>
                  <p className="text-caption mt-2">
                    {day.bookings.length} séance{day.bookings.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-caption text-success">{day.freeSlots.length} créneau(x) libre(s)</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDay && (
        <Card>
          <CardHeader>
            <CardTitle className="text-h2 capitalize">{formatFullDay(selectedDay.date)}</CardTitle>
            <CardDescription>
              {selectedDay.bookings.length} réservation(s) · {selectedDay.freeSlots.length} créneau(x) disponible(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SlotGrid day={selectedDay} />
            {selectedDay.bookings.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Heure</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Prestation</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDay.bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-primary tabular-nums">{b.time}</TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{b.clientName}</div>
                        <div className="text-caption">{b.clientEmail}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{b.serviceTitle}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(b.status)} className="text-[10px]">
                          {statusLabelFr(b.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatPrice(b.totalAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-h2">Prochaines séances</CardTitle>
          <CardDescription>Les 12 prochaines réservations à venir.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune séance à venir.</p>
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
