'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Upload,
  Image as ImageIcon,
  Globe,
  ExternalLink,
  Copy,
  Eye,
  FileText,
  CheckCircle2,
  Clock,
  MessageSquare,
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
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  duplicateBlogPost,
  type AdminBlogPost,
} from '@/lib/admin-blog-api';
import apiClient from '@/lib/api-client';
import { MarkdownEditor } from '@/components/blog/markdown-editor';
import { BlogCommentsPanel } from '@/components/admin/blog-comments-panel';

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop';

const CATEGORIES = [
  'Conseils Mariage',
  'Portrait',
  'Coulisses Studio',
  'Corporate',
  'Journal',
];

type StatusFilter = 'all' | 'published' | 'draft';
type AdminTab = 'articles' | 'comments';

const emptyForm = {
  title: '',
  slug: '',
  category: CATEGORIES[0],
  author: 'KSW Studio',
  excerpt: '',
  content: '',
  featuredImage: DEFAULT_COVER,
  isPublished: true,
  seoTitle: '',
  seoDescription: '',
  tagsInput: '',
  readTime: '',
};

export default function AdminBlogPage() {
  const { toast } = useAdminToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [activeTab, setActiveTab] = useState<AdminTab>('articles');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<AdminBlogPost | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [formData, setFormData] = useState(emptyForm);

  const stats = useMemo(
    () => ({
      total: posts.length,
      published: posts.filter((p) => p.isPublished).length,
      drafts: posts.filter((p) => !p.isPublished).length,
    }),
    [posts]
  );

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

  const notifyBlogUpdated = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('blog_posts_updated'));
    }
  };

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
      if (res.data?.url) {
        setFormData((prev) => ({ ...prev, featuredImage: res.data.url }));
        toast('Image téléversée', 'success');
      }
    } catch (err) {
      console.error('Erreur téléversement image blog:', err);
      toast(getApiErrorMessage(err, 'Échec du téléversement.'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleTogglePublish = async (post: AdminBlogPost) => {
    try {
      const updated = await updateBlogPost(post.id, { ...post, isPublished: !post.isPublished });
      setPosts((prev) => prev.map((p) => (p.id === post.id ? updated : p)));
      notifyBlogUpdated();
      toast(updated.isPublished ? 'Article publié' : 'Article passé en brouillon', 'success');
    } catch (err) {
      toast(getApiErrorMessage(err, 'Impossible de modifier le statut.'), 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer définitivement cet article ?')) return;
    try {
      await deleteBlogPost(id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      notifyBlogUpdated();
      toast('Article supprimé', 'success');
    } catch (err) {
      toast(getApiErrorMessage(err, 'Impossible de supprimer l\'article.'), 'error');
    }
  };

  const handleDuplicate = async (post: AdminBlogPost) => {
    try {
      const copy = await duplicateBlogPost(post);
      setPosts((prev) => [copy, ...prev]);
      notifyBlogUpdated();
      toast('Article dupliqué en brouillon', 'success');
    } catch (err) {
      toast(getApiErrorMessage(err, 'Impossible de dupliquer l\'article.'), 'error');
    }
  };

  const handleOpenAdd = () => {
    setEditingPost(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (post: AdminBlogPost) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug || '',
      category: post.category,
      author: post.author,
      excerpt: post.excerpt || '',
      content: post.content || '',
      featuredImage: post.featuredImage || DEFAULT_COVER,
      isPublished: post.isPublished,
      seoTitle: post.seoTitle || post.title,
      seoDescription: post.seoDescription || post.excerpt || '',
      tagsInput: (post.tags || []).join(', '),
      readTime: post.readTime || '',
    });
    setIsModalOpen(true);
  };

  const buildPayload = () => {
    const tags = formData.tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    return {
      title: formData.title.trim(),
      slug: formData.slug.trim() || undefined,
      category: formData.category,
      author: formData.author.trim() || 'KSW Studio',
      excerpt: formData.excerpt.trim(),
      content: formData.content.trim(),
      featuredImage: formData.featuredImage.trim(),
      isPublished: formData.isPublished,
      seoTitle: formData.seoTitle.trim() || formData.title.trim(),
      seoDescription: formData.seoDescription.trim() || formData.excerpt.trim(),
      tags,
      readTime: formData.readTime.trim() || undefined,
      contentFormat: 'markdown' as const,
    };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = buildPayload();
      if (editingPost) {
        const updated = await updateBlogPost(editingPost.id, payload);
        setPosts((prev) => prev.map((p) => (p.id === editingPost.id ? updated : p)));
        toast('Article mis à jour', 'success');
      } else {
        const created = await createBlogPost(payload);
        setPosts((prev) => [created, ...prev]);
        toast('Article créé', 'success');
      }
      notifyBlogUpdated();
      setIsModalOpen(false);
    } catch (err) {
      toast(getApiErrorMessage(err, 'Erreur lors de la sauvegarde.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredPosts = posts.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'published' && p.isPublished) ||
      (statusFilter === 'draft' && !p.isPublished);
    return matchesSearch && matchesStatus;
  });

  const previewSlug = editingPost?.slug || formData.slug;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <AdminPageHeader
        title="CMS Blog &"
        accent="Articles"
        description="Créez, modifiez, publiez ou supprimez vos articles. Les brouillons ne sont pas visibles sur le site public."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/blog" target="_blank">
              <Button variant="outline" size="sm" className="space-x-2">
                <ExternalLink className="h-4 w-4" />
                <span>Voir le blog public</span>
              </Button>
            </Link>
            <Button variant="primary" size="sm" onClick={handleOpenAdd} className="space-x-2">
              <Plus className="h-4 w-4" />
              <span>Nouvel article</span>
            </Button>
          </div>
        }
      />

      <div className="flex gap-2 border-b border-border pb-1">
        <Button
          type="button"
          variant={activeTab === 'articles' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('articles')}
          className="space-x-2"
        >
          <FileText className="h-4 w-4" />
          <span>Articles</span>
        </Button>
        <Button
          type="button"
          variant={activeTab === 'comments' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('comments')}
          className="space-x-2"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Commentaires</span>
        </Button>
      </div>

      {activeTab === 'comments' ? (
        <BlogCommentsPanel onCountsChange={loadPosts} />
      ) : (
        <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Articles au total</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <div>
              <div className="text-2xl font-bold text-foreground">{stats.published}</div>
              <div className="text-xs text-muted-foreground">Publiés</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Clock className="h-8 w-8 text-warning" />
            <div>
              <div className="text-2xl font-bold text-foreground">{stats.drafts}</div>
              <div className="text-xs text-muted-foreground">Brouillons</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-h2">Articles ({filteredPosts.length})</CardTitle>
            <CardDescription>
              Gérez le contenu affiché sur la page /blog du site.
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="text-xs h-10 sm:w-40"
            >
              <option value="all">Tous les statuts</option>
              <option value="published">Publiés</option>
              <option value="draft">Brouillons</option>
            </Select>
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 text-xs"
              />
            </div>
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
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.length === 0 ? (
                  <TableEmpty
                    colSpan={6}
                    message={
                      posts.length === 0
                        ? 'Aucun article. Cliquez sur « Nouvel article » pour commencer.'
                        : 'Aucun article ne correspond à votre recherche.'
                    }
                  />
                ) : (
                  filteredPosts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <img
                          src={p.featuredImage || DEFAULT_COVER}
                          alt={p.title}
                          className="h-12 w-16 object-cover rounded-lg border border-border"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground text-sm max-w-xs sm:max-w-md truncate">
                          {p.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <Badge variant="accent" className="text-[10px]">
                            {p.category}
                          </Badge>
                          {p.slug && (
                            <span className="text-[10px] text-muted-foreground font-mono">/{p.slug}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.author}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div>{p.publishedAt || '—'}</div>
                        {p.readTime && <div className="text-[10px]">{p.readTime} de lecture</div>}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(p)}
                          className="cursor-pointer"
                          title={p.isPublished ? 'Passer en brouillon' : 'Publier'}
                        >
                          <Badge variant={p.isPublished ? 'success' : 'warning'}>
                            {p.isPublished ? 'Publié' : 'Brouillon'}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          {p.isPublished && p.slug && (
                            <Link href={`/blog/${p.slug}`} target="_blank">
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Aperçu">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicate(p)}
                            className="h-8 w-8"
                            aria-label="Dupliquer"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
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
        </>
      )}

      <AdminModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPost ? "Modifier l'article" : 'Rédiger un article'}
        size="lg"
        footer={
          <>
            {previewSlug && formData.isPublished && (
              <Link href={`/blog/${previewSlug}`} target="_blank" className="mr-auto">
                <Button type="button" variant="ghost" size="sm" className="space-x-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Aperçu</span>
                </Button>
              </Link>
            )}
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" form="blog-form" variant="primary" disabled={saving}>
              {saving ? 'Enregistrement…' : editingPost ? 'Mettre à jour' : 'Créer l\'article'}
            </Button>
          </>
        }
      >
        <form id="blog-form" onSubmit={handleSave} className="space-y-4 text-sm">
          <div>
            <label className="text-caption font-medium text-muted-foreground block mb-1.5">Titre *</label>
            <Input
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-caption font-medium text-muted-foreground block mb-1.5">Slug URL</label>
              <Input
                value={formData.slug}
                placeholder="auto-généré depuis le titre"
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-caption font-medium text-muted-foreground block mb-1.5">Temps de lecture</label>
              <Input
                value={formData.readTime}
                placeholder="ex. 5 min (auto si vide)"
                onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
              />
            </div>
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
                  {uploading ? 'Téléversement…' : 'Téléverser une image'}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-caption font-medium text-muted-foreground block mb-1.5">Catégorie</label>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="text-xs"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-caption font-medium text-muted-foreground block mb-1.5">Auteur</label>
              <Input
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              />
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
            <label className="text-caption font-medium text-muted-foreground block mb-1.5">Résumé *</label>
            <Input
              required
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              placeholder="Court texte affiché sur la liste des articles"
            />
          </div>

          <div>
            <label className="text-caption font-medium text-muted-foreground block mb-1.5">
              Contenu * <span className="text-[10px] font-normal">(Markdown)</span>
            </label>
            <MarkdownEditor
              required
              value={formData.content}
              onChange={(content) => setFormData({ ...formData, content })}
              placeholder="## Introduction&#10;&#10;Rédigez votre article en Markdown…"
              rows={10}
            />
          </div>

          <div>
            <label className="text-caption font-medium text-muted-foreground block mb-1.5">Tags</label>
            <Input
              value={formData.tagsInput}
              onChange={(e) => setFormData({ ...formData, tagsInput: e.target.value })}
              placeholder="Mariage, Conseils, Portrait (séparés par des virgules)"
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
              <Textarea
                rows={2}
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
