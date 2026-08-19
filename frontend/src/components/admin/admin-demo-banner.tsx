'use client';

import { Info } from 'lucide-react';

export function AdminDemoBanner({ module }: { module: string }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary-muted px-4 py-3 text-xs text-warning/90">
      <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
      <p>
        <strong className="text-primary">{module}</strong> — données de démonstration locales.
        Les modifications ne sont pas encore synchronisées avec la base de données.
      </p>
    </div>
  );
}
