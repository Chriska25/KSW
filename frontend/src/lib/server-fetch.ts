import { cache } from 'react';
import { DEFAULT_SETTINGS, type SystemSettings } from '@/lib/studio-defaults';
import type { GalleryAdminItem } from '@/lib/gallery-types';
import type { ServiceItem } from '@/lib/service-types';
import { getBackendApiBase } from '@/lib/backend-url';

export const fetchSettingsServer = cache(async (): Promise<SystemSettings> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${getBackendApiBase()}/settings`, {
      next: { revalidate: 60 },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return DEFAULT_SETTINGS;
    const json = await res.json();
    if (json?.data && Object.keys(json.data).length > 0) {
      return { ...DEFAULT_SETTINGS, ...json.data };
    }
  } catch {
    // backend indisponible au build/SSR
  }
  return DEFAULT_SETTINGS;
});

export const fetchGalleriesServer = cache(async (): Promise<GalleryAdminItem[]> => {
  try {
    const res = await fetch(`${getBackendApiBase()}/galleries/public`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (Array.isArray(json?.data)) return json.data;
  } catch {
    // ignore
  }
  return [];
});

export const fetchServicesServer = cache(async (): Promise<ServiceItem[]> => {
  try {
    const res = await fetch(`${getBackendApiBase()}/services`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (Array.isArray(json?.data)) {
      return json.data.filter((s: ServiceItem) => s.isActive !== false);
    }
  } catch {
    // ignore
  }
  return [];
});
