'use client';

import { Download, X, Archive, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PrivateGalleryDownloadPanelProps {
  open: boolean;
  mode: 'zip' | 'single' | null;
  progress: number;
  total: number;
  message: string;
  onClose: () => void;
}

export function PrivateGalleryDownloadPanel({
  open,
  mode,
  progress,
  total,
  message,
  onClose,
}: PrivateGalleryDownloadPanelProps) {
  if (!open) return null;

  const pct = total > 0 ? Math.round((progress / total) * 100) : mode === 'zip' ? 50 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-surface-muted/80 -sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface-muted p-6 space-y-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary-muted flex items-center justify-center text-primary">
              {mode === 'zip' ? <Archive className="h-5 w-5" /> : <Download className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {mode === 'zip' ? 'Préparation du ZIP HD' : 'Téléchargement en cours'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{message || 'Veuillez patienter…'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-muted transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300 ease-out"
              style={{ width: `${Math.max(pct, mode === 'zip' && progress === 0 ? 8 : 0)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
            <span>{mode === 'zip' ? 'Archive HD' : `${progress}/${total || '—'}`}</span>
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              {pct}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PrivateGalleryDownloadActionsProps {
  downloading: boolean;
  photoCount: number;
  onDownloadZip: () => void;
  onDownloadSingle: () => void;
}

export function PrivateGalleryDownloadActions({
  downloading,
  photoCount,
  onDownloadZip,
  onDownloadSingle,
}: PrivateGalleryDownloadActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 shrink-0">
      <Button variant="primary" size="sm" onClick={onDownloadZip} disabled={downloading || photoCount === 0}>
        <Archive className="h-4 w-4 mr-1" />
        ZIP HD
      </Button>
      <Button variant="outline" size="sm" onClick={onDownloadSingle} disabled={downloading || photoCount === 0}>
        <Download className="h-4 w-4 mr-1" />
        Une par une
      </Button>
    </div>
  );
}
