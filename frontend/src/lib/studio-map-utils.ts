import type { SystemSettings } from '@/lib/studio-defaults';

export interface StudioMapCoords {
  lat: number;
  lng: number;
  zoom: number;
}

export const DEFAULT_STUDIO_MAP: StudioMapCoords = {
  lat: 48.868285,
  lng: 2.317581,
  zoom: 16,
};

function parseCoord(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function resolveStudioMap(settings?: Partial<SystemSettings>): StudioMapCoords {
  return {
    lat: parseCoord(settings?.studioMapLat, DEFAULT_STUDIO_MAP.lat),
    lng: parseCoord(settings?.studioMapLng, DEFAULT_STUDIO_MAP.lng),
    zoom: Math.max(10, Math.min(20, parseCoord(settings?.studioMapZoom, DEFAULT_STUDIO_MAP.zoom))),
  };
}

/** Embed Google Maps centré exactement sur lat/lng (sans clé API). */
export function buildStudioMapEmbedUrl({ lat, lng, zoom }: StudioMapCoords): string {
  return `https://maps.google.com/maps?q=${lat},${lng}&hl=fr&z=${zoom}&output=embed`;
}

export async function geocodeStudioAddress(address: string): Promise<StudioMapCoords | null> {
  const query = address.trim();
  if (!query) return null;

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
    { headers: { Accept: 'application/json' } }
  );
  if (!res.ok) return null;

  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  const hit = data[0];
  if (!hit) return null;

  return {
    lat: parseFloat(hit.lat),
    lng: parseFloat(hit.lon),
    zoom: 16,
  };
}

export function formatCoord(value: number, digits = 6): string {
  return value.toFixed(digits);
}
