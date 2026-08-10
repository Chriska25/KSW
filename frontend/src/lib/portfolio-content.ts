import type { SystemSettings } from '@/lib/studio-defaults';
import { normalizeHeroBackgroundUrls } from '@/lib/hero-banner-images';

export type PortfolioMediaCategory = 'mariage' | 'portrait' | 'corporate' | 'film';

export interface PortfolioVideoItem {
  id: string;
  title: string;
  description?: string;
  category: PortfolioMediaCategory | string;
  /** YouTube, Vimeo ou URL directe (.mp4 / .webm). */
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: string;
  isFeatured?: boolean;
  isPublished?: boolean;
  order?: number;
}

export interface PortfolioPageContent {
  heroBadge: string;
  heroTitleLine1: string;
  heroTitleHighlight: string;
  heroSubtitle: string;
  /** Première image (rétrocompatibilité). */
  heroBackgroundUrl: string;
  /** Photos de la bannière — diaporama si plusieurs. */
  heroBackgroundUrls?: string[];
  showStats: boolean;
  videothequeTitle: string;
  videothequeSubtitle: string;
  videos: PortfolioVideoItem[];
}

export const PORTFOLIO_CATEGORY_LABELS: Record<string, string> = {
  all: 'Tout',
  mariage: 'Mariages',
  portrait: 'Portraits',
  corporate: 'Corporate',
  film: 'Films & making-of',
};

export const DEFAULT_PORTFOLIO_CONTENT: PortfolioPageContent = {
  heroBadge: 'Portfolio & Vidéothèque',
  heroTitleLine1: 'Lumière, émotion,',
  heroTitleHighlight: 'précision absolue',
  heroSubtitle:
    'Reportages de mariage, portraits d\'art et films de marque — une sélection curatée de nos réalisations les plus emblématiques.',
  heroBackgroundUrl:
    'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=2000&auto=format&fit=crop',
  heroBackgroundUrls: [
    'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=2000&auto=format&fit=crop',
  ],
  showStats: true,
  videothequeTitle: 'Vidéothèque',
  videothequeSubtitle: 'Films de mariage, teasers et making-of — l\'émotion en mouvement.',
  videos: [],
};

/** Images hero à afficher sur /portfolio (source admin). */
export function resolvePortfolioHeroImages(content: PortfolioPageContent): string[] {
  return normalizeHeroBackgroundUrls(content, DEFAULT_PORTFOLIO_CONTENT.heroBackgroundUrl);
}

export function getPortfolioContent(settings: Pick<SystemSettings, 'portfolioContent'>): PortfolioPageContent {
  const raw = settings.portfolioContent;
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_PORTFOLIO_CONTENT;
  }

  const heroBackgroundUrls = normalizeHeroBackgroundUrls(raw, DEFAULT_PORTFOLIO_CONTENT.heroBackgroundUrl);

  const videos = Array.isArray(raw.videos)
    ? raw.videos
        .filter((v) => v && typeof v === 'object')
        .map((v, index) => ({
          id: String(v.id || `vid-${index + 1}`),
          title: String(v.title || 'Sans titre'),
          description: v.description ? String(v.description) : '',
          category: (v.category || 'film') as string,
          videoUrl: String(v.videoUrl || ''),
          thumbnailUrl: v.thumbnailUrl ? String(v.thumbnailUrl) : '',
          duration: v.duration ? String(v.duration) : '',
          isFeatured: Boolean(v.isFeatured),
          isPublished: v.isPublished !== false,
          order: typeof v.order === 'number' ? v.order : index,
        }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : DEFAULT_PORTFOLIO_CONTENT.videos;

  return {
    ...DEFAULT_PORTFOLIO_CONTENT,
    ...raw,
    heroBackgroundUrls,
    heroBackgroundUrl: heroBackgroundUrls[0] || DEFAULT_PORTFOLIO_CONTENT.heroBackgroundUrl,
    videos,
  };
}

export function getPublishedPortfolioVideos(content: PortfolioPageContent): PortfolioVideoItem[] {
  return content.videos.filter((v) => v.isPublished !== false && v.videoUrl.trim().length > 0);
}
