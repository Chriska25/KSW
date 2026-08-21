'use client';

import type { InvitationTemplateKey } from '@/lib/invitation-types';
import { TEMPLATE_OPTIONS } from '@/lib/invitation-types';
import { cn } from '@/lib/utils';

const TEMPLATE_PREVIEW: Record<
  InvitationTemplateKey,
  { gradient: string; accent: string; border: string }
> = {
  elegant: { gradient: 'from-zinc-900 to-zinc-950', accent: 'bg-amber-400', border: 'border-primary/30' },
  modern: { gradient: 'from-slate-900 to-indigo-950', accent: 'bg-sky-400', border: 'border-sky-400/40' },
  minimal: { gradient: 'from-zinc-900 to-zinc-900', accent: 'bg-zinc-100', border: 'border-zinc-600' },
  romantic: { gradient: 'from-rose-950/80 to-zinc-950', accent: 'bg-rose-300', border: 'border-rose-400/40' },
  premium: { gradient: 'from-black to-amber-950/40', accent: 'bg-amber-300', border: 'border-amber-500/50' },
  classic: { gradient: 'from-stone-900 to-zinc-950', accent: 'bg-stone-200', border: 'border-stone-500/40' },
};

interface InvitationTemplatePickerProps {
  value: InvitationTemplateKey;
  onChange: (value: InvitationTemplateKey) => void;
  primaryColor?: string;
  onPrimaryColorChange?: (color: string) => void;
}

export function InvitationTemplatePicker({
  value,
  onChange,
  primaryColor,
  onPrimaryColorChange,
}: InvitationTemplatePickerProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-zinc-200 font-medium text-sm">Style de l&apos;invitation</p>
        <p className="text-muted-foreground text-xs mt-0.5">Choisissez le rendu de votre page publique.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {TEMPLATE_OPTIONS.map((opt) => {
          const preview = TEMPLATE_PREVIEW[opt.value];
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'rounded-xl border p-3 text-left transition-all',
                selected ? `${preview.border} ring-2 ring-amber-400/30` : 'border-border hover:border-zinc-600'
              )}
            >
              <div className={cn('h-14 rounded-lg bg-gradient-to-br mb-2 relative overflow-hidden', preview.gradient)}>
                <div className={cn('absolute bottom-2 left-2 h-1.5 w-8 rounded-full', preview.accent)} />
                <div className="absolute bottom-2 left-2 ml-10 h-1 w-12 rounded-full bg-zinc-700/80" />
              </div>
              <span className={cn('text-xs font-semibold', selected ? 'text-primary' : 'text-foreground')}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

      {onPrimaryColorChange && (
        <div>
          <label className="text-muted-foreground text-xs block mb-1.5">Couleur d&apos;accent (optionnel)</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={primaryColor || '#d4af37'}
              onChange={(e) => onPrimaryColorChange(e.target.value)}
              className="h-10 w-14 rounded-lg border border-border bg-surface-muted cursor-pointer"
            />
            <span className="text-muted-foreground text-xs">Titres et éléments mis en valeur sur l&apos;invitation.</span>
          </div>
        </div>
      )}
    </div>
  );
}
