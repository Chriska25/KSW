'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  /** Partie accentuée après le titre (couleur primary, pas de dégradé) */
  accent?: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  badges?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  accent,
  description,
  icon: Icon,
  actions,
  badges,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('mb-6 space-y-4', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-h1 text-foreground flex items-center gap-2.5">
            {Icon && <Icon className="h-5 w-5 text-primary shrink-0" aria-hidden />}
            <span className="truncate">
              {title}
              {accent && (
                <>
                  {' '}
                  <span className="text-accent">{accent}</span>
                </>
              )}
            </span>
          </h1>
          {description && <p className="text-small text-muted-foreground max-w-3xl">{description}</p>}
        </div>
        {(actions || badges) && (
          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto [&>*]:max-w-full">
            {badges}
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
