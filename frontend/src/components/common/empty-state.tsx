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
    <Card className={`p-12 text-center flex flex-col items-center justify-center space-y-4 border-border ${className}`}>
      <div className="h-14 w-14 rounded-2xl bg-surface-muted border border-border flex items-center justify-center text-muted-foreground">
        <FolderOpen className="h-7 w-7 text-primary/80" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-2 space-x-2">
          <Plus className="h-4 w-4" />
          <span>{actionLabel}</span>
        </Button>
      )}
    </Card>
  );
}

export default EmptyState;
