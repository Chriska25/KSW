'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminModal } from '@/components/admin/admin-modal';
import { computeCropArea, getCroppedImageDataUrl } from '@/lib/crop-image';

interface ImageCropModalProps {
  open: boolean;
  imageSrc: string;
  aspectRatio?: number;
  /** Libellé du format affiché (ex. 16:9). */
  formatHint?: string;
  title?: string;
  onClose: () => void;
  onConfirm: (croppedDataUrl: string) => void;
}

const VIEWPORT_W = 480;
const VIEWPORT_H = 360;

export function ImageCropModal({
  open,
  imageSrc,
  aspectRatio = 4 / 3,
  formatHint,
  title = 'Recadrer l\'image',
  onClose,
  onConfirm,
}: ImageCropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  useEffect(() => {
    if (!open || !imageSrc) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    const img = new Image();
    img.onload = () => setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = imageSrc;
  }, [open, imageSrc]);

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  };

  const onPointerUp = () => setDragging(false);

  const handleConfirm = async () => {
    if (!naturalSize.w) return;
    setProcessing(true);
    try {
      const crop = computeCropArea(
        naturalSize.w,
        naturalSize.h,
        VIEWPORT_W,
        VIEWPORT_H,
        zoom,
        offset.x,
        offset.y,
        aspectRatio
      );
      const result = await getCroppedImageDataUrl(imageSrc, crop, 900);
      onConfirm(result);
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  const cropW = VIEWPORT_W * 0.85;
  const cropH = cropW / aspectRatio;
  const formatLabel =
    formatHint ||
    (Math.abs(aspectRatio - 16 / 9) < 0.02 ? '16:9' : Math.abs(aspectRatio - 4 / 3) < 0.02 ? '4:3' : undefined);

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" variant="gold" onClick={handleConfirm} disabled={processing}>
            <Check className="h-4 w-4 mr-1.5" />
            {processing ? 'Traitement…' : 'Appliquer le recadrage'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-xs text-zinc-400">
          Glissez l&apos;image pour ajuster le cadrage.
          {formatLabel ? (
            <>
              {' '}
              Format recommandé :{' '}
              <span className="text-amber-400 font-semibold">{formatLabel}</span>.
            </>
          ) : null}
        </p>

        <div
          className="relative mx-auto rounded-xl overflow-hidden border border-zinc-700 bg-zinc-950 select-none touch-none"
          style={{ width: VIEWPORT_W, height: VIEWPORT_H, cursor: dragging ? 'grabbing' : 'grab' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {naturalSize.w > 0 && (
            <img
              src={imageSrc}
              alt="Recadrage"
              draggable={false}
              className="absolute max-w-none pointer-events-none"
              style={{
                width: naturalSize.w * Math.max(VIEWPORT_W / naturalSize.w, VIEWPORT_H / naturalSize.h) * zoom,
                height: naturalSize.h * Math.max(VIEWPORT_W / naturalSize.w, VIEWPORT_H / naturalSize.h) * zoom,
                left: '50%',
                top: '50%',
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          )}

          {/* Overlay sombre avec fenêtre de crop */}
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute border-2 border-amber-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
              style={{
                width: cropW,
                height: cropH,
                left: (VIEWPORT_W - cropW) / 2,
                top: (VIEWPORT_H - cropH) / 2,
              }}
            />
            <div className="absolute bottom-2 left-2 text-[10px] font-mono text-amber-400/80 bg-zinc-950/80 px-2 py-0.5 rounded">
              {formatLabel || 'Recadrage'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 px-2">
          <ZoomOut className="h-4 w-4 text-zinc-500 shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-amber-400 h-1.5"
          />
          <ZoomIn className="h-4 w-4 text-zinc-500 shrink-0" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setZoom(1);
              setOffset({ x: 0, y: 0 });
            }}
            className="text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Réinitialiser
          </Button>
        </div>
      </div>
    </AdminModal>
  );
}
