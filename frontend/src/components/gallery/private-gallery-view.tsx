'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Heart,
  Calendar,
  ArrowLeft,
  ImageIcon,
  AlertCircle,
  Key,
  Lock,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { getActiveAlbums, isPhotoTrashed } from '@/lib/gallery-album-utils';
import { isGalleryTrashed } from '@/lib/gallery-trash-utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/common/loading-state';
import { HeroBackgroundSlideshow } from '@/components/common/hero-background-slideshow';

const PhotoLightbox = dynamic(
  () => import('@/components/common/photo-lightbox').then((m) => ({ default: m.PhotoLightbox })),
  { ssr: false }
);
import { PrivateGalleryPhotoCard } from '@/components/gallery/private-gallery-photo-card';
import {
  PrivateGalleryDownloadActions,
  PrivateGalleryDownloadPanel,
} from '@/components/gallery/private-gallery-download-panel';
import type { PhotoItem } from '@/lib/gallery-types';
import {
  unlockGallery,
  getUnlockedGallery,
  loadGalleryFavorites,
  saveGalleryFavorites,
  downloadGalleryPhotos,
  downloadGalleryZip,
  persistGalleryPassword,
  resolveGalleryAccessPassword,
  resolvePhotoHdUrl,
  getGalleryPassword,
} from '@/lib/gallery-client';
import type { GalleryAdminItem } from '@/lib/gallery-types';
import { getApiErrorMessage, isAuthApiError } from '@/lib/api-error';
import { useSettings } from '@/context/settings-context';
import { resolveGridImageUrl } from '@/lib/optimize-image-url';
import { useProgressiveVisible } from '@/lib/use-progressive-visible';
import { LoadMoreSentinel } from '@/components/common/load-more-sentinel';

interface PrivateGalleryViewProps {
  accessKey: string;
  backHref?: string;
  backLabel?: string;
}

