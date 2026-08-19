'use client';

import React from 'react';
import { ImageIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { SystemSettings } from '@/lib/studio-defaults';
import { buildHeroBackgroundPatch } from '@/lib/hero-banner-images';
import { HeroBannerPhotosFields } from '@/components/admin/hero-banner-photos-fields';
import { VideothequeAdminPanel } from '@/components/admin/videotheque-admin-panel';
import {
  DEFAULT_PORTFOLIO_CONTENT,
  getPortfolioContent,
  resolvePortfolioHeroImages,
  type PortfolioPageContent,
} from '@/lib/portfolio-content';

interface PortfolioSettingsFieldsProps {
  settings: SystemSettings;
  onChange: (portfolioContent: PortfolioPageContent) => void;
}

export function PortfolioSettingsFields({ settings, onChange }: PortfolioSettingsFieldsProps) {
  const portfolio = getPortfolioContent(settings);
  const heroImages = resolvePortfolioHeroImages(portfolio);

  const patch = (partial: Partial<PortfolioPageContent>) => {
    onChange({ ...portfolio, ...partial });
  };

  const patchHeroImages = (urls: string[]) => {
    patch(buildHeroBackgroundPatch(urls, DEFAULT_PORTFOLIO_CONTENT.heroBackgroundUrl));
  };

  return (
    <div className="space-y-6">
      <Card className="">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" /> Page Portfolio — en-tête
          </CardTitle>
          <CardDescription>Textes et photos de la bannière sur /portfolio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-foreground font-semibold">Badge</label>
              <Input value={portfolio.heroBadge} onChange={(e) => patch({ heroBadge: e.target.value })} className="bg-surface-muted" />
            </div>
            <div className="space-y-1.5">
              <label className="text-foreground font-semibold">Titre — ligne 1</label>
              <Input value={portfolio.heroTitleLine1} onChange={(e) => patch({ heroTitleLine1: e.target.value })} className="bg-surface-muted" />
            </div>
            <div className="space-y-1.5">
              <label className="text-foreground font-semibold">Titre — mot doré</label>
              <Input
                value={portfolio.heroTitleHighlight}
                onChange={(e) => patch({ heroTitleHighlight: e.target.value })}
                className="bg-surface-muted"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-foreground font-semibold">Sous-titre</label>
              <textarea
                value={portfolio.heroSubtitle}
                onChange={(e) => patch({ heroSubtitle: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <HeroBannerPhotosFields
            images={heroImages}
            onChange={patchHeroImages}
            pageLabel="/portfolio"
          />
        </CardContent>
      </Card>

      <VideothequeAdminPanel portfolio={portfolio} onChange={onChange} />

      <p className="text-[11px] text-muted-foreground px-1">
        Les photos de la galerie proviennent des albums publics (Admin → Galeries). Gérez aussi la vidéothèque depuis{' '}
        <a href="/admin/videotheque" className="text-primary hover:underline">
          Admin → Vidéothèque
        </a>
        .
      </p>
    </div>
  );
}
