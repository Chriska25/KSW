import type { GalleryAdminItem } from '@/lib/gallery-types';

export function isGalleryTrashed(gallery: GalleryAdminItem): boolean {
  return Boolean(gallery.deletedAt);
}

export function getActiveGalleries(galleries: GalleryAdminItem[] = []): GalleryAdminItem[] {
  return galleries.filter((gallery) => !isGalleryTrashed(gallery));
}

export function getTrashedGalleries(galleries: GalleryAdminItem[] = []): GalleryAdminItem[] {
  return galleries.filter(isGalleryTrashed);
}

export function trashGalleryInList(galleries: GalleryAdminItem[], galleryId: string): GalleryAdminItem[] {
  const deletedAt = new Date().toISOString();
  return galleries.map((gallery) =>
    gallery.id === galleryId ? { ...gallery, deletedAt } : gallery
  );
}

export function restoreGalleryInList(galleries: GalleryAdminItem[], galleryId: string): GalleryAdminItem[] {
  return galleries.map((gallery) => {
    if (gallery.id !== galleryId) return gallery;
    const { deletedAt: _removed, ...rest } = gallery;
    return rest;
  });
}

export function permanentlyDeleteGalleryFromList(
  galleries: GalleryAdminItem[],
  galleryId: string
): GalleryAdminItem[] {
  return galleries.filter((gallery) => gallery.id !== galleryId);
}
