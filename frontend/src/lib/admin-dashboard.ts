import type { ApiBooking, ApiContactMessage } from '@/lib/admin-crm-api';

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export interface DashboardStats {
  monthlyRevenue: number;
  depositsCollected: number;
  confirmedBookingsCount: number;
  upcomingBookingsCount: number;
  pendingBookingsCount: number;
  activeClientsCount: number;
  newLeadsCount: number;
  monthlyRevenueChart: Array<{ month: string; revenue: number; bookings: number }>;
  serviceDistribution: Array<{ name: string; value: number; color: string }>;
  recentBookings: Array<{
    id: string;
    reference: string;
    client: string;
    service: string;
    date: string;
    amount: number;
    depositPaid: number;
    status: string;
    paymentStatus?: string;
  }>;
}

export interface InvoiceRow {
  id: string;
  number: string;
  clientName: string;
  serviceTitle: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: 'paid' | 'partially_paid' | 'unpaid';
  paymentMethod: 'Stripe (Carte)' | 'PayPal' | 'Virement';
}

function parseBookingDate(raw?: string): Date | null {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const d = new Date(raw.slice(0, 10));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const d = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function categorizeService(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('mariage')) return 'Mariages';
  if (t.includes('corporate') || t.includes('executive')) return 'Corporate';
  return 'Portraits Studio';
}

function statusLabel(status?: string): string {
  switch (status) {
    case 'confirmed':
      return 'Confirmé';
    case 'completed':
      return 'Effectué';
    case 'cancelled':
      return 'Annulé';
    default:
      return 'En attente';
  }
}

export function computeDashboardStats(
  bookings: ApiBooking[],
  messages: ApiContactMessage[]
): DashboardStats {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  let monthlyRevenue = 0;
  let depositsCollected = 0;
  let confirmedBookingsCount = 0;
  let upcomingBookingsCount = 0;
  let pendingBookingsCount = 0;

  const monthBuckets = Array.from({ length: 12 }, (_, i) => ({
    month: MONTH_LABELS[i],
    revenue: 0,
    bookings: 0,
  }));

  const serviceCounts: Record<string, number> = {
    Mariages: 0,
    'Portraits Studio': 0,
    Corporate: 0,
  };

  const clientEmails = new Set<string>();

  for (const b of bookings) {
    const total = Number(b.totalPrice) || 0;
    const deposit = Number(b.depositAmount) || 0;
    const created = parseBookingDate(b.createdAt) || parseBookingDate(b.date);
    const sessionDate = parseBookingDate(b.date);

    if (b.email) clientEmails.add(b.email.toLowerCase());

    const category = categorizeService(b.serviceTitle || '');
    serviceCounts[category] = (serviceCounts[category] || 0) + 1;

    if (created) {
      if (created.getMonth() === currentMonth && created.getFullYear() === currentYear) {
        monthlyRevenue += total;
      }
      monthBuckets[created.getMonth()].revenue += total;
      monthBuckets[created.getMonth()].bookings += 1;
    }

    if (b.paymentStatus === 'paid') {
      depositsCollected += deposit;
    }

    if (b.status === 'confirmed' || b.status === 'completed') {
      confirmedBookingsCount += 1;
    }
    if (b.status === 'pending') {
      pendingBookingsCount += 1;
    }

    if (
      sessionDate &&
      sessionDate >= now &&
      b.status !== 'cancelled' &&
      b.status !== 'completed'
    ) {
      upcomingBookingsCount += 1;
    }
  }

  for (const m of messages) {
    if (m.email) clientEmails.add(m.email.toLowerCase());
  }

  const totalServices = Object.values(serviceCounts).reduce((a, b) => a + b, 0) || 1;
  const colors = ['#d4af37', '#f59e0b', '#71717a'];
  const serviceDistribution = Object.entries(serviceCounts)
    .filter(([, count]) => count > 0)
    .map(([name, count], i) => ({
      name,
      value: Math.round((count / totalServices) * 100),
      color: colors[i % colors.length],
    }));

  const recentBookings = [...bookings]
    .slice(0, 8)
    .map((b) => ({
      id: b.id,
      reference: b.reference || `RES-${b.id.slice(0, 8).toUpperCase()}`,
      client: `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.email,
      service: b.serviceTitle,
      date: b.date,
      amount: Number(b.totalPrice) || 0,
      depositPaid: b.paymentStatus === 'paid' ? Number(b.depositAmount) || 0 : 0,
      status: statusLabel(b.status),
      paymentStatus: b.paymentStatus,
    }));

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newLeadsCount = messages.filter((m) => {
    const d = parseBookingDate(m.createdAt);
    return d ? d >= thirtyDaysAgo : false;
  }).length;

  return {
    monthlyRevenue,
    depositsCollected,
    confirmedBookingsCount,
    upcomingBookingsCount,
    pendingBookingsCount,
    activeClientsCount: clientEmails.size,
    newLeadsCount,
    monthlyRevenueChart: monthBuckets,
    serviceDistribution,
    recentBookings,
  };
}

export function bookingsToInvoices(bookings: ApiBooking[]): InvoiceRow[] {
  return bookings.map((b) => {
    const total = Number(b.totalPrice) || 0;
    const deposit = Number(b.depositAmount) || 0;
    const paid = b.paymentStatus === 'paid' ? deposit : 0;
    let status: InvoiceRow['status'] = 'unpaid';
    if (paid >= total && total > 0) status = 'paid';
    else if (paid > 0) status = 'partially_paid';

    const invoiceNumber =
      (b as ApiBooking & { invoiceNumber?: string }).invoiceNumber ||
      `FAC-${new Date().getFullYear()}-${(b.reference || b.id).replace(/[^A-Z0-9]/gi, '').slice(0, 6).toUpperCase()}`;

    return {
      id: b.id,
      number: invoiceNumber,
      clientName: `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.email,
      serviceTitle: b.serviceTitle,
      issueDate: b.createdAt || b.date,
      dueDate: b.date,
      totalAmount: total,
      paidAmount: paid,
      status,
      paymentMethod: b.paymentStatus === 'paid' ? 'Stripe (Carte)' : 'Virement',
    };
  });
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

export function exportBookingsCsv(bookings: ApiBooking[]): void {
  const headers = [
    'reference',
    'client',
    'email',
    'service',
    'date',
    'total',
    'deposit',
    'status',
    'payment',
    'created',
  ];
  const rows = bookings.map((b) =>
    [
      b.reference || b.id,
      `${b.firstName} ${b.lastName}`.trim(),
      b.email,
      b.serviceTitle,
      b.date,
      b.totalPrice,
      b.depositAmount,
      b.status,
      b.paymentStatus || 'unpaid',
      b.createdAt || '',
    ]
      .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ksw-reservations-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function fetchDashboardData() {
  const { fetchAdminBookings, fetchAdminContactMessages } = await import('@/lib/admin-crm-api');
  const [bookings, messages] = await Promise.all([
    fetchAdminBookings(),
    fetchAdminContactMessages(),
  ]);
  return { bookings, messages, stats: computeDashboardStats(bookings, messages) };
}
