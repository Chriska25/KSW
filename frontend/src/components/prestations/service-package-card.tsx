'use client';

import Link from 'next/link';
import { CheckCircle2, Calendar, Clock, ImageIcon, ArrowRight, Mail, Share2, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ServiceItem } from '@/lib/service-types';
import { useSettings } from '@/context/settings-context';
import { useRevealInView } from '@/lib/use-reveal-in-view';
import { cn } from '@/lib/utils';

interface ServicePackageCardProps {
  pkg: ServiceItem;
  index: number;
  isPopular: boolean;
}

function getCategoryLabel(category: string): string {
  const c = category.toLowerCase();
  if (c.includes('mariage')) return 'Mariage';
  if (c.includes('portrait')) return 'Portrait';
  if (c.includes('corp')) return 'Corporate';
  if (c.includes('événement') || c.includes('evenement')) return 'Événement';
  return category;
}

function isInvitationService(pkg: ServiceItem): boolean {
  const hay = `${pkg.title} ${pkg.category}`.toLowerCase();
  return hay.includes('invitation') || hay.includes('événement') || hay.includes('evenement');
}

export function ServicePackageCard({ pkg, index, isPopular }: ServicePackageCardProps) {
  const { settings, formatPrice } = useSettings();
  const { ref, visible } = useRevealInView<HTMLDivElement>(0.08);
  const staggerMs = Math.min(index * 90, 540);
  const depositPct = pkg.depositPercentage || settings.depositRate || 30;
  const depositAmount = Math.round((pkg.price * depositPct) / 100);
  const hours = pkg.durationMinutes / 60;
  const invitation = isInvitationService(pkg);

  return (
    <div
      ref={ref}
      style={{ animationDelay: visible ? `${staggerMs}ms` : undefined }}
      className={cn(
        'prestations-card group relative flex flex-col rounded-3xl overflow-hidden border bg-zinc-950/80',
        isPopular
          ? 'border-amber-400/50 gold-border-glow shadow-lg shadow-amber-400/10'
          : 'border-zinc-800/90 hover:border-zinc-600',
        visible && 'is-visible'
      )}
    >
      {isPopular && (
        <div className="absolute top-4 right-4 z-20 bg-amber-400 text-zinc-950 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
          Coup de cœur
        </div>
      )}

      <div className="relative h-52 sm:h-56 overflow-hidden">
        {pkg.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pkg.coverImage}
            alt={pkg.title}
            className="prestations-card-image absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-zinc-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
        <div className="prestations-card-shine" aria-hidden />
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <Badge variant="gold" className="text-[10px] mb-2">
            {getCategoryLabel(pkg.category)}
          </Badge>
          <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">{pkg.title}</h3>
        </div>
      </div>

      <div className="flex flex-col flex-1 p-6 space-y-5">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums">{formatPrice(pkg.price)}</span>
            <span className="text-xs text-zinc-500 uppercase tracking-wider">TTC</span>
          </div>
          <p className="text-xs text-amber-400/90 font-mono mt-1.5">
            Acompte {depositPct}% · {formatPrice(depositAmount)} à la réservation
          </p>
        </div>

        <ul className="space-y-2.5 text-sm text-zinc-300 flex-1">
          {invitation ? (
            <>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <Mail className="h-3.5 w-3.5 inline mr-1 text-zinc-500" />
                  Page publique personnalisée avec formulaire RSVP
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{pkg.photosCount} templates premium au choix (élégant, moderne, romantique…)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <Share2 className="h-3.5 w-3.5 inline mr-1 text-zinc-500" />
                  Partage WhatsApp, QR code & lien unique
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <BarChart3 className="h-3.5 w-3.5 inline mr-1 text-zinc-500" />
                  Statistiques invités en temps réel dans votre espace client
                </span>
              </li>
            </>
          ) : (
            <>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <Clock className="h-3.5 w-3.5 inline mr-1 text-zinc-500" />
                  {hours} h de prise de vue & direction artistique
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{pkg.photosCount}+ photos retouchées en haute définition</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Galerie privée sécurisée & téléchargement HD</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Contrat & facture inclus · signature électronique</span>
              </li>
            </>
          )}
        </ul>

        <Link
          href={invitation ? '/invitations/nouvelle' : `/reservation?service=${pkg.id}`}
          className="block pt-2"
        >
          <Button
            variant={isPopular ? 'gold' : 'outline'}
            size="md"
            className="w-full justify-center space-x-2 group/btn"
          >
            {invitation ? <Mail className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
            <span>{invitation ? 'Commander mon invitation' : 'Réserver cette formule'}</span>
            <ArrowRight className="h-4 w-4 opacity-70 group-hover/btn:translate-x-0.5 transition-transform" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
