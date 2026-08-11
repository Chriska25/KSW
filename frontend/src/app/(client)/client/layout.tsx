import React from 'react';
import { ClientShellWrapper } from '@/components/client/client-shell-wrapper';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ClientShellWrapper>{children}</ClientShellWrapper>;
}
