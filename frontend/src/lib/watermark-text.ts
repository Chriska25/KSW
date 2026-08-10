import type { SystemSettings } from '@/lib/studio-defaults';
import { resolveInvoiceLogoUrl } from '@/lib/invoice-studio-info';

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
    case 'bottom_left':
      return 'bottom-4 left-4';
    case 'top_left':
      return 'top-4 left-4';
    case 'top_center':
      return 'top-4 left-1/2 -translate-x-1/2';
    case 'top_right':
      return 'top-4 right-4';
    case 'center':
      return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    case 'bottom_right':
    default:
      return 'bottom-4 right-4';
  }
}

export function resolveWatermarkLogoUrl(
  settings: Pick<SystemSettings, 'watermarkLogoUrl' | 'invoiceLogoUrl'>
): string | undefined {
  const dedicated = (settings.watermarkLogoUrl || '').trim();
  if (dedicated) return resolveInvoiceLogoUrl(dedicated);
  return resolveInvoiceLogoUrl(settings.invoiceLogoUrl);
}

export const WATERMARK_POSITION_OPTIONS = [
  { value: 'bottom_center', label: 'En bas au centre' },
  { value: 'bottom_right', label: 'En bas à droite' },
  { value: 'bottom_left', label: 'En bas à gauche' },
  { value: 'top_center', label: 'En haut au centre' },
  { value: 'top_right', label: 'En haut à droite' },
  { value: 'top_left', label: 'En haut à gauche' },
  { value: 'center', label: 'Au centre' },
] as const;
