'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Camera,
  Clock,
  Globe,
  Upload,
  Image as ImageIcon,
  Loader2,
  Crop,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api-client';
import { useSettings } from '@/context/settings-context';
import { AdminModal } from '@/components/admin/admin-modal';
import { ImageCropModal } from '@/components/admin/image-crop-modal';
import { useAdminToast } from '@/components/admin/admin-toast';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import type { ServiceItem } from '@/lib/service-types';
import type { ServiceKind } from '@/lib/service-kind';
import { SERVICE_KIND_LABELS, inferServiceKind } from '@/lib/service-kind';

export default function AdminPrestationsPage() {
  const { formatPrice, currencySymbol } = useSettings();
  const { toast } = useAdminToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ServiceItem | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Mariage',
    serviceKind: 'photo' as ServiceKind,
    price: 500,
    depositPercentage: 30,
    durationMinutes: 120,
    photosCount: 20,
    coverImage: '',
    isActive: true,
    seoTitle: '',
    seoDescription: '',
  });

  const fetchLiveServices = async () => {
    try {
      const res = await apiClient.get(`/services?t=${Date.now()}`);
      if (res.data && Array.isArray(res.data.data)) {
        if (!isModalOpen) setServices(res.data.data);
      }
    } catch (e) {
      console.error('Erreur chargement prestations BDD:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveServices();
    const interval = setInterval(fetchLiveServices, 30000);
    return () => clearInterval(interval);
  }, [isModalOpen]);

  const saveServices = async (newServices: ServiceItem[], successMsg?: string) => {
    setSaving(true);
    setServices(newServices);
    try {
      await apiClient.post('/admin/sync-from-local', { services: newServices });
      await fetchLiveServices();
      toast(successMsg || 'Prestations enregistrées avec succès');
    } catch (e) {
      console.error('Erreur sauvegarde BDD prestations:', e);
      toast('Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Veuillez sélectionner une image', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) setCropSrc(event.target.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleToggleStatus = (id: string) => {
    const updated = services.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s));
    saveServices(updated, 'Statut mis à jour');
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const updated = services.filter((s) => s.id !== deleteTarget.id);
    saveServices(updated, 'Prestation supprimée');
    setDeleteTarget(null);
  };

  const resetForm = () => ({
    title: '',
    category: 'Mariage',
    serviceKind: 'photo' as ServiceKind,
    price: 500,
    depositPercentage: 30,
    durationMinutes: 120,
    photosCount: 20,
    coverImage: '',
    isActive: true,
    seoTitle: '',
    seoDescription: '',
  });

  const handleOpenAddModal = () => {
    setEditingService(null);
    setFormData(resetForm());
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service: ServiceItem) => {
    setEditingService(service);
    setFormData({
      title: service.title,
      category: service.category,
      serviceKind: inferServiceKind(service),
      price: service.price,
      depositPercentage: service.depositPercentage,
      durationMinutes: service.durationMinutes,
      photosCount: service.photosCount,
      coverImage: service.coverImage,
      isActive: service.isActive,
      seoTitle: service.seoTitle || '',
      seoDescription: service.seoDescription || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.coverImage?.trim()) {
      toast('Ajoutez une image de couverture (téléversement ou URL)', 'error');
      return;
    }
    let updated: ServiceItem[];
    if (editingService) {
      updated = services.map((s) => (s.id === editingService.id ? { ...s, ...formData } : s));
    } else {
      updated = [...services, { id: String(Date.now()), ...formData }];
    }
    await saveServices(updated, editingService ? 'Prestation modifiée' : 'Prestation créée');
    setIsModalOpen(false);
  };

  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'published' && s.isActive) ||
      (selectedStatus === 'draft' && !s.isActive);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const selectClass =
    'h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-300 focus:outline-none focus:border-amber-400/60 transition-colors';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <AdminPageHeader
        title="Catalogue"
        accent="Prestations"
        description="Gérez vos formules, tarifs, images de couverture et publication."
        actions={
          <Button variant="gold" size="sm" onClick={handleOpenAddModal} className="space-x-2 shrink-0">
            <Plus className="h-4 w-4" />
            <span>Nouvelle prestation</span>
          </Button>
        }
      />

      <div className="glass-panel p-4 rounded-2xl border-zinc-800 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-3 text-zinc-500" />
          <Input
            placeholder="Rechercher une formule…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 text-xs"
          />
        </div>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className={selectClass}>
          <option value="all">Toutes catégories</option>
          <option value="Mariage">Mariage</option>
          <option value="Portrait">Portrait</option>
          <option value="Corporate">Corporate</option>
          <option value="Événement">Événement</option>
        </select>
        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className={selectClass}>
          <option value="all">Tous statuts</option>
          <option value="published">Publié</option>
          <option value="draft">Brouillon</option>
        </select>
      </div>

      <Card className="glass-panel overflow-hidden">
        <CardHeader className="border-b border-zinc-800/80">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Formules & Tarifs</CardTitle>
              <CardDescription>{filteredServices.length} prestation(s) affichée(s)</CardDescription>
            </div>
            {saving && (
              <Badge variant="outline" className="text-xs border-amber-400/40 text-amber-300">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Enregistrement…
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-zinc-900/60 animate-pulse" />
              ))}
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              Aucune prestation trouvée.{' '}
              <button type="button" onClick={handleOpenAddModal} className="text-amber-400 hover:underline">
                Créer la première
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950/80 text-[11px] font-semibold uppercase text-zinc-500 border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Image</th>
                    <th className="py-3 px-4">Titre</th>
                    <th className="py-3 px-4">Tarif</th>
                    <th className="py-3 px-4">Durée</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredServices.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-900/30 transition-colors group">
                      <td className="py-3 px-4">
                        <img src={s.coverImage} alt="" className="h-11 w-16 object-cover rounded-lg border border-zinc-800" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white text-sm">{s.title}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="gold" className="text-[10px]">{s.category}</Badge>
                          {inferServiceKind(s) === 'invitation' && (
                            <Badge variant="outline" className="text-[10px] border-violet-400/40 text-violet-300">
                              Invitation
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{formatPrice(s.price)}</div>
                        <div className="text-[11px] text-amber-400/80">
                          Acompte {s.depositPercentage}% · {formatPrice(Math.round((s.price * s.depositPercentage) / 100))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-zinc-400">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-400" />{s.durationMinutes / 60}h</span>
                        <span className="flex items-center gap-1 mt-0.5"><Camera className="h-3 w-3 text-amber-400" />{s.photosCount} photos</span>
                      </td>
                      <td className="py-3 px-4">
                        <button type="button" onClick={() => handleToggleStatus(s.id)} className="cursor-pointer">
                          <Badge variant={s.isActive ? 'success' : 'warning'}>{s.isActive ? 'Publié' : 'Brouillon'}</Badge>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1 opacity-80 group-hover:opacity-100">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(s)} className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(s)} className="h-8 w-8 text-red-400 hover:text-red-300">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal édition */}
      <AdminModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? 'Modifier la prestation' : 'Nouvelle prestation'}
        size="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button type="submit" form="prestation-form" variant="gold" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <form id="prestation-form" onSubmit={handleSaveForm} className="space-y-5 text-xs">
          <div>
            <label className="text-zinc-400 block mb-1.5 font-medium">Titre de l&apos;offre</label>
            <Input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium">Catégorie</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className={`w-full ${selectClass}`}>
                <option value="Mariage">Mariage</option>
                <option value="Portrait">Portrait</option>
                <option value="Corporate">Corporate</option>
                <option value="Événement">Événement</option>
              </select>
            </div>
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium">Type de prestation</label>
              <select
                value={formData.serviceKind}
                onChange={(e) => setFormData({ ...formData, serviceKind: e.target.value as ServiceKind })}
                className={`w-full ${selectClass}`}
              >
                <option value="photo">{SERVICE_KIND_LABELS.photo}</option>
                <option value="invitation">{SERVICE_KIND_LABELS.invitation}</option>
              </select>
              <p className="text-[10px] text-zinc-500 mt-1.5 leading-relaxed">
                {formData.serviceKind === 'invitation'
                  ? 'Redirige vers la commande d’invitation RSVP (templates, partage, stats).'
                  : 'Redirige vers la réservation de séance photo (date, acompte, contrat).'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-zinc-400 block mb-1.5 font-medium">Publication</label>
              <select
                value={formData.isActive ? 'published' : 'draft'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'published' })}
                className={`w-full ${selectClass}`}
              >
                <option value="published">Publié</option>
                <option value="draft">Brouillon</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-zinc-400 block mb-1.5">Prix ({currencySymbol})</label>
              <Input type="number" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1.5">Acompte (%)</label>
              <Input type="number" required value={formData.depositPercentage} onChange={(e) => setFormData({ ...formData, depositPercentage: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1.5">Durée (min)</label>
              <Input type="number" required value={formData.durationMinutes} onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1.5">Photos</label>
              <Input type="number" required value={formData.photosCount} onChange={(e) => setFormData({ ...formData, photosCount: Number(e.target.value) })} />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-3">
            <label className="text-zinc-200 font-semibold flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-amber-400" /> Image de couverture
            </label>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {formData.coverImage ? (
                <div className="relative h-24 w-32 rounded-xl overflow-hidden border border-zinc-700 shrink-0 group">
                  <img src={formData.coverImage} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setCropSrc(formData.coverImage)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] gap-1 transition-opacity"
                  >
                    <Crop className="h-3.5 w-3.5" /> Recadrer
                  </button>
                </div>
              ) : (
                <div className="h-24 w-32 rounded-xl border-2 border-dashed border-zinc-800 flex items-center justify-center text-zinc-600 shrink-0">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <div className="flex-1 space-y-2 w-full">
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="gold" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-1" /> Téléverser une photo
                  </Button>
                  {formData.coverImage && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setCropSrc(formData.coverImage)}>
                      <Crop className="h-4 w-4 mr-1" /> Recadrer
                    </Button>
                  )}
                </div>

                {formData.coverImage.startsWith('data:') ? (
                  <p className="text-xs text-emerald-400 flex items-center gap-1.5 pt-1">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    Image téléversée — enregistrez directement, aucune URL requise.
                  </p>
                ) : (
                  <Input
                    value={formData.coverImage}
                    placeholder="Ou coller une URL https://… (optionnel si téléversement)"
                    onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                    className="text-xs"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800 space-y-3">
            <span className="font-semibold text-amber-400 flex items-center gap-1.5">
              <Globe className="h-4 w-4" /> SEO
            </span>
            <Input value={formData.seoTitle} placeholder="Titre SEO" onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })} />
            <Input value={formData.seoDescription} placeholder="Description SEO" onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })} />
          </div>
        </form>
      </AdminModal>

      {/* Confirmation suppression */}
      <AdminModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Supprimer cette prestation ?"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="gold" className="bg-red-600 hover:bg-red-500 border-red-500" onClick={confirmDelete}>
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-400">
          La formule <strong className="text-white">{deleteTarget?.title}</strong> sera définitivement retirée du catalogue public.
        </p>
      </AdminModal>

      {/* Recadrage */}
      {cropSrc && (
        <ImageCropModal
          open={!!cropSrc}
          imageSrc={cropSrc}
          aspectRatio={4 / 3}
          onClose={() => setCropSrc(null)}
          onConfirm={async (cropped) => {
            setCropSrc(null);
            try {
              const res = await apiClient.post('/upload/base64', { image: cropped });
              if (res.data?.url) {
                setFormData((prev) => ({ ...prev, coverImage: res.data.url }));
                toast('Image recadrée — filigrane et WebP appliqués');
                return;
              }
            } catch {
              // fallback : traitement à l'enregistrement via sync-from-local
            }
            setFormData((prev) => ({ ...prev, coverImage: cropped }));
            toast('Image recadrée — filigrane appliqué à l\'enregistrement', 'info');
          }}
        />
      )}
    </div>
  );
}
