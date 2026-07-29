import apiClient from '@/lib/api-client';
import { clearSession } from '@/lib/session';

export interface ApiBooking {
  id: string;
  reference?: string;
  serviceId?: string;
  serviceTitle: string;
  date: string;
  time: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  location?: string;
  notes?: string;
  depositAmount: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus?: string;
  createdAt?: string;
  invoiceNumber?: string;
}

export interface ApiContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status?: string;
  createdAt?: string;
}

export async function fetchAdminBookings(): Promise<ApiBooking[]> {
  const res = await apiClient.get('/admin/bookings');
  return res.data?.data || [];
}

export async function fetchAdminContactMessages(): Promise<ApiContactMessage[]> {
  const res = await apiClient.get('/admin/contact-messages');
  return res.data?.data || [];
}

export async function updateBookingStatus(
  bookingId: string,
  status: ApiBooking['status']
): Promise<ApiBooking> {
  const res = await apiClient.patch(`/admin/bookings/${bookingId}/status`, { status });
  return res.data?.data;
}

export async function updateBooking(
  bookingId: string,
  payload: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    service_title: string;
    date: string;
    time: string;
    location: string;
    total_price: number;
    deposit_amount: number;
    status: string;
  }>
): Promise<ApiBooking> {
  const res = await apiClient.patch(`/admin/bookings/${bookingId}`, payload);
  return res.data?.data;
}

export function mapBookingToRow(b: ApiBooking) {
  const clientName = `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.email;
  return {
    id: b.id,
    reference: b.reference || `RES-${b.id.slice(0, 8).toUpperCase()}`,
    clientName,
    clientEmail: b.email,
    serviceTitle: b.serviceTitle,
    date: b.date,
    startTime: b.time,
    endTime: b.time,
    location: b.location || '—',
    totalAmount: Number(b.totalPrice) || 0,
    depositAmount: Number(b.depositAmount) || 0,
    status: (b.status || 'pending') as ApiBooking['status'],
    paymentStatus: b.paymentStatus,
    createdAt: b.createdAt,
  };
}

export function buildCrmClients(bookings: ApiBooking[], messages: ApiContactMessage[]) {
  const byEmail = new Map<
    string,
    {
      id: string;
      name: string;
      email: string;
      phone: string;
      segment: string;
      totalSpent: number;
      bookingsCount: number;
      lastBookingDate: string;
      notes: string;
      bookings: ApiBooking[];
      messages: ApiContactMessage[];
    }
  >();

  for (const b of bookings) {
    const email = (b.email || '').toLowerCase();
    if (!email) continue;
    const existing = byEmail.get(email);
    const name = `${b.firstName || ''} ${b.lastName || ''}`.trim() || email;
    const amount = Number(b.totalPrice) || 0;
    const segment = (b.serviceTitle || '').toLowerCase().includes('mariage')
      ? 'Mariage VIP'
      : (b.serviceTitle || '').toLowerCase().includes('corporate')
        ? 'Corporate Executive'
        : 'Portrait Studio';

    if (!existing) {
      byEmail.set(email, {
        id: b.id,
        name,
        email: b.email,
        phone: b.phone || '—',
        segment,
        totalSpent: amount,
        bookingsCount: 1,
        lastBookingDate: `${b.date} ${b.time}`,
        notes: b.notes || '',
        bookings: [b],
        messages: [],
      });
    } else {
      existing.totalSpent += amount;
      existing.bookingsCount += 1;
      existing.lastBookingDate = `${b.date} ${b.time}`;
      existing.bookings.push(b);
      if (b.phone) existing.phone = b.phone;
      if (b.notes) existing.notes = b.notes;
    }
  }

  for (const m of messages) {
    const email = (m.email || '').toLowerCase();
    if (!email) continue;
    const existing = byEmail.get(email);
    if (existing) {
      existing.messages.push(m);
      if (existing.phone === '—' && m.phone) existing.phone = m.phone;
    } else {
      byEmail.set(email, {
        id: m.id,
        name: m.name,
        email: m.email,
        phone: m.phone || '—',
        segment: m.subject || 'Prospect',
        totalSpent: 0,
        bookingsCount: 0,
        lastBookingDate: m.createdAt || '—',
        notes: m.message,
        bookings: [],
        messages: [m],
      });
    }
  }

  return Array.from(byEmail.values());
}

export function redirectToLoginIfUnauthorized(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 401 || status === 403) {
    clearSession();
    if (typeof window !== 'undefined') {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
    return true;
  }
  return false;
}
