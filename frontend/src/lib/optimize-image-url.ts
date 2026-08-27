'use client';

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

function insertThumbSuffix(filename: string): string | null {
  const dot = filename.lastIndexOf('.');
  if (dot === -1) return null;
  const base = filename.slice(0, dot);
  const ext = filename.slice(dot);
  if (base.endsWith('_thumb')) return filename;
  return `${base}_thumb${ext || '.webp'}`;
}

/** Déduit l’URL miniature `_thumb.webp` (aligné sur backend/image_processor.py). */
export function inferThumbUrl(url: string): string | null {
  if (!url) return null;

  if (url.startsWith('/uploads/')) {
    const filename = url.replace('/uploads/', '');
    const thumb = insertThumbSuffix(filename);
    return thumb ? `/uploads/${thumb}` : null;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      const parts = parsed.pathname.split('/');
      const filename = parts.pop() || '';
      const thumb = insertThumbSuffix(filename);
      if (!thumb) return null;
      parts.push(thumb);
      parsed.pathname = parts.join('/');
      return parsed.toString();
    } catch {
      return null;
    }
  }

  return null;
}

/** Miniature déjà générée côté serveur — pas besoin du optimiseur Next.js. */
export function isPreGeneratedThumb(url: string): boolean {
  return (url.startsWith('/uploads/') || url.includes('/storage/v1/object/public/')) && url.includes('_thumb');
}

/** URL grille : miniature serveur si disponible, sinon miniature inférée, sinon originale optimisée. */
export function resolveGridImageUrl(
  url: string,
  thumbUrl?: string | null,
  width = 800,
  quality = 75
): string {
  if (thumbUrl && (thumbUrl.startsWith('/uploads/') || thumbUrl.startsWith('http'))) {
    return thumbUrl;
  }

  const inferred = inferThumbUrl(url);
  if (inferred) return inferred;

  return optimizeImageUrl(url, width, quality);
}

/** URL hero / bannière — préfère miniature inférée pour les uploads studio. */
export function resolveHeroImageUrl(url: string, width = 1400, quality = 70): string {
  if (!url) return url;
  const inferred = inferThumbUrl(url);
  if (inferred) return inferred;
  return optimizeImageUrl(url, width, quality);
}
