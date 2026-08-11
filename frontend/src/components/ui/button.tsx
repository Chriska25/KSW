import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

    const variants = {
      primary:
        'bg-amber-400 text-zinc-100 hover:bg-amber-300 font-semibold shadow-lg shadow-amber-400/20 hover:shadow-amber-400/30 hover:scale-[1.02]',
      secondary:
        'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700/60',
      outline:
        'border border-zinc-700 text-zinc-200 hover:bg-zinc-800/80 hover:border-zinc-500',
      ghost: 'text-zinc-300 hover:bg-zinc-800/50 hover:text-white',
      gold: 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-zinc-100 font-bold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02]',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-7 py-3.5 text-base',
      icon: 'h-10 w-10 p-2 text-sm',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
