'use client';

import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Chargement des données en cours...', className = '' }: LoadingStateProps) {
  return (
    <Card className={`glass-panel p-12 text-center flex flex-col items-center justify-center space-y-4 border-zinc-800 ${className}`}>
      <div className="relative">
        <div className="h-12 w-12 rounded-full bg-amber-400/10 flex items-center justify-center border border-amber-400/40 gold-border-glow">
          <Loader2 className="h-6 w-6 text-amber-400 animate-spin" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">{message}</p>
        <p className="text-xs text-zinc-500">Optimisation de l'affichage pour votre connexion</p>
      </div>
    </Card>
  );
}

export default LoadingState;
