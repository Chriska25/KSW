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

/** Déduit l’URL miniature `_thumb.webp` (aligné sur backend/image_processor.py). */
export function inferThumbUrl(url: string): string | null {
  if (!url?.startsWith('/uploads/')) return null;

  const filename = url.replace('/uploads/', '');
  const dot = filename.lastIndexOf('.');
  if (dot === -1) return null;

  const base = filename.slice(0, dot);
  const ext = filename.slice(dot);
  if (base.endsWith('_thumb')) return url;

  return `/uploads/${base}_thumb${ext || '.webp'}`;
}

/** Miniature déjà générée côté serveur — pas besoin du optimiseur Next.js. */
export function isPreGeneratedThumb(url: string): boolean {
  return url.startsWith('/uploads/') && url.includes('_thumb');
}

/** URL grille : miniature locale si disponible, sinon URL optimisée. */
export function resolveGridImageUrl(
  url: string,
  thumbUrl?: string | null,
  width = 800,
  quality = 75
): string {
  if (thumbUrl?.startsWith('/uploads/')) return thumbUrl;

  const inferred = inferThumbUrl(url);
  if (inferred) return inferred;

  return optimizeImageUrl(url, width, quality);
}
