'use client';

import React from 'react';
import { Eye } from 'lucide-react';
import { OptimizedPhoto } from '@/components/common/optimized-photo';
import type { PhotoItem } from '@/lib/gallery-types';
import { PORTFOLIO_CATEGORY_LABELS } from '@/lib/portfolio-content';
import { prefetchImageUrl } from '@/lib/prefetch-image';
import { useRevealInView } from '@/lib/use-reveal-in-view';
import { useProgressiveVisible } from '@/lib/use-progressive-visible';
import { LoadMoreSentinel } from '@/components/common/load-more-sentinel';
import { cn } from '@/lib/utils';

interface PortfolioMasonryGridProps {
  photos: PhotoItem[];
  onPhotoClick: (index: number) => void;
}

function layoutClass(index: number, photo: PhotoItem): { grid: string; kenburns: boolean } {
  if (photo.isCover || photo.isFavorite) {
    if (index % 5 === 0) return { grid: 'md:col-span-2 md:row-span-2', kenburns: false };
    if (index % 7 === 0) return { grid: 'md:col-span-2', kenburns: false };
  }
  if (index % 6 === 2) return { grid: 'md:col-span-2', kenburns: false };
  return { grid: '', kenburns: false };
}

interface PortfolioPhotoCardProps {
  photo: PhotoItem;
  index: number;
  onClick: () => void;
}

function PortfolioPhotoCard({ photo, index, onClick }: PortfolioPhotoCardProps) {
  const { ref, visible } = useRevealInView<HTMLButtonElement>(0.08);
  const staggerMs = Math.min(index * 75, 525);
  const layout = layoutClass(index, photo);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onMouseEnter={() => prefetchImageUrl(photo.url)}
      style={{ animationDelay: visible ? `${staggerMs}ms` : undefined }}
      className={cn(
        'portfolio-photo-card group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950 text-left cursor-pointer min-h-[220px]',
        layout.grid,
        layout.kenburns && 'portfolio-photo-kenburns',
        visible && 'is-visible'
      )}
    >
      <OptimizedPhoto
        src={photo.url}
        thumbSrc={photo.thumbUrl}
        alt={photo.title}
        className="portfolio-photo-image absolute inset-0 h-full w-full object-cover"
      />

      <div className="portfolio-photo-shine" aria-hidden />

      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/25 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-500 z-[1]" />

      <div className="absolute inset-x-0 bottom-0 p-5 z-[3] translate-y-3 group-hover:translate-y-0 transition-transform duration-500 ease-out">
        <span className="inline-block text-[10px] uppercase tracking-[0.2em] text-amber-400 font-mono opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 delay-75">
          {PORTFOLIO_CATEGORY_LABELS[photo.cat || ''] || photo.cat || 'portfolio'}
        </span>
        <h3 className="text-base sm:text-lg font-bold text-white mt-1 line-clamp-2 translate-y-1 group-hover:translate-y-0 transition-transform duration-500">
          {photo.title}
        </h3>
        {photo.albumName && (
          <p className="text-[11px] text-zinc-400 mt-1 max-h-0 opacity-0 overflow-hidden group-hover:max-h-8 group-hover:opacity-100 transition-all duration-500">
            {photo.albumName}
          </p>
        )}
      </div>

      <div className="absolute top-3 right-3 z-[3] h-9 w-9 rounded-full bg-zinc-950/70 border border-zinc-700/80 flex items-center justify-center scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 ease-out">
        <Eye className="h-4 w-4 text-amber-400" />
      </div>

      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/0 group-hover:ring-amber-400/20 transition-all duration-500 pointer-events-none z-[4]" />
    </button>
  );
}

const INITIAL_VISIBLE = 18;
const LOAD_MORE_STEP = 12;

export function PortfolioMasonryGrid({ photos, onPhotoClick }: PortfolioMasonryGridProps) {
  const listKey = `${photos.length}-${photos[0]?.id ?? ''}`;
  const { visibleItems: visiblePhotos, hasMore, loadMore, remaining } = useProgressiveVisible(
    photos,
    listKey,
    INITIAL_VISIBLE,
    LOAD_MORE_STEP
  );

  if (photos.length === 0) {
    return (
      <div className="text-center py-16 px-6 rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/50 portfolio-photo-card is-visible">
        <Eye className="h-10 w-10 text-zinc-600 mx-auto mb-4" />
        <p className="text-zinc-400 text-sm">
          Aucune photo publique pour le moment. Rendez une galerie visible dans Admin → Galeries.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 auto-rows-[220px] gap-4 md:gap-5">
        {visiblePhotos.map((photo, index) => (
          <PortfolioPhotoCard
            key={photo.id}
            photo={photo}
            index={index}
            onClick={() => onPhotoClick(photos.findIndex((p) => p.id === photo.id))}
          />
        ))}
      </div>
      {hasMore && (
        <LoadMoreSentinel enabled={hasMore} onLoadMore={loadMore} remaining={remaining} />
      )}
    </div>
  );
}
