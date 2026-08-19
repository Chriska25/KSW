'use client';

import React, { useEffect, useState } from 'react';
import {
  CalendarClock,
  Copy,
  ExternalLink,
  Link2,
  Link2Off,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { ElectronicInvitation } from '@/lib/invitation-types';
import { invitationPublicUrl, invitationWhatsAppShareUrl, formatDisplayDate } from '@/lib/invitation-utils';

interface InvitationLinkControlProps {
  invitation: ElectronicInvitation;
  onToggleLink: (active: boolean) => void | Promise<void>;
  onCopyLink?: () => void | Promise<void>;
  onUpdateSchedule?: (patch: {
    linkActiveFrom?: string | null;
    linkActiveUntil?: string | null;
  }) => void | Promise<void>;
  compact?: boolean;
}

function scheduleLabel(invitation: ElectronicInvitation): string | null {
  const status = invitation.linkScheduleStatus;
  if (status === 'expired' && invitation.linkActiveUntil) {
    return `Expiré le ${formatDisplayDate(invitation.linkActiveUntil)}`;
  }
  if (status === 'scheduled' && invitation.linkActiveFrom) {
    return `Actif à partir du ${formatDisplayDate(invitation.linkActiveFrom)}`;
  }
  if (invitation.linkActiveUntil) {
    return `Actif jusqu'au ${formatDisplayDate(invitation.linkActiveUntil)}`;
  }
  if (invitation.linkActiveFrom) {
    return `À partir du ${formatDisplayDate(invitation.linkActiveFrom)}`;
  }
  return null;
}

export function InvitationLinkControl({
  invitation,
  onToggleLink,
  onCopyLink,
  onUpdateSchedule,
  compact = false,
}: InvitationLinkControlProps) {
  const [activeFrom, setActiveFrom] = useState(invitation.linkActiveFrom || '');
  const [activeUntil, setActiveUntil] = useState(invitation.linkActiveUntil || '');
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    setActiveFrom(invitation.linkActiveFrom || '');
    setActiveUntil(invitation.linkActiveUntil || '');
  }, [invitation.linkActiveFrom, invitation.linkActiveUntil]);

  if (!invitation.publicToken) return null;

  const publicUrl = invitationPublicUrl(invitation.publicToken);
  const linkEffective = invitation.linkEffectiveActive ?? Boolean(invitation.linkActive);
  const scheduleText = scheduleLabel(invitation);

  const handleStop = () => {
    const ok = window.confirm(
      'Arrêter le lien public ?\n\nLes invités ne pourront plus ouvrir l\'invitation en ligne ni envoyer de RSVP. Vous pourrez toujours exporter le PDF, le QR code et la liste CSV des réponses.'
    );
    if (ok) void onToggleLink(false);
  };

  const handleSaveSchedule = async () => {
    if (!onUpdateSchedule) return;
    setSavingSchedule(true);
    try {
      await onUpdateSchedule({
        linkActiveFrom: activeFrom.trim() || null,
        linkActiveUntil: activeUntil.trim() || null,
      });
    } finally {
      setSavingSchedule(false);
    }
  };

  const statusBadge = () => {
    if (invitation.linkScheduleStatus === 'expired') {
      return <Badge variant="warning" className="text-[10px]">Expiré</Badge>;
    }
    if (invitation.linkScheduleStatus === 'scheduled') {
      return <Badge variant="outline" className="text-[10px]">Programmé</Badge>;
    }
    if (linkEffective) {
      return <Badge variant="success" className="text-[10px]">Actif</Badge>;
    }
    return <Badge variant="warning" className="text-[10px]">Arrêté</Badge>;
  };

  return (
    <div
      className={`rounded-lg border ${
        linkEffective ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-orange-500/30 bg-orange-500/5'
      } ${compact ? 'p-3 space-y-2' : 'p-4 space-y-3'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {linkEffective ? (
            <Link2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <Link2Off className="h-4 w-4 text-orange-400 shrink-0" />
          )}
          <span className="text-sm text-foreground font-medium">Lien public</span>
          {statusBadge()}
        </div>
        <Button
          size="sm"
          variant={invitation.linkActive ? 'outline' : 'gold'}
          type="button"
          onClick={invitation.linkActive ? handleStop : () => void onToggleLink(true)}
          className={invitation.linkActive ? 'text-orange-300 border-orange-500/40 hover:bg-orange-500/10' : undefined}
        >
          {invitation.linkActive ? (
            <>
              <Link2Off className="h-4 w-4 mr-1" />
              Arrêter le lien
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4 mr-1" />
              Réactiver le lien
            </>
          )}
        </Button>
      </div>

      {!compact && (
        <p className="text-xs text-muted-foreground">
          {scheduleText ||
            (linkEffective
              ? 'Le lien et le QR code sont accessibles aux invités. Programmez une date de fin pour l\'arrêt automatique.'
              : 'Le lien est coupé : plus d\'accès en ligne ni de nouveaux RSVP. L\'export PDF, QR et CSV reste disponible.')}
        </p>
      )}

      {onUpdateSchedule && !compact && (
        <div className="rounded-md border border-border bg-surface-muted/50 p-3 space-y-3">
          <div className="flex items-center gap-2 text-xs text-foreground font-medium">
            <CalendarClock className="h-3.5 w-3.5 text-primary" />
            Validité automatique du lien
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-xs text-muted-foreground">
              Actif à partir du
              <Input
                type="date"
                value={activeFrom}
                onChange={(e) => setActiveFrom(e.target.value)}
                className="mt-1 bg-surface-muted"
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Actif jusqu&apos;au (arrêt auto)
              <Input
                type="date"
                value={activeUntil}
                onChange={(e) => setActiveUntil(e.target.value)}
                className="mt-1 bg-surface-muted"
              />
            </label>
          </div>
          <p className="text-[11px] text-zinc-600">
            Après la date de fin, le lien se coupe automatiquement. Laissez vide pour une validité manuelle uniquement.
          </p>
          <Button
            size="sm"
            variant="outline"
            type="button"
            disabled={savingSchedule}
            onClick={() => void handleSaveSchedule()}
          >
            {savingSchedule ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                Enregistrement…
              </>
            ) : (
              'Enregistrer les dates'
            )}
          </Button>
        </div>
      )}

      <div className="p-2.5 rounded-md bg-surface-muted/80 border border-border font-mono text-[11px] text-primary break-all">
        {publicUrl}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" type="button" onClick={() => void onCopyLink?.()}>
          <Copy className="h-3.5 w-3.5 mr-1" /> Copier
        </Button>
        <a href={invitationWhatsAppShareUrl(publicUrl, invitation.organizerNames)} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline" type="button">
            <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
          </Button>
        </a>
        {linkEffective && (
          <a href={publicUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" type="button">
              <ExternalLink className="h-3.5 w-3.5 mr-1" /> Ouvrir
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
