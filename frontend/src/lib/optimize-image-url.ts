/** Réduit la taille des URLs Unsplash et normalise la qualité. */
export function optimizeImageUrl(url: string, width = 800, quality = 75): string {
  if (!url) return url;

  if (url.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('w', String(width));
      parsed.searchParams.set('q', String(quality));
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      return parsed.toString();
    } catch {
      return url;
    }
  }

  return url;
}

/** URL grille : miniature locale si disponible, sinon URL optimisée. */
export function resolveGridImageUrl(
  url: string,
  thumbUrl?: string | null,
  width = 800,
  quality = 75
): string {
  if (thumbUrl?.startsWith('/uploads/')) return thumbUrl;
  return optimizeImageUrl(url, width, quality);
}
