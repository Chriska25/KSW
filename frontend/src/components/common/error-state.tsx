'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Erreur de connexion API',
  message = 'Impossible d\'établir une liaison sécurisée avec le serveur de l\'application. Veuillez vérifier votre réseau ou votre tunnel Ngrok.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <Card className={`glass-panel p-10 text-center flex flex-col items-center justify-center space-y-4 border-rose-500/30 ${className}`}>
      <div className="h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="text-base font-bold text-white">{title}</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="space-x-2 border-zinc-800 text-xs">
          <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
          <span>Réessayer la connexion</span>
        </Button>
      )}
    </Card>
  );
}

export default ErrorState;
