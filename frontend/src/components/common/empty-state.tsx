'use client';

import React from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title = 'Aucune donnée disponible',
  description = 'Il n\'y a actuellement aucun élément à afficher dans cette section.',
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <Card className={`glass-panel p-12 text-center flex flex-col items-center justify-center space-y-4 border-zinc-800 ${className}`}>
      <div className="h-14 w-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
        <FolderOpen className="h-7 w-7 text-amber-400/80" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-base font-bold text-white">{title}</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button variant="gold" size="sm" onClick={onAction} className="mt-2 space-x-2">
          <Plus className="h-4 w-4" />
          <span>{actionLabel}</span>
        </Button>
      )}
    </Card>
  );
}

export default EmptyState;
