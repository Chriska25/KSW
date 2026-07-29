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
import { LoadingState } from '@/components/common/loading-state';
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            CMS Blog & <span className="gold-gradient-text">Articles</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Gestion complète des articles, catégories, mots-clés SEO, brouillons et commentaires.
          </p>
        </div>
        <Button variant="gold" size="sm" onClick={handleOpenAdd} className="space-x-2">
          <Plus className="h-4 w-4" />
          <span>Nouvel Article</span>
        </Button>
      </div>

      {/* Table Card */}
      <Card className="glass-panel space-y-4">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Articles Rédigés ({filteredPosts.length})</CardTitle>
            <CardDescription>
              Aperçu des articles publiés et brouillons en cours d'écriture.
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-3 text-zinc-500" />
            <Input
              placeholder="Rechercher par titre..."
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
              <p className="text-sm text-red-400">{loadError}</p>
              <Button variant="outline" size="sm" onClick={loadPosts}>
                Réessayer
              </Button>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400">
              Aucun article pour le moment. Créez votre premier contenu.
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-950/80 text-xs font-semibold uppercase text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Visuel</th>
                  <th className="py-3 px-4">Titre & Catégorie</th>
                  <th className="py-3 px-4">Auteur</th>
                  <th className="py-3 px-4">Date & Commentaires</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredPosts.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="py-3 px-4">
                      <img
                        src={p.featuredImage}
                        alt={p.title}
                        className="h-12 w-16 object-cover rounded-lg border border-zinc-800"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white text-sm max-w-xs sm:max-w-md truncate">
                        {p.title}
                      </div>
                      <Badge variant="gold" className="text-[10px] mt-1">
                        {p.category}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-300">{p.author}</td>
                    <td className="py-3 px-4 text-xs space-y-1">
                      <div className="text-zinc-400">{p.publishedAt}</div>
                      <div className="text-amber-400 flex items-center">
                        <MessageSquare className="h-3 w-3 mr-1" /> {p.commentsCount} avis
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button onClick={() => handleTogglePublish(p.id)} className="cursor-pointer">
                        <Badge variant={p.isPublished ? 'success' : 'warning'}>
                          {p.isPublished ? 'Publié' : 'Brouillon'}
                        </Badge>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(p)}
                        className="h-8 w-8 text-zinc-300 hover:text-amber-400"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(p.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive/80"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Edit / Add Article */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="glass-panel max-w-2xl w-full border-amber-400/40 space-y-4 max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 pb-3">
              <CardTitle className="text-xl">
                {editingPost ? 'Modifier l\'Article' : 'Rédiger un Article'}
              </CardTitle>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div>
                  <label className="text-zinc-400 block mb-1">Titre de l'Article</label>
                  <Input
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2 border border-zinc-800 bg-zinc-950/80 p-3 rounded-xl">
                  <label className="text-zinc-300 font-semibold block flex items-center">
                    <ImageIcon className="h-4 w-4 text-amber-400 mr-1.5" /> Image à la Une (Couverture)
                  </label>
                  <div className="flex items-center space-x-4">
                    {formData.featuredImage && (
                      <img
                        src={formData.featuredImage}
                        alt="Aperçu"
                        className="h-16 w-24 object-cover rounded-lg border border-amber-400/40"
                      />
                    )}
                    <div className="flex-1 space-y-2">
                      <Input
                        value={formData.featuredImage}
                        placeholder="https://..."
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
                        className="w-full text-xs border-amber-400/50 text-amber-400 hover:bg-amber-400/10"
                      >
                        <Upload className="h-3.5 w-3.5 mr-1" />
                        {uploading ? 'Téléversement en cours...' : 'Changer l\'Image (Fichier HD)'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-zinc-400 block mb-1">Catégorie</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100"
                    >
                      <option value="Conseils Mariage">Conseils Mariage</option>
                      <option value="Portrait">Portrait</option>
                      <option value="Coulisses Studio">Coulisses Studio</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-zinc-400 block mb-1">Statut</label>
                    <select
                      value={formData.isPublished ? 'published' : 'draft'}
                      onChange={(e) =>
                        setFormData({ ...formData, isPublished: e.target.value === 'published' })
                      }
                      className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100"
                    >
                      <option value="published">Publié</option>
                      <option value="draft">Brouillon</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">Résumé / Excerpt</label>
                  <Input
                    required
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1">Contenu (Markdown / HTML)</label>
                  <textarea
                    required
                    rows={6}
                    className="flex w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-100 focus:outline-none focus:border-amber-400"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                </div>

                <div className="pt-2 border-t border-zinc-800 space-y-3">
                  <span className="font-semibold text-amber-400 flex items-center">
                    <Globe className="h-4 w-4 mr-1" /> Métadonnées SEO
                  </span>
                  <div>
                    <label className="text-zinc-400 block mb-1">Meta Title</label>
                    <Input
                      value={formData.seoTitle}
                      onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Meta Description</label>
                    <Input
                      value={formData.seoDescription}
                      onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end space-x-3">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" variant="gold" disabled={saving}>
                    {saving ? 'Enregistrement…' : 'Enregistrer l\'Article'}
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
