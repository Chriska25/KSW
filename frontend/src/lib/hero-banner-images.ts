export function normalizeHeroBackgroundUrls(
  raw: { heroBackgroundUrls?: string[]; heroBackgroundUrl?: string } | undefined,
  fallbackUrl: string
): string[] {
  if (Array.isArray(raw?.heroBackgroundUrls)) {
    const urls = raw.heroBackgroundUrls.map((u) => String(u || '').trim()).filter(Boolean);
    if (urls.length > 0) return urls;
  }
  const single = String(raw?.heroBackgroundUrl || '').trim();
  if (single) return [single];
  return [fallbackUrl];
}

export function buildHeroBackgroundPatch(
  urls: string[],
  fallbackUrl: string
): { heroBackgroundUrls: string[]; heroBackgroundUrl: string } {
  const cleaned = urls.map((u) => u.trim()).filter(Boolean);
  return {
    heroBackgroundUrls: cleaned,
    heroBackgroundUrl: cleaned[0] || fallbackUrl,
  };
}
