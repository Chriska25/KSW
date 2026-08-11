'use client';

import Link from 'next/link';
import { LegalBodyRenderer } from '@/components/legal/legal-body-renderer';
import type { LegalTemplateVars } from '@/lib/legal-page-content';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
        <Link href="/">
          <Button variant="ghost" size="sm" className="text-zinc-400 -ml-2 mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Retour au site
          </Button>
        </Link>
        <Badge variant="gold">{badge}</Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{title}</h1>
        <p className="text-zinc-400 text-sm leading-relaxed">{subtitle}</p>
        {updatedAt && (
          <p className="text-[11px] text-zinc-500">Dernière mise à jour : {updatedAt}</p>
        )}
      </div>

      <article className="glass-panel rounded-2xl border border-zinc-800/80 divide-y divide-zinc-800/60">
        {sections.map((section) => (
          <section key={section.title} className="p-6 sm:p-8 space-y-3">
            <h2 className="text-lg font-bold text-white">{section.title}</h2>
            <div className="text-sm text-zinc-400 leading-relaxed space-y-3">
              <LegalBodyRenderer body={section.body} vars={section.vars || templateVars} />
            </div>
          </section>
        ))}
      </article>

      <div className="flex flex-wrap gap-3 text-xs">
        <Link href="/legal" className="text-zinc-500 hover:text-amber-400 transition-colors">
          Mentions légales
        </Link>
        <span className="text-zinc-700">·</span>
        <Link href="/privacy" className="text-zinc-500 hover:text-amber-400 transition-colors">
          Politique de confidentialité
        </Link>
        <span className="text-zinc-700">·</span>
        <Link href="/contact" className="text-zinc-500 hover:text-amber-400 transition-colors">
          Contact
        </Link>
      </div>
    </div>
  );
}
