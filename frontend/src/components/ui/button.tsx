import * as React from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  /** @deprecated Utiliser `primary` */
  | 'gold';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const buttonBaseStyles =
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:bg-primary-hover border border-transparent',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-muted border border-border',
  outline:
    'border border-border bg-transparent text-foreground hover:bg-surface-muted',
  ghost: 'text-muted-foreground hover:text-foreground hover:bg-surface-muted border border-transparent',
  danger:
    'bg-danger text-white hover:bg-danger/90 border border-transparent',
  gold: 'bg-primary text-primary-foreground hover:bg-primary-hover border border-transparent',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
  icon: 'h-10 w-10 p-0 text-sm',
};

export function getButtonClassName({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  const resolvedVariant = variant === 'gold' ? 'primary' : variant;
  return cn(buttonBaseStyles, buttonVariants[resolvedVariant], buttonSizes[size], className);
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={getButtonClassName({ variant, size, className })}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
