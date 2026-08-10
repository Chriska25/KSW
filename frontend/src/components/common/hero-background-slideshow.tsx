'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { optimizeImageUrl } from '@/lib/optimize-image-url';

interface HeroBackgroundSlideshowProps {
  images: string[];
  intervalMs?: number;
}

/** Une seule image chargée à la fois — diaporama léger. */
export function HeroBackgroundSlideshow({ images, intervalMs = 6500 }: HeroBackgroundSlideshowProps) {
  const slides = images.filter(Boolean).map((url) => optimizeImageUrl(url, 1400, 70));
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (reduceMotion || slides.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [reduceMotion, slides.length, intervalMs]);

  if (slides.length === 0) return null;

  const activeIndex = reduceMotion ? 0 : index;
  const activeUrl = slides[activeIndex];

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <Image
        key={activeUrl}
        src={activeUrl}
        alt=""
        fill
        priority={activeIndex === 0}
        sizes="100vw"
        quality={70}
        className="object-cover scale-105 hero-background-slide-active transition-opacity duration-[2200ms]"
      />
    </div>
  );
}
