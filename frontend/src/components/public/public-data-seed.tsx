'use client';

import { useLayoutEffect, useRef } from 'react';
import type { GalleryAdminItem } from '@/lib/gallery-types';
import { useGalleries } from '@/context/gallery-context';

/** Injecte les galeries SSR dans le contexte (évite un fetch client au premier affichage portfolio/contact). */
export function PublicDataSeed({ galleries }: { galleries: GalleryAdminItem[] }) {
  const { hydrateGalleries } = useGalleries();
  const seededRef = useRef(false);

  useLayoutEffect(() => {
    if (seededRef.current || galleries.length === 0) return;
    seededRef.current = true;
    hydrateGalleries(galleries);
  }, [galleries, hydrateGalleries]);

  return null;
}
