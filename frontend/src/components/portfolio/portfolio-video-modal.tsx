'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import type { PortfolioVideoItem } from '@/lib/portfolio-content';
import { resolveVideoSource } from '@/lib/portfolio-video-utils';

interface PortfolioVideoModalProps {
  video: PortfolioVideoItem | null;
  onClose: () => void;
}

export function PortfolioVideoModal({ video, onClose }: PortfolioVideoModalProps) {
  useEffect(() => {
    if (!video) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [video, onClose]);

  if (!video) return null;

  const source = resolveVideoSource(video.videoUrl);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-surface-muted/95"
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-2 right-0 sm:-top-10 sm:right-0 h-10 w-10 rounded-full bg-surface-muted border border-border flex items-center justify-center text-foreground hover:text-foreground hover:border-primary/30 transition-colors z-10"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="aspect-video w-full rounded-2xl overflow-hidden border border-border bg-black shadow-2xl shadow-black/60">
          {source?.provider === 'file' ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={source.embedUrl} controls autoPlay className="h-full w-full object-contain bg-black" />
          ) : source ? (
            <iframe
              title={video.title}
              src={source.embedUrl}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm px-6 text-center">
              URL vidéo non reconnue. Utilisez YouTube, Vimeo ou un fichier .mp4.
            </div>
          )}
        </div>

        <div className="px-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-mono mb-1">{video.category}</p>
          <h3 className="text-xl sm:text-2xl font-bold text-foreground">{video.title}</h3>
          {video.description && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{video.description}</p>}
        </div>
      </div>
    </div>
  );
}
