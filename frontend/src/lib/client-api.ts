import apiClient from '@/lib/api-client';
import type { InvoiceRow } from '@/lib/admin-dashboard';

export interface ClientBooking {
  id: string;
  reference?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  serviceTitle?: string;
  date?: string;
  time?: string;
  totalPrice?: number;
  depositAmount?: number;
  status?: string;
  paymentStatus?: string;
  createdAt?: string;
  paidAt?: string;
  invoiceNumber?: string;
}

export interface ClientInvoicesSummary {
  totalInvoiced: number;
  totalPaid: number;
  remaining: number;
}

function normalizeBooking(raw: Record<string, unknown>): ClientBooking {
  return {
    id: String(raw.id || ''),
    reference: raw.reference ? String(raw.reference) : undefined,
    firstName: raw.firstName ? String(raw.firstName) : undefined,
    lastName: raw.lastName ? String(raw.lastName) : undefined,
    email: raw.email ? String(raw.email) : undefined,
    serviceTitle: raw.serviceTitle ? String(raw.serviceTitle) : undefined,
    date: raw.date ? String(raw.date) : undefined,
    time: raw.time ? String(raw.time) : undefined,
    totalPrice: Number(raw.totalPrice || 0),
    depositAmount: Number(raw.depositAmount || 0),
    status: raw.status ? String(raw.status) : undefined,
    paymentStatus: raw.paymentStatus ? String(raw.paymentStatus) : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    paidAt: raw.paidAt ? String(raw.paidAt) : undefined,
    invoiceNumber: raw.invoiceNumber ? String(raw.invoiceNumber) : undefined,
  };
}

function normalizeInvoice(raw: Record<string, unknown>): InvoiceRow {
  return {
    id: String(raw.id || ''),
    number: String(raw.number || ''),
    clientName: String(raw.clientName || ''),
    serviceTitle: String(raw.serviceTitle || ''),
    issueDate: String(raw.issueDate || ''),
    dueDate: String(raw.dueDate || ''),
    totalAmount: Number(raw.totalAmount || 0),
    paidAmount: Number(raw.paidAmount || 0),
    status: (raw.status as InvoiceRow['status']) || 'unpaid',
    paymentMethod: (raw.paymentMethod === 'Stripe (Carte)' || raw.paymentMethod === 'PayPal' || raw.paymentMethod === 'Virement'
      ? raw.paymentMethod
      : 'Virement') as InvoiceRow['paymentMethod'],
  };
}

export async function fetchClientBookings(): Promise<ClientBooking[]> {
  const res = await apiClient.get('/client/bookings');
  if (!Array.isArray(res.data?.data)) return [];
  return res.data.data.map((row: Record<string, unknown>) => normalizeBooking(row));
}

export async function fetchClientInvoices(): Promise<{
  data: InvoiceRow[];
  summary: ClientInvoicesSummary;
}> {
  const res = await apiClient.get('/client/invoices');
  const data = Array.isArray(res.data?.data)
    ? res.data.data.map((row: Record<string, unknown>) => normalizeInvoice(row))
    : [];
  const summary = res.data?.summary || { totalInvoiced: 0, totalPaid: 0, remaining: 0 };
  return {
    data,
    summary: {
      totalInvoiced: Number(summary.totalInvoiced || 0),
      totalPaid: Number(summary.totalPaid || 0),
      remaining: Number(summary.remaining || 0),
    },
  };
}

export async function changeClientPassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post('/client/profile/password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export function parseBookingDate(value?: string): Date | null {
  if (!value) return null;
  const iso = value.includes('/') ? value.split('/').reverse().join('-') : value;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getUpcomingBooking(bookings: ClientBooking[]): ClientBooking | null {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcoming = bookings
    .filter((b) => {
      const d = parseBookingDate(b.date);
      return d ? d >= now : false;
    })
    .sort((a, b) => {
      const da = parseBookingDate(a.date)?.getTime() || 0;
      const db = parseBookingDate(b.date)?.getTime() || 0;
      return da - db;
    });
  return upcoming[0] || null;
}

export function bookingStatusLabel(status?: string, paymentStatus?: string): string {
  if (paymentStatus === 'paid') return 'Acompte réglé';
  if (status === 'confirmed') return 'Confirmée';
  if (status === 'cancelled') return 'Annulée';
  if (status === 'pending') return 'En attente';
  return status || 'En cours';
}

export function bookingStatusVariant(
  status?: string,
  paymentStatus?: string
): 'success' | 'warning' | 'outline' | 'gold' {
  if (paymentStatus === 'paid') return 'success';
  if (status === 'confirmed') return 'gold';
  if (status === 'cancelled') return 'outline';
  return 'warning';
}
