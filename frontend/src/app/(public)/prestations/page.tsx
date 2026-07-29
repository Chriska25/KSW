'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Calendar, Heart, Camera, Briefcase, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/context/settings-context';
import { useServices } from '@/context/services-context';
import type { ServiceItem } from '@/lib/service-types';

export default function PrestationsPage() {
  const { settings: systemSettings, formatPrice } = useSettings();
  const { services: packages } = useServices();

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'mariage':
        return Heart;
      case 'portrait':
        return Camera;
      default:
        return Briefcase;
    }
  };

  return (
    <div className="pt-28 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="gold">Formules & Offres</Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Prestations Photographiques <span className="gold-gradient-text">Sur-Mesure</span>
        </h1>
        <p className="text-zinc-400 text-base leading-relaxed">
          Découvrez des prestations claires et transparentes pour {systemSettings.studioName}. Choisissez la formule adaptée et réservez votre date en ligne avec acompte personnalisé.
        </p>
      </div>

      {packages.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 rounded-2xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {packages.map((pkg, idx) => {
            const IconComp = getCategoryIcon(pkg.category);
            const isPopular = idx === 0;
            const depositAmount = Math.round((pkg.price * (pkg.depositPercentage || systemSettings.depositRate || 30)) / 100);

            return (
              <Card
                key={pkg.id}
                className={`flex flex-col justify-between relative overflow-hidden ${
                  isPopular
                    ? 'border-amber-400/60 gold-border-glow bg-amber-500/5'
                    : 'hover:border-zinc-700'
                }`}
              >
                {isPopular && (
                  <div className="absolute top-3 right-3 z-10 bg-amber-400 text-zinc-950 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                    Formule Plébiscitée
                  </div>
                )}

                {pkg.coverImage && (
                  <div className="h-44 w-full overflow-hidden relative border-b border-zinc-800">
                    <img
                      src={pkg.coverImage}
                      alt={pkg.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                  </div>
                )}

                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-xl bg-amber-400/10 flex items-center justify-center text-amber-400">
                      <IconComp className="h-5 w-5" />
                    </div>
                    <Badge variant="gold" className="text-[10px]">
                      {pkg.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-bold">{pkg.title}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div>
                    <div className="text-3xl font-extrabold text-white">{formatPrice(pkg.price)}</div>
                    <div className="text-xs text-amber-400/80 font-mono mt-0.5">
                      Acompte ({pkg.depositPercentage || systemSettings.depositRate || 30}%) : {formatPrice(depositAmount)}
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 pt-4 space-y-3">
                    <span className="text-xs font-semibold uppercase text-zinc-400 tracking-wider">
                      Inclus dans ce pack :
                    </span>
                    <ul className="space-y-2 text-sm text-zinc-300">
                      <li className="flex items-start space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>Durée de la séance: {pkg.durationMinutes / 60} heure(s)</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>{pkg.photosCount}+ Photos retouchées en Haute Définition</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>Galerie en ligne privée sécurisée avec téléchargement HD</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-zinc-800">
                    <Link href={`/reservation?service=${pkg.id}`}>
                      <Button variant={isPopular ? 'gold' : 'outline'} size="md" className="w-full justify-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Réserver cette Prestation</span>
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="glass-panel rounded-3xl p-8 border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-400/10 flex items-center justify-center text-amber-400 shrink-0">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Engagement de Qualité & Sécurité</h3>
            <p className="text-sm text-zinc-400">
              Paiement d'acompte par Stripe 100% sécurisé • Contrat avec signature électronique immédiate.
            </p>
          </div>
        </div>
        <Link href="/contact">
          <Button variant="outline" size="md">
            Une demande spécifique ? Contactez-nous
          </Button>
        </Link>
      </div>
    </div>
  );
}
