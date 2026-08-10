'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  HelpCircle,
  Plus,
  Trash2,
  Save,
  GripVertical,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/common/loading-state';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminStickyActions } from '@/components/admin/admin-sticky-actions';
import { useAdminToast } from '@/components/admin/admin-toast';
import { fetchAdminFaqItems, saveAllFaqItems, type FaqItem } from '@/lib/admin-faq-api';
import { getApiErrorMessage } from '@/lib/api-error';

const emptyItem = (order: number): FaqItem => ({
  id: `faq-new-${Date.now()}`,
  question: '',
  answer: '',
  order,
  isPublished: true,
});

export default function AdminFaqPage() {
  const { toast } = useAdminToast();
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchAdminFaqItems();
      setItems(data);
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Impossible de charger la FAQ.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const normalized = items.map((item, idx) => ({ ...item, order: idx }));
      const saved = await saveAllFaqItems(normalized);
      setItems(saved);
      toast('FAQ enregistrée — visible sur la page contact', 'success');
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Erreur lors de la sauvegarde.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (id: string, patch: Partial<FaqItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addItem = () => {
    setItems((prev) => [...prev, emptyItem(prev.length)]);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((item, idx) => ({ ...item, order: idx }));
    });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <AdminPageHeader
        title="FAQ"
        accent="Contact"
        description="Questions affichées sur la page contact publique. Publiez ou masquez chaque entrée."
        icon={HelpCircle}
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={addItem} className="space-x-2 hidden sm:inline-flex">
              <Plus className="h-4 w-4" />
              <span>Ajouter</span>
            </Button>
            <Button type="button" variant="gold" size="sm" onClick={handleSave} disabled={saving} className="space-x-2 hidden sm:inline-flex">
              <Save className="h-4 w-4" />
              <span>{saving ? 'Enregistrement…' : 'Enregistrer'}</span>
            </Button>
          </>
        }
      />

      {loading ? (
        <LoadingState message="Chargement de la FAQ..." />
      ) : (
        <div className="space-y-4">
          {items.length === 0 && (
            <Card className="glass-panel">
              <CardContent className="py-12 text-center text-zinc-500 text-sm">
                Aucune question. Cliquez sur « Ajouter » pour créer la première entrée.
              </CardContent>
            </Card>
          )}

          {items.map((item, index) => (
            <Card key={item.id} className="glass-panel">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-zinc-600" />
                    Question {index + 1}
                    {!item.isPublished && (
                      <Badge variant="outline" className="text-[10px]">Masquée</Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => moveItem(index, -1)} disabled={index === 0}>
                      ↑
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1}>
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => updateItem(item.id, { isPublished: !item.isPublished })}
                      title={item.isPublished ? 'Masquer' : 'Publier'}
                    >
                      {item.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </div>
                <CardDescription>Ordre d&apos;affichage : {index + 1}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Question</label>
                  <Input
                    value={item.question}
                    onChange={(e) => updateItem(item.id, { question: e.target.value })}
                    placeholder="Ex. Combien de temps à l'avance réserver ?"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Réponse</label>
                  <textarea
                    value={item.answer}
                    onChange={(e) => updateItem(item.id, { answer: e.target.value })}
                    rows={4}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    placeholder="Réponse détaillée affichée sur la page contact..."
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AdminStickyActions mobileOnly>
        <Button type="button" variant="outline" size="sm" onClick={addItem} className="space-x-2">
          <Plus className="h-4 w-4" />
          <span>Ajouter</span>
        </Button>
        <Button type="button" variant="gold" size="lg" onClick={handleSave} disabled={saving} className="flex-1 px-6 space-x-2 font-bold shadow-lg shadow-amber-400/20">
          <Save className="h-4 w-4" />
          <span>{saving ? 'Enregistrement…' : 'Enregistrer'}</span>
        </Button>
      </AdminStickyActions>
    </div>
  );
}
