'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  UploadCloud,
  FolderPlus,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Lock,
  Globe,
  Plus,
  RefreshCw,
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
  RotateCcw,
  FileText,
  User,
  Link2,
  Loader2,
  Mail,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useGalleries, GalleryAdminItem, AlbumItem, PhotoItem } from '@/context/gallery-context';
import apiClient, { API_WRITE_TIMEOUT_MS } from '@/lib/api-client';
import { galleryAccessUrl } from '@/lib/gallery-access-path';
import { useAdminToast } from '@/components/admin/admin-toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { LoadingState } from '@/components/common/loading-state';
import { EmptyState } from '@/components/common/empty-state';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import {
  applyAlbumTrashToGallery,
  applyPhotoTrashToGallery,
  formatTrashDate,
  getActiveAlbums,
  getTrashedAlbums,
  getTrashedPhotos,
  isPhotoVisibleInGallery,
} from '@/lib/gallery-album-utils';
import {
  getActiveGalleries,
  getTrashedGalleries,
  permanentlyDeleteGalleryFromList,
  restoreGalleryInList,
  trashGalleryInList,
} from '@/lib/gallery-trash-utils';
import { fetchAdminBookings, fetchRegisteredClients, sendGalleryAccessEmail, type ApiBooking } from '@/lib/admin-crm-api';
import {
  buildGalleryBookingMaps,
  filterAlbumsByQuery,
  filterGalleriesByQuery,
  getAlbumSearchMatchIds,
  getGalleryBookingMeta,
} from '@/lib/gallery-search-utils';

