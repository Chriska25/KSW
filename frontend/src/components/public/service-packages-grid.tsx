'use client';

import { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useServices } from '@/context/services-context';
import { ServicePackageCard } from '@/components/prestations/service-package-card';
import { PRESTATION_CATEGORY_LABELS } from '@/lib/prestations-content';

const CATEGORY_FILTERS = [
  { id: 'all', label: PRESTATION_CATEGORY_LABELS.all },
  { id: 'mariage', label: PRESTATION_CATEGORY_LABELS.mariage },
  { id: 'portrait', label: PRESTATION_CATEGORY_LABELS.portrait },
  { id: 'corporate', label: PRESTATION_CATEGORY_LABELS.corporate },
  { id: 'evenement', label: PRESTATION_CATEGORY_LABELS.evenement },
];

function normalizeCategory(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function categoryMatchesFilter(category: string, filter: string): boolean {
  return normalizeCategory(category).includes(filter);
}

export function ServicePackagesGrid() {
  const { services: packages } = useServices();
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return packages;
    return packages.filter((p) => categoryMatchesFilter(p.category, filter));
  }, [packages, filter]);

  const popularId = useMemo(() => {
    const mariage = packages.find((p) => p.category.toLowerCase().includes('mariage'));
    return mariage?.id ?? packages[0]?.id;
  }, [packages]);

  if (packages.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[520px] rounded-3xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-3 pb-2">
        <Badge variant="outline" className="border-zinc-700 text-zinc-400">
          Catalogue
        </Badge>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Nos <span className="gold-gradient-text">formules</span>
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Filtrez par univers et comparez les inclusions — chaque pack inclut retouche HD, galerie privée et contrat.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {CATEGORY_FILTERS.map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => setFilter(btn.id)}
            className={`px-4 py-2 text-[11px] font-semibold rounded-full border transition-all cursor-pointer ${
              filter === btn.id
                ? 'border-amber-400/80 bg-amber-400/10 text-amber-300'
                : 'border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-3xl border border-dashed border-zinc-800 text-zinc-500 text-sm">
          Aucune prestation dans cette catégorie pour le moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {filtered.map((pkg, index) => (
            <ServicePackageCard
              key={pkg.id}
              pkg={pkg}
              index={index}
              isPopular={pkg.id === popularId && filter === 'all'}
            />
          ))}
        </div>
      )}

      <p className="text-center text-[11px] text-zinc-500 flex items-center justify-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-amber-400/70" />
        Tarifs indicatifs — devis personnalisé sur demande via le formulaire contact.
      </p>
    </div>
  );
}
