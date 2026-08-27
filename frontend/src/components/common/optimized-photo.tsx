'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  isPreGeneratedThumb,
  optimizeImageUrl,
  resolveGridImageUrl,
} from '@/lib/optimize-image-url';

const FALLBACK = optimizeImageUrl(
  'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop',
  640
);

interface OptimizedPhotoProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  width?: number;
  /** Miniature pré-générée (uploads locaux) — utilisée en grille. */
  thumbSrc?: string | null;
}

/** Image optimisée via next/image (WebP/AVIF, lazy, srcset). */
export function OptimizedPhoto({
  src,
  alt,
  className,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  width = 640,
  thumbSrc,
}: OptimizedPhotoProps) {
  const source = src || FALLBACK;
  const primary = resolveGridImageUrl(source, thumbSrc, width);
  const [resolved, setResolved] = useState(primary);
  const unoptimized = isPreGeneratedThumb(resolved);

  useEffect(() => {
    setResolved(primary);
  }, [primary]);

  const handleError = () => {
    const fallback = optimizeImageUrl(source, width);
    if (resolved !== fallback) {
      setResolved(fallback);
    }
  };

  return (
    <Image
      src={resolved}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={unoptimized ? undefined : 75}
      unoptimized={unoptimized}
      onError={handleError}
      className={cn('object-cover', className)}
    />
  );
}
