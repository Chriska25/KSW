'use client';

import React, { useState } from 'react';
import {
  Star,
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  User,
  Quote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api-client';
import { fetchAdminTestimonials, type TestimonialItem } from '@/lib/testimonials';
import { useAdminToast } from '@/components/admin/admin-toast';

export default function AdminTemoignagesPage() {
  const { toast } = useAdminToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TestimonialItem | null>(null);

  const [testimonials, setTestimonials] = useState<TestimonialItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTestimonials = React.useCallback(async () => {
    try {
      const items = await fetchAdminTestimonials();
      setTestimonials(items);
    } catch (e) {
      console.error('Erreur chargement témoignages BDD:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadTestimonials();
    const onFocus = () => loadTestimonials();
    window.addEventListener('focus', onFocus);
    const interval = window.setInterval(loadTestimonials, 30000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(interval);
    };
  }, [loadTestimonials]);

  const saveTestimonials = async (items: TestimonialItem[]) => {
    setTestimonials(items);
    try {
      await apiClient.post('/admin/testimonials/save-all', { testimonials: items });
      toast('Témoignages enregistrés', 'success');
    } catch (e) {
      console.error('Erreur sauvegarde témoignages BDD:', e);
      toast('Erreur lors de la sauvegarde', 'error');
      throw e;
    }
  };

  const [formData, setFormData] = useState({
    clientName: '',
    clientRole: 'Mariés',
    rating: 5,
    content: '',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    isPublished: true,
  });

  const handleToggleApprove = async (id: string) => {
    const updated = testimonials.map((t) => (t.id === id ? { ...t, isPublished: !t.isPublished } : t));
    try {
      await saveTestimonials(updated);
    } catch {
      // rollback handled by not updating on throw - need to refetch
      loadTestimonials();
    }
  };

  const handleDelete = async (id: string) => {
    const updated = testimonials.filter((t) => t.id !== id);
    try {
      await saveTestimonials(updated);
    } catch {
      loadTestimonials();
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      clientName: '',
      clientRole: 'Mariés',
      rating: 5,
      content: '',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
      isPublished: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: TestimonialItem) => {
    setEditingItem(item);
    setFormData({
      clientName: item.clientName,
      clientRole: item.clientRole,
      rating: item.rating,
      content: item.content,
      avatarUrl: item.avatarUrl,
      isPublished: item.isPublished,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    let updated: TestimonialItem[];
    if (editingItem) {
      updated = testimonials.map((t) => (t.id === editingItem.id ? { ...t, ...formData } : t));
    } else {
      const newItem: TestimonialItem = {
        id: String(Date.now()),
        ...formData,
        createdAt: new Date().toLocaleDateString('fr-FR'),
      };
      updated = [...testimonials, newItem];
    }
    try {
      await saveTestimonials(updated);
      setIsModalOpen(false);
    } catch {
      // toast already shown
    }
  };

  const pendingCount = testimonials.filter((t) => !t.isPublished).length;

  const filteredTestimonials = testimonials.filter((t) =>
    t.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <AdminPageHeader
        title="Modération des"
        accent="Témoignages & Avis Clients"
        description="Validation des avis déposés, contrôle des notes (1 à 5 étoiles) et affichage sur le site public."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={loadTestimonials} className="space-x-2">
              <Search className="h-4 w-4" />
              <span>Actualiser</span>
            </Button>
            <Button variant="gold" size="sm" onClick={handleOpenAdd} className="space-x-2">
              <Plus className="h-4 w-4" />
              <span>Ajouter un Témoignage</span>
            </Button>
          </>
        }
      />

      {/* Table Card */}
      <Card className="glass-panel space-y-4">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              Avis et Recommandations ({filteredTestimonials.length})
              {pendingCount > 0 && (
                <Badge variant="warning">{pendingCount} en attente</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Modération des témoignages publiés dans le carrousel de la page d'accueil.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-3 text-zinc-500" />
            <Input
              placeholder="Rechercher un avis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-950/80 text-xs font-semibold uppercase text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Avatar</th>
                  <th className="py-3 px-4">Client / Qualité</th>
                  <th className="py-3 px-4">Note Étoiles</th>
                  <th className="py-3 px-4">Avis & Message</th>
                  <th className="py-3 px-4">Statut Modération</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500 text-xs">
                      Chargement des avis…
                    </td>
                  </tr>
                ) : filteredTestimonials.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500 text-xs">
                      Aucun avis pour le moment. Les dépôts depuis la page Contact apparaîtront ici en « En Attente ».
                    </td>
                  </tr>
                ) : (
                filteredTestimonials.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3 px-4">
                      <img
                        src={t.avatarUrl}
                        alt={t.clientName}
                        className="h-10 w-10 rounded-full object-cover border border-zinc-800"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm">{t.clientName}</div>
                      <div className="text-xs text-zinc-500">{t.clientRole}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1 text-amber-400">
                        {Array.from({ length: t.rating }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-amber-400" />
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-300 max-w-sm italic">
                      "{t.content}"
                    </td>
                    <td className="py-3 px-4">
                      <button onClick={() => handleToggleApprove(t.id)} className="cursor-pointer">
                        <Badge variant={t.isPublished ? 'success' : 'warning'}>
                          {t.isPublished ? 'Approuvé & Publié' : 'En Attente'}
                        </Badge>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(t)}
                        className="h-8 w-8 text-zinc-300 hover:text-amber-400"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(t.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="glass-panel max-w-xl w-full border-amber-400/40 space-y-4">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 pb-3">
              <CardTitle className="text-xl">
                {editingItem ? 'Modifier le Témoignage' : 'Ajouter un Témoignage Client'}
              </CardTitle>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div>
                  <label className="text-zinc-400 block mb-1">Nom du Client / Couple</label>
                  <Input
                    required
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 block mb-1">Qualité / Événement</label>
                    <Input
                      value={formData.clientRole}
                      onChange={(e) => setFormData({ ...formData, clientRole: e.target.value })}
                      placeholder="Mariés en 2026"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Note (1 à 5 Étoiles)</label>
                    <select
                      value={formData.rating}
                      onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                      className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100"
                    >
                      <option value={5}>5 / 5 Étoiles (Sublime)</option>
                      <option value={4}>4 / 5 Étoiles (Très Bien)</option>
                      <option value={3}>3 / 5 Étoiles (Moyen)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">Message du Témoignage</label>
                  <textarea
                    required
                    rows={4}
                    className="flex w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-100 focus:outline-none focus:border-amber-400"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex justify-end space-x-3">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" variant="gold">
                    Enregistrer le Témoignage
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
