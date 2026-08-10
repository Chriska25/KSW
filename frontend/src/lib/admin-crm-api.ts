import apiClient from '@/lib/api-client';
import { clearSession } from '@/lib/session';
import { buildLoginUrl } from '@/lib/auth-login-url';
import { bookingToInvoice, normalizeInvoiceRow, type InvoiceRow } from '@/lib/invoice-utils';

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
  paymentMethod?: string;
  mobileMoneyReference?: string;
  mobileMoneyPhone?: string;
  galleryId?: string;
  galleryAccessKey?: string;
  createdAt?: string;
  invoiceNumber?: string;
  balancePaidAmount?: number;
  balancePaymentMethod?: string;
  balancePaidAt?: string;
  balancePaymentReference?: string;
  paidAt?: string;
  currency?: string;
  preferredPaymentMethod?: string;
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

/** Suppression définitive — superUser uniquement (réservation + facture). */
export async function deleteBookingPermanently(bookingId: string): Promise<void> {
  await apiClient.delete(`/admin/bookings/${bookingId}`);
}

export async function confirmMobileMoneyPayment(
  bookingId: string,
  transactionReference: string
): Promise<ApiBooking> {
  const res = await apiClient.post(`/admin/bookings/${bookingId}/confirm-mobile-money`, {
    transaction_reference: transactionReference.trim(),
  });
  return res.data?.data;
}

export interface BookingGalleryAccess {
  id: string;
  title: string;
  accessKey: string;
  password?: string;
  clientEmail?: string;
  bookingId?: string;
}

export async function fetchBookingGallery(bookingId: string): Promise<BookingGalleryAccess> {
  const res = await apiClient.get(`/admin/bookings/${bookingId}/gallery`);
  return res.data?.data;
}

export async function sendBookingGalleryAccess(bookingId: string): Promise<BookingGalleryAccess> {
  const res = await apiClient.post(`/admin/bookings/${bookingId}/send-gallery-access`);
  return res.data?.data;
}

export async function sendGalleryAccessEmail(galleryId: string): Promise<BookingGalleryAccess> {
  const res = await apiClient.post(`/admin/galleries/${galleryId}/send-access`, undefined, {
    timeout: 25000,
  });
  return res.data?.data;
}

export async function fetchRegisteredClients(): Promise<
  Array<{ id: string; name: string; email: string }>
> {
  const res = await apiClient.get('/admin/users');
  const rows = (res.data?.data || []) as Array<{
    id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    role?: string;
    status?: string;
  }>;
  return rows
    .filter((u) => u.role === 'client' && u.status !== 'suspended' && u.email)
    .map((u) => ({
      id: u.id,
      name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
      email: u.email,
    }));
}

export async function recordBalancePayment(
  bookingId: string,
  payload: {
    amount: number;
    paymentMethod: string;
    transactionReference?: string;
    notes?: string;
  }
): Promise<{ booking: ApiBooking; invoice: InvoiceRow }> {
  const res = await apiClient.post(`/admin/bookings/${bookingId}/record-balance-payment`, {
    amount: payload.amount,
    payment_method: payload.paymentMethod,
    transaction_reference: payload.transactionReference,
    notes: payload.notes,
  });
  const booking = res.data?.data as ApiBooking;
  const invoiceRaw = res.data?.invoice as Record<string, unknown> | undefined;
  return {
    booking,
    invoice: invoiceRaw ? normalizeInvoiceRow(invoiceRaw) : bookingToInvoice(booking as ApiBooking & Record<string, unknown>),
  };
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
    paymentMethod: b.paymentMethod,
    mobileMoneyReference: b.mobileMoneyReference,
    mobileMoneyPhone: b.mobileMoneyPhone,
    galleryId: b.galleryId,
    galleryAccessKey: b.galleryAccessKey,
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
      window.location.href = buildLoginUrl({
        redirect: window.location.pathname,
        admin: window.location.pathname.startsWith('/admin'),
      });
    }
    return true;
  }
  return false;
}
