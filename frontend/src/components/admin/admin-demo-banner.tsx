'use client';

import { Info } from 'lucide-react';

export function AdminDemoBanner({ module }: { module: string }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-xs text-amber-200/90">
      <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
      <p>
        <strong className="text-amber-300">{module}</strong> — données de démonstration locales.
        Les modifications ne sont pas encore synchronisées avec la base de données.
      </p>
    </div>
  );
}
