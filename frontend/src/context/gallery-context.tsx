'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import type { PhotoItem, AlbumItem, GalleryAdminItem } from '@/lib/gallery-types';

export type { PhotoItem, AlbumItem, GalleryAdminItem };

/** Données de démo — utilisées uniquement en admin si la BDD est vide */
export const INITIAL_GALLERIES: GalleryAdminItem[] = [
  {
    id: '1',
    title: 'Mariage Sophie & Alexandre - Château de Chantilly',
    clientName: 'Sophie Dupont',
    clientEmail: 'sophie.d@email.com',
    category: 'mariage',
    isPrivate: true,
    accessKey: 'SOPHIE-ALEX-2026',
    password: 'Love2026!',
    expiresAt: '2027-08-15',
    coverUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop',
    albums: [
      { id: 'alb-1', name: 'Préparatifs & Habillage', photosCount: 2, isPrivate: true },
      { id: 'alb-2', name: 'Cérémonie & Alliances', photosCount: 2, isPrivate: true },
      { id: 'alb-3', name: 'Cocktail & Valse', photosCount: 2, isPrivate: false },
    ],
    photos: [
      {
        id: '1',
        title: 'Échange des Alliances - Château de Chantilly',
        cat: 'mariage',
        url: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop',
        albumId: 'alb-2',
        albumName: 'Cérémonie & Alliances',
        isFavorite: true,
        isCover: true,
        isPrivate: true,
        exif: { camera: 'Canon EOS R5', lens: 'RF 85mm F1.2', iso: 100, aperture: 'f/1.2' },
      },
      {
        id: '4',
        title: 'Réception & Valse des Mariés',
        cat: 'mariage',
        url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=1200&auto=format&fit=crop',
        albumId: 'alb-3',
        albumName: 'Cocktail & Valse',
        isFavorite: true,
        isCover: false,
        isPrivate: false,
        exif: { camera: 'Canon EOS R5', lens: 'RF 35mm F1.8', iso: 800, aperture: 'f/2.0' },
      },
    ],
  },
  {
    id: '2',
    title: 'Portfolio Public Studio 2026',
    clientName: 'Portfolio Public',
    category: 'portrait',
    isPrivate: false,
    accessKey: 'PUBLIC-2026',
    coverUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
    albums: [
      { id: 'alb-pub1', name: 'Portraits Studio', photosCount: 2, isPrivate: false },
      { id: 'alb-pub2', name: 'Corporate Executive', photosCount: 2, isPrivate: false },
    ],
    photos: [
      {
        id: '2',
        title: 'Portrait Noir & Blanc Profond',
        cat: 'portrait',
        url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1200&auto=format&fit=crop',
        albumId: 'alb-pub1',
        albumName: 'Portraits Studio',
        isFavorite: true,
        isCover: true,
        isPrivate: false,
        exif: { camera: 'Canon EOS R5', lens: 'RF 50mm F1.2', iso: 200, aperture: 'f/1.4' },
      },
      {
        id: '3',
        title: 'Executive Leadership Campaign',
        cat: 'corporate',
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1200&auto=format&fit=crop',
        albumId: 'alb-pub2',
        albumName: 'Corporate Executive',
        isFavorite: false,
        isCover: false,
        isPrivate: false,
        exif: { camera: 'Sony A7IV', lens: 'FE 24-70mm F2.8', iso: 400, aperture: 'f/2.8' },
      },
      {
        id: '5',
        title: 'Lumière Dorée en Studio',
        cat: 'portrait',
        url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1200&auto=format&fit=crop',
        albumId: 'alb-pub1',
        albumName: 'Portraits Studio',
        isFavorite: true,
        isCover: false,
        isPrivate: false,
        exif: { camera: 'Canon EOS R5', lens: 'RF 85mm F1.2', iso: 100, aperture: 'f/1.8' },
      },
      {
        id: '6',
        title: 'Architecture & Design Intérieur',
        cat: 'corporate',
        url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop',
        albumId: 'alb-pub2',
        albumName: 'Corporate Executive',
        isFavorite: false,
        isCover: false,
        isPrivate: false,
        exif: { camera: 'Sony A7IV', lens: 'FE 16-35mm F2.8', iso: 100, aperture: 'f/8.0' },
      },
    ],
  },
];

interface GalleryContextType {
  galleries: GalleryAdminItem[];
  setGalleries: React.Dispatch<React.SetStateAction<GalleryAdminItem[]>>;
  updateGalleries: (newGalleries: GalleryAdminItem[]) => void;
  publicPhotos: PhotoItem[];
}

const GalleryContext = createContext<GalleryContextType>({
  galleries: [],
  setGalleries: () => {},
  updateGalleries: () => {},
  publicPhotos: [],
});

interface GalleryProviderProps {
  children: React.ReactNode;
  initialGalleries?: GalleryAdminItem[];
}

const SYNC_INTERVAL_MS = 300_000;

export function GalleryProvider({ children, initialGalleries = [] }: GalleryProviderProps) {
  const [galleries, setGalleries] = useState<GalleryAdminItem[]>(initialGalleries);
  const hasInitialData = initialGalleries.length > 0;

  const fetchLiveGalleries = useCallback(async () => {
    try {
      const res = await apiClient.get('/galleries/public', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = res.data;
      if (data && Array.isArray(data.data)) {
        setGalleries(data.data);
        try {
          localStorage.setItem('studio_galleries', JSON.stringify(data.data));
        } catch {
          // localStorage indisponible
        }
      }
    } catch (e) {
      console.error('Erreur chargement API galeries:', e);
    }
  }, []);

  useEffect(() => {
    if (!hasInitialData) {
      fetchLiveGalleries();
    }

    const interval = setInterval(fetchLiveGalleries, SYNC_INTERVAL_MS);
    const handleUpdate = () => fetchLiveGalleries();
    window.addEventListener('galleries_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('galleries_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [fetchLiveGalleries, hasInitialData]);

  const updateGalleries = useCallback(async (newGalleries: GalleryAdminItem[]) => {
    setGalleries(newGalleries);
    try {
      localStorage.setItem('studio_galleries', JSON.stringify(newGalleries));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('galleries_updated'));
      }
    } catch {
      // localStorage indisponible
    }

    try {
      await apiClient.post('/admin/galleries/save-all', { galleries: newGalleries });
      await fetchLiveGalleries();
    } catch (e) {
      console.error('Erreur sauvegarde BDD galeries:', e);
      throw e;
    }
  }, [fetchLiveGalleries]);

  const publicPhotos = useMemo(() => {
    return galleries.flatMap((g) => {
      return (g.photos || [])
        .filter((p) => {
          if (p.isPrivate === true) return false;
          const parentAlb = (g.albums || []).find((a) => a.id === p.albumId);
          if (parentAlb && parentAlb.isPrivate === true) return false;
          return true;
        })
        .map((p) => ({
          ...p,
          cat: (p.cat || g.category || 'mariage').toLowerCase(),
        }));
    });
  }, [galleries]);

  const value = useMemo(
    () => ({ galleries, setGalleries, updateGalleries, publicPhotos }),
    [galleries, updateGalleries, publicPhotos]
  );

  return (
    <GalleryContext.Provider value={value}>
      {children}
    </GalleryContext.Provider>
  );
}

export const useGalleries = () => useContext(GalleryContext);
