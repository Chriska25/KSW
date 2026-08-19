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
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty,
} from '@/components/ui/table';
import { LoadingState } from '@/components/common/loading-state';
import { AdminModal } from '@/components/admin/admin-modal';
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
            <Button variant="primary" size="sm" onClick={handleOpenAdd} className="space-x-2">
              <Plus className="h-4 w-4" />
              <span>Ajouter un Témoignage</span>
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-h2 flex items-center gap-2 flex-wrap">
              Avis et recommandations ({filteredTestimonials.length})
              {pendingCount > 0 && (
                <Badge variant="warning">{pendingCount} en attente</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Modération des témoignages publiés dans le carrousel de la page d&apos;accueil.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Rechercher un avis…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <LoadingState message="Chargement des avis…" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Avatar</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTestimonials.length === 0 ? (
                  <TableEmpty
                    colSpan={6}
                    message="Aucun avis pour le moment. Les dépôts depuis Contact apparaîtront en « En attente »."
                  />
                ) : (
                  filteredTestimonials.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <img
                          src={t.avatarUrl}
                          alt={t.clientName}
                          className="h-10 w-10 rounded-full object-cover border border-border"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground text-sm">{t.clientName}</div>
                        <div className="text-caption text-muted-foreground">{t.clientRole}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-0.5 text-primary">
                          {Array.from({ length: t.rating }).map((_, i) => (
                            <Star key={i} className="h-3.5 w-3.5 fill-primary" />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-sm italic">
                        &ldquo;{t.content}&rdquo;
                      </TableCell>
                      <TableCell>
                        <button type="button" onClick={() => handleToggleApprove(t.id)} className="cursor-pointer">
                          <Badge variant={t.isPublished ? 'success' : 'warning'}>
                            {t.isPublished ? 'Approuvé' : 'En attente'}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(t)}
                            className="h-8 w-8"
                            aria-label="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(t.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive/80"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AdminModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Modifier le témoignage' : 'Ajouter un témoignage'}
        size="md"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" form="testimonial-form" variant="primary">
              Enregistrer
            </Button>
          </>
        }
      >
        <form id="testimonial-form" onSubmit={handleSave} className="space-y-4 text-sm">
          <div>
            <label className="text-caption font-medium text-muted-foreground block mb-1.5">Nom du client</label>
            <Input
              required
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-caption font-medium text-muted-foreground block mb-1.5">Événement</label>
              <Input
                value={formData.clientRole}
                onChange={(e) => setFormData({ ...formData, clientRole: e.target.value })}
                placeholder="Mariés en 2026"
              />
            </div>
            <div>
              <label className="text-caption font-medium text-muted-foreground block mb-1.5">Note</label>
              <Select
                value={String(formData.rating)}
                onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                className="text-xs"
              >
                <option value="5">5 / 5</option>
                <option value="4">4 / 5</option>
                <option value="3">3 / 5</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-caption font-medium text-muted-foreground block mb-1.5">Message</label>
            <Textarea
              required
              rows={4}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            />
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
