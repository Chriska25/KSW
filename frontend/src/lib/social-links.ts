import type { SystemSettings } from '@/lib/studio-defaults';

export type SocialNetworkId =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'linkedin'
  | 'pinterest'
  | 'x'
  | 'whatsapp';

export interface SocialLinksSettings {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
  pinterest?: string;
  x?: string;
  whatsapp?: string;
}

/** Liens affichés par défaut dans le footer tant qu'aucun réseau n'est configuré. */
export const DEFAULT_SOCIAL_LINKS: Required<SocialLinksSettings> = {
  instagram: 'https://instagram.com/kswstudio',
  facebook: 'https://facebook.com/kswstudio',
  tiktok: '',
  youtube: '',
  linkedin: '',
  pinterest: '',
  x: '',
  whatsapp: '',
};

export const SOCIAL_NETWORK_META: Array<{
  id: SocialNetworkId;
  label: string;
  placeholder: string;
}> = [
  { id: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/kswstudio' },
  { id: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/kswstudio' },
  { id: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@kswstudio' },
  { id: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@kswstudio' },
  { id: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/kswstudio' },
  { id: 'pinterest', label: 'Pinterest', placeholder: 'https://pinterest.com/kswstudio' },
  { id: 'x', label: 'X (Twitter)', placeholder: 'https://x.com/kswstudio' },
  { id: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/33600000000' },
];

function isSocialLinksEmpty(links?: SocialLinksSettings | null): boolean {
  if (!links) return true;
  return SOCIAL_NETWORK_META.every((meta) => !(links[meta.id]?.trim()));
}

export function mergeSocialLinks(settings?: Partial<SystemSettings>): Required<SocialLinksSettings> {
  const raw = settings?.socialLinks;

  if (isSocialLinksEmpty(raw)) {
    return { ...DEFAULT_SOCIAL_LINKS };
  }

  return {
    instagram: raw?.instagram?.trim() || '',
    facebook: raw?.facebook?.trim() || '',
    tiktok: raw?.tiktok?.trim() || '',
    youtube: raw?.youtube?.trim() || '',
    linkedin: raw?.linkedin?.trim() || '',
    pinterest: raw?.pinterest?.trim() || '',
    x: raw?.x?.trim() || '',
    whatsapp: raw?.whatsapp?.trim() || '',
  };
}

export function getActiveSocialLinks(settings?: Partial<SystemSettings>) {
  const links = mergeSocialLinks(settings);
  return SOCIAL_NETWORK_META.map((meta) => ({
    ...meta,
    url: normalizeSocialUrl(links[meta.id]),
  })).filter((item) => Boolean(item.url));
}

function normalizeSocialUrl(url: string): string {
  const clean = url.trim();
  if (!clean) return '';
  if (/^https?:\/\//i.test(clean)) return clean;
  if (clean.startsWith('wa.me/') || clean.startsWith('www.')) return `https://${clean}`;
  return `https://${clean}`;
}
