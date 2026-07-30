import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/admin-shell';

const TOKEN_COOKIE = 'studio_token';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;

  if (!token || token.length <= 10) {
    redirect('/login?redirect=/admin/dashboard&admin=1');
  }

  return <AdminShell>{children}</AdminShell>;
}
