import type { SystemSettings } from '@/lib/studio-defaults';

/** Texte affiché : © STUDIO LUMIÈRE • ÉPREUVE SÉCURISÉE */
export function buildWatermarkLabel(
  settings: Pick<SystemSettings, 'studioNameFirstPart' | 'studioNameSecondPart' | 'watermarkText'>
): string {
  const studio = `${settings.studioNameFirstPart || 'KSW'} ${settings.studioNameSecondPart || 'STUDIO'}`
    .trim()
    .toUpperCase();

  let suffix = (settings.watermarkText || 'Épreuve sécurisée').trim();
  suffix = suffix.replace(/^©\s*/i, '').trim();

  // Texte complet déjà saisi par l'admin (ex. "STUDIO LUMIÈRE • ÉPREUVE SÉCURISÉE")
  if (suffix.includes('•')) {
    return suffix.startsWith('©') ? suffix.toUpperCase() : `© ${suffix.toUpperCase()}`;
  }

  // Ancien format "© KSW Studio - Épreuve confidentielle"
  if (suffix.includes(' - ')) {
    suffix = suffix.split(' - ').pop()?.trim() || suffix;
  }

  return `© ${studio} • ${suffix.toUpperCase()}`;
}

export function watermarkPositionClass(position?: string): string {
  switch (position) {
    case 'bottom_center':
      return 'bottom-4 left-1/2 -translate-x-1/2';
    case 'center':
      return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    case 'bottom_right':
    default:
      return 'bottom-4 right-4';
  }
}
