'use client';

import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ImageIcon, Upload, Trash2, Plus, ChevronUp, ChevronDown, Crop } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';
import { ImageCropModal } from '@/components/admin/image-crop-modal';

const HERO_CROP_ASPECT = 16 / 9;

type HeroCropTarget = { mode: 'new' } | { mode: 'edit'; index: number };

interface HeroBannerPhotosFieldsProps {
  images: string[];
  onChange: (urls: string[]) => void;
  pageLabel?: string;
}

export function HeroBannerPhotosFields({ images, onChange, pageLabel = 'la page' }: HeroBannerPhotosFieldsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState('');
  const [cropState, setCropState] = useState<{ src: string; target: HeroCropTarget } | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Veuillez sélectionner une image (PNG, JPG, WebP…).');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCropState({ src: event.target.result as string, target: { mode: 'new' } });
      }
    };
    reader.readAsDataURL(file);
  };

  const openCropForIndex = (index: number) => {
    const src = images[index];
    if (!src) return;
    setCropState({ src, target: { mode: 'edit', index } });
  };

  const handleCropConfirm = async (cropped: string) => {
    if (!cropState) return;

    setUploading(true);
    setUploadError(null);

    try {
      let url = cropped;
      try {
        const res = await apiClient.post('/upload/base64', { image: cropped });
        if (res.data?.url) url = res.data.url as string;
      } catch {
        // Conserver le data URL si l'upload échoue
      }

      if (cropState.target.mode === 'new') {
        onChange([...images, url]);
      } else {
        const next = [...images];
        next[cropState.target.index] = url;
        onChange(next);
      }
      setCropState(null);
    } catch (err: unknown) {
      setUploadError(getApiErrorMessage(err, 'Impossible d\'appliquer le recadrage.'));
    } finally {
      setUploading(false);
    }
  };

  const addUrl = () => {
    const url = urlDraft.trim();
    if (!url) return;
    onChange([...images, url]);
    setUrlDraft('');
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const next = [...images];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <>
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-zinc-200 font-semibold flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-amber-400" /> Photos de bannière
            </p>
            <p className="text-zinc-500 mt-1">
              Téléversez ou ajoutez des URLs pour {pageLabel}. Plusieurs photos = diaporama automatique.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <Button
              type="button"
              variant="gold"
              size="sm"
              disabled={uploading || !!cropState}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1" />
              {uploading ? 'Traitement…' : 'Téléverser & recadrer'}
            </Button>
          </div>
        </div>

        {uploadError && <p className="text-red-400 text-[11px]">{uploadError}</p>}

        {images.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-zinc-700 rounded-xl text-zinc-500">
            Aucune photo — ajoutez-en une pour personnaliser la bannière.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {images.map((url, index) => (
              <div key={`${url}-${index}`} className="flex gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/50">
                <div className="relative h-20 w-28 rounded-lg overflow-hidden border border-zinc-700 shrink-0 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => openCropForIndex(index)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] gap-1 transition-opacity cursor-pointer"
                  >
                    <Crop className="h-3.5 w-3.5" /> Recadrer
                  </button>
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <span className="text-[10px] font-mono text-amber-400/80">
                    {index === 0 ? 'PRINCIPALE' : `PHOTO ${index + 1}`}
                  </span>
                  <Input
                    value={url}
                    onChange={(e) => {
                      const next = [...images];
                      next[index] = e.target.value;
                      onChange(next);
                    }}
                    className="bg-zinc-950 text-[11px] h-9"
                  />
                  <div className="flex flex-wrap gap-1">
                    <Button type="button" variant="outline" size="sm" className="h-7 px-2" onClick={() => openCropForIndex(index)}>
                      <Crop className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      disabled={index === 0}
                      onClick={() => moveImage(index, -1)}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      disabled={index === images.length - 1}
                      onClick={() => moveImage(index, 1)}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-rose-300 border-rose-500/30"
                      onClick={() => removeImage(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://… ou /uploads/…"
            className="bg-zinc-950 flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addUrl();
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={addUrl} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" /> Ajouter une URL
          </Button>
        </div>
      </div>

      {cropState && (
        <ImageCropModal
          open={!!cropState}
          imageSrc={cropState.src}
          aspectRatio={HERO_CROP_ASPECT}
          formatHint="16:9"
          title="Recadrer la photo de bannière"
          onClose={() => setCropState(null)}
          onConfirm={handleCropConfirm}
        />
      )}
    </>
  );
}
