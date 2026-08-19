'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  BookOpen,
  Calendar,
  User,
  MessageSquare,
  Globe,
  Tag,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminModal } from '@/components/admin/admin-modal';
import { useAdminToast } from '@/components/admin/admin-toast';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  fetchAdminBlogPosts,
  saveAllBlogPosts,
  type AdminBlogPost,
} from '@/lib/admin-blog-api';
import apiClient from '@/lib/api-client';

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop';

export default function AdminBlogPage() {
  const { toast } = useAdminToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<AdminBlogPost | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [posts, setPosts] = useState<AdminBlogPost[]>([]);

  const loadPosts = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchAdminBlogPosts();
      setPosts(data);
    } catch (err) {
      console.error('Erreur chargement blog BDD:', err);
      setPosts([]);
      setLoadError(getApiErrorMessage(err, 'Impossible de charger les articles.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const persistPosts = async (newPosts: AdminBlogPost[], successMsg: string) => {
    setSaving(true);
    try {
      const saved = await saveAllBlogPosts(newPosts);
      setPosts(saved);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('blog_posts_updated'));
      }
      toast(successMsg, 'success');
    } catch (err) {
      console.error('Erreur sauvegarde blog BDD:', err);
      toast(getApiErrorMessage(err, 'Erreur lors de la sauvegarde.'), 'error');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const [formData, setFormData] = useState({
    title: '',
    category: 'Conseils Mariage',
    excerpt: '',
    content: '',
    featuredImage: DEFAULT_COVER,
    isPublished: true,
    seoTitle: '',
    seoDescription: '',
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      const data = new FormData();
      data.append('file', file);
      const res = await apiClient.post('/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data && res.data.url) {
        setFormData((prev) => ({ ...prev, featuredImage: res.data.url }));
      }
    } catch (err) {
      console.error('Erreur téléversement image blog:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleTogglePublish = async (id: string) => {
    const updated = posts.map((p) => (p.id === id ? { ...p, isPublished: !p.isPublished } : p));
    try {
      await persistPosts(updated, 'Statut de publication mis à jour');
    } catch {
      // toast déjà affiché
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet article ?')) return;
    const updated = posts.filter((p) => p.id !== id);
    try {
      await persistPosts(updated, 'Article supprimé');
    } catch {
      // toast déjà affiché
    }
  };

  const handleOpenAdd = () => {
    setEditingPost(null);
    setFormData({
      title: '',
      category: 'Conseils Mariage',
      excerpt: '',
      content: '',
      featuredImage: DEFAULT_COVER,
      isPublished: true,
      seoTitle: '',
      seoDescription: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (post: AdminBlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      category: post.category,
      excerpt: post.excerpt || 'Résumé de l\'article...',
      content: post.content || 'Contenu détaillé de l\'article...',
      featuredImage: post.featuredImage,
      isPublished: post.isPublished,
      seoTitle: post.seoTitle || post.title,
      seoDescription: post.seoDescription || 'Description SEO de l\'article',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    let updated: AdminBlogPost[];
    if (editingPost) {
      updated = posts.map((p) =>
        p.id === editingPost.id
          ? {
              ...p,
              title: formData.title,
              category: formData.category,
              excerpt: formData.excerpt,
              content: formData.content,
              featuredImage: formData.featuredImage,
              isPublished: formData.isPublished,
              seoTitle: formData.seoTitle,
              seoDescription: formData.seoDescription,
            }
          : p
      );
    } else {
      const newPost: AdminBlogPost = {
        id: String(Date.now()),
        title: formData.title,
        category: formData.category,
        author: 'Photographe Master',
        isPublished: formData.isPublished,
        publishedAt: new Date().toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
        commentsCount: 0,
        featuredImage: formData.featuredImage,
        excerpt: formData.excerpt,
        content: formData.content,
        seoTitle: formData.seoTitle,
        seoDescription: formData.seoDescription,
      };
      updated = [newPost, ...posts];
    }
    try {
      await persistPosts(updated, editingPost ? 'Article mis à jour' : 'Article créé');
      setIsModalOpen(false);
    } catch {
      // toast déjà affiché
    }
  };

  const filteredPosts = posts.filter((p) =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <AdminPageHeader
        title="CMS Blog &"
        accent="Articles"
        description="Gestion complète des articles, catégories, mots-clés SEO, brouillons et commentaires."
        actions={
          <Button variant="primary" size="sm" onClick={handleOpenAdd} className="space-x-2">
            <Plus className="h-4 w-4" />
            <span>Nouvel Article</span>
          </Button>
        }
      />

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-h2">Articles ({filteredPosts.length})</CardTitle>
            <CardDescription>
              Aperçu des articles publiés et brouillons en cours d&apos;écriture.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Rechercher par titre…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <LoadingState message="Chargement des articles…" />
          ) : loadError ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-danger">{loadError}</p>
              <Button variant="outline" size="sm" onClick={loadPosts}>
                Réessayer
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visuel</TableHead>
                  <TableHead>Titre & catégorie</TableHead>
                  <TableHead>Auteur</TableHead>
                  <TableHead>Date & commentaires</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.length === 0 ? (
                  <TableEmpty colSpan={6} message="Aucun article pour le moment." />
                ) : (
                  filteredPosts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <img
                          src={p.featuredImage}
                          alt={p.title}
                          className="h-12 w-16 object-cover rounded-lg border border-border"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground text-sm max-w-xs sm:max-w-md truncate">
                          {p.title}
                        </div>
                        <Badge variant="accent" className="text-[10px] mt-1">
                          {p.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.author}</TableCell>
                      <TableCell className="text-xs space-y-1">
                        <div className="text-muted-foreground">{p.publishedAt}</div>
                        <div className="text-primary flex items-center">
                          <MessageSquare className="h-3 w-3 mr-1" /> {p.commentsCount} avis
                        </div>
                      </TableCell>
                      <TableCell>
                        <button type="button" onClick={() => handleTogglePublish(p.id)} className="cursor-pointer">
                          <Badge variant={p.isPublished ? 'success' : 'warning'}>
                            {p.isPublished ? 'Publié' : 'Brouillon'}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(p)}
                            className="h-8 w-8"
                            aria-label="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(p.id)}
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
        title={editingPost ?"Modifier l'article" : 'Rédiger un article'}
        size="lg"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" form="blog-form" variant="primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </>
        }
      >
        <form id="blog-form" onSubmit={handleSave} className="space-y-4 text-sm">
          <div>
            <label className="text-caption font-medium text-muted-foreground block mb-1.5">Titre</label>
            <Input
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2 border border-border bg-surface-muted p-3 rounded-lg">
            <label className="font-medium text-foreground flex items-center text-sm">
              <ImageIcon className="h-4 w-4 text-primary mr-1.5" /> Image à la une
            </label>
            <div className="flex items-center gap-4">
              {formData.featuredImage && (
                <img
                  src={formData.featuredImage}
                  alt="Aperçu"
                  className="h-16 w-24 object-cover rounded-lg border border-primary/40"
                />
              )}
              <div className="flex-1 space-y-2">
                <Input
                  value={formData.featuredImage}
                  placeholder="https://…"
                  onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
                  className="text-xs"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-xs"
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  {uploading ? 'Téléversement…' : 'Changer l\'image (fichier)'}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-caption font-medium text-muted-foreground block mb-1.5">Catégorie</label>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="text-xs"
              >
                <option value="Conseils Mariage">Conseils Mariage</option>
                <option value="Portrait">Portrait</option>
                <option value="Coulisses Studio">Coulisses Studio</option>
              </Select>
            </div>

            <div>
              <label className="text-caption font-medium text-muted-foreground block mb-1.5">Statut</label>
              <Select
                value={formData.isPublished ? 'published' : 'draft'}
                onChange={(e) =>
                  setFormData({ ...formData, isPublished: e.target.value === 'published' })
                }
                className="text-xs"
              >
                <option value="published">Publié</option>
                <option value="draft">Brouillon</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-caption font-medium text-muted-foreground block mb-1.5">Résumé</label>
            <Input
              required
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
            />
          </div>

          <div>
            <label className="text-caption font-medium text-muted-foreground block mb-1.5">Contenu</label>
            <Textarea
              required
              rows={6}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            />
          </div>

          <div className="pt-2 border-t border-border space-y-3">
            <span className="font-semibold text-primary flex items-center text-sm">
              <Globe className="h-4 w-4 mr-1" /> Métadonnées SEO
            </span>
            <div>
              <label className="text-caption font-medium text-muted-foreground block mb-1.5">Meta title</label>
              <Input
                value={formData.seoTitle}
                onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
              />
            </div>
            <div>
              <label className="text-caption font-medium text-muted-foreground block mb-1.5">Meta description</label>
              <Input
                value={formData.seoDescription}
                onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
              />
            </div>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
