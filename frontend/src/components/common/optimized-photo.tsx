'use client';

import Image from 'next/image';
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
  width = 800,
  thumbSrc,
}: OptimizedPhotoProps) {
  const resolved = resolveGridImageUrl(src || FALLBACK, thumbSrc, width);
  const unoptimized = isPreGeneratedThumb(resolved);

  return (
    <Image
      src={resolved}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      quality={unoptimized ? undefined : 75}
      unoptimized={unoptimized}
      className={cn('object-cover', className)}
    />
  );
}
