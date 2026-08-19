'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Camera,
  Film,
  Search,
  ArrowRight,
  Calendar,
  Aperture,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/common/loading-state';
import { PortfolioMasonryGrid } from '@/components/portfolio/portfolio-masonry-grid';
import { useSettings } from '@/context/settings-context';
import { useGalleries } from '@/context/gallery-context';
import {
  getPortfolioContent,
  getPublishedPortfolioVideos,
  PORTFOLIO_CATEGORY_LABELS,
  resolvePortfolioHeroImages,
} from '@/lib/portfolio-content';
import { HeroBackgroundSlideshow } from '@/components/common/hero-background-slideshow';

const PhotoLightbox = dynamic(
  () => import('@/components/common/photo-lightbox').then((m) => ({ default: m.PhotoLightbox })),
  { ssr: false }
);
const PortfolioVideotheque = dynamic(
  () =>
    import('@/components/portfolio/portfolio-videotheque').then((m) => ({
      default: m.PortfolioVideotheque,
    })),
  { loading: () => <LoadingState message="Chargement de la vidéothèque…" /> }
);

type PortfolioView = 'photos' | 'videos';

export default function PortfolioPage() {
  const { settings, fullStudioName } = useSettings();
  const { publicPhotos, galleriesLoading } = useGalleries();
  const portfolio = getPortfolioContent(settings);
  const publishedVideos = getPublishedPortfolioVideos(portfolio);
  const heroImages = useMemo(() => resolvePortfolioHeroImages(portfolio), [portfolio]);

  const [view, setView] = useState<PortfolioView>('photos');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const filterButtons = useMemo(() => {
    const base = Object.entries(PORTFOLIO_CATEGORY_LABELS).map(([id, label]) => ({ id, label }));
    const albumNames = Array.from(
      new Set(publicPhotos.map((p) => p.albumName).filter((name): name is string => Boolean(name)))
    );
    const custom = albumNames.slice(0, 4).map((name) => ({
      id: name.toLowerCase(),
      label: name,
    }));
    return [...base, ...custom];
  }, [publicPhotos]);

  const filteredPhotos = useMemo(() => {
    return publicPhotos.filter((p) => {
      const photoCat = (p.cat || 'mariage').toLowerCase();
      const albumName = (p.albumName || '').toLowerCase();
      const filterLower = filter.toLowerCase();
      const matchesCat =
        filter === 'all' ||
        photoCat.includes(filterLower) ||
        albumName.includes(filterLower);
      const matchesSearch =
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.albumName || '').toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [publicPhotos, filter, search]);

  const stats = useMemo(
    () => [
      { value: String(publicPhotos.length), label: 'Clichés publics' },
      { value: String(publishedVideos.length), label: 'Films & vidéos' },
      {
        value: String(new Set(publicPhotos.map((p) => p.cat).filter(Boolean)).size || 3),
        label: 'Univers créatifs',
      },
    ],
    [publicPhotos, publishedVideos.length]
  );

  if (galleriesLoading && publicPhotos.length === 0 && publishedVideos.length === 0) {
    return (
      <div className="pt-28 pb-20 px-4">
        <LoadingState message="Chargement du portfolio…" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Hero cinématique */}
      <section className="relative min-h-[72vh] flex items-end overflow-hidden">
        <HeroBackgroundSlideshow images={heroImages} />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/30 via-zinc-950/75 to-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,_rgba(251,191,36,0.12),_transparent_50%)]" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16">
          <Badge variant="primary" className="mb-5 px-4 py-1.5 text-[10px] uppercase tracking-[0.2em]">
            <Sparkles className="h-3.5 w-3.5 mr-2 inline" />
            {portfolio.heroBadge}
          </Badge>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-foreground tracking-tight leading-[1.05] max-w-4xl">
            {portfolio.heroTitleLine1}{' '}
            <span className="text-primary block sm:inline">{portfolio.heroTitleHighlight}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base sm:text-lg text-foreground leading-relaxed font-light">
            {portfolio.heroSubtitle.replace('{studio}', fullStudioName)}
          </p>

          {portfolio.showStats && (
            <div className="mt-10 flex flex-wrap gap-8 sm:gap-12">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-3xl sm:text-4xl font-extrabold text-foreground tabular-nums">{stat.value}</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 -mt-6 relative z-20 space-y-10">
        {/* Barre de contrôle */}
        <div className="p-4 sm:p-5 rounded-2xl border border-border/90 space-y-4 shadow-xl shadow-black/20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="inline-flex p-1 rounded-xl bg-surface-muted border border-border self-start">
              <button
                type="button"
                onClick={() => setView('photos')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  view === 'photos'
                    ? 'bg-amber-400 text-zinc-950 shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Camera className="h-4 w-4" /> Galerie photo
              </button>
              <button
                type="button"
                onClick={() => setView('videos')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  view === 'videos'
                    ? 'bg-amber-400 text-zinc-950 shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Film className="h-4 w-4" /> Vidéothèque
                {publishedVideos.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-md bg-surface-muted/20 text-[10px]">{publishedVideos.length}</span>
                )}
              </button>
            </div>

            <div className="relative w-full lg:max-w-xs">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder={view === 'photos' ? 'Rechercher un projet…' : 'Rechercher un film…'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 text-xs bg-surface-muted/80"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterButtons.map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setFilter(btn.id)}
                className={`px-3.5 py-1.5 text-[11px] font-semibold rounded-full border transition-all cursor-pointer ${
                  filter === btn.id
                    ? 'border-primary/30 bg-primary-muted text-primary'
                    : 'border-border text-muted-foreground hover:border-zinc-600 hover:text-zinc-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu */}
        {view === 'photos' ? (
          <PortfolioMasonryGrid
            photos={filteredPhotos}
            onPhotoClick={(index) => {
              setSelectedPhotoIndex(index);
              setLightboxOpen(true);
            }}
          />
        ) : (
          <PortfolioVideotheque
            videos={publishedVideos}
            title={portfolio.videothequeTitle}
            subtitle={portfolio.videothequeSubtitle}
            filter={filter}
            search={search}
          />
        )}

        {/* CTA */}
        <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-950 p-8 sm:p-12">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-muted rounded-full blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2 text-primary">
                <Aperture className="h-5 w-5" />
                <span className="text-xs font-mono uppercase tracking-widest">Sur mesure</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                Votre histoire mérite une <span className="text-primary">mise en lumière</span> d&apos;exception
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Mariage, portrait ou film de marque — construisons ensemble un univers visuel à la hauteur de vos ambitions.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link href="/reservation">
                <Button variant="primary" size="lg" className="w-full sm:w-auto space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Réserver une séance</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Nous contacter
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>

      <PhotoLightbox
        photos={filteredPhotos}
        currentIndex={selectedPhotoIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(idx) => setSelectedPhotoIndex(idx)}
      />
    </div>
  );
}
