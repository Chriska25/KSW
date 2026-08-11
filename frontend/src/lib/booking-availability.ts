import apiClient from '@/lib/api-client';

export const DEFAULT_TIME_SLOTS = ['09:00', '10:30', '14:00', '16:00', '18:00'] as const;

export interface BookingSlotSuggestion {
  date: string;
  time: string;
}

export interface BookingAvailability {
  date: string;
  time?: string;
  bookedSlots: string[];
  availableSlots: string[];
  allSlots: string[];
  isWedding: boolean;
  selectedSlotTaken: boolean;
  suggestion?: BookingSlotSuggestion | null;
  message?: string | null;
}

export interface SlotConflictDetail {
  message: string;
  code: 'SLOT_TAKEN';
  isWedding: boolean;
  suggestion?: BookingSlotSuggestion | null;
}

export function isWeddingService(title: string, category?: string): boolean {
  const combined = `${category || ''} ${title || ''}`.toLowerCase();
  return combined.includes('mariage') || combined.includes('wedding');
}

export async function fetchBookingAvailability(
  date: string,
  serviceId: string,
  options?: { serviceTitle?: string; time?: string }
): Promise<BookingAvailability> {
  const res = await apiClient.get('/bookings/availability', {
    params: {
      date,
      service_id: serviceId,
      service_title: options?.serviceTitle || undefined,
      time: options?.time || undefined,
    },
  });
  return res.data?.data as BookingAvailability;
}

export function getSlotConflict(err: unknown): SlotConflictDetail | null {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (detail && typeof detail === 'object' && (detail as SlotConflictDetail).code === 'SLOT_TAKEN') {
    return detail as SlotConflictDetail;
  }
  return null;
}

export function formatBookingDay(dateStr: string): string {
  try {
    return new Date(`${dateStr}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
