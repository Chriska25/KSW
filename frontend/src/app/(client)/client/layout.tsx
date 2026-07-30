import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ClientShellWrapper } from '@/components/client/client-shell-wrapper';

const TOKEN_COOKIE = 'studio_token';

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;

  if (!token || token.length <= 10) {
    redirect('/login?redirect=/client/dashboard');
  }

  return <ClientShellWrapper>{children}</ClientShellWrapper>;
}
