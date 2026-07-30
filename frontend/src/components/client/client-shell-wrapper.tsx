'use client';

import { ClientShell } from '@/components/client/client-shell';
import { ClientAuthGuard } from '@/components/client/client-auth-guard';

export function ClientShellWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ClientShell>
      <ClientAuthGuard>{children}</ClientAuthGuard>
    </ClientShell>
  );
}