export function PrivateGalleryView({
  accessKey,
  backHref = '/galerie-privee',
  backLabel = 'Réessayer avec une clé',
}: PrivateGalleryViewProps) {
  const { settings } = useSettings();
  const [gallery, setGallery] = useState<GalleryAdminItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [activeAlbum, setActiveAlbum] = useState<string>('all');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotoId, setLightboxPhotoId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadMode, setDownloadMode] = useState<'zip' | 'single' | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadTotal, setDownloadTotal] = useState(0);
  const [downloadMessage, setDownloadMessage] = useState('');
  const [downloadAuthRequired, setDownloadAuthRequired] = useState(false);

  const applyFavorites = useCallback((gal: GalleryAdminItem): PhotoItem[] => {
    const favs = loadGalleryFavorites(gal.id);
    return (gal.photos || []).map((p) => ({
      ...p,
      isFavorite: favs.has(p.id) || p.isFavorite,
    }));
  }, []);

  const openGallery = useCallback(
    (gal: GalleryAdminItem) => {
      setGallery(gal);
      setPhotos(applyFavorites(gal));
      setNeedsPassword(false);
      setError(null);
    },
    [applyFavorites]
  );

  const attemptUnlock = useCallback(
    async (pwd?: string) => {
      setUnlocking(true);
      setError(null);
      try {
        const unlocked = await unlockGallery(accessKey, pwd);
        if (pwd?.trim()) persistGalleryPassword(accessKey, pwd);
        openGallery(unlocked);
        return true;
      } catch (e: unknown) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status === 403) {
          setNeedsPassword(true);
          setError('Mot de passe requis pour cette galerie.');
          return false;
        }
        if (status === 410) {
          setError('Cette galerie a expiré. Contactez le studio pour la réactiver.');
          return false;
        }
        setError(getApiErrorMessage(e, 'Galerie introuvable. Vérifiez votre clé d\'accès.'));
        return false;
      } finally {
        setUnlocking(false);
        setLoading(false);
      }
    },
    [accessKey, openGallery]
  );

  useEffect(() => {
    if (!accessKey) {
      setError('Clé d\'accès manquante');
      setLoading(false);
      return;
    }

    const cached = getUnlockedGallery(accessKey);
    if (cached && !isGalleryTrashed(cached)) {
      const pwd = resolveGalleryAccessPassword(accessKey);
      if (pwd) setPassword(pwd);
      openGallery(cached);
      setLoading(false);
      return;
    }

    void attemptUnlock(getGalleryPassword(accessKey));
  }, [accessKey, attemptUnlock, openGallery]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Veuillez saisir le mot de passe de la galerie.');
      return;
    }
    await attemptUnlock(password);
  };

  const albumTabs = useMemo(() => {
    const tabs = [
      { id: 'all', label: 'Toutes les photos' },
      { id: 'fav', label: 'Mes favoris' },
    ];
    getActiveAlbums(gallery?.albums || []).forEach((alb) => {
      tabs.push({ id: alb.id, label: alb.name });
    });
    return tabs;
  }, [gallery?.albums]);

  const filteredPhotos = useMemo(() => {
    return photos.filter((p) => {
      if (isPhotoTrashed(p)) return false;
      if (gallery && p.albumId) {
        const album = (gallery.albums || []).find((a) => a.id === p.albumId);
        if (album?.deletedAt) return false;
      }
      if (activeAlbum === 'all') return true;
      if (activeAlbum === 'fav') return p.isFavorite;
      return p.albumId === activeAlbum;
    });
  }, [photos, activeAlbum, gallery]);

  const lightboxIndex = useMemo(() => {
    if (!lightboxPhotoId) return 0;
    const idx = filteredPhotos.findIndex((p) => p.id === lightboxPhotoId);
    return idx >= 0 ? idx : 0;
  }, [filteredPhotos, lightboxPhotoId]);

  const favoritesCount = photos.filter((p) => p.isFavorite && !isPhotoTrashed(p)).length;
  const activeAlbumsCount = getActiveAlbums(gallery?.albums || []).length;
  const totalPhotos = photos.filter((p) => !isPhotoTrashed(p)).length;

  const heroImages = useMemo(() => {
    const urls: string[] = [];
    if (gallery?.coverUrl) {
      urls.push(resolveGridImageUrl(gallery.coverUrl, undefined, 640, 75));
    }
    for (const photo of photos) {
      if (photo.url) {
        const gridUrl = resolveGridImageUrl(photo.url, photo.thumbUrl, 640, 75);
        if (!urls.includes(gridUrl)) urls.push(gridUrl);
      }
      if (urls.length >= 4) break;
    }
    return urls;
  }, [gallery, photos]);

  const { visibleItems: visiblePhotos, hasMore, loadMore, remaining } = useProgressiveVisible(
    filteredPhotos,
    activeAlbum,
    12,
    12
  );

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

  const getDownloadPhotos = () => {
    if (activeAlbum === 'fav') return photos.filter((p) => p.isFavorite && !isPhotoTrashed(p));
    if (activeAlbum === 'all') return photos.filter((p) => !isPhotoTrashed(p));
    return filteredPhotos;
  };

  const closeDownloadPanel = () => {
    setDownloading(false);
    setDownloadMode(null);
    setDownloadProgress(0);
    setDownloadTotal(0);
    setDownloadMessage('');
  };

  const handleDownloadZip = async () => {
    const toDownload = getDownloadPhotos();
    if (toDownload.length === 0) return;

    setDownloading(true);
    setDownloadMode('zip');
    setDownloadProgress(0);
    setDownloadTotal(toDownload.length);
    setDownloadMessage(`Préparation de ${toDownload.length} photo(s)…`);

    try {
      await downloadGalleryZip({
        accessKey,
        password: resolveGalleryAccessPassword(accessKey, password),
        albumId: activeAlbum !== 'all' && activeAlbum !== 'fav' ? activeAlbum : undefined,
        photoIds: activeAlbum === 'fav' ? toDownload.map((p) => p.id) : undefined,
      });
      setDownloadProgress(toDownload.length);
      setDownloadMessage(`Archive ZIP prête — ${toDownload.length} photo(s)`);
      setTimeout(closeDownloadPanel, 2500);
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Impossible de générer le ZIP.');
      const status = (err as { response?: { status?: number } })?.response?.status;

      if (isAuthApiError(err)) {
        setDownloadAuthRequired(true);
        setDownloadMessage('Mot de passe requis pour le téléchargement. Saisissez-le ci-dessous puis réessayez.');
        setTimeout(closeDownloadPanel, 4000);
        return;
      }

      if (status === 404 || /aucune photo téléchargeable/i.test(msg)) {
        setDownloadMessage('ZIP indisponible — téléchargement photo par photo…');
        try {
          const result = await downloadGalleryPhotos(
            toDownload,
            accessKey,
            resolveGalleryAccessPassword(accessKey, password),
            (current, total) => {
              setDownloadProgress(current);
              setDownloadTotal(total);
            }
          );
          setDownloadMessage(
            result.failed > 0
              ? `${result.downloaded} OK, ${result.failed} ouvertes dans un nouvel onglet`
              : `${result.downloaded} photo(s) téléchargée(s) en HD`
          );
          setTimeout(closeDownloadPanel, 3500);
          return;
        } catch {
          setDownloadMessage('Impossible de télécharger les photos. Réessayez plus tard.');
        }
      } else {
        setDownloadMessage(msg);
      }
      setTimeout(closeDownloadPanel, 4000);
    }
  };

  const handleDownloadSingle = async () => {
    const toDownload = getDownloadPhotos();
    if (toDownload.length === 0) return;

    setDownloading(true);
    setDownloadMode('single');
    setDownloadTotal(toDownload.length);
    setDownloadProgress(0);
    setDownloadMessage('Téléchargement photo par photo…');

    try {
      const result = await downloadGalleryPhotos(
        toDownload,
        accessKey,
        resolveGalleryAccessPassword(accessKey, password),
        (current, total) => {
          setDownloadProgress(current);
          setDownloadTotal(total);
        }
      );
      if (result.failed > 0) {
        setDownloadMessage(`${result.downloaded} OK, ${result.failed} ouvertes dans un nouvel onglet`);
      } else {
        setDownloadMessage(`${result.downloaded} photo(s) téléchargée(s)`);
      }
      setTimeout(closeDownloadPanel, 3500);
    } catch {
      setDownloadMessage('Erreur lors du téléchargement.');
      setTimeout(closeDownloadPanel, 3500);
    }
  };

  if (loading || unlocking) {
    return (
      <div className="py-16">
        <LoadingState message="Ouverture de votre galerie privée…" />
      </div>
    );
  }

  if (needsPassword && !gallery) {
    return (
      <div className="max-w-md mx-auto py-12 space-y-6">
        <div className="text-center space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto gold-border-glow">
            <Lock className="h-7 w-7" />
          </div>
          <Badge variant="gold">Accès sécurisé</Badge>
          <h1 className="text-xl font-bold text-white">Mot de passe requis</h1>
          <p className="text-sm text-zinc-400">
            La clé <span className="font-mono text-amber-400/90">{accessKey}</span> est valide. Saisissez le mot de passe reçu avec votre galerie.
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="glass-panel border border-amber-400/20 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-zinc-400 block mb-1 text-xs font-semibold">Mot de passe</label>
            <Input
              type="password"
              autoFocus
              placeholder="Mot de passe de la galerie"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
            />
          </div>
          {error && <p className="text-rose-400 text-[11px] font-medium">{error}</p>}
          <Button type="submit" variant="gold" size="lg" className="w-full font-bold" disabled={unlocking}>
            {unlocking ? 'Vérification…' : 'Accéder à la galerie'}
          </Button>
        </form>

        <div className="text-center">
          <Link href={`/galerie-privee?key=${encodeURIComponent(accessKey)}`}>
            <Button variant="ghost" size="sm" className="text-zinc-400">
              <Key className="h-4 w-4 mr-1" /> Modifier la clé
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error || !gallery) {
    const isExpired = error?.includes('expiré');
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-amber-400 mx-auto" />
        <h1 className="text-xl font-bold text-white">{isExpired ? 'Galerie expirée' : 'Accès impossible'}</h1>
        <p className="text-sm text-zinc-400">{error || 'Galerie non trouvée'}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {isExpired && settings.contactEmail && (
            <a href={`mailto:${settings.contactEmail}`}>
              <Button variant="gold" size="sm">Contacter le studio</Button>
            </a>
          )}
          <Link href={backHref}>
            <Button variant={isExpired ? 'outline' : 'gold'} size="sm">{backLabel}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero cinématique */}
      <section className="relative min-h-[42vh] flex items-end overflow-hidden rounded-3xl border border-amber-400/15">
        <HeroBackgroundSlideshow images={heroImages} intervalMs={7000} />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/20 via-zinc-950/70 to-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_10%,_rgba(212,175,55,0.12),_transparent_50%)]" />

        <div className="relative z-10 w-full p-6 sm:p-8 lg:p-10 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="gold" className="px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 inline" />
              Galerie privée HD
            </Badge>
            <span className="text-[11px] font-mono text-zinc-400">{accessKey}</span>
          </div>

          <div className="space-y-2 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">{gallery.title}</h1>
            <p className="text-sm text-zinc-300 flex flex-wrap items-center gap-x-2 gap-y-1">
              <Calendar className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Client : {gallery.clientName}</span>
              {gallery.expiresAt && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>Valide jusqu&apos;au {gallery.expiresAt}</span>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-6 sm:gap-10">
            {[
              { value: String(totalPhotos), label: 'Photos HD' },
              { value: String(favoritesCount), label: 'Favoris' },
              { value: String(activeAlbumsCount || 1), label: 'Albums' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-extrabold text-white">{stat.value}</div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Barre d'actions */}
      <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-zinc-800/90 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Livraison haute définition</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Téléchargez toutes vos photos en ZIP ou une par une. Vos favoris sont mémorisés sur cet appareil.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveAlbum(activeAlbum === 'fav' ? 'all' : 'fav')}
            className={activeAlbum === 'fav' ? 'border-amber-400/50 text-amber-400' : ''}
          >
            <Heart className={`h-4 w-4 mr-1 ${favoritesCount ? 'fill-amber-400 text-amber-400' : ''}`} />
            Favoris ({favoritesCount})
          </Button>
          <PrivateGalleryDownloadActions
            downloading={downloading}
            photoCount={filteredPhotos.length}
            onDownloadZip={handleDownloadZip}
            onDownloadSingle={handleDownloadSingle}
          />
        </div>
      </div>

      {downloadAuthRequired && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!password.trim()) return;
            persistGalleryPassword(accessKey, password);
            setDownloadAuthRequired(false);
            await handleDownloadZip();
          }}
          className="glass-panel p-4 rounded-2xl border border-amber-400/30 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end"
        >
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
              Mot de passe pour télécharger
            </label>
            <Input
              type="password"
              autoFocus
              placeholder="Mot de passe de la galerie"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10"
            />
          </div>
          <Button type="submit" variant="gold" size="sm" className="shrink-0">
            Télécharger le ZIP
          </Button>
        </form>
      )}

      {albumTabs.length > 2 && (
        <div className="flex flex-wrap gap-2">
          {albumTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveAlbum(tab.id)}
              className={`px-4 py-2 text-[11px] font-semibold rounded-full border transition-all cursor-pointer ${
                activeAlbum === tab.id
                  ? 'border-amber-400/80 bg-amber-400/10 text-amber-300'
                  : 'border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {filteredPhotos.length === 0 ? (
        <div className="text-center py-20 space-y-4 rounded-3xl border border-dashed border-zinc-800">
          <ImageIcon className="h-12 w-12 text-zinc-600 mx-auto" />
          <p className="text-sm text-zinc-400">Aucune photo dans cette sélection.</p>
          {activeAlbum === 'fav' && (
            <p className="text-xs text-zinc-500">Cliquez sur le cœur d&apos;une photo pour l&apos;ajouter à vos favoris.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {visiblePhotos.map((photo, index) => (
            <PrivateGalleryPhotoCard
              key={photo.id}
              photo={photo}
              index={index}
              priority={index < 6}
              onOpen={() => {
                setLightboxPhotoId(photo.id);
                setLightboxOpen(true);
              }}
              onToggleFavorite={() => handleToggleFav(photo.id)}
            />
          ))}
        </div>
      )}

      {filteredPhotos.length > 0 && hasMore && (
        <LoadMoreSentinel enabled={hasMore} onLoadMore={loadMore} remaining={remaining} />
      )}

      <div className="flex justify-center pt-4">
        <Link href={backHref}>
          <Button variant="ghost" size="sm" className="text-zinc-400">
            <ArrowLeft className="h-4 w-4 mr-1" /> {backLabel}
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

      <PrivateGalleryDownloadPanel
        open={downloading}
        mode={downloadMode}
        progress={downloadProgress}
        total={downloadTotal}
        message={downloadMessage}
        onClose={closeDownloadPanel}
      />
    </div>
  );
}
