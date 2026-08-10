'use client';

import React, { useEffect, useState } from 'react';
import { Save, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/context/settings-context';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminStickyActions } from '@/components/admin/admin-sticky-actions';
import { VideothequeAdminPanel } from '@/components/admin/videotheque-admin-panel';
import { getPortfolioContent } from '@/lib/portfolio-content';
import { getApiErrorMessage } from '@/lib/api-error';

export default function AdminVideothequePage() {
  const { settings: globalSettings, updateSettings } = useSettings();
  const [portfolio, setPortfolio] = useState(() => getPortfolioContent(globalSettings));
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      setPortfolio(getPortfolioContent(globalSettings));
    }
  }, [globalSettings, isDirty]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await updateSettings({ portfolioContent: portfolio });
      setIsDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: unknown) {
      setSaveError(getApiErrorMessage(err, 'Impossible de publier la vidéothèque.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-5xl">
      <AdminPageHeader
        title="Vidéothèque"
        description="Films et vidéos affichés dans l'onglet Vidéothèque du portfolio public."
      />

      {saved && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Vidéothèque publiée sur le portfolio.
        </div>
      )}
      {saveError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {saveError}
        </div>
      )}

      <VideothequeAdminPanel
        portfolio={portfolio}
        showSectionTitles={false}
        onChange={(next) => {
          setIsDirty(true);
          setPortfolio(next);
        }}
      />

      <AdminStickyActions>
        <Button
          type="submit"
          variant="gold"
          size="lg"
          disabled={saving}
          className="w-full sm:w-auto px-6 sm:px-8 font-bold shadow-lg shadow-amber-400/20"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Publication…' : 'Publier la vidéothèque'}
        </Button>
      </AdminStickyActions>
    </form>
  );
}
