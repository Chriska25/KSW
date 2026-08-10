'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import apiClient, { API_WRITE_TIMEOUT_MS } from '@/lib/api-client';
import { onVisibleInterval } from '@/lib/visible-interval';
import type { PhotoItem, AlbumItem, GalleryAdminItem } from '@/lib/gallery-types';
import { isAlbumTrashed, isPhotoInTrashedAlbum, isPhotoTrashed } from '@/lib/gallery-album-utils';
import { isGalleryTrashed } from '@/lib/gallery-trash-utils';

export type { PhotoItem, AlbumItem, GalleryAdminItem };

interface GalleryContextType {
  galleries: GalleryAdminItem[];
  setGalleries: React.Dispatch<React.SetStateAction<GalleryAdminItem[]>>;
  hydrateGalleries: (items: GalleryAdminItem[]) => void;
  updateGalleries: (
    newGalleries: GalleryAdminItem[],
    options?: { skipPublicCache?: boolean }
  ) => Promise<void>;
  publicPhotos: PhotoItem[];
  galleriesLoading: boolean;
}

const GalleryContext = createContext<GalleryContextType>({
  galleries: [],
  setGalleries: () => {},
  hydrateGalleries: () => {},
  updateGalleries: async () => {},
  publicPhotos: [],
  galleriesLoading: false,
});

const SYNC_INTERVAL_MS = 300_000;

function routeNeedsGalleries(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith('/portfolio') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/galerie')
  );
}

export function GalleryProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [galleries, setGalleries] = useState<GalleryAdminItem[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const fetchLiveGalleries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/galleries/public');
      const data = res.data;
      if (data && Array.isArray(data.data)) {
        setGalleries(data.data);
        fetchedRef.current = true;
        try {
          localStorage.setItem('studio_galleries', JSON.stringify(data.data));
        } catch {
          // localStorage indisponible
        }
      }
    } catch (e) {
      console.error('Erreur chargement API galeries:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const hydrateGalleries = useCallback((items: GalleryAdminItem[]) => {
    if (!items.length) return;
    setGalleries(items);
    fetchedRef.current = true;
    try {
      localStorage.setItem('studio_galleries', JSON.stringify(items));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!routeNeedsGalleries(pathname)) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    try {
      const cached = localStorage.getItem('studio_galleries');
      if (cached) {
        const parsed = JSON.parse(cached) as GalleryAdminItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGalleries(parsed);
        }
      }
    } catch {
      // ignore cache parse errors
    }

    fetchLiveGalleries();
  }, [pathname, fetchLiveGalleries]);

  useEffect(() => {
    if (!routeNeedsGalleries(pathname)) return;

    const clearInterval = onVisibleInterval(fetchLiveGalleries, SYNC_INTERVAL_MS);
    const handleUpdate = () => {
      if (document.visibilityState === 'visible') fetchLiveGalleries();
    };
    window.addEventListener('galleries_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      clearInterval();
      window.removeEventListener('galleries_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [pathname, fetchLiveGalleries]);

  const updateGalleries = useCallback(
    async (newGalleries: GalleryAdminItem[], options?: { skipPublicCache?: boolean }) => {
      setGalleries(newGalleries);

      if (!options?.skipPublicCache) {
        try {
          localStorage.setItem('studio_galleries', JSON.stringify(newGalleries));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('galleries_updated'));
          }
        } catch {
          // localStorage indisponible
        }
      }

      try {
        await apiClient.post('/admin/galleries/save-all', { galleries: newGalleries }, {
          timeout: API_WRITE_TIMEOUT_MS,
        });
      } catch (e) {
        console.error('Erreur sauvegarde BDD galeries:', e);
        throw e;
      }
    },
    []
  );

  const publicPhotos = useMemo(() => {
    return galleries.flatMap((g) => {
      if (isGalleryTrashed(g)) return [];
      return (g.photos || [])
        .filter((p) => {
          if (isPhotoTrashed(p)) return false;
          if (p.isPrivate === true) return false;
          if (isPhotoInTrashedAlbum(g, p)) return false;
          const parentAlb = (g.albums || []).find((a) => a.id === p.albumId);
          if (parentAlb && parentAlb.isPrivate === true) return false;
          if (parentAlb && isAlbumTrashed(parentAlb)) return false;
          return true;
        })
        .map((p) => ({
          ...p,
          cat: (p.cat || g.category || 'mariage').toLowerCase(),
        }));
    });
  }, [galleries]);

  const value = useMemo(
    () => ({
      galleries,
      setGalleries,
      hydrateGalleries,
      updateGalleries,
      publicPhotos,
      galleriesLoading: loading,
    }),
    [galleries, hydrateGalleries, updateGalleries, publicPhotos, loading]
  );

  return (
    <GalleryContext.Provider value={value}>
      {children}
    </GalleryContext.Provider>
  );
}

export const useGalleries = () => useContext(GalleryContext);
