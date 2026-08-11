'use client';

import { useEffect, useRef } from 'react';

/** Déclenche `onLoadMore` quand le sentinel entre dans le viewport (scroll infini). */
export function useInfiniteScrollTrigger(enabled: boolean, onLoadMore: () => void, rootMargin = '200px 0px') {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin, threshold: 0 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, onLoadMore, rootMargin]);

  return sentinelRef;
}
