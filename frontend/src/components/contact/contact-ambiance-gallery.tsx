'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { optimizeImageUrl } from '@/lib/optimize-image-url';

const FALLBACK_CONTACT_PHOTOS = [
  {
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop',
    title: 'Mariage d\'exception',
  },
  {
    url: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=800&auto=format&fit=crop',
    title: 'Portrait d\'art',
  },
  {
    url: 'https://images.unsplash.com/photo-1465495976277-4387d212b22d?q=80&w=800&auto=format&fit=crop',
    title: 'Émotion & lumière',
  },
  {
    url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop',
    title: 'Reportage premium',
  },
  {
    url: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c2b?q=80&w=800&auto=format&fit=crop',
    title: 'Coulisses studio',
  },
  {
    url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=800&auto=format&fit=crop',
    title: 'Réception & fête',
  },
];

interface ContactAmbianceGalleryProps {
  photos: { url: string; title: string }[];
}

export function ContactAmbianceGallery({ photos }: ContactAmbianceGalleryProps) {
  const items = useMemo(() => {
    const source = photos.length >= 2 ? photos.slice(0, 8) : FALLBACK_CONTACT_PHOTOS;
    return source.length >= 4 ? source : [...source, ...FALLBACK_CONTACT_PHOTOS].slice(0, 6);
  }, [photos]);

  const loop = useMemo(() => [...items, ...items], [items]);
  const durationSec = Math.max(items.length * 9, 48);

  return (
    <section className="space-y-6">
      <div className="text-center max-w-2xl mx-auto space-y-2 px-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-amber-400/90 font-mono">Univers créatif</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-white">
          L&apos;ambiance <span className="gold-gradient-text">du studio</span>
        </h2>
      </div>

      <div
        className="relative ambiance-marquee-root -mx-4 sm:-mx-6 lg:-mx-8"
        style={{ ['--ambiance-marquee-duration' as string]: `${durationSec}s` }}
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 sm:w-24 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 sm:w-24 bg-gradient-to-l from-zinc-950 via-zinc-950/80 to-transparent" />

        <div className="overflow-hidden py-1">
          <div className="ambiance-marquee-track flex w-max gap-4 sm:gap-5 px-4 sm:px-6">
            {loop.map((photo, index) => (
              <article
                key={`${photo.url}-${index}`}
                className="group relative shrink-0 w-[11.5rem] sm:w-[13.5rem] md:w-[15rem] aspect-[3/4] rounded-2xl overflow-hidden border border-zinc-800/80 bg-zinc-950 shadow-lg shadow-black/20"
              >
                <Image
                  src={optimizeImageUrl(photo.url, 480, 70)}
                  alt={photo.title}
                  fill
                  sizes="240px"
                  quality={70}
                  loading="lazy"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/10 to-transparent" />
                <p className="absolute bottom-3 left-3 right-3 text-[11px] font-semibold text-white/90 line-clamp-2 z-[1]">
                  {photo.title}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
