import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'accent' | 'primary' | 'outline' | 'success' | 'warning' | 'danger' | 'gold';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-surface-muted text-muted-foreground border-border',
    accent: 'bg-primary-muted text-primary border-primary/25',
    primary: 'bg-primary-muted text-primary border-primary/25',
    gold: 'bg-primary-muted text-primary border-primary/25',
    outline: 'bg-transparent text-muted-foreground border-border',
    success: 'bg-success-muted text-success border-success/30',
    warning: 'bg-warning-muted text-warning border-warning/30',
    danger: 'bg-danger-muted text-danger border-danger/30',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
