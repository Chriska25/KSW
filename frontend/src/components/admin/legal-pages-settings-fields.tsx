'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Scale, Shield, Plus, Trash2, RotateCcw, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { SystemSettings } from '@/lib/studio-defaults';
import {
  DEFAULT_LEGAL_PAGES_CONTENT,
  getLegalPagesContent,
  LEGAL_CONTENT_PLACEHOLDERS_HELP,
  type LegalPageContentConfig,
  type LegalPagesContent,
  type LegalSectionContent,
} from '@/lib/legal-page-content';

interface LegalPagesSettingsFieldsProps {
  settings: SystemSettings;
  onChange: (legalPagesContent: LegalPagesContent) => void;
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-foreground block font-semibold text-xs">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono leading-relaxed"
        />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="bg-surface-muted text-foreground" />
      )}
    </div>
  );
}

function PageEditor({
  pageKey,
  page,
  onChange,
  previewHref,
  previewLabel,
}: {
  pageKey: 'legal' | 'privacy';
  page: LegalPageContentConfig;
  onChange: (next: LegalPageContentConfig) => void;
  previewHref: string;
  previewLabel: string;
}) {
  const patch = (partial: Partial<LegalPageContentConfig>) => onChange({ ...page, ...partial });

  const patchSection = (index: number, partial: Partial<LegalSectionContent>) => {
    const sections = page.sections.map((s, i) => (i === index ? { ...s, ...partial } : s));
    patch({ sections });
  };

  const addSection = () => {
    patch({
      sections: [
        ...page.sections,
        {
          id: `section-${Date.now()}`,
          title: 'Nouvelle section',
          body: 'Contenu de la section…',
        },
      ],
    });
  };

  const removeSection = (index: number) => {
    if (page.sections.length <= 1) return;
    patch({ sections: page.sections.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed max-w-2xl">{LEGAL_CONTENT_PLACEHOLDERS_HELP}</p>
        <Link href={previewHref} target="_blank">
          <Button type="button" variant="outline" size="sm" className="text-xs gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            {previewLabel}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Badge" value={page.badge} onChange={(v) => patch({ badge: v })} />
        <Field label="Date de mise à jour" value={page.updatedAt} onChange={(v) => patch({ updatedAt: v })} />
        <Field label="Titre de la page" value={page.title} onChange={(v) => patch({ title: v })} />
        <Field
          label="Introduction"
          value={page.subtitle}
          onChange={(v) => patch({ subtitle: v })}
          multiline
          rows={3}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-foreground">Sections ({page.sections.length})</h3>
          <Button type="button" variant="outline" size="sm" onClick={addSection} className="text-xs gap-1">
            <Plus className="h-3.5 w-3.5" /> Ajouter une section
          </Button>
        </div>

        {page.sections.map((section, index) => (
          <Card key={section.id || index} className="border-border">
            <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3">
              <CardTitle className="text-sm text-foreground">Section {index + 1}</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-danger hover:text-danger h-8 px-2"
                onClick={() => removeSection(index)}
                disabled={page.sections.length <= 1}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field
                label="Titre"
                value={section.title}
                onChange={(v) => patchSection(index, { title: v })}
              />
              <Field
                label="Contenu"
                value={section.body}
                onChange={(v) => patchSection(index, { body: v })}
                multiline
                rows={8}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function LegalPagesSettingsFields({ settings, onChange }: LegalPagesSettingsFieldsProps) {
  const [activePage, setActivePage] = useState<'legal' | 'privacy'>('legal');
  const content = getLegalPagesContent(settings);

  const patchPage = (key: 'legal' | 'privacy', next: LegalPageContentConfig) => {
    onChange({ ...content, [key]: next });
  };

  const resetPage = (key: 'legal' | 'privacy') => {
    if (!window.confirm('Réinitialiser cette page aux textes par défaut ?')) return;
    onChange({ ...content, [key]: DEFAULT_LEGAL_PAGES_CONTENT[key] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActivePage('legal')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-2 ${
            activePage === 'legal'
              ? 'border-amber-400 bg-primary-muted text-primary'
              : 'border-border text-muted-foreground hover:border-muted-foreground/40'
          }`}
        >
          <Scale className="h-3.5 w-3.5" /> Mentions légales
        </button>
        <button
          type="button"
          onClick={() => setActivePage('privacy')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-2 ${
            activePage === 'privacy'
              ? 'border-amber-400 bg-primary-muted text-primary'
              : 'border-border text-muted-foreground hover:border-muted-foreground/40'
          }`}
        >
          <Shield className="h-3.5 w-3.5" /> Confidentialité
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground ml-auto gap-1"
          onClick={() => resetPage(activePage)}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser cette page
        </Button>
      </div>

      <Card className="">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {activePage === 'legal' ? (
              <>
                <Scale className="h-5 w-5 text-primary" /> Mentions légales
              </>
            ) : (
              <>
                <Shield className="h-5 w-5 text-primary" /> Politique de confidentialité
              </>
            )}
          </CardTitle>
          <CardDescription>
            Modifiez les textes affichés sur le site public. Les modifications sont visibles après enregistrement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activePage === 'legal' ? (
            <PageEditor
              pageKey="legal"
              page={content.legal}
              onChange={(next) => patchPage('legal', next)}
              previewHref="/legal"
              previewLabel="Voir /legal"
            />
          ) : (
            <PageEditor
              pageKey="privacy"
              page={content.privacy}
              onChange={(next) => patchPage('privacy', next)}
              previewHref="/privacy"
              previewLabel="Voir /privacy"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
