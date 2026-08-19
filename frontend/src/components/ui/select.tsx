import * as React from 'react';
import { cn } from '@/lib/utils';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          'flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground',
          'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors duration-150',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';
