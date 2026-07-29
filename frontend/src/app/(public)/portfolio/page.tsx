'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Camera, Sparkles, Filter, Eye, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PhotoLightbox } from '@/components/common/photo-lightbox';
import { useSettings } from '@/context/settings-context';
import { useGalleries } from '@/context/gallery-context';

export default function PortfolioPage() {
  const { settings } = useSettings();
  const { publicPhotos } = useGalleries();

  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Extract unique album names dynamically from public photos
  const dynamicAlbumButtons = useMemo(() => {
    const base = [
      { id: 'all', label: 'Toutes les Galeries' },
      { id: 'mariage', label: 'Mariages' },
      { id: 'portrait', label: 'Portraits' },
      { id: 'corporate', label: 'Corporate' },
    ];
    const albumNames = Array.from(
      new Set(publicPhotos.map((p) => p.albumName).filter((name): name is string => Boolean(name)))
    );
    const customButtons = albumNames.map((name) => ({
      id: name.toLowerCase(),
      label: name,
    }));
    return [...base, ...customButtons];
  }, [publicPhotos]);

  const filtered = useMemo(() => {
    return publicPhotos.filter((p) => {
      const photoCat = (p.cat || 'mariage').toLowerCase();
      const albumName = (p.albumName || '').toLowerCase();
      const filterLower = filter.toLowerCase();

      const matchesCat =
        filter === 'all' ||
        photoCat.includes(filterLower) ||
        albumName.includes(filterLower);
      const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [publicPhotos, filter, search]);

  const handleOpenLightbox = (index: number) => {
    setSelectedPhotoIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="pt-28 pb-20 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="gold">Portfolio Haute Couture</Badge>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Galeries & <span className="gold-gradient-text">Réalisations</span>
        </h1>
        <p className="text-zinc-400 text-base leading-relaxed">
          Chaque cliché est une quête d'esthétisme, de spontanéité et de lumière. Explorez les différents univers de {settings.studioName}.
        </p>
      </div>

      {/* Controls: Search & Category / Album Filter */}
      <div className="glass-panel p-4 rounded-2xl border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute left-3 top-3 text-zinc-500" />
          <Input
            placeholder="Rechercher par titre de projet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {dynamicAlbumButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                filter === btn.id
                  ? 'border-amber-400 bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/20'
                  : 'border-zinc-800 glass-panel text-zinc-300 hover:border-zinc-700'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Photos with Lazy Loading & Live Sync */}
      {(!mounted || filtered.length === 0) ? (
        <div className="text-center py-12 glass-panel rounded-2xl text-zinc-400 text-sm">
          {!mounted ? 'Chargement des réalisations...' : 'Aucun cliché ne correspond à votre recherche pour le moment.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((photo, index) => (
            <div
              key={photo.id}
              onClick={() => handleOpenLightbox(index)}
              className="group relative overflow-hidden rounded-2xl glass-panel aspect-[4/3] cursor-pointer"
            >
              <img
                src={photo.url}
                alt={photo.title}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop';
                }}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-6 flex flex-col justify-end">
                <span className="text-xs uppercase font-mono tracking-widest text-amber-400">
                  {photo.cat || 'mariage'}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">{photo.title}</h3>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Integration */}
      <PhotoLightbox
        photos={filtered}
        currentIndex={selectedPhotoIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(idx) => setSelectedPhotoIndex(idx)}
      />
    </div>
  );
}
