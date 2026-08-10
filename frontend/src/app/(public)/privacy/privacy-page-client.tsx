'use client';

import React from 'react';
import { useSettings } from '@/context/settings-context';
import { LegalPageShell } from '@/components/legal/legal-page-shell';
import {
  applyLegalTemplate,
  buildLegalTemplateVars,
  getLegalPageContent,
} from '@/lib/legal-page-content';

export default function PrivacyPageClient() {
  const { settings, fullStudioName } = useSettings();
  const page = getLegalPageContent(settings, 'privacy');
  const vars = buildLegalTemplateVars(settings, fullStudioName);

  return (
    <LegalPageShell
      badge={applyLegalTemplate(page.badge, vars)}
      title={applyLegalTemplate(page.title, vars)}
      subtitle={applyLegalTemplate(page.subtitle, vars)}
      updatedAt={page.updatedAt}
      templateVars={vars}
      sections={page.sections.map((section) => ({
        title: section.title,
        body: section.body,
      }))}
    />
  );
}