export default function AdminGaleriesPage() {
  const searchParams = useSearchParams();
  const linkedGalleryId = searchParams.get('galleryId');
  const { toast } = useAdminToast();
  const { galleries, updateGalleries, setGalleries } = useGalleries();

  const [galleriesLoading, setGalleriesLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [sendingGalleryAccess, setSendingGalleryAccess] = React.useState(false);
  const [registeredClients, setRegisteredClients] = React.useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = React.useRef<{ next: GalleryAdminItem[]; successMsg?: string } | null>(null);

  const flushGallerySave = React.useCallback(async () => {
    const pending = pendingSaveRef.current;
    if (!pending) return;
    pendingSaveRef.current = null;
    setIsSaving(true);
    try {
      await updateGalleries(pending.next, { skipPublicCache: true });
      if (pending.successMsg) toast(pending.successMsg, 'success');
    } catch (err) {
      toast(getApiErrorMessage(err, 'Erreur lors de la sauvegarde des galeries.'), 'error');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [updateGalleries, toast]);

  const persistGalleries = React.useCallback(
    (next: GalleryAdminItem[], successMsg?: string, options?: { immediate?: boolean }) => {
      setGalleries(next);
      pendingSaveRef.current = { next, successMsg };
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      if (options?.immediate) {
        return flushGallerySave();
      }

      saveTimerRef.current = setTimeout(() => {
        void flushGallerySave();
      }, 800);
    },
    [setGalleries, flushGallerySave]
  );

  React.useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (pendingSaveRef.current) {
        void updateGalleries(pendingSaveRef.current.next, { skipPublicCache: true });
      }
    };
  }, [updateGalleries]);

  const handleCopyGalleryLink = async (key: string) => {
    try {
      await navigator.clipboard.writeText(galleryAccessUrl(key));
      setCopiedLink(true);
      toast('Lien d\'accès copié', 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast('Impossible de copier le lien', 'error');
    }
  };

  const handleSendGalleryAccess = async (gallery: GalleryAdminItem) => {
    setSendingGalleryAccess(true);
    try {
      const data = await sendGalleryAccessEmail(gallery.id);
      if (data?.password && data.password !== gallery.password) {
        persistGalleries(
          galleries.map((g) =>
            g.id === gallery.id
              ? { ...g, password: data.password, accessKey: data.accessKey || g.accessKey }
              : g
          ),
          undefined,
          { immediate: true }
        );
      }
      const target = gallery.clientEmail || 'le client';
      toast(`Clé et mot de passe envoyés à ${target}`, 'success');
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Envoi email impossible.'), 'error');
    } finally {
      setSendingGalleryAccess(false);
    }
  };

  const [selectedGalleryId, setSelectedGalleryId] = useState<string>(() => linkedGalleryId || '1');
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [selectedAlbumFilter, setSelectedAlbumFilter] = useState<string>('all');
  const [searchGalleryQuery, setSearchGalleryQuery] = useState<string>('');
  const [searchAlbumQuery, setSearchAlbumQuery] = useState<string>('');
  const [searchPhotoQuery, setSearchPhotoQuery] = useState<string>('');
  const [bookings, setBookings] = useState<ApiBooking[]>([]);

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
  const [showTrashPanel, setShowTrashPanel] = useState(false);
  const [showPhotoTrashPanel, setShowPhotoTrashPanel] = useState(false);
  const [showGalleryTrashPanel, setShowGalleryTrashPanel] = useState(false);
  const [generatingThumbs, setGeneratingThumbs] = useState(false);

  React.useEffect(() => {
    const loadAdminGalleries = async () => {
      setGalleriesLoading(true);
      setLoadError(null);
      try {
        const res = await apiClient.get(`/admin/galleries?t=${Date.now()}`);
        if (Array.isArray(res.data?.data)) {
          setGalleries(res.data.data);
          const active = getActiveGalleries(res.data.data);
          const preferredId =
            linkedGalleryId && active.some((g: GalleryAdminItem) => g.id === linkedGalleryId)
              ? linkedGalleryId
              : active[0]?.id;
          if (preferredId) {
            setSelectedGalleryId(preferredId);
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
  }, [setGalleries, linkedGalleryId]);

  React.useEffect(() => {
    fetchRegisteredClients()
      .then(setRegisteredClients)
      .catch(() => setRegisteredClients([]));
  }, []);

  React.useEffect(() => {
    fetchAdminBookings()
      .then(setBookings)
      .catch(() => setBookings([]));
  }, []);

  const activeGalleries = getActiveGalleries(galleries);
  const trashedGalleries = getTrashedGalleries(galleries);
  const bookingMaps = useMemo(() => buildGalleryBookingMaps(bookings), [bookings]);
  const filteredActiveGalleries = useMemo(
    () => filterGalleriesByQuery(galleries, searchGalleryQuery, bookingMaps),
    [galleries, searchGalleryQuery, bookingMaps]
  );

  React.useEffect(() => {
    if (!linkedGalleryId) return;
    if (activeGalleries.some((g) => g.id === linkedGalleryId)) {
      setSelectedGalleryId(linkedGalleryId);
    }
  }, [linkedGalleryId, activeGalleries]);

  React.useEffect(() => {
    if (!linkedGalleryId) return;
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      setMobileDetailOpen(true);
    }
  }, [linkedGalleryId]);

  const openNewGalleryModal = () => {
    setEditingGallery({ isPrivate: true, category: 'mariage' });
    setIsGalleryModalOpen(true);
  };

  React.useEffect(() => {
    if (filteredActiveGalleries.length === 0) return;
    if (!filteredActiveGalleries.some((g) => g.id === selectedGalleryId)) {
      setSelectedGalleryId(filteredActiveGalleries[0].id);
      setSelectedAlbumFilter('all');
      setSearchAlbumQuery('');
    }
  }, [filteredActiveGalleries, selectedGalleryId]);

  const selectedGallery =
    filteredActiveGalleries.find((g) => g.id === selectedGalleryId) ||
    filteredActiveGalleries[0] ||
    activeGalleries.find((g) => g.id === selectedGalleryId) ||
    activeGalleries[0];
  const selectedGalleryMeta = selectedGallery
    ? getGalleryBookingMeta(selectedGallery, bookingMaps)
    : undefined;
  const activeAlbums = getActiveAlbums(selectedGallery?.albums || []);
  const filteredAlbums = useMemo(
    () => filterAlbumsByQuery(activeAlbums, searchAlbumQuery),
    [activeAlbums, searchAlbumQuery]
  );
  const trashedAlbums = getTrashedAlbums(selectedGallery?.albums || []);
  const trashedPhotos = getTrashedPhotos(selectedGallery?.photos || []);
  const albumSearchMatchIds = useMemo(
    () => getAlbumSearchMatchIds(activeAlbums, searchAlbumQuery),
    [activeAlbums, searchAlbumQuery]
  );


  if (galleriesLoading) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto animate-pulse">
        <div className="space-y-2">
          <div className="h-9 w-72 rounded-lg bg-surface-muted" />
          <div className="h-4 w-full max-w-2xl rounded bg-surface-muted" />
        </div>
        <div className="flex flex-col lg:flex-row gap-5 min-h-[calc(100dvh-10rem)]">
          <aside className="w-full lg:w-72 space-y-3">
            <div className="h-10 rounded-lg bg-surface-muted" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-surface-muted" />
            ))}
          </aside>
          <div className="flex-1 min-h-[420px] rounded-xl bg-surface-muted" />
        </div>
      </div>
    );
  }

  // Filtering photos in current gallery (hors albums en corbeille)
  const filteredPhotos = (selectedGallery?.photos || []).filter((p) => {
    if (selectedGallery && !isPhotoVisibleInGallery(selectedGallery, p)) return false;

    const matchesAlbumFilter =
      selectedAlbumFilter === 'all' || p.albumId === selectedAlbumFilter;

    const matchesAlbumSearch =
      !albumSearchMatchIds ||
      selectedAlbumFilter !== 'all' ||
      (p.albumId ? albumSearchMatchIds.has(p.albumId) : true);

    const matchesPhotoSearch = p.title.toLowerCase().includes(searchPhotoQuery.toLowerCase());

    return matchesAlbumFilter && matchesAlbumSearch && matchesPhotoSearch;
  });

  const totalVisiblePhotos = (selectedGallery?.photos || []).filter(
    (p) => selectedGallery && isPhotoVisibleInGallery(selectedGallery, p)
  ).length;

  // Toggle Album Privacy (Public <-> Privé)
  const handleToggleAlbumPrivacy = async (albumId: string) => {
    if (!selectedGallery) return;
    const album = selectedGallery.albums.find((item) => item.id === albumId);
    if (!album) return;
    const nextPrivate = !(album.isPrivate === true);

    const updated = galleries.map((g) => {
      if (g.id !== selectedGallery.id) return g;
      const updatedAlbums = g.albums.map((alb) =>
        alb.id === albumId ? { ...alb, isPrivate: nextPrivate } : alb
      );
      return { ...g, albums: updatedAlbums };
    });
      persistGalleries(
        updated,
        nextPrivate ? 'Album passé en privé' : 'Album passé en public'
      );
  };

  const handleTrashAlbum = async (albumId: string) => {
    if (!selectedGallery) return;
    if (activeAlbums.length <= 1) {
      toast('Impossible de supprimer le dernier album actif de la galerie.', 'error');
      return;
    }
    const album = selectedGallery.albums.find((item) => item.id === albumId);
    if (!album) return;
    if (!window.confirm(`Mettre l'album « ${album.name} » dans la corbeille ?`)) return;

    const updated = applyAlbumTrashToGallery(galleries, selectedGallery.id, albumId, 'trash');
    if (selectedAlbumFilter === albumId) {
      setSelectedAlbumFilter('all');
    }
    setShowTrashPanel(true);
    try {
      persistGalleries(updated, 'Album déplacé dans la corbeille');
    } catch {
      // toast affiché
    }
  };

  const handleRestoreAlbum = async (albumId: string) => {
    if (!selectedGallery) return;
    const updated = applyAlbumTrashToGallery(galleries, selectedGallery.id, albumId, 'restore');
    try {
      persistGalleries(updated, 'Album restauré');
    } catch {
      // toast affiché
    }
  };

  const handlePermanentDeleteAlbum = async (albumId: string) => {
    if (!selectedGallery) return;
    const album = selectedGallery.albums.find((item) => item.id === albumId);
    if (!album) return;
    const photoCount = selectedGallery.photos.filter((p) => p.albumId === albumId).length;
    if (
      !window.confirm(
        `Supprimer définitivement « ${album.name} » ?${
          photoCount > 0
            ? ` Les ${photoCount} photo(s) seront déplacées vers un autre album.`
            : ''
        }`
      )
    ) {
      return;
    }

    const updated = applyAlbumTrashToGallery(galleries, selectedGallery.id, albumId, 'delete');
    try {
      persistGalleries(updated, 'Album supprimé définitivement', { immediate: true });
    } catch {
      // toast affiché
    }
  };

  const handleTrashGallery = async () => {
    if (!selectedGallery) return;
    if (activeGalleries.length <= 1) {
      toast('Impossible de supprimer la dernière galerie active.', 'error');
      return;
    }
    if (
      !window.confirm(
        `Mettre la galerie « ${selectedGallery.title} » dans la corbeille ? Elle sera masquée du portfolio et de l'espace client.`
      )
    ) {
      return;
    }

    const updated = trashGalleryInList(galleries, selectedGallery.id);
    const nextActive = getActiveGalleries(updated);
    if (nextActive[0]?.id) {
      setSelectedGalleryId(nextActive[0].id);
    }
    setShowGalleryTrashPanel(true);
    try {
      persistGalleries(updated, 'Galerie déplacée dans la corbeille');
    } catch {
      // toast affiché
    }
  };

  const handleRestoreGallery = async (galleryId: string) => {
    const updated = restoreGalleryInList(galleries, galleryId);
    setSelectedGalleryId(galleryId);
    try {
      persistGalleries(updated, 'Galerie restaurée');
    } catch {
      // toast affiché
    }
  };

  const handlePermanentDeleteGallery = async (galleryId: string) => {
    const gallery = galleries.find((g) => g.id === galleryId);
    if (!gallery) return;
    const photoCount = gallery.photos?.length || 0;
    if (
      !window.confirm(
        `Supprimer définitivement « ${gallery.title} » ?${
          photoCount > 0 ? ` ${photoCount} photo(s) seront perdues.` : ''
        }`
      )
    ) {
      return;
    }

    const updated = permanentlyDeleteGalleryFromList(galleries, galleryId);
    const nextActive = getActiveGalleries(updated);
    if (nextActive[0]?.id) {
      setSelectedGalleryId(nextActive[0].id);
    }
    try {
      persistGalleries(updated, 'Galerie supprimée définitivement', { immediate: true });
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
      persistGalleries(updated, 'Photos restaurées');
    } catch {
      // toast affiché
    }
  };

  const handleGenerateThumbnails = async () => {
    setGeneratingThumbs(true);
    try {
      const res = await apiClient.post('/admin/galleries/generate-thumbnails', {}, {
        timeout: API_WRITE_TIMEOUT_MS,
      });
      const stats = res.data?.stats;
      const msg =
        res.data?.message ||
        `${stats?.generated ?? 0} miniature(s) générée(s)`;
      toast(msg, 'success');

      const refresh = await apiClient.get(`/admin/galleries?t=${Date.now()}`);
      if (Array.isArray(refresh.data?.data)) {
        setGalleries(refresh.data.data);
      }
    } catch (err) {
      toast(getApiErrorMessage(err, 'Impossible de générer les miniatures.'), 'error');
    } finally {
      setGeneratingThumbs(false);
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
    const successes: { file: File; url: string; hdUrl?: string; originalUrl?: string; thumbUrl?: string }[] = [];

    for (let idx = 0; idx < uploadedFiles.length; idx++) {
      const file = uploadedFiles[idx];
      setUploadProgress(Math.round(10 + ((idx + 1) / uploadedFiles.length) * 80));
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiClient.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: API_WRITE_TIMEOUT_MS,
        });
        if (res.data?.url) {
          successes.push({
            file,
            url: res.data.url,
            hdUrl: res.data.hdUrl || res.data.url,
            originalUrl: res.data.originalUrl || undefined,
            thumbUrl: res.data.thumbUrl || undefined,
          });
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

    const fallbackAlbum = activeAlbums[0];
    const targetAlbum =
      selectedAlbumFilter !== 'all'
        ? activeAlbums.find((a) => a.id === selectedAlbumFilter)
        : fallbackAlbum;
    const isAlbPrivate = targetAlbum ? targetAlbum.isPrivate ?? false : false;

    const newPhotos: PhotoItem[] = successes.map(({ file, url, hdUrl, originalUrl, thumbUrl }, idx) => ({
      id: `p-new-${Date.now()}-${idx}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      cat: selectedGallery.category || 'mariage',
      url,
      hdUrl: hdUrl || url,
      originalUrl,
      thumbUrl,
      watermarked: true,
      albumId: targetAlbum?.id || fallbackAlbum?.id,
      albumName: targetAlbum?.name || fallbackAlbum?.name || 'Général',
      isFavorite: false,
      isCover: false,
      isPrivate: isAlbPrivate,
      exif: { camera: 'Canon EOS R5', lens: 'RF 85mm F1.2', iso: 100, aperture: 'f/1.4' },
    }));

    const updated = galleries.map((g) =>
      g.id === selectedGallery.id ? { ...g, photos: [...g.photos, ...newPhotos] } : g
    );

    try {
      persistGalleries(
        updated,
        `${successes.length} photo(s) téléversée(s)${failures.length ? ` — ${failures.length} échec(s)` : ''}`,
        { immediate: true }
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
        persistGalleries(updated, 'Galerie mise à jour', { immediate: true });
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
        persistGalleries([...galleries, newG], 'Galerie créée', { immediate: true });
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
      persistGalleries(updated, 'Album créé', { immediate: true });
    } catch {
      return;
    }

    setNewAlbumForm({ name: '', isPrivate: false, password: '' });
    setIsAlbumModalOpen(false);
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!selectedGallery) return;
    const photo = selectedGallery.photos.find((p) => p.id === photoId);
    if (!photo) return;
    if (!window.confirm(`Mettre « ${photo.title} » dans la corbeille ?`)) return;

    const updated = applyPhotoTrashToGallery(galleries, selectedGallery.id, photoId, 'trash');
    setShowPhotoTrashPanel(true);
    try {
      persistGalleries(updated, 'Photo déplacée dans la corbeille');
    } catch {
      // toast affiché
    }
  };

  const handleRestorePhoto = async (photoId: string) => {
    if (!selectedGallery) return;
    const updated = applyPhotoTrashToGallery(galleries, selectedGallery.id, photoId, 'restore');
    try {
      persistGalleries(updated, 'Photo restaurée');
    } catch {
      // toast affiché
    }
  };

  const handlePermanentDeletePhoto = async (photoId: string) => {
    if (!selectedGallery) return;
    const photo = selectedGallery.photos.find((p) => p.id === photoId);
    if (!photo) return;
    if (!window.confirm(`Supprimer définitivement « ${photo.title} » ?`)) return;

    const updated = applyPhotoTrashToGallery(galleries, selectedGallery.id, photoId, 'delete');
    try {
      persistGalleries(updated, 'Photo supprimée définitivement', { immediate: true });
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
      persistGalleries(updated, 'Couverture mise à jour');
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
      persistGalleries(updated);
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
      persistGalleries(updated, 'Photo mise à jour');
    } catch {
      return;
    }

    setIsPhotoEditModalOpen(false);
    setEditingPhoto(null);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {isSaving && (
        <div className="sticky top-0 z-30 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary-muted px-4 py-2 text-xs text-primary">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          Sauvegarde en cours…
        </div>
      )}
      <AdminPageHeader
        title="Gestionnaire de"
        accent="Galeries & Albums (Public/Privé)"
        description="Créer des galeries, des sous-albums publics ou verrouillés en privé, uploader et synchroniser."
        actions={
          <>
            {selectedGallery && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={generatingThumbs}
                  onClick={handleGenerateThumbnails}
                  className="space-x-1.5 border-border text-foreground hover:bg-muted text-xs font-semibold inline-flex"
                >
                  {generatingThumbs ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                  <span>{generatingThumbs ? 'Génération…' : 'Générer miniatures'}</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRestoreBrokenPhotos}
                  className="space-x-1.5 border-border text-primary hover:bg-primary-muted text-xs font-semibold hidden md:inline-flex"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Restaurer les Photos</span>
                </Button>
              </>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={openNewGalleryModal}
              className="space-x-2 font-semibold"
            >
              <FolderPlus className="h-4 w-4" />
              <span>Nouvelle Galerie</span>
            </Button>
          </>
        }
      />

      {!selectedGallery ? (
        <div className="space-y-4">
          {loadError && (
            <p className="text-sm text-danger rounded-lg border border-danger/30 bg-danger-muted px-4 py-3">{loadError}</p>
          )}
          <EmptyState
            title={
              trashedGalleries.length > 0
                ? 'Galeries en corbeille'
                : 'Aucune galerie pour le moment'
            }
            description={
              trashedGalleries.length > 0
                ? 'Toutes les galeries sont dans la corbeille. Restaurez-en une ou créez une nouvelle galerie.'
                : 'Créez votre première galerie pour commencer à organiser albums et photos.'
            }
            actionLabel="Nouvelle galerie"
            onAction={openNewGalleryModal}
          />
          {trashedGalleries.length > 0 && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGalleryTrashPanel(true)}
                className="space-x-1.5 text-danger hover:bg-danger-muted"
              >
                <Trash2 className="h-4 w-4" />
                <span>Corbeille galeries ({trashedGalleries.length})</span>
              </Button>
            </div>
          )}
        </div>
      ) : (
      <>
      {/* Workspace : liste galeries | albums + photos */}
      <div className="flex flex-col lg:flex-row gap-5 min-h-[calc(100dvh-10rem)]">
        {/* Colonne gauche — navigateur de galeries */}
        <aside className={`${mobileDetailOpen ? 'hidden lg:flex' : 'flex'} w-full lg:w-72 shrink-0 flex-col gap-3`}>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Galerie, client, clé, facture…"
              value={searchGalleryQuery}
              onChange={(e) => setSearchGalleryQuery(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>
          <p className="text-[10px] text-muted-foreground px-1">
            Nom, client, clé d&apos;accès, n° facture, réf. réservation
          </p>

          <Button
            variant="outline"
            size="sm"
            disabled={generatingThumbs}
            onClick={handleGenerateThumbnails}
            className="w-full space-x-1.5 border-border text-foreground hover:bg-muted text-xs font-semibold"
          >
            {generatingThumbs ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
            <span>{generatingThumbs ? 'Génération…' : 'Générer miniatures'}</span>
          </Button>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[50vh] sm:max-h-[420px] lg:max-h-[calc(100dvh-14rem)] pr-1 custom-scrollbar">
            {filteredActiveGalleries.length === 0 ? (
              <div className="rounded-xl border border-border bg-surface-muted p-4 text-center text-xs text-muted-foreground">
                Aucune galerie ne correspond à « {searchGalleryQuery} »
              </div>
            ) : (
              filteredActiveGalleries.map((gal) => {
                const meta = getGalleryBookingMeta(gal, bookingMaps);
                const isSelected = selectedGallery?.id === gal.id;
                return (
                  <button
                    key={gal.id}
                    type="button"
                    onClick={() => {
                      setSelectedGalleryId(gal.id);
                      setSelectedAlbumFilter('all');
                      setSearchAlbumQuery('');
                      if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
                        setMobileDetailOpen(true);
                      }
                    }}
                    className={`w-full text-left rounded-xl border p-3 flex gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary-muted'
                        : 'border-border bg-surface hover:border-primary/40'
                    }`}
                  >
                    <img
                      src={gal.coverUrl}
                      alt={gal.title}
                      className="h-14 w-[4.5rem] object-cover rounded-lg border border-border shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {gal.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                        <User className="h-3 w-3 shrink-0" />
                        {gal.clientName}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <code className="text-[9px] font-mono text-primary/90 bg-surface-muted px-1.5 py-0.5 rounded border border-border">
                          {gal.accessKey}
                        </code>
                        {meta?.invoiceNumber && (
                          <span className="text-[9px] font-mono text-muted-foreground flex items-center gap-0.5">
                            <FileText className="h-2.5 w-2.5" />
                            {meta.invoiceNumber}
                          </span>
                        )}
                        {gal.isPrivate ? (
                          <Lock className="h-3 w-3 text-primary" />
                        ) : (
                          <Globe className="h-3 w-3 text-emerald-400" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground/80 mt-1">{gal.photos.length} photo(s)</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Corbeille galeries — toujours accessible */}
          <div className="border-t border-border pt-3 space-y-2">
            <button
              type="button"
              onClick={() => setShowGalleryTrashPanel((open) => !open)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                showGalleryTrashPanel
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                  : 'border-border text-muted-foreground hover:border-border hover:text-rose-400'
              }`}
            >
              <span className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Corbeille galeries
              </span>
              {trashedGalleries.length > 0 && (
                <Badge variant="warning" className="text-[10px]">{trashedGalleries.length}</Badge>
              )}
            </button>

            {showGalleryTrashPanel && (
              <div className="rounded-xl border border-border bg-surface-muted p-3 space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Galeries masquées du portfolio et de l&apos;espace client.
                </p>
                {trashedGalleries.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/80 text-center py-3">Corbeille vide</p>
                ) : (
                  trashedGalleries.map((gal) => (
                    <div
                      key={gal.id}
                      className="rounded-lg border border-border bg-surface-muted p-2.5 space-y-2"
                    >
                      <div className="flex gap-2 min-w-0">
                        <img
                          src={gal.coverUrl}
                          alt={gal.title}
                          className="h-10 w-12 object-cover rounded-md border border-border shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-foreground truncate">{gal.title}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">
                            {gal.photos.length} photo(s) • {formatTrashDate(gal.deletedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] flex-1"
                          onClick={() => handleRestoreGallery(gal.id)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Restaurer
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] text-rose-400 flex-1"
                          onClick={() => handlePermanentDeleteGallery(gal.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Suppr.
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Colonne droite — contenu galerie sélectionnée */}
        <div className={`flex-1 min-w-0 ${!mobileDetailOpen ? 'hidden lg:block' : ''}`}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="lg:hidden text-muted-foreground -ml-2 mb-3"
            onClick={() => setMobileDetailOpen(false)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Retour aux galeries
          </Button>
      <Card className="border-primary/30 overflow-hidden h-full flex flex-col">
        {/* En-tête galerie compact */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 border-b border-border bg-surface-muted/80">
          <div className="flex items-center gap-4 min-w-0">
            <img
              src={selectedGallery.coverUrl}
              alt={selectedGallery.title}
              className="h-16 w-22 object-cover rounded-xl border border-primary/40 shrink-0"
            />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-extrabold text-foreground truncate">{selectedGallery.title}</h2>
                <Badge variant={selectedGallery.isPrivate ? 'gold' : 'success'} className="text-[10px]">
                  {selectedGallery.isPrivate ? 'Privée' : 'Publique'}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {selectedGallery.clientName} • <span className="text-primary uppercase font-mono">{selectedGallery.category}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Key className="h-3 w-3 text-primary" />
                  {selectedGallery.accessKey}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary"
                  onClick={() => handleCopyGalleryLink(selectedGallery.accessKey)}
                >
                  {copiedLink ? (
                    <Check className="h-3 w-3 mr-1" />
                  ) : (
                    <Link2 className="h-3 w-3 mr-1" />
                  )}
                  {copiedLink ? 'Copié' : 'Copier le lien'}
                </Button>
                {selectedGalleryMeta?.invoiceNumber && (
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {selectedGalleryMeta.invoiceNumber}
                  </span>
                )}
                {selectedGalleryMeta?.reference && (
                  <span>Rés. {selectedGalleryMeta.reference}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {selectedGallery.isPrivate && (
              <Button
                variant="primary"
                size="sm"
                disabled={sendingGalleryAccess}
                onClick={() => handleSendGalleryAccess(selectedGallery)}
                className="text-xs font-bold"
              >
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                {sendingGalleryAccess ? 'Envoi…' : 'Envoyer clé par email'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingGallery(selectedGallery);
                setIsGalleryModalOpen(true);
              }}
              className="text-xs border-border"
            >
              <Edit3 className="h-3.5 w-3.5 text-primary mr-1.5" />
              Modifier
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTrashGallery}
              title="Mettre la galerie dans la corbeille"
              className="text-xs border-border text-muted-foreground hover:text-rose-400 hover:border-rose-500/40"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Mettre en corbeille
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsAlbumModalOpen(true)} className="text-xs font-bold">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Album
            </Button>
          </div>
        </div>

        {/* Split albums | photos */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,280px)_1fr] flex-1 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* Panneau albums */}
          <div className="flex flex-col min-h-0 bg-surface-muted/60">
            <div className="p-4 space-y-3 border-b border-border/80">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Albums ({activeAlbums.length})
                </h3>
                {trashedAlbums.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowTrashPanel((open) => !open)}
                    className="text-[10px] text-muted-foreground hover:text-rose-400 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    {trashedAlbums.length}
                  </button>
                )}
              </div>
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Album, mot de passe…"
                  value={searchAlbumQuery}
                  onChange={(e) => setSearchAlbumQuery(e.target.value)}
                  className="pl-8 h-9 text-[11px]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[45vh] sm:max-h-[320px] lg:max-h-[calc(100dvh-20rem)] custom-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedAlbumFilter('all')}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center justify-between ${
                  selectedAlbumFilter === 'all'
                    ? 'border-primary bg-primary-muted text-primary'
                    : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span>Toutes les photos</span>
                <span className="text-[10px] font-mono opacity-70">{totalVisiblePhotos}</span>
              </button>

              {filteredAlbums.length === 0 ? (
                <p className="text-[11px] text-muted-foreground/80 text-center py-4">Aucun album trouvé</p>
              ) : (
                filteredAlbums.map((alb) => {
                  const albumCount = (selectedGallery.photos || []).filter(
                    (p) => p.albumId === alb.id && isPhotoVisibleInGallery(selectedGallery, p)
                  ).length;
                  const isActive = selectedAlbumFilter === alb.id;
                  return (
                    <div
                      key={alb.id}
                      className={`rounded-xl border transition-all ${
                        isActive ? 'border-primary/50 bg-primary-muted' : 'border-border/80'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedAlbumFilter(alb.id)}
                        className="w-full text-left px-3 py-2.5 flex items-start justify-between gap-2 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>
                            {alb.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{albumCount} photo(s)</p>
                        </div>
                        {alb.isPrivate ? (
                          <Lock className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        ) : (
                          <Globe className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        )}
                      </button>
                      <div className="flex border-t border-border/80">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleAlbumPrivacy(alb.id);
                          }}
                          title={alb.isPrivate ? 'Passer en public' : 'Passer en privé'}
                          className={`flex-1 py-1.5 text-[10px] font-semibold transition-colors cursor-pointer ${
                            alb.isPrivate
                              ? 'text-primary hover:bg-primary-muted'
                              : 'text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          {alb.isPrivate ? 'Privé → Public' : 'Public → Privé'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTrashAlbum(alb.id);
                          }}
                          title="Corbeille"
                          className="flex-1 py-1.5 text-[10px] text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer border-l border-border/80"
                        >
                          Suppr.
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-border p-3 space-y-2">
              <button
                type="button"
                onClick={() => setShowTrashPanel((open) => !open)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-[10px] font-semibold transition-all cursor-pointer ${
                  showTrashPanel
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                    : 'border-border text-muted-foreground hover:text-rose-400'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Trash2 className="h-3 w-3" />
                  Corbeille albums
                </span>
                {trashedAlbums.length > 0 && (
                  <Badge variant="warning" className="text-[9px]">{trashedAlbums.length}</Badge>
                )}
              </button>
              {showTrashPanel && (
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {trashedAlbums.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground/80 text-center py-2">Corbeille vide</p>
                  ) : (
                    trashedAlbums.map((album) => (
                      <div key={album.id} className="rounded-lg border border-border bg-surface-muted px-2.5 py-2 space-y-1.5">
                        <p className="text-[11px] font-semibold text-foreground truncate">{album.name}</p>
                        <p className="text-[9px] text-muted-foreground/80">{formatTrashDate(album.deletedAt)}</p>
                        <div className="flex gap-1">
                          <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] flex-1" onClick={() => handleRestoreAlbum(album.id)}>
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Restaurer
                          </Button>
                          <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] text-rose-400 flex-1" onClick={() => handlePermanentDeleteAlbum(album.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Panneau photos */}
          <div className="flex flex-col min-h-0 min-w-0">
            <div className="p-4 border-b border-border/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher une photo…"
                    value={searchPhotoQuery}
                    onChange={(e) => setSearchPhotoQuery(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowPhotoTrashPanel((open) => !open)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                      showPhotoTrashPanel
                        ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                        : 'border-border text-muted-foreground hover:text-rose-400 hover:border-rose-500/30'
                    }`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Corbeille photos
                    {trashedPhotos.length > 0 && (
                      <Badge variant="warning" className="text-[9px] ml-0.5">{trashedPhotos.length}</Badge>
                    )}
                  </button>
                  <span className="text-[11px] text-muted-foreground">
                    {filteredPhotos.length} / {totalVisiblePhotos}
                  </span>
                </div>
              </div>

              {showPhotoTrashPanel && (
                <div className="rounded-xl border border-rose-500/20 bg-surface-muted p-3 space-y-3">
                  <p className="text-[10px] text-muted-foreground">
                    Photos supprimées — restaurez-les ou supprimez-les définitivement.
                  </p>
                  {trashedPhotos.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/80 text-center py-4">Aucune photo en corbeille</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto custom-scrollbar">
                      {trashedPhotos.map((photo) => (
                        <div key={photo.id} className="rounded-lg border border-border bg-surface-muted overflow-hidden">
                          <div className="relative aspect-[4/3]">
                            <img src={photo.url} alt={photo.title} className="absolute inset-0 w-full h-full object-cover opacity-70" />
                          </div>
                          <div className="p-2 space-y-1.5">
                            <p className="text-[10px] font-semibold text-foreground truncate">{photo.title}</p>
                            <p className="text-[9px] text-muted-foreground/80">{formatTrashDate(photo.deletedAt)}</p>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 text-[9px] flex-1 px-1"
                                onClick={() => handleRestorePhoto(photo.id)}
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[9px] text-rose-400 flex-1 px-1"
                                onClick={() => handlePermanentDeletePhoto(photo.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Uploader compact */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-xl border border-dashed border-primary/30 bg-surface-muted">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-primary-muted text-primary flex items-center justify-center shrink-0">
                    <UploadCloud className="h-4 w-4" />
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Glisser-déposer ou sélectionner — WebP & filigrane auto
                  </p>
                </div>
                <label className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-caption cursor-pointer hover:bg-primary/90 transition-colors shrink-0">
                  <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
                  Uploader
                  <input type="file" multiple accept="image/*" className="hidden" onChange={handleMultiPhotoUpload} />
                </label>
              </div>

              {uploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-primary font-semibold">
                    <span>Traitement…</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
              {!uploading && uploadError && (
                <p className="text-[11px] text-red-400">{uploadError}</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 max-h-[520px] lg:max-h-[calc(100vh-20rem)] custom-scrollbar">
              {filteredPhotos.length === 0 ? (
                <div className="p-10 text-center rounded-xl border border-border bg-surface-muted text-muted-foreground text-xs">
                  Aucune photo dans cette sélection.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredPhotos.map((photo) => {
                const parentAlb = selectedGallery.albums.find((a) => a.id === photo.albumId);
                const isPhotoLocked = parentAlb?.isPrivate ?? photo.isPrivate ?? selectedGallery.isPrivate;

                return (
                  <div
                    key={photo.id}
                    className="group relative rounded-lg overflow-hidden border border-border bg-surface aspect-[4/3] flex flex-col justify-end"
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
                          <Badge variant="primary" className="text-[10px] uppercase font-mono font-bold">
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
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-between z-20">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleToggleFavorite(photo.id)}
                          title={photo.isFavorite ? 'Retirer des favoris client' : 'Marquer comme favori client'}
                          className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            photo.isFavorite ? 'bg-primary text-primary-foreground' : 'bg-surface-elevated text-muted-foreground hover:text-primary'
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
                          className="h-8 w-8 rounded-xl bg-surface-muted text-foreground hover:text-primary flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePhoto(photo.id)}
                          title="Mettre dans la corbeille"
                          className="h-8 w-8 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-primary-foreground flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs uppercase font-mono text-primary tracking-wider">
                          {photo.albumName || 'Album Général'}
                        </div>
                        <h4 className="text-sm font-bold text-foreground line-clamp-1">{photo.title}</h4>

                        {!photo.isCover && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetAsCover(photo)}
                            className="w-full text-caption border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground font-semibold"
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
          </div>
        </div>
      </Card>
        </div>
      </div>
      </>
      )}

      {/* Modal 1: Create / Edit Gallery */}
      {isGalleryModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4">
          <Card className="surface-elevated border-primary/50 w-full max-w-lg p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center">
                <FolderPlus className="h-5 w-5 text-primary mr-2" />
                {editingGallery.id ? 'Modifier la Galerie' : 'Créer une Nouvelle Galerie'}
              </h3>
              <button onClick={() => setIsGalleryModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGallery} className="space-y-4 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Titre de la Galerie *</label>
                <Input
                  required
                  placeholder="Ex: Mariage Sophie & Alexandre"
                  value={editingGallery.title || ''}
                  onChange={(e) => setEditingGallery({ ...editingGallery, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Nom du Client</label>
                  <Input
                    placeholder="Ex: Sophie Dupont"
                    value={editingGallery.clientName || ''}
                    onChange={(e) => setEditingGallery({ ...editingGallery, clientName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Catégorie</label>
                  <select
                    value={editingGallery.category || 'mariage'}
                    onChange={(e) => setEditingGallery({ ...editingGallery, category: e.target.value })}
                    className="w-full h-11 rounded-xl border border-border bg-surface px-3 text-xs text-foreground"
                  >
                    <option value="mariage">Mariage</option>
                    <option value="portrait">Portrait</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-foreground">Galerie Privée Sécurisée</div>
                    <div className="text-muted-foreground text-[11px]">Nécessite une clé d'accès pour déverrouiller.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingGallery.isPrivate ?? true}
                    onChange={(e) => setEditingGallery({ ...editingGallery, isPrivate: e.target.checked })}
                    className="h-4 w-4 rounded border-border bg-surface-muted accent-primary focus:ring-primary cursor-pointer"
                  />
                </div>

                {editingGallery.isPrivate && (
                  <div className="space-y-4 pt-2 border-t border-border">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-muted-foreground block mb-1 font-semibold">Client enregistré</label>
                        <select
                          value={editingGallery.clientEmail || ''}
                          onChange={(e) => {
                            const email = e.target.value;
                            const match = registeredClients.find((c) => c.email === email);
                            setEditingGallery({
                              ...editingGallery,
                              clientEmail: email,
                              clientName: match?.name || editingGallery.clientName,
                            });
                          }}
                          className="w-full h-11 rounded-xl border border-border bg-surface px-3 text-xs text-foreground"
                        >
                          <option value="">— Choisir un client du système —</option>
                          {registeredClients.map((client) => (
                            <option key={client.id} value={client.email}>
                              {client.name} ({client.email})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-muted-foreground block mb-1 font-semibold">Email de réception</label>
                        <Input
                          type="email"
                          placeholder="client@email.com"
                          value={editingGallery.clientEmail || ''}
                          onChange={(e) => setEditingGallery({ ...editingGallery, clientEmail: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-muted-foreground block mb-1 font-semibold">Clé d'Accès Personnalisée</label>
                      <Input
                        value={editingGallery.accessKey || ''}
                        onChange={(e) => setEditingGallery({ ...editingGallery, accessKey: e.target.value.toUpperCase() })}
                        className="uppercase font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-muted-foreground block mb-1 font-semibold">Mot de Passe Confidentiel</label>
                      <Input
                        type="text"
                        placeholder={
                          editingGallery.hasPassword && !editingGallery.password
                            ? 'Mot de passe défini — laisser vide pour conserver'
                            : 'Optionnel'
                        }
                        value={editingGallery.password || ''}
                        onChange={(e) => setEditingGallery({ ...editingGallery, password: e.target.value })}
                      />
                    </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">URL de la Photo de Couverture</label>
                <Input
                  value={editingGallery.coverUrl || ''}
                  onChange={(e) => setEditingGallery({ ...editingGallery, coverUrl: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsGalleryModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary" size="sm" className="font-bold">
                  Enregistrer la Galerie
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal 2: Create New Album with Public / Privé Choice */}
      {isAlbumModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4">
          <Card className="surface-elevated border-primary/50 w-full max-w-md p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center">
                <Layers className="h-5 w-5 text-primary mr-2" /> Créer un Sous-Album (Public ou Privé)
              </h3>
              <button onClick={() => setIsAlbumModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddAlbum} className="space-y-4 text-xs">
              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Nom du Sous-Album *</label>
                <Input
                  required
                  placeholder="Ex: Préparatifs, Cérémonie, Cocktail, Valse..."
                  value={newAlbumForm.name}
                  onChange={(e) => setNewAlbumForm({ ...newAlbumForm, name: e.target.value })}
                />
              </div>

              <div className="p-4 rounded-xl border border-border bg-surface space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-foreground flex items-center space-x-1.5">
                      {newAlbumForm.isPrivate ? <Lock className="h-4 w-4 text-primary" /> : <Globe className="h-4 w-4 text-emerald-400" />}
                      <span>{newAlbumForm.isPrivate ? 'Album Privé Verrouillé' : 'Album Public Visible Tous'}</span>
                    </div>
                    <div className="text-muted-foreground text-[11px] mt-0.5">
                      {newAlbumForm.isPrivate
                        ? 'Masqué du portfolio public. Accession uniquement via Espace Client.'
                        : 'Affiché directement sur la page Portfolio publique.'}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={newAlbumForm.isPrivate}
                    onChange={(e) => setNewAlbumForm({ ...newAlbumForm, isPrivate: e.target.checked })}
                    className="h-4 w-4 rounded border-border bg-surface-muted accent-primary focus:ring-primary cursor-pointer"
                  />
                </div>

                {newAlbumForm.isPrivate && (
                  <div className="pt-2 border-t border-border">
                    <label className="text-muted-foreground block mb-1 font-semibold">Mot de Passe d'Album (Optionnel)</label>
                    <Input
                      placeholder="Ex: Secret2026!"
                      value={newAlbumForm.password}
                      onChange={(e) => setNewAlbumForm({ ...newAlbumForm, password: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAlbumModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary" size="sm" className="font-bold">
                  Créer l'Album
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal 3: Edit Single Photo Metadata */}
      {isPhotoEditModalOpen && editingPhoto && (
        <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4">
          <Card className="surface-elevated border-primary/50 w-full max-w-lg p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center">
                <Edit3 className="h-5 w-5 text-primary mr-2" /> Personnaliser la Photo
              </h3>
              <button onClick={() => setIsPhotoEditModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePhotoDetails} className="space-y-4 text-xs">
              <div className="flex items-center space-x-4 p-3 rounded-xl border border-border bg-surface">
                <img src={editingPhoto.url} alt={editingPhoto.title} className="h-16 w-20 object-cover rounded-lg" />
                <div className="space-y-1">
                  <div className="font-bold text-foreground">{editingPhoto.title}</div>
                  <div className="text-[11px] text-muted-foreground">ID: {editingPhoto.id}</div>
                </div>
              </div>

              <div>
                <label className="text-muted-foreground block mb-1 font-semibold">Titre de la Photo *</label>
                <Input
                  value={editingPhoto.title}
                  onChange={(e) => setEditingPhoto({ ...editingPhoto, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Catégorie du Portfolio</label>
                  <select
                    value={editingPhoto.cat || 'mariage'}
                    onChange={(e) => setEditingPhoto({ ...editingPhoto, cat: e.target.value })}
                    className="w-full h-11 rounded-xl border border-border bg-surface px-3 text-xs text-foreground"
                  >
                    <option value="mariage">Mariage</option>
                    <option value="portrait">Portrait</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>

                <div>
                  <label className="text-muted-foreground block mb-1 font-semibold">Sous-Album Rattaché</label>
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
                    className="w-full h-11 rounded-xl border border-border bg-surface px-3 text-xs text-foreground"
                  >
                    {(getActiveAlbums(selectedGallery.albums || []) || []).map((alb) => (
                      <option key={alb.id} value={alb.id}>
                        {alb.name} {alb.isPrivate ? '(Privé 🔒)' : '(Public 🌍)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsPhotoEditModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary" size="sm" className="font-bold">
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
