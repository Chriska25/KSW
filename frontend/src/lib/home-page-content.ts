import type { SystemSettings } from '@/lib/studio-defaults';

export interface HomeStatItem {
  value: string;
  label: string;
}

export interface HomePageContent {
  heroBadge: string;
  heroTitleLine1: string;
  heroTitleHighlight: string;
  heroSubtitle: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  heroBackgroundUrl: string;
  trustBadge1: string;
  trustBadge2: string;
  trustBadge3: string;
  stats: HomeStatItem[];
  servicesBadge: string;
  servicesTitleLine1: string;
  servicesTitleHighlight: string;
  servicesSubtitle: string;
  ctaTitleLine1: string;
  ctaTitleHighlight: string;
  ctaSubtitle: string;
  ctaButtonPrimary: string;
  ctaButtonSecondary: string;
}

export const DEFAULT_HOME_PAGE_CONTENT: HomePageContent = {
  heroBadge: "Studio Photographique d'Art & Prestige",
  heroTitleLine1: "Sublimer l'Instant,",
  heroTitleHighlight: "Graver l'Émotion",
  heroSubtitle:
    "Photographe professionnel spécialisé dans les reportages de mariage haut de gamme, les portraits d'art et l'accompagnement visuel sur-mesure.",
  heroCtaPrimary: 'Réserver une Séance',
  heroCtaSecondary: 'Explorer le Portfolio',
  heroBackgroundUrl:
    'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=2000&auto=format&fit=crop',
  trustBadge1: 'Membre Fearless Photographers',
  trustBadge2: 'Note 5/5 (180+ Avis Vérifiés)',
  trustBadge3: 'Galerie Securisée & Livraison HD',
  stats: [
    { value: '12+', label: "Années d'Expérience" },
    { value: '450+', label: 'Mariages & Projets' },
    { value: '15', label: 'Distinctions Internationales' },
    { value: '100%', label: 'Livraison Haute Définition' },
  ],
  servicesBadge: "Prestations D'Exception",
  servicesTitleLine1: 'Des formules conçues pour immortaliser',
  servicesTitleHighlight: 'vos plus grands moments',
  servicesSubtitle:
    "Chaque prestation comprend la direction artistique, la retouche minutieuse haute précision et l'accès à une galerie privée en ligne.",
  ctaTitleLine1: 'Prêt à immortaliser',
  ctaTitleHighlight: 'vos souvenirs ?',
  ctaSubtitle:
    "Vérifiez la disponibilité de votre date et réservez votre créneau directement en ligne avec paiement sécurisé de l'acompte.",
  ctaButtonPrimary: 'Réserver en Ligne Maintenant',
  ctaButtonSecondary: 'Formulaire de Contact',
};

export function getHomePageContent(settings: Pick<SystemSettings, 'homePageContent'>): HomePageContent {
  const raw = settings.homePageContent;
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_HOME_PAGE_CONTENT;
  }

  return {
    ...DEFAULT_HOME_PAGE_CONTENT,
    ...raw,
    stats:
      Array.isArray(raw.stats) && raw.stats.length === 4
        ? raw.stats.map((item, index) => ({
            value: item?.value ?? DEFAULT_HOME_PAGE_CONTENT.stats[index]?.value ?? '',
            label: item?.label ?? DEFAULT_HOME_PAGE_CONTENT.stats[index]?.label ?? '',
          }))
        : DEFAULT_HOME_PAGE_CONTENT.stats,
  };
}
