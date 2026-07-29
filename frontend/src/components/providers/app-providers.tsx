'use client';

import React from 'react';
import { SettingsProvider } from '@/context/settings-context';
import { GalleryProvider } from '@/context/gallery-context';
import { ServicesProvider } from '@/context/services-context';
import type { SystemSettings } from '@/lib/studio-defaults';
import type { GalleryAdminItem } from '@/lib/gallery-types';
import type { ServiceItem } from '@/lib/service-types';

interface AppProvidersProps {
  children: React.ReactNode;
  initialSettings: SystemSettings;
  initialGalleries: GalleryAdminItem[];
  initialServices: ServiceItem[];
}

export function AppProviders({
  children,
  initialSettings,
  initialGalleries,
  initialServices,
}: AppProvidersProps) {
  return (
    <SettingsProvider initialSettings={initialSettings}>
      <GalleryProvider initialGalleries={initialGalleries}>
        <ServicesProvider initialServices={initialServices}>{children}</ServicesProvider>
      </GalleryProvider>
    </SettingsProvider>
  );
}
