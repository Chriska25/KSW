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
    <Card className={`p-12 text-center flex flex-col items-center justify-center space-y-4 border-border ${className}`}>
      <div className="relative">
        <div className="h-12 w-12 rounded-full bg-primary-muted flex items-center justify-center border border-primary/30">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{message}</p>
        <p className="text-xs text-muted-foreground">Optimisation de l'affichage pour votre connexion</p>
      </div>
    </Card>
  );
}

export default LoadingState;
