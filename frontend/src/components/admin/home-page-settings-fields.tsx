'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Home, Sparkles, BarChart3, Megaphone } from 'lucide-react';
import type { SystemSettings } from '@/lib/studio-defaults';
import { getHomePageContent, type HomePageContent } from '@/lib/home-page-content';

interface HomePageSettingsFieldsProps {
  settings: SystemSettings;
  onChange: (homePageContent: HomePageContent) => void;
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
      <label className="text-foreground block font-semibold text-xs">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-surface-muted text-foreground"
        />
      )}
    </div>
  );
}

export function HomePageSettingsFields({ settings, onChange }: HomePageSettingsFieldsProps) {
  const home = getHomePageContent(settings);

  const patch = (partial: Partial<HomePageContent>) => {
    onChange({ ...home, ...partial });
  };

  const patchStat = (index: number, field: 'value' | 'label', value: string) => {
    const stats = home.stats.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    patch({ stats });
  };

  return (
    <div className="space-y-6">
      <Card className="">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" /> Bannière principale (Hero)
          </CardTitle>
          <CardDescription>Textes affichés en haut de la page d&apos;accueil.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <Field label="Badge" value={home.heroBadge} onChange={(v) => patch({ heroBadge: v })} />
          <Field
            label="Image de fond (URL)"
            value={home.heroBackgroundUrl}
            onChange={(v) => patch({ heroBackgroundUrl: v })}
          />
          <Field
            label="Titre — ligne 1"
            value={home.heroTitleLine1}
            onChange={(v) => patch({ heroTitleLine1: v })}
          />
          <Field
            label="Titre — mot en or"
            value={home.heroTitleHighlight}
            onChange={(v) => patch({ heroTitleHighlight: v })}
          />
          <div className="md:col-span-2">
            <Field
              label="Sous-titre"
              value={home.heroSubtitle}
              onChange={(v) => patch({ heroSubtitle: v })}
              multiline
            />
          </div>
          <Field
            label="Bouton principal"
            value={home.heroCtaPrimary}
            onChange={(v) => patch({ heroCtaPrimary: v })}
          />
          <Field
            label="Bouton secondaire"
            value={home.heroCtaSecondary}
            onChange={(v) => patch({ heroCtaSecondary: v })}
          />
        </CardContent>
      </Card>

      <Card className="">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Badges de confiance (sous le hero)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <Field label="Badge 1" value={home.trustBadge1} onChange={(v) => patch({ trustBadge1: v })} />
          <Field label="Badge 2" value={home.trustBadge2} onChange={(v) => patch({ trustBadge2: v })} />
          <Field label="Badge 3" value={home.trustBadge3} onChange={(v) => patch({ trustBadge3: v })} />
        </CardContent>
      </Card>

      <Card className="">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Chiffres clés
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {home.stats.map((stat, index) => (
            <div key={index} className="p-4 rounded-xl border border-border bg-surface-muted space-y-3">
              <p className="text-muted-foreground font-semibold uppercase tracking-wide text-[10px]">
                Statistique {index + 1}
              </p>
              <Field
                label="Valeur"
                value={stat.value}
                onChange={(v) => patchStat(index, 'value', v)}
              />
              <Field
                label="Libellé"
                value={stat.label}
                onChange={(v) => patchStat(index, 'label', v)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="">
        <CardHeader>
          <CardTitle className="text-lg">Section prestations (intro)</CardTitle>
          <CardDescription>Les cartes prestations viennent de l&apos;API — seuls les titres ci-dessous sont éditables.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <Field label="Badge" value={home.servicesBadge} onChange={(v) => patch({ servicesBadge: v })} />
          <Field
            label="Titre — ligne 1"
            value={home.servicesTitleLine1}
            onChange={(v) => patch({ servicesTitleLine1: v })}
          />
          <Field
            label="Titre — mot en or"
            value={home.servicesTitleHighlight}
            onChange={(v) => patch({ servicesTitleHighlight: v })}
          />
          <div className="md:col-span-2">
            <Field
              label="Description"
              value={home.servicesSubtitle}
              onChange={(v) => patch({ servicesSubtitle: v })}
              multiline
            />
          </div>
        </CardContent>
      </Card>

      <Card className="">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" /> Bandeau d&apos;appel à l&apos;action
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <Field label="Titre — ligne 1" value={home.ctaTitleLine1} onChange={(v) => patch({ ctaTitleLine1: v })} />
          <Field
            label="Titre — mot en or"
            value={home.ctaTitleHighlight}
            onChange={(v) => patch({ ctaTitleHighlight: v })}
          />
          <div className="md:col-span-2">
            <Field label="Description" value={home.ctaSubtitle} onChange={(v) => patch({ ctaSubtitle: v })} multiline />
          </div>
          <Field
            label="Bouton principal"
            value={home.ctaButtonPrimary}
            onChange={(v) => patch({ ctaButtonPrimary: v })}
          />
          <Field
            label="Bouton secondaire"
            value={home.ctaButtonSecondary}
            onChange={(v) => patch({ ctaButtonSecondary: v })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
