import type { ApiBooking } from '@/lib/admin-crm-api';
import { DEFAULT_TIME_SLOTS } from '@/lib/booking-availability';

export { DEFAULT_TIME_SLOTS };

export interface ScheduleBooking {
  id: string;
  reference: string;
  clientName: string;
  clientEmail: string;
  serviceTitle: string;
  date: string;
  time: string;
  status: ApiBooking['status'];
  paymentStatus?: string;
  location?: string;
  isWedding: boolean;
  depositAmount: number;
  totalAmount: number;
}

export interface DaySchedule {
  date: string;
  label: string;
  weekday: string;
  isToday: boolean;
  bookings: ScheduleBooking[];
  bookedSlots: string[];
  freeSlots: string[];
}

export interface BookingScheduleStats {
  todayCount: number;
  weekCount: number;
  pendingCount: number;
  unpaidCount: number;
  weddingWeekCount: number;
  upcoming: ScheduleBooking[];
  weekDays: DaySchedule[];
}

function normalizeDate(raw?: string): string {
  return (raw || '').trim().slice(0, 10);
}

function normalizeTime(raw?: string): string {
  const t = (raw || '').trim();
  return t.length >= 5 ? t.slice(0, 5) : t;
}

function parseIsoDate(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00`);
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isWeddingTitle(title: string): boolean {
  const t = title.toLowerCase();
  return t.includes('mariage') || t.includes('wedding');
}

function isActiveBooking(b: ApiBooking): boolean {
  return (b.status || 'pending') !== 'cancelled';
}

export function mapToScheduleBooking(b: ApiBooking): ScheduleBooking {
  return {
    id: b.id,
    reference: b.reference || `RES-${b.id.slice(0, 8).toUpperCase()}`,
    clientName: `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.email,
    clientEmail: b.email,
    serviceTitle: b.serviceTitle,
    date: normalizeDate(b.date),
    time: normalizeTime(b.time),
    status: (b.status || 'pending') as ApiBooking['status'],
    paymentStatus: b.paymentStatus,
    location: b.location,
    isWedding: isWeddingTitle(b.serviceTitle || ''),
    depositAmount: Number(b.depositAmount) || 0,
    totalAmount: Number(b.totalPrice) || 0,
  };
}

export function startOfWeek(date: Date, weekStartsOnMonday = true): Date {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  const diff = weekStartsOnMonday ? (day === 0 ? -6 : 1 - day) : -day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatDayLabel(dateStr: string): string {
  return parseIsoDate(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatFullDay(dateStr: string): string {
  return parseIsoDate(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function buildWeekDays(weekStart: Date, bookings: ScheduleBooking[]): DaySchedule[] {
  const today = toIsoDate(new Date());
  const days: DaySchedule[] = [];

  for (let i = 0; i < 7; i += 1) {
    const d = addDays(weekStart, i);
    const date = toIsoDate(d);
    const dayBookings = bookings
      .filter((b) => b.date === date)
      .sort((a, b) => a.time.localeCompare(b.time));
    const bookedSlots = dayBookings.map((b) => b.time);
    const bookedSet = new Set(bookedSlots);
    const freeSlots = DEFAULT_TIME_SLOTS.filter((slot) => !bookedSet.has(slot));

    days.push({
      date,
      label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
      weekday: d.toLocaleDateString('fr-FR', { weekday: 'long' }),
      isToday: date === today,
      bookings: dayBookings,
      bookedSlots,
      freeSlots,
    });
  }

  return days;
}

export function computeBookingScheduleStats(
  rawBookings: ApiBooking[],
  weekStart: Date
): BookingScheduleStats {
  const active = rawBookings.filter(isActiveBooking).map(mapToScheduleBooking);
  const today = toIsoDate(new Date());
  const weekEnd = toIsoDate(addDays(weekStart, 6));

  const inWeek = (b: ScheduleBooking) => b.date >= toIsoDate(weekStart) && b.date <= weekEnd;

  const weekDays = buildWeekDays(weekStart, active);
  const todayCount = active.filter((b) => b.date === today).length;
  const weekCount = active.filter(inWeek).length;
  const pendingCount = active.filter((b) => b.status === 'pending').length;
  const unpaidCount = active.filter((b) => b.paymentStatus !== 'paid' && b.status !== 'cancelled').length;
  const weddingWeekCount = active.filter((b) => b.isWedding && inWeek(b)).length;

  const now = new Date();
  const upcoming = active
    .filter((b) => {
      const session = new Date(`${b.date}T${b.time || '00:00'}:00`);
      return session >= now && b.status !== 'completed';
    })
    .sort((a, b) => {
      const da = `${a.date} ${a.time}`;
      const db = `${b.date} ${b.time}`;
      return da.localeCompare(db);
    })
    .slice(0, 12);

  return {
    todayCount,
    weekCount,
    pendingCount,
    unpaidCount,
    weddingWeekCount,
    upcoming,
    weekDays,
  };
}

export function statusBadgeVariant(status: ApiBooking['status']): 'gold' | 'success' | 'outline' | 'warning' {
  switch (status) {
    case 'confirmed':
      return 'success';
    case 'completed':
      return 'outline';
    case 'cancelled':
      return 'warning';
    default:
      return 'gold';
  }
}

export function statusLabelFr(status: ApiBooking['status']): string {
  switch (status) {
    case 'confirmed':
      return 'Confirmée';
    case 'completed':
      return 'Effectuée';
    case 'cancelled':
      return 'Annulée';
    default:
      return 'En attente';
  }
}

export function paymentLabelFr(paymentStatus?: string): string {
  switch (paymentStatus) {
    case 'paid':
      return 'Acompte payé';
    case 'mobile_money_pending':
      return 'Mobile Money en attente';
    default:
      return 'Acompte non payé';
  }
}
