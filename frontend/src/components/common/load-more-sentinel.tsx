'use client';

import { useInfiniteScrollTrigger } from '@/lib/use-infinite-scroll-trigger';
import { cn } from '@/lib/utils';

interface LoadMoreSentinelProps {
  enabled: boolean;
  onLoadMore: () => void;
  remaining?: number;
  className?: string;
}

/** Point d'ancrage invisible — charge la suite au scroll. */
export function LoadMoreSentinel({ enabled, onLoadMore, remaining, className }: LoadMoreSentinelProps) {
  const ref = useInfiniteScrollTrigger(enabled, onLoadMore);

  if (!enabled) return null;

  return (
    <div
      ref={ref}
      className={cn('flex justify-center py-6', className)}
      aria-hidden
    >
      <span className="text-[11px] text-zinc-500 font-mono">
        {remaining != null && remaining > 0 ? `${remaining} photo(s) à afficher…` : 'Chargement…'}
      </span>
    </div>
  );
}
