'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Play, Clock, Film } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PortfolioVideoItem } from '@/lib/portfolio-content';
import { PORTFOLIO_CATEGORY_LABELS } from '@/lib/portfolio-content';
import { resolveVideoThumbnail } from '@/lib/portfolio-video-utils';
import { PortfolioVideoModal } from '@/components/portfolio/portfolio-video-modal';

interface PortfolioVideothequeProps {
  videos: PortfolioVideoItem[];
  title: string;
  subtitle: string;
  filter: string;
  search: string;
}

export function PortfolioVideotheque({ videos, title, subtitle, filter, search }: PortfolioVideothequeProps) {
  const [activeVideo, setActiveVideo] = useState<PortfolioVideoItem | null>(null);

  const filtered = useMemo(() => {
    return videos.filter((v) => {
      const cat = (v.category || 'film').toLowerCase();
      const matchesCat = filter === 'all' || cat.includes(filter.toLowerCase());
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        v.title.toLowerCase().includes(q) ||
        (v.description || '').toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [videos, filter, search]);

  const featured = filtered.find((v) => v.isFeatured) || filtered[0];

  if (videos.length === 0) {
    return (
      <div className="text-center py-16 px-6 rounded-3xl border border-dashed border-zinc-800 bg-zinc-950/50">
        <Film className="h-10 w-10 text-zinc-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-sm text-zinc-500 max-w-md mx-auto">
          La vidéothèque sera bientôt disponible. L&apos;administrateur peut ajouter des films depuis{' '}
          <Link href="/admin/videotheque" className="text-amber-400 hover:underline">
            Admin → Vidéothèque
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-10">
        <div className="max-w-2xl">
          <Badge variant="gold" className="mb-3">Cinéma & motion</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {title.split(' ').slice(0, -1).join(' ')}{' '}
            <span className="gold-gradient-text">{title.split(' ').slice(-1)[0]}</span>
          </h2>
          <p className="text-zinc-400 mt-3 leading-relaxed">{subtitle}</p>
        </div>

        {featured && filtered.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveVideo(featured)}
            className="group relative w-full aspect-[21/9] min-h-[220px] rounded-3xl overflow-hidden border border-zinc-800 text-left cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolveVideoThumbnail(featured.videoUrl, featured.thumbnailUrl)}
              alt={featured.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-6 sm:p-10 max-w-2xl">
              <span className="text-[10px] uppercase tracking-[0.25em] text-amber-400 font-mono mb-2">
                {PORTFOLIO_CATEGORY_LABELS[featured.category] || featured.category} · À la une
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">{featured.title}</h3>
              {featured.description && (
                <p className="text-sm text-zinc-300 line-clamp-2 mb-4">{featured.description}</p>
              )}
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400 text-zinc-950 text-xs font-bold uppercase tracking-wider group-hover:scale-105 transition-transform">
                  <Play className="h-4 w-4 fill-current" /> Lire la vidéo
                </span>
                {featured.duration && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
                    <Clock className="h-3.5 w-3.5" /> {featured.duration}
                  </span>
                )}
              </div>
            </div>
          </button>
        )}

        {filtered.length === 0 ? (
          <p className="text-center text-zinc-500 py-12">Aucune vidéo ne correspond à votre recherche.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((video) => (
              <button
                key={video.id}
                type="button"
                onClick={() => setActiveVideo(video)}
                className="group text-left rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950/60 hover:border-amber-400/30 transition-all cursor-pointer"
              >
                <div className="relative aspect-video overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveVideoThumbnail(video.videoUrl, video.thumbnailUrl)}
                    alt={video.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-zinc-950/20 group-hover:bg-zinc-950/40 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="h-14 w-14 rounded-full bg-amber-400/90 text-zinc-950 flex items-center justify-center shadow-lg shadow-amber-400/30 scale-90 group-hover:scale-100 transition-transform">
                      <Play className="h-6 w-6 fill-current ml-0.5" />
                    </span>
                  </div>
                  {video.duration && (
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-zinc-950/80 text-[10px] text-zinc-200 font-mono">
                      {video.duration}
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-amber-400/90 font-mono">
                    {PORTFOLIO_CATEGORY_LABELS[video.category] || video.category}
                  </p>
                  <h3 className="font-bold text-white group-hover:text-amber-100 transition-colors">{video.title}</h3>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <PortfolioVideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />
    </>
  );
}
