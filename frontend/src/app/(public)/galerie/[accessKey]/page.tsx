'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { normalizeGalleryAccessKey } from '@/lib/gallery-access-path';
import { StudioLogo } from '@/components/brand/studio-logo';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/common/loading-state';

const PrivateGalleryView = dynamic(
  () =>
    import('@/components/gallery/private-gallery-view').then((m) => ({
      default: m.PrivateGalleryView,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="py-16">
        <LoadingState message="Chargement de votre galerie…" />
      </div>
    ),
  }
);

export default function PublicGalleryByKeyPage() {
  const params = useParams();
  const accessKey = normalizeGalleryAccessKey(params.accessKey as string);

  return (
    <div className="min-h-screen bg-surface-muted text-zinc-100">
      <header className="border-b border-border/80 bg-surface-muted/90sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <StudioLogo size="sm" showSubtitle={false} />
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground text-xs">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Retour au site
            </Button>
          </Link>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-8 md:py-12">
        <PrivateGalleryView
          accessKey={accessKey}
          backHref="/galerie-privee"
          backLabel="Entrer une autre clé"
        />
      </main>
    </div>
  );
}
