'use client';

import { Plus, Trash2, UtensilsCrossed, Wine, ListPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { InvitationServiceOptionGroup, InvitationServiceOptions } from '@/lib/invitation-types';

interface InvitationServiceOptionsEditorProps {
  value: InvitationServiceOptions;
  onChange: (value: InvitationServiceOptions) => void;
}

const GROUP_META: {
  key: keyof InvitationServiceOptions;
  title: string;
  hint: string;
  icon: typeof UtensilsCrossed;
  placeholder: string;
}[] = [
  {
    key: 'meals',
    title: 'Repas / menu',
    hint: 'Les invités choisiront leur plat lors de la confirmation.',
    icon: UtensilsCrossed,
    placeholder: 'Ex. Viande, Poisson…',
  },
  {
    key: 'drinks',
    title: 'Boissons',
    hint: 'Vin, champagne, soft… proposés aux invités.',
    icon: Wine,
    placeholder: 'Ex. Vin rouge, Champagne…',
  },
  {
    key: 'others',
    title: 'Autres options',
    hint: 'Menu enfant, allergies, transport… selon vos besoins.',
    icon: ListPlus,
    placeholder: 'Ex. Menu enfant, Sans gluten…',
  },
];

export function InvitationServiceOptionsEditor({ value, onChange }: InvitationServiceOptionsEditorProps) {
  const patchGroup = (key: keyof InvitationServiceOptions, patch: Partial<InvitationServiceOptionGroup>) => {
    onChange({ ...value, [key]: { ...value[key], ...patch } });
  };

  const addChoice = (key: keyof InvitationServiceOptions) => {
    const group = value[key];
    patchGroup(key, { choices: [...group.choices, ''] });
  };

  const updateChoice = (key: keyof InvitationServiceOptions, index: number, label: string) => {
    const group = value[key];
    const choices = [...group.choices];
    choices[index] = label;
    patchGroup(key, { choices });
  };

  const removeChoice = (key: keyof InvitationServiceOptions, index: number) => {
    const group = value[key];
    patchGroup(key, { choices: group.choices.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-foreground font-semibold text-sm">Repas, boissons & options invités</p>
        <p className="text-muted-foreground text-xs mt-1">
          Paramétrez ce que vos invités pourront choisir lors de leur confirmation de présence.
        </p>
      </div>

      {GROUP_META.map(({ key, title, hint, icon: Icon, placeholder }) => {
        const group = value[key];
        return (
          <div key={key} className="rounded-xl border border-border bg-surface-muted/60 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-start gap-2">
                <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-zinc-200 font-medium text-sm">{title}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{hint}</p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={group.enabled}
                  onChange={(e) => patchGroup(key, { enabled: e.target.checked })}
                  className="accent-amber-400"
                />
                Proposer aux invités
              </label>
            </div>

            {group.enabled && (
              <div className="space-y-3 pt-1 border-t border-border/80">
                <Field
                  label="Libellé affiché"
                  value={group.label}
                  onChange={(v) => patchGroup(key, { label: v })}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={group.required}
                    onChange={(e) => patchGroup(key, { required: e.target.checked })}
                    className="accent-amber-400"
                  />
                  Choix obligatoire pour l&apos;invité
                </label>

                <div className="space-y-2">
                  <span className="text-muted-foreground text-xs block">Options proposées</span>
                  {group.choices.length === 0 && (
                    <p className="text-zinc-600 text-xs">Aucune option — ajoutez au moins un choix.</p>
                  )}
                  {group.choices.map((choice, index) => (
                    <div key={`${key}-${index}`} className="flex gap-2">
                      <Input
                        value={choice}
                        placeholder={placeholder}
                        onChange={(e) => updateChoice(key, index, e.target.value)}
                        className="bg-surface-muted text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-rose-400"
                        onClick={() => removeChoice(key, index)}
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => addChoice(key)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une option
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-muted-foreground text-xs block mb-1">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="bg-surface-muted text-sm" />
    </div>
  );
}

function summarizeServiceOptions(options: InvitationServiceOptions): string {
  const parts: string[] = [];
  for (const key of ['meals', 'drinks', 'others'] as const) {
    const group = options[key];
    if (!group.enabled) continue;
    const choices = group.choices.filter(Boolean);
    if (!choices.length) continue;
    parts.push(`${group.label} (${choices.length} choix${group.required ? ', obligatoire' : ''})`);
  }
  return parts.length ? parts.join(' · ') : 'Aucune option RSVP configurée';
}

export { summarizeServiceOptions };
