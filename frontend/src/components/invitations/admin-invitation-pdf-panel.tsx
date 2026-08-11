'use client';

import React, { useRef, useState } from 'react';
import { FileText, Loader2, QrCode, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ElectronicInvitation } from '@/lib/invitation-types';
import {
  downloadInvitationPdf,
  uploadInvitationPdfTemplate,
} from '@/lib/admin-invitations-api';
import { invitationPublicUrl, qrCodeImageUrl } from '@/lib/invitation-utils';
import { getApiErrorMessage } from '@/lib/api-error';

type QrPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';

interface AdminInvitationPdfPanelProps {
  invitation: ElectronicInvitation;
  onToast: (message: string, type: 'success' | 'error') => void;
  onUpdated?: (inv: ElectronicInvitation) => void;
}

export function AdminInvitationPdfPanel({
  invitation,
  onToast,
  onUpdated,
}: AdminInvitationPdfPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState<'system' | 'template' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [position, setPosition] = useState<QrPosition>('bottom-right');
  const [saveTemplate, setSaveTemplate] = useState(true);

  if (!invitation.publicToken) return null;

  const publicUrl = invitationPublicUrl(invitation.publicToken);
  const hasSavedTemplate = Boolean(invitation.customization?.pdfTemplateUrl);

  const handleDownload = async (mode: 'system' | 'template') => {
    setDownloading(mode);
    try {
      await downloadInvitationPdf(invitation.id, mode);
      onToast(mode === 'system' ? 'PDF généré' : 'PDF avec QR téléchargé', 'success');
    } catch (err: unknown) {
      onToast(getApiErrorMessage(err, 'Génération PDF impossible.'), 'error');
    } finally {
      setDownloading(null);
    }
  };

  const handleUploadTemplate = async (file: File) => {
    setUploading(true);
    try {
      await uploadInvitationPdfTemplate(invitation.id, file, {
        position,
        save: saveTemplate,
      });
      onToast(
        saveTemplate
          ? 'Modèle enregistré — PDF avec QR code téléchargé'
          : 'PDF avec QR code téléchargé',
        'success'
      );
      if (saveTemplate) {
        onUpdated?.(invitation);
      }
    } catch (err: unknown) {
      onToast(getApiErrorMessage(err, 'Traitement du PDF impossible.'), 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="glass-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-white flex items-center gap-2">
          <FileText className="h-4 w-4 text-amber-400" />
          Invitation imprimable & QR code
        </CardTitle>
        <p className="text-zinc-500 text-xs mt-1">
          QR général vers l&apos;invitation digitale. Chaque invité confirmé reçoit aussi un QR personnel (billet) dans la liste des réponses.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {!invitation.linkActive && (
          <p className="text-xs text-orange-300/90 rounded-md border border-orange-500/30 bg-orange-500/5 px-3 py-2">
            Le lien public est arrêté : exportez le PDF avant de le partager, ou réactivez le lien pour que le QR code fonctionne à nouveau.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="shrink-0 mx-auto sm:mx-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeImageUrl(publicUrl, 160)}
              alt="QR Code"
              className="rounded-lg border border-zinc-800 bg-white p-1"
              width={160}
              height={160}
            />
          </div>
          <div className="flex-1 space-y-3 text-xs text-zinc-400">
            <p>
              <span className="text-zinc-300 font-medium">Option 1 — Générée par le système :</span>
              <br />
              PDF A4 avec les informations de l&apos;événement et le QR code intégré.
            </p>
            <Button
              size="sm"
              variant="gold"
              type="button"
              disabled={downloading !== null}
              onClick={() => void handleDownload('system')}
            >
              {downloading === 'system' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <QrCode className="h-4 w-4 mr-1" />
              )}
              Télécharger l&apos;invitation PDF
            </Button>

            <p className="pt-2 border-t border-zinc-800">
              <span className="text-zinc-300 font-medium">Option 2 — Votre modèle PDF :</span>
              <br />
              Téléversez votre fichier (Canva, Illustrator…). Le système y ajoute le QR code.
            </p>

            <div className="grid sm:grid-cols-2 gap-2">
              <label className="text-zinc-500 block">
                Position du QR
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as QrPosition)}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-white text-xs"
                >
                  <option value="bottom-right">Bas droite</option>
                  <option value="bottom-left">Bas gauche</option>
                  <option value="top-right">Haut droite</option>
                  <option value="top-left">Haut gauche</option>
                  <option value="center">Centre</option>
                </select>
              </label>
              <label className="flex items-end gap-2 text-zinc-500 pb-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveTemplate}
                  onChange={(e) => setSaveTemplate(e.target.checked)}
                  className="accent-amber-400"
                />
                Enregistrer le modèle pour régénérer plus tard
              </label>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUploadTemplate(f);
                e.target.value = '';
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                type="button"
                disabled={uploading || downloading !== null}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Upload className="h-4 w-4 mr-1" />
                )}
                Téléverser un PDF + QR
              </Button>
              {hasSavedTemplate && (
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  disabled={downloading !== null}
                  onClick={() => void handleDownload('template')}
                >
                  {downloading === 'template' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <FileText className="h-4 w-4 mr-1" />
                  )}
                  Régénérer depuis le modèle
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
