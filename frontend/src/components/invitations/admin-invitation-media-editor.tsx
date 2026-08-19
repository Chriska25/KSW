'use client';

import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadAdminInvitationImage } from '@/lib/admin-invitation-upload';
import { updateAdminInvitation } from '@/lib/admin-invitations-api';
import type { ElectronicInvitation } from '@/lib/invitation-types';
import { resolveAvatarUrl } from '@/lib/profile-api';
import { getApiErrorMessage } from '@/lib/api-error';

interface AdminInvitationMediaEditorProps {
  invitation: ElectronicInvitation;
  onUpdated: (inv: ElectronicInvitation) => void;
  onToast: (message: string, type: 'success' | 'error') => void;
}

export function AdminInvitationMediaEditor({
  invitation,
  onUpdated,
  onToast,
}: AdminInvitationMediaEditorProps) {
  const coverRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<'cover' | 'logo' | 'gallery' | null>(null);

  const persist = async (patch: Partial<ElectronicInvitation>) => {
    const updated = await updateAdminInvitation(invitation.id, patch);
    onUpdated({ ...invitation, ...updated, ...patch });
    onToast('Visuels mis à jour', 'success');
  };

  const uploadAndSet = async (file: File, kind: 'cover' | 'logo' | 'gallery') => {
    setUploading(kind);
    try {
      const url = await uploadAdminInvitationImage(file);
      if (kind === 'cover') await persist({ coverUrl: url });
      else if (kind === 'logo') await persist({ logoUrl: url });
      else {
        const next = [...(invitation.galleryUrls || []), url];
        await persist({ galleryUrls: next });
      }
    } catch (err: unknown) {
      onToast(getApiErrorMessage(err, 'Échec du téléversement.'), 'error');
    } finally {
      setUploading(null);
    }
  };

  const removeGalleryAt = async (index: number) => {
    const next = (invitation.galleryUrls || []).filter((_, i) => i !== index);
    try {
      await persist({ galleryUrls: next });
    } catch (err: unknown) {
      onToast(getApiErrorMessage(err, 'Suppression impossible.'), 'error');
    }
  };

  return (
    <div className="space-y-4 pt-2 border-t border-border">
      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Visuels de l&apos;invitation</p>

      <MediaBlock
        label="Photo de couverture"
        url={invitation.coverUrl}
        uploading={uploading === 'cover'}
        inputRef={coverRef}
        onPick={(f) => uploadAndSet(f, 'cover')}
        onClear={() => void persist({ coverUrl: '' })}
        large
      />

      <MediaBlock
        label="Logo"
        url={invitation.logoUrl}
        uploading={uploading === 'logo'}
        inputRef={logoRef}
        onPick={(f) => uploadAndSet(f, 'logo')}
        onClear={() => void persist({ logoUrl: '' })}
      />

      <div>
        <label className="text-muted-foreground text-xs block mb-2">Galerie photos</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(invitation.galleryUrls || []).map((url, i) => (
            <div key={`${url}-${i}`} className="relative h-14 w-14 rounded-lg overflow-hidden border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveAvatarUrl(url)} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeGalleryAt(i)}
                className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5"
              >
                <X className="h-3 w-3 text-foreground" />
              </button>
            </div>
          ))}
        </div>
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadAndSet(f, 'gallery');
            e.target.value = '';
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading !== null}
          onClick={() => galleryRef.current?.click()}
        >
          {uploading === 'gallery' ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <ImagePlus className="h-4 w-4 mr-1" />
          )}
          Ajouter une photo
        </Button>
      </div>
    </div>
  );
}

function MediaBlock({
  label,
  url,
  uploading,
  inputRef,
  onPick,
  onClear,
  large,
}: {
  label: string;
  url?: string;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file: File) => void;
  onClear: () => void;
  large?: boolean;
}) {
  return (
    <div>
      <label className="text-muted-foreground text-xs block mb-2">{label}</label>
      {url ? (
        <div
          className={`relative ${large ? 'h-36 w-full max-w-md' : 'h-16 w-16'} rounded-xl overflow-hidden border border-border mb-2`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resolveAvatarUrl(url)} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 bg-black/70 rounded-full p-1"
          >
            <X className="h-4 w-4 text-foreground" />
          </button>
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = '';
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ImagePlus className="h-4 w-4 mr-1" />}
        {url ? 'Remplacer' : 'Téléverser'}
      </Button>
    </div>
  );
}
