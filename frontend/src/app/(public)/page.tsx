'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Calendar,
  Camera,
  Star,
  Award,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ServicePackagesGrid } from '@/components/public/service-packages-grid';
import { useSettings } from '@/context/settings-context';
import { getHomePageContent } from '@/lib/home-page-content';

export default function HomePage() {
  const { settings } = useSettings();
  const home = getHomePageContent(settings);

  return (
    <div className="space-y-24 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[92vh] flex items-center justify-center pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-zinc-950/80 to-zinc-950" />
        <div
          className="absolute inset-0 opacity-20 mix-blend-overlay bg-cover bg-center"
          style={{ backgroundImage: `url("${home.heroBackgroundUrl}")` }}
        />

        <div className="relative max-w-5xl mx-auto px-4 text-center space-y-8 z-10">
          <Badge variant="gold" className="px-4 py-1.5 text-xs font-semibold uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5 mr-2 inline" /> {home.heroBadge}
          </Badge>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-foreground tracking-tight leading-[1.1]">
            {home.heroTitleLine1} <br />
            <span className="gold-gradient-text">{home.heroTitleHighlight}</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-foreground font-light leading-relaxed">
            {home.heroSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/reservation">
              <Button variant="gold" size="lg" className="w-full sm:w-auto space-x-3 px-8 text-base">
                <Calendar className="h-5 w-5" />
                <span>{home.heroCtaPrimary}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/portfolio">
              <Button variant="outline" size="lg" className="w-full sm:w-auto space-x-2 px-8 text-base">
                <Camera className="h-5 w-5 text-primary" />
                <span>{home.heroCtaSecondary}</span>
              </Button>
            </Link>
          </div>

          <div className="pt-10 flex flex-wrap items-center justify-center gap-8 text-xs text-muted-foreground border-t border-border/80">
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4 text-primary" />
              <span>{home.trustBadge1}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="h-4 w-4 text-primary fill-amber-400" />
              <span>{home.trustBadge2}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-primary" />
              <span>{home.trustBadge3}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATS COUNTER BAR */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl p-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center border border-amber-500/20 gold-border-glow">
          {home.stats.map((stat, index) => (
            <div key={index}>
              <div className="text-3xl md:text-4xl font-extrabold gold-gradient-text">{stat.value}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. PRESTATIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <Badge variant="gold">{home.servicesBadge}</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            {home.servicesTitleLine1} <br />
            <span className="gold-gradient-text">{home.servicesTitleHighlight}</span>
          </h2>
          <p className="text-muted-foreground text-sm">{home.servicesSubtitle}</p>
        </div>

        <ServicePackagesGrid />
      </section>

      {/* 4. TESTIMONIALS — contenu fixe */}
      <section className="bg-surface-muted/40 py-16 border-y border-border/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <Badge variant="gold">Témoignages Clients</Badge>
            <h2 className="text-3xl font-bold text-foreground">Ce qu&apos;ils disent du Studio</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Sophie & Alexandre',
                event: 'Mariage au Château de Gilly',
                text: 'Une présence merveilleuse lors de notre mariage. Les photos sont à couper le souffle, d’une poésie rare. Nos invités ont tous souligné sa discrétion et son professionnalisme.',
                stars: 5,
              },
              {
                name: 'Julien M.',
                event: 'Portrait Professionnel Studio',
                text: 'Moi qui déteste poser devant un objectif, l’expérience en studio a été d’une fluidité remarquable. Le résultat pour mon profil LinkedIn et presse est exceptionnel.',
                stars: 5,
              },
              {
                name: 'Cabinet Vaneau & Associés',
                event: 'Reportage Corporate 50 Collaborateurs',
                text: 'Livraison des photos dans des délais record. La qualité des portraits trombinoscopes et des prises de vue d’architecture a sublimé notre nouveau site internet.',
                stars: 5,
              },
            ].map((t, idx) => (
              <Card key={idx} className="space-y-4">
                <div className="flex items-center space-x-1">
                  {[...Array(t.stars)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-primary fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-foreground italic leading-relaxed">&quot;{t.text}&quot;</p>
                <div className="pt-4 border-t border-border/80">
                  <div className="font-semibold text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.event}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 5. CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl glass-panel-gold gold-border-glow p-10 md:p-16 overflow-hidden text-center space-y-6 border-amber-400/40">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
              {home.ctaTitleLine1}{' '}
              <span className="gold-gradient-text">{home.ctaTitleHighlight}</span>
            </h2>
            <p className="text-foreground text-sm md:text-base">{home.ctaSubtitle}</p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/reservation">
                <Button variant="gold" size="lg" className="px-8 space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>{home.ctaButtonPrimary}</span>
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" size="lg" className="px-8">
                  {home.ctaButtonSecondary}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
