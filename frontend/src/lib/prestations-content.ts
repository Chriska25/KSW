import type { SystemSettings } from '@/lib/studio-defaults';
import { getHomePageContent } from '@/lib/home-page-content';
import { normalizeHeroBackgroundUrls } from '@/lib/hero-banner-images';

export interface PrestationsProcessStep {
  title: string;
  description: string;
}

export interface PrestationsPageContent {
  heroBadge: string;
  heroTitleLine1: string;
  heroTitleHighlight: string;
  heroSubtitle: string;
  /** Première image (rétrocompatibilité). */
  heroBackgroundUrl: string;
  /** Photos de la bannière — diaporama si plusieurs. */
  heroBackgroundUrls?: string[];
  processTitle: string;
  processSteps: PrestationsProcessStep[];
}

export const DEFAULT_PRESTATIONS_CONTENT: PrestationsPageContent = {
  heroBadge: 'Formules & Tarifs',
  heroTitleLine1: 'Prestations photographiques',
  heroTitleHighlight: 'sur-mesure',
  heroSubtitle:
    'Des formules transparentes, un accompagnement haut de gamme et une réservation en ligne simplifiée — acompte sécurisé, contrat et galerie privée inclus.',
  heroBackgroundUrl:
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=2000&auto=format&fit=crop',
  heroBackgroundUrls: [
    'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=2000&auto=format&fit=crop',
  ],
  processTitle: 'Comment réserver votre séance',
  processSteps: [
    {
      title: 'Choisissez votre formule',
      description: 'Comparez les packs mariage, portrait ou corporate et sélectionnez la prestation adaptée à votre projet.',
    },
    {
      title: 'Réservez & versez l\'acompte',
      description: 'Indiquez votre date, vos coordonnées et réglez l\'acompte en ligne (carte, Mobile Money ou virement).',
    },
    {
      title: 'Signature & galerie privée',
      description: 'Contrat électronique immédiat, puis livraison HD via votre espace client sécurisé.',
    },
  ],
};

/** Images hero à afficher sur /prestations (source admin). */
export function resolvePrestationsHeroImages(content: PrestationsPageContent): string[] {
  return normalizeHeroBackgroundUrls(content, DEFAULT_PRESTATIONS_CONTENT.heroBackgroundUrl);
}

export function getPrestationsContent(settings: Pick<SystemSettings, 'homePageContent' | 'prestationsContent'>): PrestationsPageContent {
  const home = getHomePageContent(settings);
  const raw = settings.prestationsContent;
  const heroBackgroundUrls = normalizeHeroBackgroundUrls(raw, DEFAULT_PRESTATIONS_CONTENT.heroBackgroundUrl);

  const merged: PrestationsPageContent = {
    ...DEFAULT_PRESTATIONS_CONTENT,
    ...(raw && typeof raw === 'object' ? raw : {}),
    heroBadge: raw?.heroBadge || home.servicesBadge || DEFAULT_PRESTATIONS_CONTENT.heroBadge,
    heroTitleLine1: raw?.heroTitleLine1 || home.servicesTitleLine1 || DEFAULT_PRESTATIONS_CONTENT.heroTitleLine1,
    heroTitleHighlight: raw?.heroTitleHighlight || home.servicesTitleHighlight || DEFAULT_PRESTATIONS_CONTENT.heroTitleHighlight,
    heroSubtitle: raw?.heroSubtitle || home.servicesSubtitle || DEFAULT_PRESTATIONS_CONTENT.heroSubtitle,
    heroBackgroundUrls,
    heroBackgroundUrl: heroBackgroundUrls[0] || DEFAULT_PRESTATIONS_CONTENT.heroBackgroundUrl,
    processSteps:
      Array.isArray(raw?.processSteps) && raw.processSteps.length > 0
        ? raw.processSteps
        : DEFAULT_PRESTATIONS_CONTENT.processSteps,
  };

  return merged;
}

export const PRESTATION_CATEGORY_LABELS: Record<string, string> = {
  all: 'Toutes',
  mariage: 'Mariages',
  portrait: 'Portraits',
  corporate: 'Corporate',
  evenement: 'Événements',
};
