'use client';

import type { ComponentProps } from 'react';
import { AppLink } from '@/components/navigation/app-link';
import { getButtonClassName, type ButtonSize, type ButtonVariant } from '@/components/ui/button';

type ButtonLinkProps = ComponentProps<typeof AppLink> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/** Lien de navigation stylé comme un bouton — évite le nesting invalide `<Link><button>`. */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <AppLink className={getButtonClassName({ variant, size, className })} {...props}>
      {children}
    </AppLink>
  );
}
