import apiClient from '@/lib/api-client';
import type { GalleryAdminItem, PhotoItem } from '@/lib/gallery-types';

const UNLOCK_KEY = 'studio_unlocked_galleries';
const FAV_KEY = 'studio_gallery_favorites';

interface UnlockEntry {
  unlockedAt: number;
  gallery: GalleryAdminItem;
  password?: string;
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
  persistUnlock(gallery, password);
  return gallery;
}

export function persistUnlock(gallery: GalleryAdminItem, password?: string): void {
  try {
    const key = (gallery.accessKey || '').toUpperCase();
    const pwd = password?.trim() || getGalleryPassword(key);
    if (pwd) persistGalleryPassword(key, pwd);
    const store = readUnlockStore();
    store[key] = { unlockedAt: Date.now(), gallery, password: pwd };
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

/** Mot de passe galerie — état formulaire, sessionStorage ou cache unlock. */
export function resolveGalleryAccessPassword(accessKey: string, fallback?: string): string | undefined {
  const key = (accessKey || '').toUpperCase();
  const explicit = fallback?.trim();
  if (explicit) return explicit;
  const stored = getGalleryPassword(key);
  if (stored) return stored;
  return readUnlockStore()[key]?.password;
}

/** URL HD pleine résolution (lightbox, téléchargement). */
export function resolvePhotoHdUrl(photo: Pick<PhotoItem, 'url' | 'hdUrl'>): string {
  return photo.hdUrl || photo.url;
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
  const safeName = filename.replace(/[^\w.\-]+/g, '_');

  try {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (res.ok) {
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = safeName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      return;
    }
  } catch {
    // CORS ou réseau — repli ci-dessous
  }

  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadGalleryPhotoFromServer(options: {
  accessKey: string;
  password?: string;
  photoId: string;
  filename: string;
}): Promise<void> {
  const res = await apiClient.post(
    '/galleries/download-photo',
    {
      access_key: options.accessKey.trim().toUpperCase(),
      password: resolveGalleryAccessPassword(options.accessKey, options.password),
      photo_id: options.photoId,
    },
    { responseType: 'blob', timeout: 120000 }
  );

  const blob = res.data as Blob;
  const safeName = options.filename.replace(/[^\w.\-]+/g, '_');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadGalleryPhotos(
  photos: { id: string; url: string; hdUrl?: string; title: string }[],
  accessKey: string,
  password?: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ downloaded: number; failed: number }> {
  let downloaded = 0;
  let failed = 0;
  let i = 0;
  const resolvedPassword = resolveGalleryAccessPassword(accessKey, password);

  for (const photo of photos) {
    i += 1;
    onProgress?.(i, photos.length);
    const safeName = (photo.title || `photo-${i}`).replace(/[^\w\-]+/g, '_');
    try {
      await downloadGalleryPhotoFromServer({
        accessKey,
        password: resolvedPassword,
        photoId: photo.id,
        filename: `${safeName}.webp`,
      });
      downloaded += 1;
    } catch {
      try {
        await downloadPhoto(resolvePhotoHdUrl(photo), `${safeName}.jpg`);
        downloaded += 1;
      } catch {
        failed += 1;
      }
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  return { downloaded, failed };
}

const GALLERY_PWD_KEY = 'studio_gallery_passwords';

export function persistGalleryPassword(accessKey: string, password: string): void {
  if (!password.trim()) return;
  try {
    const store = JSON.parse(sessionStorage.getItem(GALLERY_PWD_KEY) || '{}') as Record<string, string>;
    store[(accessKey || '').toUpperCase()] = password;
    sessionStorage.setItem(GALLERY_PWD_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export function getGalleryPassword(accessKey: string): string | undefined {
  try {
    const store = JSON.parse(sessionStorage.getItem(GALLERY_PWD_KEY) || '{}') as Record<string, string>;
    return store[(accessKey || '').toUpperCase()];
  } catch {
    return undefined;
  }
}

export interface GalleryZipDownloadOptions {
  accessKey: string;
  password?: string;
  albumId?: string;
  favoritesOnly?: boolean;
  photoIds?: string[];
}

export async function downloadGalleryZip(options: GalleryZipDownloadOptions): Promise<void> {
  const resolvedPassword = resolveGalleryAccessPassword(options.accessKey, options.password);

  try {
    const res = await apiClient.post(
      '/galleries/download-zip',
      {
        access_key: options.accessKey.trim().toUpperCase(),
        password: resolvedPassword || undefined,
        album_id: options.albumId,
        favorites_only: options.favoritesOnly ?? false,
        photo_ids: options.photoIds?.length ? options.photoIds : undefined,
      },
      { responseType: 'blob', timeout: 120000 }
    );

    const blob = res.data as Blob;
    if (blob.type.includes('json')) {
      const text = await blob.text();
      const parsed = JSON.parse(text) as { detail?: string; message?: string };
      const message = parsed.detail || parsed.message || 'Téléchargement ZIP refusé.';
      throw Object.assign(new Error(message), { response: { status: 403, data: parsed } });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${options.accessKey.trim().toUpperCase()}-photos.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err: unknown) {
    const response = (err as { response?: { data?: unknown; status?: number } })?.response;
    if (response?.data instanceof Blob) {
      try {
        const text = await response.data.text();
        const parsed = JSON.parse(text) as { detail?: string; message?: string };
        const message = parsed.detail || parsed.message || 'Mot de passe incorrect ou accès refusé.';
        throw Object.assign(new Error(message), {
          response: { status: response.status ?? 400, data: parsed },
        });
      } catch (inner) {
        if (inner instanceof Error && inner.message && !(inner instanceof SyntaxError)) {
          throw inner;
        }
      }
    }
    throw err;
  }
}
