'use client';

import React, { useRef, useState } from 'react';
import {
  CalendarClock,
  Car,
  Hotel,
  Bus,
  Gift,
  Baby,
  Hash,
  Church,
  PartyPopper,
  Upload,
  Download,
  Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { InvitationPracticalInfo } from '@/lib/invitation-types';
import type { ElectronicInvitation } from '@/lib/invitation-types';
import {
  mergeGuestNames,
  parseGuestListCsv,
  downloadGuestListTemplate,
} from '@/lib/invitation-guest-list-csv';
import { importInvitedGuestListCsv } from '@/lib/admin-invitations-api';
import { getApiErrorMessage } from '@/lib/api-error';

interface InvitationPracticalFieldsProps {
  value: InvitationPracticalInfo;
  onChange: (value: InvitationPracticalInfo) => void;
  phoneRequired: boolean;
  onPhoneRequiredChange: (v: boolean) => void;
  invitationId?: string;
  onServerImported?: (invitation: ElectronicInvitation) => void;
  onToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function InvitationPracticalFields({
  value,
  onChange,
  phoneRequired,
  onPhoneRequiredChange,
  invitationId,
  onServerImported,
  onToast,
}: InvitationPracticalFieldsProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const patch = (partial: Partial<InvitationPracticalInfo>) => onChange({ ...value, ...partial });

  const applyImportedNames = (imported: string[], replace: boolean) => {
    const existing = value.invitedGuestNames || [];
    const merged = replace ? mergeGuestNames([], imported) : mergeGuestNames(existing, imported);
    patch({
      invitedGuestNames: merged,
      restrictRsvpToGuestList: true,
    });
    return merged.length;
  };

  const handleFile = async (file: File, replace: boolean) => {
    if (!file) return;
    setImporting(true);
    try {
      if (invitationId) {
        const result = await importInvitedGuestListCsv(invitationId, file, {
          merge: !replace,
          enableRestrict: true,
        });
        const practical = result.data.customization?.practicalInfo;
        if (practical) {
          onChange(normalizePracticalFromServer(practical, value));
        }
        onServerImported?.(result.data);
        onToast?.(result.message, 'success');
        return;
      }

      const text = await file.text();
      const imported = parseGuestListCsv(text);
      if (!imported.length) {
        onToast?.('Aucun nom trouvé dans le CSV.', 'error');
        return;
      }
      const total = applyImportedNames(imported, replace);
      onToast?.(`${imported.length} nom(s) importé(s) — ${total} invité(s) au total. Enregistrez pour appliquer.`, 'success');
    } catch (err: unknown) {
      onToast?.(getApiErrorMessage(err, 'Import CSV impossible.'), 'error');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-surface-muted/60 p-4 space-y-4">
        <p className="text-zinc-200 font-medium text-sm">Paramètres RSVP</p>
        <Field
          icon={CalendarClock}
          label="Date limite de réponse"
          type="date"
          value={value.rsvpDeadline || ''}
          onChange={(v) => patch({ rsvpDeadline: v })}
          hint="Après cette date, le formulaire de confirmation sera automatiquement désactivé."
        />
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={phoneRequired}
            onChange={(e) => onPhoneRequiredChange(e.target.checked)}
            className="accent-amber-400"
          />
          Téléphone obligatoire lors de la confirmation de présence
        </label>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <label className="text-muted-foreground text-xs">
              Liste des invités autorisés ({value.invitedGuestNames?.length || 0})
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[10px] border-border"
                onClick={() => downloadGuestListTemplate()}
              >
                <Download className="h-3 w-3 mr-1" /> Modèle CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[10px] border-border"
                disabled={importing}
                onClick={() => fileRef.current?.click()}
              >
                {importing ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3 mr-1" />
                )}
                Importer CSV
              </Button>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file, false);
            }}
          />
          <textarea
            value={(value.invitedGuestNames || []).join('\n')}
            onChange={(e) =>
              patch({
                invitedGuestNames: e.target.value
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean),
              })
            }
            rows={5}
            placeholder={'Sophie Dupont\nAlexandre Marc\nMarie Lambert'}
            className="w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-foreground text-sm resize-y placeholder:text-zinc-600 font-mono"
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer mt-2">
            <input
              type="checkbox"
              checked={Boolean(value.restrictRsvpToGuestList)}
              onChange={(e) => patch({ restrictRsvpToGuestList: e.target.checked })}
              className="accent-amber-400"
            />
            Refuser la confirmation si le nom n&apos;est pas sur la liste
          </label>
          <p className="text-zinc-600 text-[11px] mt-1">
            CSV : colonne « Nom » ou une colonne par ligne. Fusion avec la liste existante.
            {!invitationId && ' Cliquez « Enregistrer » après import.'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-muted/60 p-4 space-y-4">
        <p className="text-zinc-200 font-medium text-sm">Lieux & horaires (optionnel)</p>
        <p className="text-muted-foreground text-xs -mt-2">Pour séparer cérémonie et réception (mariage).</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field
            icon={Church}
            label="Lieu cérémonie"
            value={value.ceremonyVenue || ''}
            onChange={(v) => patch({ ceremonyVenue: v })}
          />
          <Field
            icon={CalendarClock}
            label="Heure cérémonie"
            type="time"
            value={value.ceremonyTime || ''}
            onChange={(v) => patch({ ceremonyTime: v })}
          />
          <Field
            icon={PartyPopper}
            label="Lieu réception"
            value={value.receptionVenue || ''}
            onChange={(v) => patch({ receptionVenue: v })}
          />
          <Field
            icon={CalendarClock}
            label="Heure réception"
            type="time"
            value={value.receptionTime || ''}
            onChange={(v) => patch({ receptionTime: v })}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-muted/60 p-4 space-y-4">
        <p className="text-zinc-200 font-medium text-sm">Informations pratiques pour vos invités</p>
        <Field
          icon={Car}
          label="Parking & accès"
          value={value.parkingInfo || ''}
          onChange={(v) => patch({ parkingInfo: v })}
          multiline
          placeholder="Parking gratuit sur place, voiturier disponible…"
        />
        <Field
          icon={Bus}
          label="Transport & navettes"
          value={value.transportInfo || ''}
          onChange={(v) => patch({ transportInfo: v })}
          multiline
          placeholder="Navette depuis la gare à 18h, covoiturage…"
        />
        <Field
          icon={Hotel}
          label="Hébergement à proximité"
          value={value.accommodationInfo || ''}
          onChange={(v) => patch({ accommodationInfo: v })}
          multiline
          placeholder="Hôtels partenaires, tarifs préférentiels…"
        />
        <Field
          icon={Gift}
          label="Liste de cadeaux / cagnotte"
          value={value.giftRegistry || ''}
          onChange={(v) => patch({ giftRegistry: v })}
          multiline
          placeholder="Lien cagnotte, liste de mariage…"
        />
        <Field
          icon={Baby}
          label="Enfants & accompagnants"
          value={value.childrenPolicy || ''}
          onChange={(v) => patch({ childrenPolicy: v })}
          placeholder="Ex. Enfants bienvenus · Adultes uniquement"
        />
        <Field
          icon={Hash}
          label="Hashtag événement"
          value={value.hashtag || ''}
          onChange={(v) => patch({ hashtag: v })}
          placeholder="#SophieEtAlex2026"
        />
      </div>
    </div>
  );
}

