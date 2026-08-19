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
import { Textarea } from '@/components/ui/textarea';
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
            <Button type="button" variant="primary" size="sm" onClick={handleSave} disabled={saving} className="space-x-2 hidden sm:inline-flex">
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
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                Aucune question. Cliquez sur « Ajouter » pour créer la première entrée.
              </CardContent>
            </Card>
          )}

          {items.map((item, index) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    Question {index + 1}
                    {!item.isPublished && (
                      <Badge variant="outline" className="text-[10px]">Masquée</Badge>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => moveItem(index, -1)} disabled={index === 0} aria-label="Monter">
                      ↑
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => moveItem(index, 1)} disabled={index === items.length - 1} aria-label="Descendre">
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => updateItem(item.id, { isPublished: !item.isPublished })}
                      title={item.isPublished ? 'Masquer' : 'Publier'}
                      aria-label={item.isPublished ? 'Masquer' : 'Publier'}
                    >
                      {item.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id)} aria-label="Supprimer">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <CardDescription>Ordre d&apos;affichage : {index + 1}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <label className="text-caption font-medium text-muted-foreground block mb-1.5">Question</label>
                  <Input
                    value={item.question}
                    onChange={(e) => updateItem(item.id, { question: e.target.value })}
                    placeholder="Ex. Combien de temps à l'avance réserver ?"
                  />
                </div>
                <div>
                  <label className="text-caption font-medium text-muted-foreground block mb-1.5">Réponse</label>
                  <Textarea
                    value={item.answer}
                    onChange={(e) => updateItem(item.id, { answer: e.target.value })}
                    rows={4}
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
        <Button type="button" variant="primary" size="lg" onClick={handleSave} disabled={saving} className="flex-1 px-6 space-x-2">
          <Save className="h-4 w-4" />
          <span>{saving ? 'Enregistrement…' : 'Enregistrer'}</span>
        </Button>
      </AdminStickyActions>
    </div>
  );
}
