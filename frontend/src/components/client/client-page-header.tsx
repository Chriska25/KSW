'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ClientPageHeaderProps {
  title: string;
  accent?: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  badges?: React.ReactNode;
  className?: string;
}

export function ClientPageHeader({
  title,
  accent,
  description,
  icon: Icon,
  actions,
  badges,
  className,
}: ClientPageHeaderProps) {
  return (
    <header className={cn('mb-6 sm:mb-8 space-y-4', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold sm:font-extrabold text-white flex items-center gap-2.5 leading-tight">
            {Icon && <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-amber-400 shrink-0" aria-hidden />}
            <span className="truncate">
              {title}
              {accent && (
                <>
                  {' '}
                  <span className="gold-gradient-text">{accent}</span>
                </>
              )}
            </span>
          </h1>
          {description && (
            <p className="text-sm text-zinc-500 sm:text-zinc-400 leading-relaxed max-w-3xl">{description}</p>
          )}
        </div>

        {(actions || badges) && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 sm:pt-0.5 w-full sm:w-auto [&>*]:max-w-full">
            {badges}
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
