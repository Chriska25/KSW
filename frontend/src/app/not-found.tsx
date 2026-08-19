'use client';

import React from 'react';
import { Camera, Home } from 'lucide-react';
import { ButtonLink } from '@/components/navigation/button-link';
import { Badge } from '@/components/ui/badge';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center space-y-8">
      <div className="space-y-4 max-w-lg">
        <Badge variant="accent" className="text-caption">
          Erreur 404 — page introuvable
        </Badge>

        <h1 className="text-display font-semibold tabular-nums">
          4<span className="text-accent">0</span>4
        </h1>

        <h2 className="text-h2">Cette page n&apos;existe pas</h2>

        <p className="text-small text-muted-foreground">
          La page ou la ressource que vous recherchez a été déplacée, supprimée ou l&apos;URL saisie comporte une erreur.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <ButtonLink href="/" variant="primary" size="lg">
          <Home className="h-4 w-4" aria-hidden />
          Retour à l&apos;accueil
        </ButtonLink>

        <ButtonLink href="/portfolio" variant="outline" size="lg">
          <Camera className="h-4 w-4" aria-hidden />
          Explorer le portfolio
        </ButtonLink>
      </div>

      <p className="text-caption font-mono">KSW Studio</p>
    </div>
  );
}
