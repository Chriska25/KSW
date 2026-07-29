'use client';

import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function OfflineState() {
  return (
    <Card className="glass-panel p-10 text-center flex flex-col items-center justify-center space-y-4 border-amber-400/30">
      <div className="h-14 w-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
        <WifiOff className="h-7 w-7" />
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="text-base font-bold text-white">Vous êtes hors ligne</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Connexion Internet interrompue. L'application bascule automatiquement sur vos données enregistrées en cache local.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.location.reload()}
        className="space-x-2 border-zinc-800 text-xs"
      >
        <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
        <span>Actualiser la page</span>
      </Button>
    </Card>
  );
}

export default OfflineState;
