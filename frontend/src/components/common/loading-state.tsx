'use client';

import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface LoadingStateProps {
  message?: string;
  className?: string;
  compact?: boolean;
}

export function LoadingState({
  message = 'Chargement en cours…',
  className = '',
  compact = false,
}: LoadingStateProps) {
  return (
    <Card
      className={`${compact ? 'p-6' : 'p-12'} text-center flex flex-col items-center justify-center space-y-4 border-border ${className}`}
    >
      <div className="h-12 w-12 rounded-full bg-primary-muted flex items-center justify-center border border-primary/30">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
      <p className="text-sm font-semibold text-foreground">{message}</p>
    </Card>
  );
}

export default LoadingState;
