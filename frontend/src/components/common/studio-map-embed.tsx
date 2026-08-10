'use client';

import React from 'react';
import { buildStudioMapEmbedUrl, resolveStudioMap, type StudioMapCoords } from '@/lib/studio-map-utils';
import { useSettings } from '@/context/settings-context';

interface StudioMapEmbedProps {
  coords?: StudioMapCoords;
  className?: string;
  title?: string;
}

export function StudioMapEmbed({
  coords,
  className = 'h-48 w-full',
  title = 'Localisation du studio',
}: StudioMapEmbedProps) {
  const { settings } = useSettings();
  const map = coords || resolveStudioMap(settings);
  const src = buildStudioMapEmbedUrl(map);

  return (
    <div className={`rounded-2xl overflow-hidden glass-panel border border-zinc-800 ${className}`}>
      <iframe
        title={title}
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0, filter: 'grayscale(1) invert(0.9) contrast(1.2)' }}
        allowFullScreen={false}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}
