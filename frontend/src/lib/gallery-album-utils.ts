import type { AlbumItem, GalleryAdminItem, PhotoItem } from '@/lib/gallery-types';

export function isAlbumTrashed(album: AlbumItem): boolean {
  return Boolean(album.deletedAt);
}

export function getActiveAlbums(albums: AlbumItem[] = []): AlbumItem[] {
  return albums.filter((album) => !isAlbumTrashed(album));
}

export function getTrashedAlbums(albums: AlbumItem[] = []): AlbumItem[] {
  return albums.filter(isAlbumTrashed);
}

export function formatTrashDate(deletedAt?: string | null): string {
  if (!deletedAt) return '—';
  try {
    return new Date(deletedAt).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return deletedAt;
  }
}

export function isPhotoInTrashedAlbum(gallery: GalleryAdminItem, photo: PhotoItem): boolean {
  if (!photo.albumId) return false;
  const album = (gallery.albums || []).find((item) => item.id === photo.albumId);
  return album ? isAlbumTrashed(album) : false;
}

export function trashAlbumInGallery(gallery: GalleryAdminItem, albumId: string): GalleryAdminItem {
  const deletedAt = new Date().toISOString();
  return {
    ...gallery,
    albums: (gallery.albums || []).map((album) =>
      album.id === albumId ? { ...album, deletedAt } : album
    ),
  };
}

export function restoreAlbumInGallery(gallery: GalleryAdminItem, albumId: string): GalleryAdminItem {
  return {
    ...gallery,
    albums: (gallery.albums || []).map((album) => {
      if (album.id !== albumId) return album;
      const { deletedAt: _removed, ...rest } = album;
      return rest;
    }),
  };
}

export function permanentlyDeleteAlbumInGallery(
  gallery: GalleryAdminItem,
  albumId: string
): GalleryAdminItem {
  const fallback = getActiveAlbums(gallery.albums).find((album) => album.id !== albumId);

  return {
    ...gallery,
    albums: (gallery.albums || []).filter((album) => album.id !== albumId),
    photos: (gallery.photos || []).map((photo) =>
      photo.albumId === albumId
        ? {
            ...photo,
            albumId: fallback?.id,
            albumName: fallback?.name || 'Général',
          }
        : photo
    ),
  };
}

export function isPhotoTrashed(photo: PhotoItem): boolean {
  return Boolean(photo.deletedAt);
}

export function getActivePhotos(photos: PhotoItem[] = []): PhotoItem[] {
  return photos.filter((photo) => !isPhotoTrashed(photo));
}

export function getTrashedPhotos(photos: PhotoItem[] = []): PhotoItem[] {
  return photos.filter(isPhotoTrashed);
}

export function isPhotoVisibleInGallery(gallery: GalleryAdminItem, photo: PhotoItem): boolean {
  if (isPhotoTrashed(photo)) return false;
  return !isPhotoInTrashedAlbum(gallery, photo);
}

export function trashPhotoInGallery(gallery: GalleryAdminItem, photoId: string): GalleryAdminItem {
  const deletedAt = new Date().toISOString();
  return {
    ...gallery,
    photos: (gallery.photos || []).map((photo) =>
      photo.id === photoId
        ? { ...photo, deletedAt, isCover: false }
        : photo
    ),
  };
}

export function restorePhotoInGallery(gallery: GalleryAdminItem, photoId: string): GalleryAdminItem {
  return {
    ...gallery,
    photos: (gallery.photos || []).map((photo) => {
      if (photo.id !== photoId) return photo;
      const { deletedAt: _removed, ...rest } = photo;
      return rest;
    }),
  };
}

export function permanentlyDeletePhotoFromGallery(
  gallery: GalleryAdminItem,
  photoId: string
): GalleryAdminItem {
  const remaining = (gallery.photos || []).filter((photo) => photo.id !== photoId);
  const wasCover = gallery.photos?.find((p) => p.id === photoId)?.url === gallery.coverUrl;
  const nextCover = getActivePhotos(remaining).find((p) => p.isCover) || getActivePhotos(remaining)[0];

  return {
    ...gallery,
    photos: remaining,
    coverUrl: wasCover && nextCover ? nextCover.url : gallery.coverUrl,
  };
}

export function applyPhotoTrashToGallery(
  galleries: GalleryAdminItem[],
  galleryId: string,
  photoId: string,
  action: 'trash' | 'restore' | 'delete'
): GalleryAdminItem[] {
  return galleries.map((gallery) => {
    if (gallery.id !== galleryId) return gallery;
    if (action === 'trash') return trashPhotoInGallery(gallery, photoId);
    if (action === 'restore') return restorePhotoInGallery(gallery, photoId);
    return permanentlyDeletePhotoFromGallery(gallery, photoId);
  });
}

export function applyAlbumTrashToGallery(
  galleries: GalleryAdminItem[],
  galleryId: string,
  albumId: string,
  action: 'trash' | 'restore' | 'delete'
): GalleryAdminItem[] {
  return galleries.map((gallery) => {
    if (gallery.id !== galleryId) return gallery;
    if (action === 'trash') return trashAlbumInGallery(gallery, albumId);
    if (action === 'restore') return restoreAlbumInGallery(gallery, albumId);
    return permanentlyDeleteAlbumInGallery(gallery, albumId);
  });
}
