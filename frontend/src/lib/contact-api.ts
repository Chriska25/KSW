import apiClient from '@/lib/api-client';

export interface BookingRecord {
  id: string;
  reference?: string;
  serviceId?: string;
  serviceTitle?: string;
  date?: string;
  time?: string;
  depositAmount?: number;
  totalPrice?: number;
  status?: string;
  paymentStatus?: string;
  /** Jeton serveur requis pour initier un paiement (anti-IDOR). */
  paymentToken?: string;
}

export async function submitContactMessage(data: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  website?: string;
  formStartedAt?: number;
}): Promise<void> {
  await apiClient.post('/contact', {
    name: data.name.trim(),
    email: data.email.trim(),
    phone: data.phone?.trim() || undefined,
    subject: data.subject,
    message: data.message.trim(),
    website: data.website || '',
    form_started_at: data.formStartedAt,
  });
}

export async function submitBooking(data: {
  serviceId: string;
  serviceTitle: string;
  date: string;
  time: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location?: string;
  notes?: string;
  depositAmount: number;
  totalPrice: number;
  preferredPaymentMethod?: string;
}): Promise<BookingRecord> {
  const res = await apiClient.post('/bookings', {
    service_id: data.serviceId,
    service_title: data.serviceTitle,
    date: data.date,
    time: data.time,
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
    phone: data.phone,
    location: data.location,
    notes: data.notes,
    deposit_amount: data.depositAmount,
    total_price: data.totalPrice,
    preferred_payment_method: data.preferredPaymentMethod,
  });
  return res.data?.data as BookingRecord;
}

export async function createStripeCheckoutSession(data: {
  bookingId: string;
  paymentToken: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ checkoutUrl: string; sessionId: string }> {
  const res = await apiClient.post('/bookings/stripe/create-checkout-session', {
    booking_id: data.bookingId,
    payment_token: data.paymentToken,
    success_url: data.successUrl,
    cancel_url: data.cancelUrl,
  });
  return {
    checkoutUrl: res.data.checkoutUrl,
    sessionId: res.data.sessionId,
  };
}

export async function getStripeSessionStatus(sessionId: string): Promise<{
  paid: boolean;
  paymentStatus: string;
  bookingId?: string;
}> {
  const res = await apiClient.get('/bookings/stripe/session-status', {
    params: { session_id: sessionId },
  });
  return res.data;
}

export async function submitMobileMoneyPayment(data: {
  bookingId: string;
  paymentToken: string;
  payerPhone: string;
  transactionReference: string;
}): Promise<BookingRecord> {
  const res = await apiClient.post('/bookings/mobile-money/submit', {
    booking_id: data.bookingId,
    payment_token: data.paymentToken,
    payer_phone: data.payerPhone.trim(),
    transaction_reference: data.transactionReference.trim(),
  });
  return res.data?.data as BookingRecord;
}
