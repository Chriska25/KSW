'use client';

import { Plus, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { InvitationProgramItem } from '@/lib/invitation-types';

interface InvitationProgramEditorProps {
  value: InvitationProgramItem[];
  onChange: (value: InvitationProgramItem[]) => void;
}

const DEFAULT_SUGGESTIONS: InvitationProgramItem[] = [
  { time: '15:00', label: 'Cérémonie' },
  { time: '17:00', label: 'Cocktail & photos' },
  { time: '19:30', label: 'Dîner & soirée' },
];

export function InvitationProgramEditor({ value, onChange }: InvitationProgramEditorProps) {
  const items = value.length ? value : [];

  const patchItem = (index: number, patch: Partial<InvitationProgramItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addItem = () => onChange([...items, { time: '', label: '' }]);

  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index));

  const applySuggestions = () => onChange([...DEFAULT_SUGGESTIONS]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-zinc-200 font-medium text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Programme de la journée
          </p>
          <p className="text-muted-foreground text-xs mt-0.5">Horaires affichés sur l&apos;invitation publique.</p>
        </div>
        {items.length === 0 && (
          <Button type="button" variant="outline" size="sm" onClick={applySuggestions}>
            Modèle mariage
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-zinc-600 text-xs">Aucune étape — ajoutez le déroulé ou utilisez le modèle.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex gap-2 items-start">
              <Input
                type="time"
                value={item.time || ''}
                onChange={(e) => patchItem(index, { time: e.target.value })}
                className="bg-surface-muted w-32 shrink-0 text-sm"
              />
              <Input
                value={item.label || ''}
                placeholder="Ex. Cérémonie, Dîner…"
                onChange={(e) => patchItem(index, { label: e.target.value })}
                className="bg-surface-muted flex-1 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-rose-400"
                onClick={() => removeItem(index)}
                aria-label="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addItem}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une étape
      </Button>
    </div>
  );
}

export function summarizeProgram(items: InvitationProgramItem[]): string {
  const filled = items.filter((i) => i.label?.trim());
  if (!filled.length) return 'Non renseigné';
  return filled.map((i) => `${i.time || '—'} ${i.label}`).join(' · ');
}
