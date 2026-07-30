'use client';

import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/providers/theme-provider';
import { THEME_MODE_LABELS, type ThemeMode } from '@/lib/theme';

const MODES: ThemeMode[] = ['system', 'light', 'dark'];

const MODE_ICONS = {
  system: Monitor,
  light: Sun,
  dark: Moon,
} as const;

interface ThemeSwitcherProps {
  variant?: 'compact' | 'default';
  className?: string;
}

export function ThemeSwitcher({ variant = 'default', className }: ThemeSwitcherProps) {
  const { mode, setMode } = useTheme();

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'inline-flex items-center rounded-xl border border-zinc-800 bg-zinc-950/60 p-0.5',
          className
        )}
        role="group"
        aria-label="Thème d'affichage"
      >
        {MODES.map((item) => {
          const Icon = MODE_ICONS[item];
          const active = mode === item;
          return (
            <button
              key={item}
              type="button"
              title={THEME_MODE_LABELS[item]}
              aria-label={THEME_MODE_LABELS[item]}
              aria-pressed={active}
              onClick={() => setMode(item)}
              className={cn(
                'p-2 rounded-lg transition-all cursor-pointer',
                active
                  ? 'bg-amber-400 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80'
              )}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <p className="text-xs text-zinc-400">
        Choisissez l&apos;apparence de l&apos;interface. « Système » suit les réglages de votre appareil.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="group" aria-label="Thème d'affichage">
        {MODES.map((item) => {
          const Icon = MODE_ICONS[item];
          const active = mode === item;
          return (
            <button
              key={item}
              type="button"
              aria-pressed={active}
              onClick={() => setMode(item)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-semibold transition-all cursor-pointer',
                active
                  ? 'border-amber-400/50 bg-amber-400/10 text-amber-400 shadow-md shadow-amber-400/10'
                  : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{THEME_MODE_LABELS[item]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
