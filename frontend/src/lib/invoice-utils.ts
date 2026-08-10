import type { ApiBooking } from '@/lib/admin-crm-api';
import { resolveStudioCurrency } from '@/lib/currency';

export type PaymentMethodType =
  | 'Stripe (Carte)'
  | 'PayPal'
  | 'Virement'
  | 'Mobile Money'
  | 'Espèces'
  | 'Chèque'
  | 'Mixte';

export interface InvoicePaymentLine {
  label: string;
  amount: number;
  method: string;
  paidAt?: string;
  reference?: string;
}

export interface InvoiceRow {
  id: string;
  number: string;
  clientName: string;
  serviceTitle: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  depositAmount?: number;
  paidAmount: number;
  remainingAmount?: number;
  status: 'paid' | 'partially_paid' | 'unpaid';
  paymentMethod: PaymentMethodType;
  paymentSummary?: string;
  paymentLines?: InvoicePaymentLine[];
  reference?: string;
  sessionDate?: string;
  sessionTime?: string;
  location?: string;
  currency?: string;
}

export const BALANCE_PAYMENT_METHODS: PaymentMethodType[] = [
  'Stripe (Carte)',
  'Mobile Money',
  'PayPal',
  'Virement',
  'Espèces',
  'Chèque',
];

export function computeBookingFinancials(booking: ApiBooking & Record<string, unknown>) {
  const total = Number(booking.totalPrice) || 0;
  const depositDue = Number(booking.depositAmount) || 0;
  const depositPaid = booking.paymentStatus === 'paid' ? depositDue : 0;
  const balancePaid = Number(booking.balancePaidAmount) || 0;
  const totalPaid = Math.round((depositPaid + balancePaid) * 100) / 100;
  const remaining = Math.round(Math.max(0, total - totalPaid) * 100) / 100;

  let status: InvoiceRow['status'] = 'unpaid';
  if (totalPaid <= 0) status = 'unpaid';
  else if (total > 0 && remaining <= 0.01) status = 'paid';
  else status = 'partially_paid';

  const paymentLines: InvoicePaymentLine[] = [];
  if (depositPaid > 0) {
    paymentLines.push({
      label: 'Acompte',
      amount: depositPaid,
      method: String(booking.paymentMethod || 'Stripe (Carte)'),
      paidAt: booking.paidAt ? String(booking.paidAt) : undefined,
      reference: String(
        booking.mobileMoneyConfirmedReference ||
          booking.mobileMoneyReference ||
          booking.stripeSessionId ||
          ''
      ) || undefined,
    });
  }
  if (balancePaid > 0) {
    paymentLines.push({
      label: 'Solde',
      amount: balancePaid,
      method: String(booking.balancePaymentMethod || 'Virement'),
      paidAt: booking.balancePaidAt ? String(booking.balancePaidAt) : undefined,
      reference: booking.balancePaymentReference
        ? String(booking.balancePaymentReference)
        : undefined,
    });
  }

  const methods = [...new Set(paymentLines.map((line) => line.method))];
  let paymentMethod: PaymentMethodType = 'Virement';
  let paymentSummary = 'En attente';
  if (methods.length > 1) {
    paymentMethod = 'Mixte';
    paymentSummary = paymentLines.map((line) => `${line.label}: ${line.method}`).join(' · ');
  } else if (methods.length === 1) {
    paymentMethod = methods[0] as PaymentMethodType;
    paymentSummary = methods[0];
  }

  return {
    totalAmount: total,
    depositAmount: depositDue,
    paidAmount: totalPaid,
    remainingAmount: remaining,
    status,
    paymentMethod,
    paymentSummary,
    paymentLines,
  };
}

export function bookingToInvoice(
  booking: ApiBooking & Record<string, unknown>,
  defaultCurrency?: string
): InvoiceRow {
  const financials = computeBookingFinancials(booking);
  const invoiceNumber =
    (booking.invoiceNumber as string | undefined) ||
    `FAC-${new Date().getFullYear()}-${(booking.reference || booking.id)
      .replace(/[^A-Z0-9]/gi, '')
      .slice(0, 6)
      .toUpperCase()}`;

  return {
    id: booking.id,
    number: invoiceNumber,
    clientName: `${booking.firstName || ''} ${booking.lastName || ''}`.trim() || booking.email || 'Client',
    serviceTitle: booking.serviceTitle || 'Prestation',
    issueDate: booking.createdAt || booking.date || '—',
    dueDate: booking.date || '—',
    totalAmount: financials.totalAmount,
    depositAmount: financials.depositAmount,
    paidAmount: financials.paidAmount,
    remainingAmount: financials.remainingAmount,
    status: financials.status,
    paymentMethod: financials.paymentMethod,
    paymentSummary: financials.paymentSummary,
    paymentLines: financials.paymentLines,
    reference: booking.reference,
    sessionDate: booking.date,
    sessionTime: booking.time,
    location: booking.location,
    currency: resolveStudioCurrency(booking.currency ? String(booking.currency) : defaultCurrency),
  };
}

export function normalizeInvoiceRow(raw: Record<string, unknown>): InvoiceRow {
  const paymentLines = Array.isArray(raw.paymentLines)
    ? raw.paymentLines.map((line) => {
        const row = line as Record<string, unknown>;
        return {
          label: String(row.label || ''),
          amount: Number(row.amount || 0),
          method: String(row.method || ''),
          paidAt: row.paidAt ? String(row.paidAt) : undefined,
          reference: row.reference ? String(row.reference) : undefined,
        } satisfies InvoicePaymentLine;
      })
    : undefined;

  const method = String(raw.paymentMethod || 'Virement');
  const allowed: PaymentMethodType[] = [
    'Stripe (Carte)',
    'PayPal',
    'Virement',
    'Mobile Money',
    'Espèces',
    'Chèque',
    'Mixte',
  ];

  const totalAmount = Number(raw.totalAmount || 0);
  const paidAmount = Number(raw.paidAmount || 0);

  return {
    id: String(raw.id || ''),
    number: String(raw.number || 'FAC-000000'),
    clientName: String(raw.clientName || 'Client'),
    serviceTitle: String(raw.serviceTitle || 'Prestation'),
    issueDate: String(raw.issueDate || '—'),
    dueDate: String(raw.dueDate || '—'),
    totalAmount,
    depositAmount: Number(raw.depositAmount || 0),
    paidAmount,
    remainingAmount: Number(raw.remainingAmount ?? Math.max(0, totalAmount - paidAmount)),
    status: (raw.status as InvoiceRow['status']) || 'unpaid',
    paymentMethod: (allowed.includes(method as PaymentMethodType) ? method : 'Virement') as PaymentMethodType,
    paymentSummary: raw.paymentSummary ? String(raw.paymentSummary) : undefined,
    paymentLines,
    reference: raw.reference ? String(raw.reference) : undefined,
    sessionDate: raw.sessionDate ? String(raw.sessionDate) : undefined,
    sessionTime: raw.sessionTime ? String(raw.sessionTime) : undefined,
    location: raw.location ? String(raw.location) : undefined,
    currency: raw.currency ? resolveStudioCurrency(String(raw.currency)) : undefined,
  };
}

export function computeInvoiceSummary(invoices: InvoiceRow[]) {
  const totalInvoiced = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const totalPaid = invoices.reduce((s, i) => s + i.paidAmount, 0);
  return {
    totalInvoiced,
    totalPaid,
    remaining: Math.max(0, totalInvoiced - totalPaid),
  };
}
