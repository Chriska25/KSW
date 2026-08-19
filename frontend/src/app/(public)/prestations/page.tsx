'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Shield,
  Sparkles,
  Calendar,
  CreditCard,
  Images,
  ArrowRight,
  CheckCircle2,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/context/settings-context';
import { useServices } from '@/context/services-context';
import { getPrestationsContent, resolvePrestationsHeroImages } from '@/lib/prestations-content';
import { ServicePackagesGrid } from '@/components/public/service-packages-grid';
import { HeroBackgroundSlideshow } from '@/components/common/hero-background-slideshow';
import { useRevealInView } from '@/lib/use-reveal-in-view';
import { cn } from '@/lib/utils';

const PROCESS_STEP_ICONS: LucideIcon[] = [Star, CreditCard, Images];

function ProcessStepCard({
  step,
  title,
  description,
  index,
  Icon,
}: {
  step: string;
  title: string;
  description: string;
  index: number;
  Icon: LucideIcon;
}) {
  const { ref, visible } = useRevealInView<HTMLDivElement>(0.12);

  return (
    <div
      ref={ref}
      className={cn(
        'prestations-step group relative p-6 sm:p-8 rounded-3xl border border-border/90 bg-surface-muted hover:border-primary/30 transition-colors',
        visible && 'is-visible'
      )}
      style={{ animationDelay: visible ? `${index * 120}ms` : undefined }}
    >
      <span className="text-[10px] font-mono text-primary/80 tracking-[0.3em]">{step}</span>
      <div className="mt-4 h-11 w-11 rounded-xl bg-primary-muted flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

export default function PrestationsPage() {
  const { settings, fullStudioName, formatPrice } = useSettings();
  const { services } = useServices();
  const content = getPrestationsContent(settings);
  const heroImages = useMemo(() => resolvePrestationsHeroImages(content), [content]);

  const stats = useMemo(() => {
    const prices = services.map((s) => s.price).filter((p) => p > 0);
    const minPrice = prices.length ? Math.min(...prices) : null;
    return [
      { value: String(services.length || '—'), label: 'Formules actives' },
      { value: minPrice != null ? `dès ${formatPrice(minPrice)}` : 'Sur devis', label: 'Tarifs transparents' },
      { value: `${settings.depositRate || 30}%`, label:"Acompte à la réservation" },
    ];
  }, [services, formatPrice, settings.depositRate]);

  return (
    <div className="pb-24">
      {/* Hero */}
      <section className="relative min-h-[68vh] flex items-end overflow-hidden">
        <HeroBackgroundSlideshow images={heroImages} />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/80 to-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,_rgba(212,175,55,0.14),_transparent_55%)]" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-14">
          <Badge variant="primary" className="mb-5 px-4 py-1.5 text-[10px] uppercase tracking-[0.2em]">
            <Sparkles className="h-3.5 w-3.5 mr-2 inline" />
            {content.heroBadge}
          </Badge>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-foreground tracking-tight leading-[1.05] max-w-4xl">
            {content.heroTitleLine1}{' '}
            <span className="text-primary block sm:inline">{content.heroTitleHighlight}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base sm:text-lg text-foreground leading-relaxed font-light">
            {content.heroSubtitle.includes('Chez ')
              ? content.heroSubtitle
              : `Chez ${fullStudioName}, ${content.heroSubtitle.charAt(0).toLowerCase()}${content.heroSubtitle.slice(1)}`}
          </p>

          <div className="mt-10 flex flex-wrap gap-8 sm:gap-12">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl sm:text-3xl font-extrabold text-foreground">{stat.value}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-20 space-y-20">
        {/* Grille prestations */}
        <section>
          <ServicePackagesGrid />
        </section>

        {/* Comment ça marche */}
        <section className="space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <Badge variant="outline" className="border-border text-muted-foreground">
              Parcours client
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
              {content.processTitle}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Un processus fluide, pensé pour les mariés et clients exigeants — de la réservation à la livraison de vos images.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
            {content.processSteps.map((item, index) => (
              <ProcessStepCard
                key={item.title}
                step={`0${index + 1}`}
                title={item.title}
                description={item.description}
                index={index}
                Icon={PROCESS_STEP_ICONS[index] ?? Star}
              />
            ))}
          </div>
        </section>

        {/* Garanties */}
        <section className="rounded-3xl p-8 sm:p-10 border border-border/90">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-primary-muted flex items-center justify-center text-primary shrink-0">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Engagement qualité & sécurité</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">Votre sérénité, notre priorité.</p>
                </div>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-foreground">
                {[
                  'Paiement sécurisé Stripe & Mobile Money',
                  'Contrat avec signature électronique',
                  'Galerie privée chiffrée par clé d\'accès',
                  'Retouche professionnelle & livraison HD',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <Link href="/reservation">
                <Button variant="primary" size="lg" className="w-full sm:w-auto space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Réserver maintenant</span>
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Demande sur mesure
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-950 p-8 sm:p-12 text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-primary-muted blur-3xl" />
          <div className="relative space-y-4 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Une date en tête ? <span className="text-primary">Sécurisez-la dès aujourd&apos;hui.</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Les créneaux haute saison partent vite. Verrouillez votre date avec un acompte et recevez votre confirmation immédiatement.
            </p>
            <Link href="/reservation">
              <Button variant="primary" size="lg" className="mt-2 space-x-2">
                <span>Voir les disponibilités</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
