'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';

type AppLinkProps = ComponentProps<typeof Link>;

/** Lien Next.js avec prefetch activé par défaut pour des changements de page plus rapides. */
export function AppLink({ prefetch = true, ...props }: AppLinkProps) {
  return <Link prefetch={prefetch} {...props} />;
}
