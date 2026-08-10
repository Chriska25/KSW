'use client';

import React from 'react';
import { optimizeImageUrl } from '@/lib/optimize-image-url';
import { useRevealInView } from '@/lib/use-reveal-in-view';
import { cn } from '@/lib/utils';

interface RevealPhotoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  index?: number;
  kenBurns?: boolean;
  /** Reflet lumineux au survol (désactiver si le contenu n'est pas une photo). */
  withShine?: boolean;
}

export function RevealPhotoCard({
  index = 0,
  kenBurns = false,
  withShine = true,
  className,
  children,
  style,
  ...props
}: RevealPhotoCardProps) {
  const { ref, visible } = useRevealInView<HTMLDivElement>(0.08);
  const staggerMs = Math.min(index * 90, 540);

  return (
    <div
      ref={ref}
      style={{
        ...style,
        animationDelay: visible ? `${staggerMs}ms` : undefined,
      }}
      className={cn(
        'portfolio-photo-card group relative overflow-hidden',
        kenBurns && 'portfolio-photo-kenburns',
        visible && 'is-visible',
        className
      )}
      {...props}
    >
      {children}
      {withShine && <div className="portfolio-photo-shine pointer-events-none" aria-hidden />}
    </div>
  );
}

interface RevealPhotoImageProps {
  src: string;
  alt: string;
  className?: string;
}

/** Image animée — placer dans un conteneur `overflow-hidden` relative ; le Ken Burns se active via la classe parente. */
export function RevealPhotoImage({
  src,
  alt,
  className,
  width = 640,
}: RevealPhotoImageProps & { width?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={optimizeImageUrl(src, width, 75)}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn('portfolio-photo-image absolute inset-0 h-full w-full object-cover', className)}
    />
  );
}
