import type { ServiceKind } from '@/lib/service-kind';

export interface ServiceItem {
  id: string;
  title: string;
  category: string;
  /** photo = réservation séance · invitation = page RSVP électronique */
  serviceKind?: ServiceKind;
  price: number;
  depositPercentage: number;
  durationMinutes: number;
  photosCount: number;
  coverImage: string;
  isActive: boolean;
  seoTitle?: string;
  seoDescription?: string;
}
