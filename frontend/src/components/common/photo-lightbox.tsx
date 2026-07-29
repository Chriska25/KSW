'use client';

import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/context/settings-context';
import { buildWatermarkLabel, watermarkPositionClass } from '@/lib/watermark-text';

interface PhotoItem {
  id: string;
  url: string;
  title: string;
  exif?: {
    camera?: string;
    lens?: string;
    focalLength?: string;
    iso?: number;
    aperture?: string;
  };
  isFavorite?: boolean;
}

interface PhotoLightboxProps {
  photos: PhotoItem[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onToggleFavorite?: (id: string) => void;
}

export function PhotoLightbox({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  onToggleFavorite,
}: PhotoLightboxProps) {
  const { settings } = useSettings();
  const watermarkLabel = buildWatermarkLabel(settings);
  const watermarkPos = watermarkPositionClass(settings.watermarkPosition);
  const watermarkOpacity = Math.max(0.2, Math.min(1, (settings.watermarkOpacity || 40) / 100));

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) onNavigate(currentIndex + 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos.length, onClose, onNavigate]);

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex] || photos[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <Badge variant="gold" className="text-xs">
            {currentIndex + 1} / {photos.length}
          </Badge>
          <span className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
            {currentPhoto.title}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {onToggleFavorite && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleFavorite(currentPhoto.id)}
              className="text-zinc-300 hover:text-amber-400"
            >
              <Heart
                className={`h-5 w-5 ${
                  currentPhoto.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                }`}
              />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="h-6 w-6" />
          </Button>
        </div>
      </div>

      <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
        {currentIndex > 0 && (
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            className="absolute left-2 sm:left-4 z-20 p-3 rounded-full glass-panel text-white hover:text-amber-400 hover:border-amber-400 transition-all cursor-pointer"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {currentIndex < photos.length - 1 && (
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            className="absolute right-2 sm:right-4 z-20 p-3 rounded-full glass-panel text-white hover:text-amber-400 hover:border-amber-400 transition-all cursor-pointer"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        <div className="relative max-h-full max-w-full flex items-center justify-center">
          <img
            src={currentPhoto.url}
            alt={currentPhoto.title}
            className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl transition-all duration-300"
          />

          <div
            className={`absolute ${watermarkPos} text-[10px] font-mono tracking-widest text-white uppercase bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm select-none pointer-events-none whitespace-nowrap`}
            style={{ opacity: watermarkOpacity }}
          >
            {watermarkLabel}
          </div>
        </div>
      </div>

      {currentPhoto.exif && (
        <div className="glass-panel rounded-xl p-3 max-w-xl mx-auto flex items-center justify-center space-x-6 text-xs text-zinc-400 border-zinc-800">
          <div className="flex items-center space-x-1.5">
            <Camera className="h-3.5 w-3.5 text-amber-400" />
            <span>{currentPhoto.exif.camera || 'Canon EOS R5'}</span>
          </div>
          <div>{currentPhoto.exif.lens || 'RF 85mm F1.2'}</div>
          <div>ISO {currentPhoto.exif.iso || 100}</div>
          <div>{currentPhoto.exif.aperture || 'f/1.2'}</div>
        </div>
      )}
    </div>
  );
}
