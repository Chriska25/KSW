'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Download,
  Heart,
  Calendar,
  ArrowLeft,
  ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PhotoLightbox } from '@/components/common/photo-lightbox';
import { LoadingState } from '@/components/common/loading-state';
import type { PhotoItem } from '@/lib/gallery-types';
import {
  unlockGallery,
  getUnlockedGallery,
  persistUnlock,
  loadGalleryFavorites,
  saveGalleryFavorites,
  downloadGalleryPhotos,
} from '@/lib/gallery-client';
import type { GalleryAdminItem } from '@/lib/gallery-types';

export default function ClientPrivateGalleryPage() {
  const params = useParams();
  const router = useRouter();
  const accessKey = ((params.accessKey as string) || '').toUpperCase();

  const [gallery, setGallery] = useState<GalleryAdminItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAlbum, setActiveAlbum] = useState<string>('all');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotoId, setLightboxPhotoId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const applyFavorites = useCallback((gal: GalleryAdminItem): PhotoItem[] => {
    const favs = loadGalleryFavorites(gal.id);
    return (gal.photos || []).map((p) => ({
      ...p,
      isFavorite: favs.has(p.id) || p.isFavorite,
    }));
  }, []);

  useEffect(() => {
    if (!accessKey) {
      setError('Clé d\'accès manquante');
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      const cached = getUnlockedGallery(accessKey);
      if (cached) {
        setGallery(cached);
        setPhotos(applyFavorites(cached));
        setLoading(false);
        return;
      }

      try {
        const unlocked = await unlockGallery(accessKey);
        setGallery(unlocked);
        setPhotos(applyFavorites(unlocked));
      } catch (e: unknown) {
        const msg =
          (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Galerie introuvable. Vérifiez votre clé d\'accès.';
        setError(String(msg));
        router.replace(`/galerie-privee?key=${accessKey}`);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [accessKey, applyFavorites, router]);

  const albumTabs = useMemo(() => {
    const tabs = [{ id: 'all', label: 'Toutes' }, { id: 'fav', label: 'Favoris' }];
    (gallery?.albums || []).forEach((alb) => {
      tabs.push({ id: alb.id, label: alb.name });
    });
    return tabs;
  }, [gallery?.albums]);

  const filteredPhotos = useMemo(() => {
    return photos.filter((p) => {
      if (activeAlbum === 'all') return true;
      if (activeAlbum === 'fav') return p.isFavorite;
      return p.albumId === activeAlbum;
    });
  }, [photos, activeAlbum]);

  const lightboxIndex = useMemo(() => {
    if (!lightboxPhotoId) return 0;
    const idx = filteredPhotos.findIndex((p) => p.id === lightboxPhotoId);
    return idx >= 0 ? idx : 0;
  }, [filteredPhotos, lightboxPhotoId]);

  const favoritesCount = photos.filter((p) => p.isFavorite).length;

  const handleToggleFav = (id: string) => {
    if (!gallery) return;
    setPhotos((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
      saveGalleryFavorites(
        gallery.id,
        next.filter((p) => p.isFavorite).map((p) => p.id)
      );
      return next;
    });
  };

  const handleDownloadAll = async () => {
    const toDownload = activeAlbum === 'fav'
      ? photos.filter((p) => p.isFavorite)
      : activeAlbum === 'all'
        ? photos
        : filteredPhotos;
    if (toDownload.length === 0) return;
    setDownloading(true);
    try {
      await downloadGalleryPhotos(toDownload);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16">
        <LoadingState message="Ouverture de votre galerie privée…" />
      </div>
    );
  }

  if (error || !gallery) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-amber-400 mx-auto" />
        <h1 className="text-xl font-bold text-white">Accès impossible</h1>
        <p className="text-sm text-zinc-400">{error || 'Galerie non trouvée'}</p>
        <Link href="/galerie-privee">
          <Button variant="gold" size="sm">Réessayer avec une clé</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border-amber-400/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="gold">Galerie privée</Badge>
            <span className="text-[11px] font-mono text-zinc-500">{accessKey}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{gallery.title}</h1>
          <p className="text-xs text-zinc-400 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-amber-400" />
            Client : {gallery.clientName}
            {gallery.expiresAt ? ` • Valide jusqu'au ${gallery.expiresAt}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveAlbum(activeAlbum === 'fav' ? 'all' : 'fav')}
            className={activeAlbum === 'fav' ? 'border-amber-400/50 text-amber-400' : ''}
          >
            <Heart className={`h-4 w-4 mr-1 ${favoritesCount ? 'fill-amber-400 text-amber-400' : ''}`} />
            Favoris ({favoritesCount})
          </Button>
          <Button variant="gold" size="sm" onClick={handleDownloadAll} disabled={downloading || filteredPhotos.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            {downloading ? 'Téléchargement…' : 'Télécharger les photos'}
          </Button>
        </div>
      </div>

      {albumTabs.length > 2 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {albumTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveAlbum(tab.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl border whitespace-nowrap transition-colors ${
                activeAlbum === tab.id
                  ? 'border-amber-400 bg-amber-400 text-zinc-950'
                  : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {filteredPhotos.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <ImageIcon className="h-10 w-10 text-zinc-600 mx-auto" />
          <p className="text-sm text-zinc-400">Aucune photo dans cet album.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPhotos.map((photo) => (
            <div key={photo.id} className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
              <img
                src={photo.url}
                alt={photo.title}
                loading="lazy"
                className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-500"
                onClick={() => {
                  setLightboxPhotoId(photo.id);
                  setLightboxOpen(true);
                }}
              />
              <button
                type="button"
                onClick={() => handleToggleFav(photo.id)}
                className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white hover:text-amber-400 z-10"
              >
                <Heart className={`h-4 w-4 ${photo.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs font-medium text-white truncate">{photo.title}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center pt-4">
        <Link href="/client/dashboard">
          <Button variant="ghost" size="sm" className="text-zinc-400">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour au tableau de bord
          </Button>
        </Link>
      </div>

      <PhotoLightbox
        photos={filteredPhotos}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(idx) => setLightboxPhotoId(filteredPhotos[idx]?.id || null)}
        onToggleFavorite={handleToggleFav}
      />
    </div>
  );
}
