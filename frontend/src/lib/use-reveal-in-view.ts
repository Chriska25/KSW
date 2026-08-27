'use client';

import { useEffect, useRef, useState } from 'react';

function isElementInViewport(el: Element, margin = 80): boolean {
  const rect = el.getBoundingClientRect();
  const viewHeight = window.innerHeight || document.documentElement.clientHeight;
  const viewWidth = window.innerWidth || document.documentElement.clientWidth;
  return (
    rect.bottom >= -margin &&
    rect.top <= viewHeight + margin &&
    rect.right >= -margin &&
    rect.left <= viewWidth + margin
  );
}

function prefersInstantReveal(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(max-width: 768px)').matches
  );
}

function revealRootMargin(): string {
  return prefersInstantReveal() ? '160px 0px' : '80px 0px';
}

/** Déclenche une animation d'entrée quand l'élément entre dans le viewport. */
export function useRevealInView<T extends HTMLElement>(threshold = 0.1) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reveal = () => setVisible(true);

    if (prefersInstantReveal()) {
      const frame = window.requestAnimationFrame(reveal);
      return () => window.cancelAnimationFrame(frame);
    }

    if (isElementInViewport(el)) {
      reveal();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          reveal();
          observer.disconnect();
        }
      },
      { threshold: Math.min(threshold, 0.01), rootMargin: revealRootMargin() }
    );

    observer.observe(el);

    // Filet de sécurité : iOS Safari peut ne jamais déclencher l'IO sur certains layouts.
    const fallback = window.setTimeout(reveal, 1500);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, [threshold]);

  return { ref, visible };
}
