/** Chemin public d'accès à une galerie privée via la clé seule (sans connexion). */
export function galleryAccessPath(accessKey: string): string {
  const key = (accessKey || '').trim().toUpperCase();
  return key ? `/galerie/${encodeURIComponent(key)}` : '/galerie-privee';
}

export function isGalleryKeyAccessPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return /^\/galerie\/[^/]+/.test(pathname) || /^\/client\/galeries\/[^/]+/.test(pathname);
}

export function normalizeGalleryAccessKey(raw: string | undefined | null): string {
  return (raw || '').trim().toUpperCase();
}

/** URL absolue d'accès galerie (email, copier-coller admin). */
export function galleryAccessUrl(accessKey: string): string {
  const path = galleryAccessPath(accessKey);
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`;
  }
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://kswstudio.fr').replace(/\/$/, '');
  return `${base}${path}`;
}
