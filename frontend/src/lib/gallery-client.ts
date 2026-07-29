import apiClient from '@/lib/api-client';
import type { GalleryAdminItem } from '@/lib/gallery-types';

const UNLOCK_KEY = 'studio_unlocked_galleries';
const FAV_KEY = 'studio_gallery_favorites';

interface UnlockEntry {
  unlockedAt: number;
  gallery: GalleryAdminItem;
}

export async function unlockGallery(accessKey: string, password?: string): Promise<GalleryAdminItem> {
  const res = await apiClient.post('/galleries/unlock', {
    access_key: accessKey.trim().toUpperCase(),
    password: password || undefined,
  });
  if (!res.data?.data) {
    throw new Error(res.data?.message || 'Impossible de déverrouiller la galerie');
  }
  const gallery = res.data.data as GalleryAdminItem;
  persistUnlock(gallery);
  return gallery;
}

export function persistUnlock(gallery: GalleryAdminItem): void {
  try {
    const key = (gallery.accessKey || '').toUpperCase();
    const store = readUnlockStore();
    store[key] = { unlockedAt: Date.now(), gallery };
    sessionStorage.setItem(UNLOCK_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

function readUnlockStore(): Record<string, UnlockEntry> {
  try {
    return JSON.parse(sessionStorage.getItem(UNLOCK_KEY) || '{}');
  } catch {
    return {};
  }
}

export function getUnlockedGallery(accessKey: string): GalleryAdminItem | null {
  const entry = readUnlockStore()[(accessKey || '').toUpperCase()];
  return entry?.gallery ?? null;
}

export async function fetchClientGalleries(): Promise<GalleryAdminItem[]> {
  const res = await apiClient.get('/client/galleries');
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export function loadGalleryFavorites(galleryId: string): Set<string> {
  try {
    const all = JSON.parse(localStorage.getItem(FAV_KEY) || '{}') as Record<string, string[]>;
    return new Set(all[galleryId] || []);
  } catch {
    return new Set();
  }
}

export function saveGalleryFavorites(galleryId: string, favoriteIds: string[]): void {
  try {
    const all = JSON.parse(localStorage.getItem(FAV_KEY) || '{}') as Record<string, string[]>;
    all[galleryId] = favoriteIds;
    localStorage.setItem(FAV_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export async function downloadPhoto(url: string, filename: string): Promise<void> {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadGalleryPhotos(
  photos: { url: string; title: string }[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  let i = 0;
  for (const photo of photos) {
    i += 1;
    onProgress?.(i, photos.length);
    const safeName = (photo.title || `photo-${i}`).replace(/[^\w\-]+/g, '_');
    await downloadPhoto(photo.url, `${safeName}.jpg`);
    await new Promise((r) => setTimeout(r, 400));
  }
}
