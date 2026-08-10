'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import {
  Film,
  Plus,
  Trash2,
  GripVertical,
  Star,
  Eye,
  EyeOff,
  Upload,
  Loader2,
  ExternalLink,
  ImageIcon,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  PORTFOLIO_CATEGORY_LABELS,
  type PortfolioPageContent,
  type PortfolioVideoItem,
} from '@/lib/portfolio-content';
import { resolveVideoThumbnail } from '@/lib/portfolio-video-utils';

interface VideothequeAdminPanelProps {
  portfolio: PortfolioPageContent;
  onChange: (portfolioContent: PortfolioPageContent) => void;
  showSectionTitles?: boolean;
}

function newVideoId() {
  return `vid-${Date.now().toString(36)}`;
}

export function VideothequeAdminPanel({
  portfolio,
  onChange,
  showSectionTitles = true,
}: VideothequeAdminPanelProps) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const videoFileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const thumbFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const patch = (partial: Partial<PortfolioPageContent>) => {
    onChange({ ...portfolio, ...partial });
  };

  const patchVideo = (id: string, partial: Partial<PortfolioVideoItem>) => {
    patch({
      videos: portfolio.videos.map((v) => (v.id === id ? { ...v, ...partial } : v)),
    });
  };

  const addVideo = () => {
    const item: PortfolioVideoItem = {
      id: newVideoId(),
      title: 'Nouveau film',
      description: '',
      category: 'film',
      videoUrl: '',
      thumbnailUrl: '',
      duration: '',
      isFeatured: portfolio.videos.length === 0,
      isPublished: true,
      order: portfolio.videos.length,
    };
    patch({ videos: [...portfolio.videos, item] });
  };

  const removeVideo = (id: string) => {
    patch({ videos: portfolio.videos.filter((v) => v.id !== id) });
  };

  const setFeatured = (id: string) => {
    patch({
      videos: portfolio.videos.map((v) => ({ ...v, isFeatured: v.id === id })),
    });
  };

  const uploadFile = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await apiClient.post('/upload?skip_watermark=1', form, {
      timeout: 180_000,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return String(res.data?.url || '');
  };

  const handleVideoUpload = async (id: string, file: File) => {
    setUploadError(null);
    setUploadingId(id);
    try {
      const url = await uploadFile(file);
      if (!url) throw new Error('URL de fichier manquante.');
      patchVideo(id, { videoUrl: url });
    } catch (err: unknown) {
      setUploadError(getApiErrorMessage(err, 'Import vidéo impossible.'));
    } finally {
      setUploadingId(null);
    }
  };

  const handleThumbnailUpload = async (id: string, file: File) => {
    setUploadError(null);
    setUploadingId(`${id}-thumb`);
    try {
      const url = await uploadFile(file);
      if (!url) throw new Error('URL de miniature manquante.');
      patchVideo(id, { thumbnailUrl: url });
    } catch (err: unknown) {
      setUploadError(getApiErrorMessage(err, 'Import miniature impossible.'));
    } finally {
      setUploadingId(null);
    }
  };

  const publishedCount = portfolio.videos.filter((v) => v.isPublished !== false && v.videoUrl.trim()).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Film className="h-6 w-6 text-amber-400" />
            Vidéothèque
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            {publishedCount} vidéo(s) publiée(s) sur /portfolio — onglet Vidéothèque.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/portfolio" target="_blank" rel="noopener noreferrer">
            <Button type="button" variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1" /> Voir le portfolio
            </Button>
          </Link>
          <Button type="button" variant="gold" size="sm" onClick={addVideo}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter une vidéo
          </Button>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          {uploadError}
        </div>
      )}

      <Card className="glass-panel border-amber-400/20">
        {showSectionTitles && (
          <CardHeader>
            <CardTitle className="text-lg">Textes de la section</CardTitle>
            <CardDescription>Titre et sous-titre affichés sur la page publique.</CardDescription>
          </CardHeader>
        )}
        <CardContent className={`space-y-4 text-xs ${showSectionTitles ? '' : 'pt-6'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-zinc-300 font-semibold">Titre section vidéos</label>
              <Input
                value={portfolio.videothequeTitle}
                onChange={(e) => patch({ videothequeTitle: e.target.value })}
                className="bg-zinc-950"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-zinc-300 font-semibold">Sous-titre vidéothèque</label>
              <Input
                value={portfolio.videothequeSubtitle}
                onChange={(e) => patch({ videothequeSubtitle: e.target.value })}
                className="bg-zinc-950"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Films & vidéos</CardTitle>
            <CardDescription>
              YouTube, Vimeo, lien .mp4 ou fichier importé depuis votre ordinateur.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          {portfolio.videos.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-zinc-700 rounded-xl text-zinc-500">
              Aucune vidéo. Cliquez sur « Ajouter une vidéo » pour alimenter la vidéothèque.
            </div>
          ) : (
            portfolio.videos.map((video, index) => (
              <div key={video.id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-zinc-600" />
                    <span className="font-bold text-white">Vidéo {index + 1}</span>
                    {video.isFeatured && (
                      <Badge variant="gold" className="text-[10px]">
                        <Star className="h-3 w-3 mr-1" /> À la une
                      </Badge>
                    )}
                    {!video.isPublished && (
                      <Badge variant="outline" className="text-[10px] text-zinc-400">
                        Masquée
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setFeatured(video.id)}>
                      <Star className="h-3.5 w-3.5 mr-1" /> À la une
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => patchVideo(video.id, { isPublished: !video.isPublished })}
                    >
                      {video.isPublished ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5 mr-1" /> Masquer
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Publier
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeVideo(video.id)}
                      className="text-rose-300 border-rose-500/30"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[160px_1fr] gap-4">
                  <div className="aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
                    {video.videoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveVideoThumbnail(video.videoUrl, video.thumbnailUrl)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-zinc-600 text-[10px] px-2 text-center">
                        Aperçu après URL ou import
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-zinc-400 font-semibold">Titre *</label>
                      <Input
                        value={video.title}
                        onChange={(e) => patchVideo(video.id, { title: e.target.value })}
                        className="bg-zinc-900"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-zinc-400 font-semibold">URL vidéo (YouTube, Vimeo, .mp4)</label>
                      <Input
                        value={video.videoUrl}
                        onChange={(e) => patchVideo(video.id, { videoUrl: e.target.value })}
                        placeholder="https://youtube.com/watch?v=… ou /uploads/film.mp4"
                        className="bg-zinc-900"
                      />
                    </div>
                    <div className="md:col-span-2 flex flex-wrap gap-2">
                      <input
                        ref={(el) => {
                          videoFileRefs.current[video.id] = el;
                        }}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleVideoUpload(video.id, file);
                          e.target.value = '';
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingId === video.id}
                        onClick={() => videoFileRefs.current[video.id]?.click()}
                      >
                        {uploadingId === video.id ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Import…
                          </>
                        ) : (
                          <>
                            <Upload className="h-3.5 w-3.5 mr-1" /> Importer un fichier vidéo
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-zinc-400 font-semibold">Catégorie</label>
                      <select
                        value={video.category}
                        onChange={(e) => patchVideo(video.id, { category: e.target.value })}
                        className="flex h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100"
                      >
                        {Object.entries(PORTFOLIO_CATEGORY_LABELS)
                          .filter(([k]) => k !== 'all')
                          .map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-zinc-400 font-semibold">Durée (ex. 2:34)</label>
                      <Input
                        value={video.duration || ''}
                        onChange={(e) => patchVideo(video.id, { duration: e.target.value })}
                        className="bg-zinc-900"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-zinc-400 font-semibold">Miniature (URL ou import)</label>
                      <Input
                        value={video.thumbnailUrl || ''}
                        onChange={(e) => patchVideo(video.id, { thumbnailUrl: e.target.value })}
                        placeholder="Auto pour YouTube si vide"
                        className="bg-zinc-900"
                      />
                      <input
                        ref={(el) => {
                          thumbFileRefs.current[video.id] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleThumbnailUpload(video.id, file);
                          e.target.value = '';
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        disabled={uploadingId === `${video.id}-thumb`}
                        onClick={() => thumbFileRefs.current[video.id]?.click()}
                      >
                        {uploadingId === `${video.id}-thumb` ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Import…
                          </>
                        ) : (
                          <>
                            <ImageIcon className="h-3.5 w-3.5 mr-1" /> Importer une miniature
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-zinc-400 font-semibold">Description</label>
                      <textarea
                        value={video.description || ''}
                        onChange={(e) => patchVideo(video.id, { description: e.target.value })}
                        rows={2}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
