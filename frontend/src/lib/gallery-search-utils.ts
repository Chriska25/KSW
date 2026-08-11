import type { ApiBooking } from '@/lib/admin-crm-api';
import type { AlbumItem, GalleryAdminItem } from '@/lib/gallery-types';
import { getActiveGalleries } from '@/lib/gallery-trash-utils';

export interface GalleryBookingMeta {
  bookingId: string;
  reference?: string;
  invoiceNumber?: string;
}

function normalizeSearchText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

export function resolveInvoiceNumber(booking: ApiBooking): string {
  if (booking.invoiceNumber) return booking.invoiceNumber;
  const year = booking.createdAt
    ? new Date(booking.createdAt).getFullYear()
    : new Date().getFullYear();
  const suffix = (booking.reference || booking.id).slice(-6).toUpperCase();
  return `FAC-${year}-${suffix}`;
}

export function buildGalleryBookingMaps(bookings: ApiBooking[]): {
  byGalleryId: Map<string, GalleryBookingMeta>;
  byBookingId: Map<string, GalleryBookingMeta>;
} {
  const byGalleryId = new Map<string, GalleryBookingMeta>();
  const byBookingId = new Map<string, GalleryBookingMeta>();

  for (const booking of bookings) {
    const meta: GalleryBookingMeta = {
      bookingId: booking.id,
      reference: booking.reference,
      invoiceNumber: resolveInvoiceNumber(booking),
    };
    byBookingId.set(booking.id, meta);
    if (booking.galleryId) {
      byGalleryId.set(booking.galleryId, meta);
    }
  }

  return { byGalleryId, byBookingId };
}

export function getGalleryBookingMeta(
  gallery: GalleryAdminItem,
  maps: { byGalleryId: Map<string, GalleryBookingMeta>; byBookingId: Map<string, GalleryBookingMeta> }
): GalleryBookingMeta | undefined {
  if (gallery.bookingId) {
    return maps.byBookingId.get(gallery.bookingId);
  }
  return maps.byGalleryId.get(gallery.id);
}

export function gallerySearchHaystack(
  gallery: GalleryAdminItem,
  meta?: GalleryBookingMeta
): string {
  return [
    gallery.title,
    gallery.clientName,
    gallery.clientEmail,
    gallery.accessKey,
    gallery.password,
    gallery.category,
    gallery.id,
    gallery.bookingId,
    meta?.reference,
    meta?.invoiceNumber,
    meta?.bookingId,
  ]
    .filter(Boolean)
    .map(normalizeSearchText)
    .join(' ');
}

export function filterGalleriesByQuery(
  galleries: GalleryAdminItem[],
  query: string,
  maps: { byGalleryId: Map<string, GalleryBookingMeta>; byBookingId: Map<string, GalleryBookingMeta> }
): GalleryAdminItem[] {
  const q = normalizeSearchText(query);
  const active = getActiveGalleries(galleries);
  if (!q) return active;

  return active.filter((gallery) => {
    const meta = getGalleryBookingMeta(gallery, maps);
    return gallerySearchHaystack(gallery, meta).includes(q);
  });
}

export function filterAlbumsByQuery(albums: AlbumItem[], query: string): AlbumItem[] {
  const q = normalizeSearchText(query);
  if (!q) return albums;

  return albums.filter((album) => {
    const haystack = [album.name, album.password, album.id].filter(Boolean).map(normalizeSearchText).join(' ');
    return haystack.includes(q);
  });
}

export function getAlbumSearchMatchIds(albums: AlbumItem[], query: string): Set<string> | null {
  const q = normalizeSearchText(query);
  if (!q) return null;
  const ids = filterAlbumsByQuery(albums, q).map((album) => album.id);
  return new Set(ids);
}
