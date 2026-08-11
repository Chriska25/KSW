'use client';

import { usePathname } from 'next/navigation';
import { ClientShell } from '@/components/client/client-shell';
import { ClientAuthGuard } from '@/components/client/client-auth-guard';
import { isGalleryKeyAccessPath } from '@/lib/gallery-access-path';

export function ClientShellWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const keyOnlyGallery = isGalleryKeyAccessPath(pathname);

  return (
    <ClientShell keyOnlyGallery={keyOnlyGallery}>
      {keyOnlyGallery ? children : <ClientAuthGuard>{children}</ClientAuthGuard>}
    </ClientShell>
  );
}