function normalizePracticalFromServer(
  raw: Partial<InvitationPracticalInfo>,
  current: InvitationPracticalInfo
): InvitationPracticalInfo {
  return {
    ...current,
    ...raw,
    invitedGuestNames: Array.isArray(raw.invitedGuestNames)
      ? raw.invitedGuestNames.map((n) => String(n).trim()).filter(Boolean)
      : current.invitedGuestNames,
    restrictRsvpToGuestList: raw.restrictRsvpToGuestList === true,
  };
}

function Field({
  icon: Icon,
  label,
  value,
  onChange,
  type = 'text',
  multiline,
  placeholder,
  hint,
}: {
  icon: typeof Car;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  multiline?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-muted-foreground text-xs block mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-primary/80" />
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-foreground text-sm resize-none placeholder:text-zinc-600"
        />
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-surface-muted text-sm"
        />
      )}
      {hint && <p className="text-zinc-600 text-[11px] mt-1">{hint}</p>}
    </div>
  );
}

export function summarizePracticalInfo(info: InvitationPracticalInfo, phoneRequired: boolean): string {
  const parts: string[] = [];
  if (info.rsvpDeadline) parts.push(`RSVP avant ${info.rsvpDeadline}`);
  if (phoneRequired) parts.push('Tél. obligatoire');
  if (info.restrictRsvpToGuestList && (info.invitedGuestNames?.length || 0) > 0) {
    parts.push(`Liste invités (${info.invitedGuestNames?.length})`);
  }
  if (info.ceremonyVenue) parts.push('Cérémonie');
  if (info.receptionVenue) parts.push('Réception');
  if (info.parkingInfo) parts.push('Parking');
  if (info.accommodationInfo) parts.push('Hébergement');
  if (info.giftRegistry) parts.push('Cadeaux');
  if (info.hashtag) parts.push(info.hashtag);
  return parts.length ? parts.join(' · ') : 'Non renseigné';
}
