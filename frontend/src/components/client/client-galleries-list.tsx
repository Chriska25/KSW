'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Download,
  ExternalLink,
  Copy,
  ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LoadingState } from '@/components/common/loading-state';
import { downloadGalleryPhotos } from '@/lib/gallery-client';
import { DEFAULT_GALLERY_COVER } from '@/lib/gallery-defaults';
import type { GalleryAdminItem } from '@/lib/gallery-types';

interface ClientGalleriesListProps {
  galleries: GalleryAdminItem[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  showHeader?: boolean;
}

export function ClientGalleriesList({
  galleries,
  loading = false,
  error = '',
  onRetry,
  showHeader = true,
}: ClientGalleriesListProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownloadGallery = async (gal: GalleryAdminItem) => {
    const photos = gal.photos || [];
    if (photos.length === 0) return;
    setDownloadMsg(`Téléchargement de ${photos.length} photo(s)…`);
    try {
      const result = await downloadGalleryPhotos(photos);
      if (result.failed > 0) {
        setDownloadMsg(
          `${result.downloaded} téléchargée(s), ${result.failed} ouverte(s) dans un nouvel onglet (CORS).`
        );
      } else {
        setDownloadMsg(`${result.downloaded} photo(s) téléchargée(s).`);
      }
    } catch {
      setDownloadMsg('Erreur lors du téléchargement.');
    }
    setTimeout(() => setDownloadMsg(null), 5000);
  };

  return (
    <>
      {downloadMsg && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-medium shadow-2xl max-w-sm">
          <CheckCircle2 className="h-4 w-4 inline mr-2" />
          {downloadMsg}
        </div>
      )}

      <Card className="glass-panel" id="galleries">
        {showHeader && (
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-amber-400" /> Vos galeries photos
            </CardTitle>
            <CardDescription>
              Ouvrez une galerie, marquez vos favoris et téléchargez vos épreuves HD.
            </CardDescription>
          </CardHeader>
        )}
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-rose-300 text-xs">{error}</p>
              {onRetry && (
                <Button type="button" variant="outline" size="sm" onClick={onRetry} className="shrink-0 text-xs">
                  Réessayer
                </Button>
              )}
            </div>
          )}

          {loading ? (
            <LoadingState message="Chargement de vos galeries…" />
          ) : galleries.length === 0 && !error ? (
            <div className="text-center py-12 space-y-4">
              <ImageIcon className="h-12 w-12 text-zinc-600 mx-auto" />
              <p className="text-sm text-zinc-400">Aucune galerie associée à votre compte pour le moment.</p>
              <Link href="/galerie-privee">
                <Button variant="gold" size="sm">Entrer une clé d&apos;accès</Button>
              </Link>
            </div>
          ) : (
            galleries.map((gal) => (
              <div
                key={gal.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 flex flex-col lg:flex-row gap-5 lg:items-center lg:justify-between"
              >
                <div className="flex gap-4 min-w-0">
                  <img
                    src={gal.coverUrl || DEFAULT_GALLERY_COVER}
                    alt=""
                    className="h-20 w-28 object-cover rounded-xl border border-zinc-800 shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_GALLERY_COVER;
                    }}
                  />
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-bold text-white truncate">{gal.title}</h3>
                    <p className="text-xs text-zinc-400">
                      {gal.photos?.length || 0} photos
                      {gal.expiresAt ? ` • Expire le ${gal.expiresAt}` : ''}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-[11px] text-amber-400 font-mono bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                        {gal.accessKey}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyKey(gal.accessKey)}
                        className="text-[11px] text-zinc-500 hover:text-amber-400 flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" />
                        {copiedKey === gal.accessKey ? 'Copié !' : 'Copier'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadGallery(gal)}
                    disabled={!gal.photos?.length}
                    className="text-xs"
                  >
                    <Download className="h-4 w-4 mr-1" /> Télécharger
                  </Button>
                  <Link href={`/client/galeries/${gal.accessKey}`}>
                    <Button variant="gold" size="sm" className="text-xs font-bold">
                      Ouvrir <ExternalLink className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
