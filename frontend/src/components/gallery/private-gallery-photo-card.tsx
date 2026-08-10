'use client';

import { Heart, Eye } from 'lucide-react';
import { OptimizedPhoto } from '@/components/common/optimized-photo';
import { RevealPhotoCard } from '@/components/common/reveal-photo-card';
import type { PhotoItem } from '@/lib/gallery-types';
import { prefetchImageUrl } from '@/lib/prefetch-image';
import { resolvePhotoHdUrl } from '@/lib/gallery-client';
import { cn } from '@/lib/utils';

interface PrivateGalleryPhotoCardProps {
  photo: PhotoItem;
  index: number;
  onOpen: () => void;
  onToggleFavorite: () => void;
  /** Premières vignettes visibles — chargement prioritaire */
  priority?: boolean;
}

export function PrivateGalleryPhotoCard({
  photo,
  index,
  onOpen,
  onToggleFavorite,
  priority = false,
}: PrivateGalleryPhotoCardProps) {
  const isWide = index % 5 === 0;

  return (
    <RevealPhotoCard
      index={index}
      kenBurns={false}
      withShine={false}
      className={cn(
        'aspect-[4/3] rounded-2xl border border-zinc-800/80 bg-zinc-900 cursor-pointer',
        isWide && 'sm:col-span-2 sm:aspect-[2/1]'
      )}
      onClick={onOpen}
      onMouseEnter={() => prefetchImageUrl(resolvePhotoHdUrl(photo))}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <OptimizedPhoto
        src={photo.url}
        thumbSrc={photo.thumbUrl}
        alt={photo.title}
        width={560}
        priority={priority}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
      <div className="portfolio-photo-shine pointer-events-none" aria-hidden />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className="absolute top-3 right-3 z-20 p-2.5 rounded-full bg-zinc-950/70 border border-zinc-700/80 text-white hover:text-amber-400 hover:border-amber-400/40 transition-colors"
        aria-label={photo.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      >
        <Heart className={cn('h-4 w-4', photo.isFavorite && 'fill-amber-400 text-amber-400')} />
      </button>

      <div className="absolute inset-x-0 bottom-0 z-10 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
        <p className="text-sm font-semibold text-white truncate">{photo.title}</p>
        {photo.albumName && (
          <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{photo.albumName}</p>
        )}
      </div>

      <div className="absolute top-3 left-3 z-20 h-9 w-9 rounded-full bg-zinc-950/70 border border-zinc-700/80 flex items-center justify-center scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300">
        <Eye className="h-4 w-4 text-amber-400" />
      </div>
    </RevealPhotoCard>
  );
}
