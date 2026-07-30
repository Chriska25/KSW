'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

const FALLBACK =
  'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop';

function canOptimize(src: string): boolean {
  if (!src) return false;
  if (src.startsWith('/')) return true;
  return (
    src.includes('images.unsplash.com') ||
    src.includes('localhost') ||
    src.includes('127.0.0.1') ||
    src.includes('kswstudio.fr') ||
    src.includes('studiolumiere.fr')
  );
}

interface OptimizedPhotoProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

export function OptimizedPhoto({
  src,
  alt,
  className,
  sizes = '(max-width: 768px) 100vw, 33vw',
  priority = false,
}: OptimizedPhotoProps) {
  const resolved = src || FALLBACK;

  if (!canOptimize(resolved)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={resolved} alt={alt} className={className} loading={priority ? 'eager' : 'lazy'} />
    );
  }

  return (
    <Image
      src={resolved}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn('object-cover', className)}
    />
  );
}
