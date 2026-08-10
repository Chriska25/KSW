'use client';

import React from 'react';
import { ServicesProvider } from '@/context/services-context';
import type { ServiceItem } from '@/lib/service-types';

export function PublicServicesProvider({
  initialServices,
  children,
}: {
  initialServices: ServiceItem[];
  children: React.ReactNode;
}) {
  return <ServicesProvider initialServices={initialServices}>{children}</ServicesProvider>;
}
