'use client';

import React, { useState } from 'react';
import {
  UploadCloud,
  FolderPlus,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Lock,
  Globe,
  Plus,
  Sparkles,
  Layers,
  Edit3,
  Star,
  Eye,
  X,
  Search,
  Filter,
  Check,
  Tag,
  Camera,
  Calendar,
  Save,
  Key,
  Unlock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useGalleries, GalleryAdminItem, AlbumItem, PhotoItem } from '@/context/gallery-context';
import apiClient from '@/lib/api-client';
import { useAdminToast } from '@/components/admin/admin-toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { LoadingState } from '@/components/common/loading-state';

export default function AdminGaleriesPage() {
  const { toast } = useAdminToast();
  const { galleries, updateGalleries, setGalleries } = useGalleries();

  const [galleriesLoading, setGalleriesLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadAdminGalleries = async () => {
      setGalleriesLoading(true);
      setLoadError(null);
      try {
        const res = await apiClient.get(`/admin/galleries?t=${Date.now()}`);
        if (Array.isArray(res.data?.data)) {
          setGalleries(res.data.data);
          if (res.data.data.length > 0) {
            setSelectedGalleryId(res.data.data[0].id);
          }
        }
      } catch (e) {
        console.error('Erreur chargement galeries admin:', e);
        setLoadError(getApiErrorMessage(e, 'Impossible de charger les galeries.'));
      } finally {
        setGalleriesLoading(false);
      }
    };
    loadAdminGalleries();
  }, [setGalleries]);

  const persistGalleries = async (next: GalleryAdminItem[], successMsg?: string) => {
    try {
      await updateGalleries(next);
      if (successMsg) toast(successMsg, 'success');
    } catch (err) {
      toast(getApiErrorMessage(err, 'Erreur lors de la sauvegarde des galeries.'), 'error');
      throw err;
    }
  };

  const [selectedGalleryId, setSelectedGalleryId] = useState<string>('1');
  const [selectedAlbumFilter, setSelectedAlbumFilter] = useState<string>('all');
  const [searchPhotoQuery, setSearchPhotoQuery] = useState<string>('');

  // Modals state
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [editingGallery, setEditingGallery] = useState<Partial<GalleryAdminItem>>({});

  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [newAlbumForm, setNewAlbumForm] = useState({
    name: '',
    isPrivate: false,
    password: '',
  });

  const [isPhotoEditModalOpen, setIsPhotoEditModalOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<PhotoItem | null>(null);

  // Uploader state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const selectedGallery = galleries.find((g) => g.id === selectedGalleryId) || galleries[0];

  if (galleriesLoading) {
    return (
      <div className="py-24">
        <LoadingState message="Chargement des galeries…" />
      </div>
    );
  }

  // Filtering photos in current gallery
  const filteredPhotos = (selectedGallery?.photos || []).filter((p) => {
    const matchesAlbum = selectedAlbumFilter === 'all' || p.albumId === selectedAlbumFilter;
    const matchesSearch = p.title.toLowerCase().includes(searchPhotoQuery.toLowerCase());
    return matchesAlbum && matchesSearch;
  });

  // Toggle Album Privacy (Public <-> Privé)
  const handleToggleAlbumPrivacy = async (albumId: string) => {
    if (!selectedGallery) return;
    const updated = galleries.map((g) => {
      if (g.id !== selectedGallery.id) return g;
      const updatedAlbums = g.albums.map((alb) =>
        alb.id === albumId ? { ...alb, isPrivate: !alb.isPrivate } : alb
      );
      return { ...g, albums: updatedAlbums };
    });
    try {
      await persistGalleries(updated);
    } catch {
      // toast affiché
    }
  };

  // High Definition Stock Photography URLs matching gallery categories
  const getCategoryFallbackImage = (cat?: string, index: number = 0): string => {
    const mariagePhotos = [
      'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?q=80&w=800&auto=format&fit=crop',
    ];
    const portraitPhotos = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800&auto=format&fit=crop',
    ];
    const corporatePhotos = [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=800&auto=format&fit=crop',
    ];

    const category = (cat || 'mariage').toLowerCase();
    if (category.includes('portrait')) {
      return portraitPhotos[index % portraitPhotos.length];
    }
    if (category.includes('corporate')) {
      return corporatePhotos[index % corporatePhotos.length];
    }
    return mariagePhotos[index % mariagePhotos.length];
  };

  // Restore and Fix all broken photos in state
  const handleRestoreBrokenPhotos = async () => {
    const updated = galleries.map((g) => {
      const fixedPhotos = g.photos.map((p, idx) => {
        if (!p.url || p.url.startsWith('blob:') || p.url.length < 30) {
          return { ...p, url: getCategoryFallbackImage(g.category, idx) };
        }
        return p;
      });
      return { ...g, photos: fixedPhotos };
    });
    try {
      await persistGalleries(updated, 'Photos restaurées');
    } catch {
      // toast affiché
    }
  };

  const handleMultiPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedGallery) return;
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    setUploadProgress(10);
    setUploadError(null);

    const uploadedFiles = Array.from(e.target.files);
    const failures: string[] = [];
    const successes: { file: File; url: string }[] = [];

    for (let idx = 0; idx < uploadedFiles.length; idx++) {
      const file = uploadedFiles[idx];
      setUploadProgress(Math.round(10 + ((idx + 1) / uploadedFiles.length) * 80));
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiClient.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (res.data?.url) {
          successes.push({ file, url: res.data.url });
        } else {
          failures.push(`${file.name} : réponse serveur invalide`);
        }
      } catch (err) {
        failures.push(`${file.name} : ${getApiErrorMessage(err, 'échec du téléversement')}`);
      }
    }

    setUploadProgress(100);
    setUploading(false);
    e.target.value = '';

    if (successes.length === 0) {
      const msg = failures[0] || 'Aucune photo n\'a pu être téléversée.';
      setUploadError(msg);
      toast(msg, 'error');
      return;
    }

    const targetAlbum = selectedGallery.albums.find((a) => a.id === selectedAlbumFilter);
    const isAlbPrivate = targetAlbum ? targetAlbum.isPrivate ?? false : false;

    const newPhotos: PhotoItem[] = successes.map(({ file, url }, idx) => ({
      id: `p-new-${Date.now()}-${idx}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      cat: selectedGallery.category || 'mariage',
      url,
      albumId: selectedAlbumFilter !== 'all' ? selectedAlbumFilter : selectedGallery.albums[0]?.id,
      albumName: targetAlbum?.name || 'Général',
      isFavorite: false,
      isCover: false,
      isPrivate: isAlbPrivate,
      exif: { camera: 'Canon EOS R5', lens: 'RF 85mm F1.2', iso: 100, aperture: 'f/1.4' },
    }));

    const updated = galleries.map((g) =>
      g.id === selectedGallery.id ? { ...g, photos: [...g.photos, ...newPhotos] } : g
    );

    try {
      await persistGalleries(
        updated,
        `${successes.length} photo(s) téléversée(s)${failures.length ? ` — ${failures.length} échec(s)` : ''}`
      );
      if (failures.length > 0) {
        setUploadError(failures.join(' · '));
        toast(`${failures.length} fichier(s) en échec. Vérifiez le format ou reconnectez-vous.`, 'error');
      }
    } catch {
      setUploadError('Photos téléversées mais sauvegarde BDD échouée.');
    }
  };

  // Create or Update Gallery
  const handleSaveGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGallery.title) return;

    if (editingGallery.id) {
      const updated = galleries.map((g) =>
        g.id === editingGallery.id ? ({ ...g, ...editingGallery } as GalleryAdminItem) : g
      );
      try {
        await persistGalleries(updated, 'Galerie mise à jour');
      } catch {
        return;
      }
    } else {
      const newG: GalleryAdminItem = {
        id: `gal-${Date.now()}`,
        title: editingGallery.title || 'Nouvelle Galerie',
        clientName: editingGallery.clientName || 'Client Studio',
        category: editingGallery.category || 'mariage',
        isPrivate: editingGallery.isPrivate ?? true,
        accessKey: editingGallery.accessKey || `KEY-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        coverUrl:
          editingGallery.coverUrl ||
          'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=600&auto=format&fit=crop',
        albums: [{ id: `alb-${Date.now()}`, name: 'Album Général', photosCount: 0, isPrivate: editingGallery.isPrivate ?? true }],
        photos: [],
      };
      try {
        await persistGalleries([...galleries, newG], 'Galerie créée');
        setSelectedGalleryId(newG.id);
      } catch {
        return;
      }
    }
    setIsGalleryModalOpen(false);
  };

  // Create Album with Privacy Option
  const handleAddAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumForm.name.trim() || !selectedGallery) return;

    const newAlb: AlbumItem = {
      id: `alb-${Date.now()}`,
      name: newAlbumForm.name.trim(),
      photosCount: 0,
      isPrivate: newAlbumForm.isPrivate,
      password: newAlbumForm.password,
    };

    const updated = galleries.map((g) =>
      g.id === selectedGallery.id ? { ...g, albums: [...g.albums, newAlb] } : g
    );
    try {
      await persistGalleries(updated, 'Album créé');
    } catch {
      return;
    }

    setNewAlbumForm({ name: '', isPrivate: false, password: '' });
    setIsAlbumModalOpen(false);
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!selectedGallery) return;
    const updated = galleries.map((g) =>
      g.id === selectedGallery.id ? { ...g, photos: g.photos.filter((p) => p.id !== photoId) } : g
    );
    try {
      await persistGalleries(updated);
    } catch {
      // toast affiché
    }
  };

  const handleSetAsCover = async (photo: PhotoItem) => {
    if (!selectedGallery) return;
    const updated = galleries.map((g) => {
      if (g.id !== selectedGallery.id) return g;
      const updatedPhotos = g.photos.map((p) => ({ ...p, isCover: p.id === photo.id }));
      return { ...g, coverUrl: photo.url, photos: updatedPhotos };
    });
    try {
      await persistGalleries(updated, 'Couverture mise à jour');
    } catch {
      // toast affiché
    }
  };

  const handleToggleFavorite = async (photoId: string) => {
    if (!selectedGallery) return;
    const updated = galleries.map((g) => {
      if (g.id !== selectedGallery.id) return g;
      const updatedPhotos = g.photos.map((p) =>
        p.id === photoId ? { ...p, isFavorite: !p.isFavorite } : p
      );
      return { ...g, photos: updatedPhotos };
    });
    try {
      await persistGalleries(updated);
    } catch {
      // toast affiché
    }
  };

  const handleSavePhotoDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoto || !selectedGallery) return;

    const updated = galleries.map((g) => {
      if (g.id !== selectedGallery.id) return g;
      const updatedPhotos = g.photos.map((p) => (p.id === editingPhoto.id ? editingPhoto : p));
      return { ...g, photos: updatedPhotos };
    });
    try {
      await persistGalleries(updated, 'Photo mise à jour');
    } catch {
      return;
    }

    setIsPhotoEditModalOpen(false);
    setEditingPhoto(null);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {!selectedGallery ? (
        <div className="text-center py-16 space-y-4">
          {loadError ? (
            <p className="text-sm text-red-400">{loadError}</p>
          ) : (
            <p className="text-sm text-zinc-400">Aucune galerie. Créez votre première galerie.</p>
          )}
          <Button
            variant="gold"
            size="sm"
            onClick={() => {
              setEditingGallery({ isPrivate: true, category: 'mariage' });
              setIsGalleryModalOpen(true);
            }}
          >
            <FolderPlus className="h-4 w-4 mr-2" /> Nouvelle Galerie
          </Button>
        </div>
      ) : (
      <>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            Gestionnaire de <span className="gold-gradient-text">Galeries & Albums (Public/Privé)</span>
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Créer des galeries, des sous-albums publics ou verrouillés en privé, uploader et synchroniser.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestoreBrokenPhotos}
            className="space-x-1.5 border-zinc-800 text-amber-400 hover:bg-amber-400/10 text-xs font-semibold"
          >
            <Sparkles className="h-4 w-4" />
            <span>Restaurer les Photos</span>
          </Button>

          <Button
            variant="gold"
            size="sm"
            onClick={() => {
              setEditingGallery({ isPrivate: true, category: 'mariage' });
              setIsGalleryModalOpen(true);
            }}
            className="space-x-2 font-bold shadow-md shadow-amber-400/20"
          >
            <FolderPlus className="h-4 w-4" />
            <span>Nouvelle Galerie</span>
          </Button>
        </div>
      </div>

      {/* Gallery Selector Pills */}
      <div className="flex items-center space-x-3 overflow-x-auto pb-2 border-b border-zinc-800">
        {galleries.map((gal) => (
          <button
            key={gal.id}
            onClick={() => {
              setSelectedGalleryId(gal.id);
              setSelectedAlbumFilter('all');
            }}
            className={`px-5 py-3 rounded-2xl border text-xs font-semibold flex items-center space-x-3 shrink-0 transition-all cursor-pointer ${
              selectedGalleryId === gal.id
                ? 'border-amber-400 bg-amber-400 text-zinc-950 shadow-lg shadow-amber-400/20'
                : 'border-zinc-800 glass-panel text-zinc-300 hover:border-zinc-700'
            }`}
          >
            <img src={gal.coverUrl} alt={gal.title} className="h-7 w-9 object-cover rounded-lg border border-zinc-700" />
            <div className="text-left">
              <div className="font-bold truncate max-w-[180px]">{gal.title}</div>
              <div className="text-[10px] opacity-80 flex items-center space-x-1">
                <span>{gal.photos.length} photos</span>
                <span>•</span>
                {gal.isPrivate ? <Lock className="h-3 w-3 inline text-amber-400" /> : <Globe className="h-3 w-3 inline text-emerald-400" />}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Current Gallery Details Card & Controls */}
      <Card className="glass-panel border-amber-400/30 p-6 space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-zinc-800">
          <div className="flex items-center space-x-4">
            <img
              src={selectedGallery.coverUrl}
              alt={selectedGallery.title}
              className="h-20 w-28 object-cover rounded-2xl border border-amber-400/40 gold-border-glow shrink-0"
            />
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-extrabold text-white">{selectedGallery.title}</h2>
                <Badge variant={selectedGallery.isPrivate ? 'gold' : 'success'}>
                  {selectedGallery.isPrivate ? 'Galerie Privée' : 'Galerie Publique'}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400">Client : <span className="text-white font-semibold">{selectedGallery.clientName}</span> • Catégorie : <span className="text-amber-400 uppercase font-mono">{selectedGallery.category}</span></p>
              <div className="text-xs text-zinc-400 flex items-center space-x-3 font-mono">
                <span>Clé d'Accès : <code className="text-amber-400 font-bold bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800">{selectedGallery.accessKey}</code></span>
                {selectedGallery.password && <span>Mot de Passe : <code className="text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-800">{selectedGallery.password}</code></span>}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingGallery(selectedGallery);
                setIsGalleryModalOpen(true);
              }}
              className="space-x-1.5 border-zinc-800 text-xs"
            >
              <Edit3 className="h-3.5 w-3.5 text-amber-400" />
              <span>Modifier la Galerie</span>
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={() => setIsAlbumModalOpen(true)}
              className="space-x-1.5 font-bold text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nouveau Sous-Album</span>
            </Button>
          </div>
        </div>

        {/* Albums Filter Tabs with Public/Privé Toggle Controls */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span>Sous-Albums ({selectedGallery.albums.length})</span>
            <span className="text-zinc-500 font-mono text-[11px]">Cliquez sur le cadenas d'un album pour le passer en Public ou Privé</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedAlbumFilter('all')}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  selectedAlbumFilter === 'all'
                    ? 'border-amber-400 bg-amber-400/20 text-amber-400 font-bold'
                    : 'border-zinc-800 glass-panel text-zinc-400 hover:text-white'
                }`}
              >
                Toutes les Photos ({selectedGallery.photos.length})
              </button>

              {(selectedGallery.albums || []).map((alb) => {
                const albumCount = selectedGallery.photos.filter((p) => p.albumId === alb.id).length;
                return (
                  <div key={alb.id} className="inline-flex items-center space-x-1">
                    <button
                      onClick={() => setSelectedAlbumFilter(alb.id)}
                      className={`px-4 py-2.5 rounded-l-xl text-xs font-semibold border-y border-l transition-all cursor-pointer flex items-center space-x-2 ${
                        selectedAlbumFilter === alb.id
                          ? 'border-amber-400 bg-amber-400/20 text-amber-400 font-bold'
                          : 'border-zinc-800 glass-panel text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>📁 {alb.name} ({albumCount})</span>
                    </button>

                    {/* Quick Toggle Public/Private Album Button */}
                    <button
                      onClick={() => handleToggleAlbumPrivacy(alb.id)}
                      title={alb.isPrivate ? 'Album Privé Verrouillé - S’afficherait uniquement dans l’Espace Client' : 'Album Public - Visible dans le Portfolio Public'}
                      className={`px-2.5 py-2.5 rounded-r-xl border text-xs font-bold transition-all cursor-pointer ${
                        alb.isPrivate
                          ? 'border-amber-400/50 bg-amber-400/10 text-amber-400 hover:bg-amber-400 hover:text-zinc-950'
                          : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950'
                      }`}
                    >
                      {alb.isPrivate ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-3 top-3 text-zinc-500" />
              <Input
                placeholder="Rechercher une photo..."
                value={searchPhotoQuery}
                onChange={(e) => setSearchPhotoQuery(e.target.value)}
                className="pl-9 h-10 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Drag & Drop Multi-Uploader for Selected Gallery */}
        <div className="p-6 rounded-2xl border-2 border-dashed border-amber-400/40 bg-zinc-950/60 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">Uploader des Photos HD dans "{selectedGallery.title}"</h4>
            <p className="text-xs text-zinc-400">
              Déposez vos clichés HD (JPEG/PNG/RAW). Traitement WebP & Filigranage automatique.
            </p>
          </div>

          <div>
            <label className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-amber-400 text-zinc-950 font-bold text-xs cursor-pointer hover:bg-amber-300 transition-all shadow-md shadow-amber-400/20">
              <UploadCloud className="h-4 w-4 mr-2" />
              Sélectionner & Uploader des Photos
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleMultiPhotoUpload}
              />
            </label>
          </div>

          {uploading && (
            <div className="max-w-md mx-auto space-y-2 pt-2">
              <div className="flex justify-between text-xs text-amber-400 font-semibold">
                <span>Traitement WebP & Synchronisation...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {!uploading && uploadError && (
            <p className="text-xs text-red-400 max-w-md mx-auto pt-2">{uploadError}</p>
          )}
        </div>

        {/* Photo Grid with Interactive Actions */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
            <span>Affichage de {filteredPhotos.length} photo(s)</span>
            <span className="text-amber-400/80">Les photos des albums publics sont affichées sur le Portfolio public</span>
          </div>

          {filteredPhotos.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-500 text-xs">
              Aucune photo trouvée dans cette sélection. Téléversez vos premiers clichés ci-dessus.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredPhotos.map((photo) => {
                const parentAlb = selectedGallery.albums.find((a) => a.id === photo.albumId);
                const isPhotoLocked = parentAlb?.isPrivate ?? photo.isPrivate ?? selectedGallery.isPrivate;

                return (
                  <div
                    key={photo.id}
                    className="group relative rounded-2xl overflow-hidden glass-panel border border-zinc-800 aspect-[4/3] flex flex-col justify-end"
                  >
                    <img
                      src={photo.url}
                      alt={photo.title}
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop';
                      }}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                      <div className="flex items-center space-x-1.5">
                        {photo.isCover && (
                          <Badge variant="gold" className="text-[10px] uppercase font-mono font-bold">
                            ★ Couverture
                          </Badge>
                        )}
                        {photo.isFavorite && (
                          <Badge variant="success" className="text-[10px] uppercase font-mono">
                            ♥ Favori Client
                          </Badge>
                        )}
                      </div>

                      {/* Public vs Private Badge */}
                      <Badge variant={isPhotoLocked ? 'gold' : 'success'} className="text-[10px]">
                        {isPhotoLocked ? <Lock className="h-3 w-3 mr-1 inline" /> : <Globe className="h-3 w-3 mr-1 inline" />}
                        {isPhotoLocked ? 'Privé' : 'Public'}
                      </Badge>
                    </div>

                    {/* Hover Overlay with Edit Actions */}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-between z-20">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleToggleFavorite(photo.id)}
                          title={photo.isFavorite ? 'Retirer des favoris client' : 'Marquer comme favori client'}
                          className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            photo.isFavorite ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-900/80 text-zinc-300 hover:text-amber-400'
                          }`}
                        >
                          <Star className="h-4 w-4 fill-current" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingPhoto(photo);
                            setIsPhotoEditModalOpen(true);
                          }}
                          title="Modifier le titre, l'album et la catégorie"
                          className="h-8 w-8 rounded-xl bg-zinc-900/80 text-zinc-300 hover:text-amber-400 flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          title="Supprimer la photo"
                          className="h-8 w-8 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs uppercase font-mono text-amber-400 tracking-wider">
                          {photo.albumName || 'Album Général'}
                        </div>
                        <h4 className="text-sm font-bold text-white line-clamp-1">{photo.title}</h4>

                        {!photo.isCover && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetAsCover(photo)}
                            className="w-full text-[11px] border-amber-400/40 text-amber-400 hover:bg-amber-400 hover:text-zinc-950 font-bold"
                          >
                            Définir comme Couverture
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
      </>
      )}

      {/* Modal 1: Create / Edit Gallery */}
      {isGalleryModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="glass-panel border-amber-400/50 gold-border-glow w-full max-w-lg p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <FolderPlus className="h-5 w-5 text-amber-400 mr-2" />
                {editingGallery.id ? 'Modifier la Galerie' : 'Créer une Nouvelle Galerie'}
              </h3>
              <button onClick={() => setIsGalleryModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGallery} className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1 font-semibold">Titre de la Galerie *</label>
                <Input
                  required
                  placeholder="Ex: Mariage Sophie & Alexandre"
                  value={editingGallery.title || ''}
                  onChange={(e) => setEditingGallery({ ...editingGallery, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Nom du Client</label>
                  <Input
                    placeholder="Ex: Sophie Dupont"
                    value={editingGallery.clientName || ''}
                    onChange={(e) => setEditingGallery({ ...editingGallery, clientName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Catégorie</label>
                  <select
                    value={editingGallery.category || 'mariage'}
                    onChange={(e) => setEditingGallery({ ...editingGallery, category: e.target.value })}
                    className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100"
                  >
                    <option value="mariage">Mariage</option>
                    <option value="portrait">Portrait</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">Galerie Privée Sécurisée</div>
                    <div className="text-zinc-400 text-[11px]">Nécessite une clé d'accès pour déverrouiller.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingGallery.isPrivate ?? true}
                    onChange={(e) => setEditingGallery({ ...editingGallery, isPrivate: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-amber-400 focus:ring-amber-400 cursor-pointer"
                  />
                </div>

                {editingGallery.isPrivate && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
                    <div>
                      <label className="text-zinc-400 block mb-1 font-semibold">Clé d'Accès Personnalisée</label>
                      <Input
                        value={editingGallery.accessKey || ''}
                        onChange={(e) => setEditingGallery({ ...editingGallery, accessKey: e.target.value.toUpperCase() })}
                        className="uppercase font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-zinc-400 block mb-1 font-semibold">Mot de Passe Confidentiel</label>
                      <Input
                        type="text"
                        placeholder="Optionnel"
                        value={editingGallery.password || ''}
                        onChange={(e) => setEditingGallery({ ...editingGallery, password: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-semibold">URL de la Photo de Couverture</label>
                <Input
                  value={editingGallery.coverUrl || ''}
                  onChange={(e) => setEditingGallery({ ...editingGallery, coverUrl: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsGalleryModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="gold" size="sm" className="font-bold">
                  Enregistrer la Galerie
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal 2: Create New Album with Public / Privé Choice */}
      {isAlbumModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="glass-panel border-amber-400/50 gold-border-glow w-full max-w-md p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Layers className="h-5 w-5 text-amber-400 mr-2" /> Créer un Sous-Album (Public ou Privé)
              </h3>
              <button onClick={() => setIsAlbumModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddAlbum} className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1 font-semibold">Nom du Sous-Album *</label>
                <Input
                  required
                  placeholder="Ex: Préparatifs, Cérémonie, Cocktail, Valse..."
                  value={newAlbumForm.name}
                  onChange={(e) => setNewAlbumForm({ ...newAlbumForm, name: e.target.value })}
                />
              </div>

              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white flex items-center space-x-1.5">
                      {newAlbumForm.isPrivate ? <Lock className="h-4 w-4 text-amber-400" /> : <Globe className="h-4 w-4 text-emerald-400" />}
                      <span>{newAlbumForm.isPrivate ? 'Album Privé Verrouillé' : 'Album Public Visible Tous'}</span>
                    </div>
                    <div className="text-zinc-400 text-[11px] mt-0.5">
                      {newAlbumForm.isPrivate
                        ? 'Masqué du portfolio public. Accession uniquement via Espace Client.'
                        : 'Affiché directement sur la page Portfolio publique.'}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={newAlbumForm.isPrivate}
                    onChange={(e) => setNewAlbumForm({ ...newAlbumForm, isPrivate: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-amber-400 focus:ring-amber-400 cursor-pointer"
                  />
                </div>

                {newAlbumForm.isPrivate && (
                  <div className="pt-2 border-t border-zinc-800">
                    <label className="text-zinc-400 block mb-1 font-semibold">Mot de Passe d'Album (Optionnel)</label>
                    <Input
                      placeholder="Ex: Secret2026!"
                      value={newAlbumForm.password}
                      onChange={(e) => setNewAlbumForm({ ...newAlbumForm, password: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAlbumModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="gold" size="sm" className="font-bold">
                  Créer l'Album
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal 3: Edit Single Photo Metadata */}
      {isPhotoEditModalOpen && editingPhoto && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="glass-panel border-amber-400/50 gold-border-glow w-full max-w-lg p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Edit3 className="h-5 w-5 text-amber-400 mr-2" /> Personnaliser la Photo
              </h3>
              <button onClick={() => setIsPhotoEditModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePhotoDetails} className="space-y-4 text-xs">
              <div className="flex items-center space-x-4 p-3 rounded-xl border border-zinc-800 bg-zinc-950">
                <img src={editingPhoto.url} alt={editingPhoto.title} className="h-16 w-20 object-cover rounded-lg" />
                <div className="space-y-1">
                  <div className="font-bold text-white">{editingPhoto.title}</div>
                  <div className="text-[11px] text-zinc-400">ID: {editingPhoto.id}</div>
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1 font-semibold">Titre de la Photo *</label>
                <Input
                  value={editingPhoto.title}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Catégorie du Portfolio</label>
                  <select
                    value={editingPhoto.cat || 'mariage'}
                    onChange={(e) => setEditingPhoto({ ...editingPhoto, cat: e.target.value })}
                    className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100"
                  >
                    <option value="mariage">Mariage</option>
                    <option value="portrait">Portrait</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1 font-semibold">Sous-Album Rattaché</label>
                  <select
                    value={editingPhoto.albumId || ''}
                    onChange={(e) => {
                      const albObj = (selectedGallery.albums || []).find((a) => a.id === e.target.value);
                      setEditingPhoto({
                        ...editingPhoto,
                        albumId: e.target.value,
                        albumName: albObj?.name || 'Général',
                      });
                    }}
                    className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100"
                  >
                    {(selectedGallery.albums || []).map((alb) => (
                      <option key={alb.id} value={alb.id}>
                        {alb.name} {alb.isPrivate ? '(Privé 🔒)' : '(Public 🌍)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsPhotoEditModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="gold" size="sm" className="font-bold">
                  Enregistrer les Modifications
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
