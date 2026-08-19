'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { galleryAccessPath } from '@/lib/gallery-access-path';
import {
  ExternalLink,
  Copy,
  ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LoadingState } from '@/components/common/loading-state';
import { DEFAULT_GALLERY_COVER } from '@/lib/gallery-defaults';
import type { GalleryAdminItem } from '@/lib/gallery-types';

interface ClientGalleriesListProps {
  galleries: GalleryAdminItem[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  showHeader?: boolean;
}

function galleryPhotoCount(gal: GalleryAdminItem): number {
  return gal.photosCount ?? gal.photos?.length ?? 0;
}

export function ClientGalleriesList({
  galleries,
  loading = false,
  error = '',
  onRetry,
  showHeader = true,
}: ClientGalleriesListProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <Card className="" id="galleries">
      {showHeader && (
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" /> Vos galeries photos
          </CardTitle>
          <CardDescription>
            Ouvrez une galerie, marquez vos favoris et téléchargez vos épreuves HD.
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Aucune galerie associée à votre compte pour le moment.</p>
            <Link href="/galerie-privee">
              <Button variant="primary" size="sm">Entrer une clé d&apos;accès</Button>
            </Link>
          </div>
        ) : (
          galleries.map((gal) => (
            <div
              key={gal.id}
              className="rounded-2xl border border-border bg-surface-muted p-5 flex flex-col lg:flex-row gap-5 lg:items-center lg:justify-between"
            >
              <div className="flex gap-4 min-w-0">
                <img
                  src={gal.coverUrl || DEFAULT_GALLERY_COVER}
                  alt=""
                  className="h-20 w-28 object-cover rounded-xl border border-border shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_GALLERY_COVER;
                  }}
                />
                <div className="min-w-0 space-y-1">
                  <h3 className="font-bold text-foreground truncate">{gal.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {galleryPhotoCount(gal)} photo{galleryPhotoCount(gal) !== 1 ? 's' : ''}
                    {gal.expiresAt ? ` • Expire le ${gal.expiresAt}` : ''}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-[11px] text-primary font-mono bg-surface-muted px-2 py-0.5 rounded border border-border">
                      {gal.accessKey}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopyKey(gal.accessKey)}
                      className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      {copiedKey === gal.accessKey ? 'Copié !' : 'Copier'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Link href={galleryAccessPath(gal.accessKey)}>
                  <Button variant="primary" size="sm" className="text-xs font-bold">
                    Ouvrir la galerie <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
