'use client';

import Link from 'next/link';
import { LegalBodyRenderer } from '@/components/legal/legal-body-renderer';
import type { LegalTemplateVars } from '@/lib/legal-page-content';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/navigation/button-link';

interface LegalSection {
  title: string;
  body: string;
  vars?: import('@/lib/legal-page-content').LegalTemplateVars;
}

interface LegalPageShellProps {
  badge: string;
  title: string;
  subtitle: string;
  updatedAt?: string;
  sections: LegalSection[];
  templateVars: LegalTemplateVars;
}

export function LegalPageShell({
  badge,
  title,
  subtitle,
  updatedAt,
  sections,
  templateVars,
}: LegalPageShellProps) {
  return (
    <div className="pt-28 pb-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
      <div className="space-y-4">
        <ButtonLink href="/" variant="ghost" size="sm" className="text-muted-foreground -ml-2 mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Retour au site
        </ButtonLink>
        <Badge variant="primary">{badge}</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">{subtitle}</p>
        {updatedAt && (
          <p className="text-[11px] text-muted-foreground">Dernière mise à jour : {updatedAt}</p>
        )}
      </div>

      <article className="rounded-2xl border border-border/80 divide-y divide-zinc-800/60">
        {sections.map((section) => (
          <section key={section.title} className="p-6 sm:p-8 space-y-3">
            <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <LegalBodyRenderer body={section.body} vars={section.vars || templateVars} />
            </div>
          </section>
        ))}
      </article>

      <div className="flex flex-wrap gap-3 text-xs">
        <Link href="/legal" className="text-muted-foreground hover:text-primary transition-colors">
          Mentions légales
        </Link>
        <span className="text-zinc-700">·</span>
        <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
          Politique de confidentialité
        </Link>
        <span className="text-zinc-700">·</span>
        <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">
          Contact
        </Link>
      </div>
    </div>
  );
}
