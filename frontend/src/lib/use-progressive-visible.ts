import { useCallback, useState } from 'react';

/** Affiche une liste par tranches (pagination client) — réinitialise quand `resetKey` change. */
export function useProgressiveVisible<T>(
  items: T[],
  resetKey: string | number,
  initial = 12,
  step = 12
) {
  const [state, setState] = useState({ resetKey, visibleCount: initial });

  if (state.resetKey !== resetKey) {
    setState({ resetKey, visibleCount: initial });
  }

  const visibleCount = state.visibleCount;
  const hasMore = visibleCount < items.length;
  const remaining = items.length - visibleCount;

  const loadMore = useCallback(() => {
    setState((prev) => ({
      ...prev,
      visibleCount: Math.min(prev.visibleCount + step, items.length),
    }));
  }, [items.length, step]);

  const visibleItems = items.slice(0, visibleCount);
  return { visibleItems, hasMore, loadMore, remaining, total: items.length };
}
