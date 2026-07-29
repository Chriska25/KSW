'use client';

import React from 'react';
import Link from 'next/link';
import { Camera, Home, ArrowLeft, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center space-y-8 relative overflow-hidden">
      {/* Background Subtle Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* 404 Badge & Main Header */}
      <div className="space-y-4 max-w-lg z-10">
        <Badge variant="gold" className="text-xs px-3 py-1">
          Erreur 404 • Page Non Trouvée
        </Badge>

        <h1 className="text-7xl sm:text-8xl font-black tracking-tight text-white">
          4<span className="gold-gradient-text">0</span>4
        </h1>

        <h2 className="text-2xl sm:text-3xl font-bold text-white">
          La Cliché N'Existe Pas Dans le Studio
        </h2>

        <p className="text-zinc-400 text-sm leading-relaxed">
          La page ou la ressource que vous recherchez a été déplacée, supprimée ou l'URL saisie comporte une erreur.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4 z-10">
        <Link href="/">
          <Button variant="gold" size="lg" className="space-x-2 font-bold">
            <Home className="h-4 w-4" />
            <span>Retour à l'Accueil</span>
          </Button>
        </Link>

        <Link href="/portfolio">
          <Button variant="outline" size="lg" className="space-x-2 border-zinc-800 text-zinc-300 hover:text-amber-400">
            <Camera className="h-4 w-4" />
            <span>Explorer le Portfolio</span>
          </Button>
        </Link>
      </div>

      {/* Footnote */}
      <div className="text-xs text-zinc-600 font-mono z-10">
        Studio Lumière • Haute Photographie
      </div>
    </div>
  );
}
