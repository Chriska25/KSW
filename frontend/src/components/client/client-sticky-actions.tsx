'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ClientStickyActionsProps {
  children: React.ReactNode;
  className?: string;
  withSpacer?: boolean;
  mobileOnly?: boolean;
}

export function ClientStickyActions({
  children,
  className,
  withSpacer = true,
  mobileOnly = false,
}: ClientStickyActionsProps) {
  return (
    <>
      <div
        className={cn(
          'admin-sticky-actions',
          'border-t border-border/90 bg-surface-muted/95 backdrop-blur-md',
          'px-4 sm:px-0 py-3 sm:py-4',
          'flex items-center justify-end gap-2 sm:gap-3',
          mobileOnly
            ? 'fixed inset-x-0 bottom-0 z-30 sm:hidden shadow-[0_-8px_30px_rgba(0,0,0,0.35)]'
            : 'fixed inset-x-0 bottom-0 z-30 md:static md:z-10 shadow-[0_-8px_30px_rgba(0,0,0,0.35)] md:shadow-none',
          className
        )}
      >
        {children}
      </div>
      {withSpacer && (
        <div
          className={cn('h-[4.25rem] shrink-0', mobileOnly ? 'sm:hidden' : 'md:h-0')}
          aria-hidden
        />
      )}
    </>
  );
}
