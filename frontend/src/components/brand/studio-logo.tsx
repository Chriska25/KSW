'use client';

import React from 'react';
import Link from 'next/link';
import { Camera } from 'lucide-react';
import { useSettings } from '@/context/settings-context';

interface StudioLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export function StudioLogo({ className = '', size = 'md', showSubtitle = true }: StudioLogoProps) {
  const { settings } = useSettings();

  const firstPart = settings.studioNameFirstPart || 'STUDIO';
  const secondPart = settings.studioNameSecondPart || 'LUMIÈRE';
  const subtitle = settings.studioSubtitle || 'HAUTE PHOTOGRAPHIE';

  // Tailles du logo
  const iconBoxSize = size === 'sm' ? 'h-9 w-9 rounded-xl' : size === 'lg' ? 'h-14 w-14 rounded-2xl' : 'h-11 w-11 rounded-2xl';
  const iconSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-7 w-7' : 'h-5 w-5';
  const titleTextSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <Link href="/" className={`flex items-center space-x-3.5 group select-none ${className}`}>
      {/* Glowing Gold Box with Camera Icon */}
      <div className={`${iconBoxSize} bg-zinc-950 border-2 border-amber-400 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:scale-105 group-hover:shadow-amber-400/40 transition-all duration-300 shrink-0`}>
        <Camera className={iconSize} />
      </div>

      {/* Two-Color Dual Typography */}
      <div className="flex flex-col justify-center">
        <div className={`${titleTextSize} font-black tracking-wider uppercase leading-none flex items-center space-x-1.5`}>
          <span className="text-white">{firstPart}</span>
          <span className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">{secondPart}</span>
        </div>

        {showSubtitle && (
          <span className="text-[10px] font-mono tracking-[0.25em] text-zinc-400 uppercase mt-1 block leading-none">
            {subtitle}
          </span>
        )}
      </div>
    </Link>
  );
}
