import { useCallback, useEffect, useState } from 'react';

/** Affiche une liste par tranches (pagination client) — réinitialise quand `resetKey` change. */
export function useProgressiveVisible<T>(
  items: T[],
  resetKey: string | number,
  initial = 12,
  step = 12
) {
  const [visibleCount, setVisibleCount] = useState(initial);

  useEffect(() => {
    setVisibleCount(initial);
  }, [resetKey, initial]);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;
  const remaining = items.length - visibleCount;

  const loadMore = useCallback(() => {
    setVisibleCount((n) => Math.min(n + step, items.length));
  }, [items.length, step]);

  return { visibleItems, hasMore, loadMore, remaining, total: items.length };
}
