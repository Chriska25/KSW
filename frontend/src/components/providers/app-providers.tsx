'use client';

import React from 'react';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { SettingsProvider } from '@/context/settings-context';
import { GalleryProvider } from '@/context/gallery-context';
import { RouteProgress } from '@/components/navigation/route-progress';
import type { SystemSettings } from '@/lib/studio-defaults';

interface AppProvidersProps {
  children: React.ReactNode;
  initialSettings: SystemSettings;
}

export function AppProviders({ children, initialSettings }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <RouteProgress />
      <SettingsProvider initialSettings={initialSettings}>
        <GalleryProvider>{children}</GalleryProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
