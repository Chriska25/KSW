const prefetched = new Set<string>();

/** Précharge une image en cache navigateur (lightbox, navigation). */
export function prefetchImageUrl(url: string | undefined | null): void {
  if (!url || typeof window === 'undefined') return;
  if (prefetched.has(url)) return;

  prefetched.add(url);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
}

/** Précharge plusieurs URLs (ignore les doublons). */
export function prefetchImageUrls(urls: Array<string | undefined | null>): void {
  for (const url of urls) prefetchImageUrl(url);
}
