'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PrivateGalleryView } from '@/components/gallery/private-gallery-view';
import { normalizeGalleryAccessKey } from '@/lib/gallery-access-path';
import { StudioLogo } from '@/components/brand/studio-logo';
import { Button } from '@/components/ui/button';

export default function PublicGalleryByKeyPage() {
  const params = useParams();
  const accessKey = normalizeGalleryAccessKey(params.accessKey as string);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <StudioLogo size="sm" showSubtitle={false} />
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-zinc-400 text-xs">
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
