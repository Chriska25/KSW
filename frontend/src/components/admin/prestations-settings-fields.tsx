'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Package, ListOrdered } from 'lucide-react';
import type { SystemSettings } from '@/lib/studio-defaults';
import { buildHeroBackgroundPatch } from '@/lib/hero-banner-images';
import { HeroBannerPhotosFields } from '@/components/admin/hero-banner-photos-fields';
import {
  DEFAULT_PRESTATIONS_CONTENT,
  getPrestationsContent,
  resolvePrestationsHeroImages,
  type PrestationsPageContent,
  type PrestationsProcessStep,
} from '@/lib/prestations-content';

interface PrestationsSettingsFieldsProps {
  settings: SystemSettings;
  onChange: (prestationsContent: PrestationsPageContent) => void;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-zinc-300 block font-semibold text-xs">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-zinc-950 text-white"
        />
      )}
    </div>
  );
}

export function PrestationsSettingsFields({ settings, onChange }: PrestationsSettingsFieldsProps) {
  const content = getPrestationsContent(settings);
  const heroImages = resolvePrestationsHeroImages(content);

  const patch = (partial: Partial<PrestationsPageContent>) => {
    onChange({ ...content, ...partial });
  };

  const patchHeroImages = (urls: string[]) => {
    patch(buildHeroBackgroundPatch(urls, DEFAULT_PRESTATIONS_CONTENT.heroBackgroundUrl));
  };

  const patchStep = (index: number, partial: Partial<PrestationsProcessStep>) => {
    patch({
      processSteps: content.processSteps.map((step, i) => (i === index ? { ...step, ...partial } : step)),
    });
  };

  return (
    <div className="space-y-6">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-400" /> Page Prestations — en-tête
          </CardTitle>
          <CardDescription>Textes et photos de la bannière sur /prestations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Badge" value={content.heroBadge} onChange={(v) => patch({ heroBadge: v })} />
            <Field
              label="Titre — ligne 1"
              value={content.heroTitleLine1}
              onChange={(v) => patch({ heroTitleLine1: v })}
            />
            <Field
              label="Titre — mot doré"
              value={content.heroTitleHighlight}
              onChange={(v) => patch({ heroTitleHighlight: v })}
            />
            <div className="md:col-span-2">
              <Field
                label="Sous-titre"
                value={content.heroSubtitle}
                onChange={(v) => patch({ heroSubtitle: v })}
                multiline
              />
            </div>
          </div>

          <HeroBannerPhotosFields
            images={heroImages}
            onChange={patchHeroImages}
            pageLabel="/prestations"
          />
        </CardContent>
      </Card>

      <Card className="glass-panel border-amber-400/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ListOrdered className="h-5 w-5 text-amber-400" /> Parcours client
          </CardTitle>
          <CardDescription>
            Section « Comment réserver » affichée sous le catalogue des formules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-xs">
          <Field
            label="Titre de la section"
            value={content.processTitle}
            onChange={(v) => patch({ processTitle: v })}
          />

          {content.processSteps.map((step, index) => (
            <div key={index} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-3">
              <span className="text-[10px] font-mono text-amber-400/80 tracking-[0.3em]">
                ÉTAPE 0{index + 1}
              </span>
              <Field
                label="Titre"
                value={step.title}
                onChange={(v) => patchStep(index, { title: v })}
              />
              <Field
                label="Description"
                value={step.description}
                onChange={(v) => patchStep(index, { description: v })}
                multiline
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-[11px] text-zinc-500 px-1">
        Les formules et tarifs proviennent du catalogue Admin → Prestations. Pensez à enregistrer pour publier les textes et photos.
      </p>
    </div>
  );
}
