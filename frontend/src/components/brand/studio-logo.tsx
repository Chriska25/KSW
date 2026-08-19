'use client';

import React from 'react';
import { AppLink } from '@/components/navigation/app-link';
import { Camera } from 'lucide-react';
import { useSettings } from '@/context/settings-context';

interface StudioLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  onNavigate?: () => void;
}

export function StudioLogo({
  className = '',
  size = 'md',
  showSubtitle = true,
  onNavigate,
}: StudioLogoProps) {
  const { settings } = useSettings();

  const firstPart = settings.studioNameFirstPart || 'STUDIO';
  const secondPart = settings.studioNameSecondPart || 'LUMIÈRE';
  const subtitle = settings.studioSubtitle || 'HAUTE PHOTOGRAPHIE';

  const iconBoxSize =
    size === 'sm' ? 'h-9 w-9 rounded-lg' : size === 'lg' ? 'h-12 w-12 rounded-lg' : 'h-10 w-10 rounded-lg';
  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  const titleTextSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base';

  return (
    <AppLink
      href="/"
      onClick={onNavigate}
      className={`flex items-center gap-3 group select-none ${className}`}
    >
      <div
        className={`${iconBoxSize} bg-surface border border-border text-primary flex items-center justify-center shrink-0 transition-colors group-hover:border-primary/40`}
      >
        <Camera className={iconSize} aria-hidden />
      </div>

      <div className="flex flex-col justify-center min-w-0">
        <div className={`${titleTextSize} font-semibold tracking-wide uppercase leading-none flex items-center gap-1.5`}>
          <span className="text-foreground">{firstPart}</span>
          <span className="text-primary">{secondPart}</span>
        </div>

        {showSubtitle && (
          <span className="text-caption uppercase tracking-widest mt-1 block leading-none truncate">
            {subtitle}
          </span>
        )}
      </div>
    </AppLink>
  );
}
