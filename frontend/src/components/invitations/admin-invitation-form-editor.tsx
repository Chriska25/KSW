'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Save, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateAdminInvitation } from '@/lib/admin-invitations-api';
import type { ElectronicInvitation, InvitationEventType, InvitationProgramItem, InvitationPracticalInfo, InvitationServiceOptions, InvitationTemplateKey } from '@/lib/invitation-types';
import {
  EVENT_TYPE_OPTIONS,
  createDefaultServiceOptions,
  normalizePracticalInfo,
  normalizeServiceOptions,
} from '@/lib/invitation-types';
import { InvitationProgramEditor } from '@/components/invitations/invitation-program-editor';
import { InvitationTemplatePicker } from '@/components/invitations/invitation-template-picker';
import { InvitationPracticalFields } from '@/components/invitations/invitation-practical-fields';
import { InvitationServiceOptionsEditor } from '@/components/invitations/invitation-service-options-editor';
import { getApiErrorMessage } from '@/lib/api-error';

interface AdminInvitationFormEditorProps {
  invitation: ElectronicInvitation;
  onUpdated: (inv: ElectronicInvitation) => void;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface FormState {
  eventType: InvitationEventType;
  organizerNames: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  address: string;
  description: string;
  contact: string;
  dressCode: string;
  extraInfo: string;
  program: InvitationProgramItem[];
  templateKey: InvitationTemplateKey;
  primaryColor: string;
  phoneRequired: boolean;
  practicalInfo: InvitationPracticalInfo;
  serviceOptions: InvitationServiceOptions;
}

function invitationToFormState(inv: ElectronicInvitation): FormState {
  return {
    eventType: inv.eventType,
    organizerNames: inv.organizerNames || '',
    eventDate: inv.eventDate || '',
    eventTime: inv.eventTime || '',
    venue: inv.venue || '',
    address: inv.address || '',
    description: inv.description || '',
    contact: inv.contact || '',
    dressCode: inv.dressCode || '',
    extraInfo: inv.extraInfo || '',
    program: inv.program || [],
    templateKey: inv.templateKey || 'elegant',
    primaryColor: inv.customization?.primaryColor || '',
    phoneRequired: Boolean(inv.phoneRequired),
    practicalInfo: normalizePracticalInfo(inv.customization?.practicalInfo),
    serviceOptions: normalizeServiceOptions(inv.customization?.serviceOptions ?? createDefaultServiceOptions()),
  };
}

function stripEmptyPractical(info: InvitationPracticalInfo): InvitationPracticalInfo | undefined {
  const out: InvitationPracticalInfo = {};
  for (const [key, value] of Object.entries(info)) {
    if (typeof value === 'string' && value.trim()) {
      (out as Record<string, string>)[key as keyof InvitationPracticalInfo] = value.trim();
    } else if (key === 'invitedGuestNames' && Array.isArray(value) && value.length > 0) {
      out.invitedGuestNames = value.map((n) => String(n).trim()).filter(Boolean);
    } else if (key === 'restrictRsvpToGuestList' && value === true) {
      out.restrictRsvpToGuestList = true;
    }
  }
  if (!Object.keys(out).length) return undefined;
  return out;
}

function formStateToPatch(state: FormState): Partial<ElectronicInvitation> {
  const program = state.program.filter((p) => p.label?.trim());
  const practicalInfo = stripEmptyPractical(state.practicalInfo);

  return {
    eventType: state.eventType,
    organizerNames: state.organizerNames.trim(),
    eventDate: state.eventDate,
    eventTime: state.eventTime || undefined,
    venue: state.venue || undefined,
    address: state.address || undefined,
    description: state.description || undefined,
    contact: state.contact || undefined,
    dressCode: state.dressCode || undefined,
    extraInfo: state.extraInfo || undefined,
    program,
    templateKey: state.templateKey,
    phoneRequired: state.phoneRequired,
    customization: {
      serviceOptions: state.serviceOptions,
      ...(practicalInfo ? { practicalInfo } : {}),
      ...(state.primaryColor.trim() ? { primaryColor: state.primaryColor.trim() } : {}),
    },
  };
}

export function AdminInvitationFormEditor({
  invitation,
  onUpdated,
  onToast,
}: AdminInvitationFormEditorProps) {
  const [open, setOpen] = useState(true);
  const [form, setForm] = useState<FormState>(() => invitationToFormState(invitation));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(invitationToFormState(invitation));
    setError('');
  }, [invitation.id, invitation.updatedAt]);

  const patch = (partial: Partial<FormState>) => setForm((prev) => ({ ...prev, ...partial }));

  const handleReset = () => {
    setForm(invitationToFormState(invitation));
    setError('');
    onToast('Modifications annulées', 'info');
  };

  const handleSave = async () => {
    if (!form.organizerNames.trim() || !form.eventDate.trim()) {
      setError('Organisateur(s) et date sont obligatoires.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await updateAdminInvitation(invitation.id, formStateToPatch(form));
      onUpdated({ ...invitation, ...updated });
      onToast('Invitation mise à jour', 'success');
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Enregistrement impossible.');
      setError(msg);
      onToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface-muted/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-muted/50 transition-colors"
      >
        <div>
          <p className="text-foreground font-semibold text-sm">Contenu & formulaire invitation</p>
          <p className="text-muted-foreground text-xs mt-0.5">Modifier textes, programme, options RSVP et infos pratiques.</p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-5 border-t border-border/80 pt-4 text-sm">
          <Section title="Événement">
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Type">
                <select
                  value={form.eventType}
                  onChange={(e) => patch({ eventType: e.target.value as InvitationEventType })}
                  className="w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-foreground text-sm"
                >
                  {EVENT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Organisateur(s) *">
                <Input value={form.organizerNames} onChange={(e) => patch({ organizerNames: e.target.value })} className="bg-surface-muted" />
              </Field>
              <Field label="Date *">
                <Input type="date" value={form.eventDate} onChange={(e) => patch({ eventDate: e.target.value })} className="bg-surface-muted" />
              </Field>
              <Field label="Heure">
                <Input type="time" value={form.eventTime} onChange={(e) => patch({ eventTime: e.target.value })} className="bg-surface-muted" />
              </Field>
              <Field label="Lieu">
                <Input value={form.venue} onChange={(e) => patch({ venue: e.target.value })} className="bg-surface-muted" />
              </Field>
              <Field label="Adresse">
                <Input value={form.address} onChange={(e) => patch({ address: e.target.value })} className="bg-surface-muted" />
              </Field>
            </div>
          </Section>

          <Section title="Programme">
            <InvitationProgramEditor value={form.program} onChange={(program) => patch({ program })} />
          </Section>

          <Section title="Textes & contact">
            <div className="space-y-3">
              <Field label="Message / description">
                <textarea
                  value={form.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-foreground text-sm resize-none"
                />
              </Field>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Contact">
                  <Input value={form.contact} onChange={(e) => patch({ contact: e.target.value })} className="bg-surface-muted" />
                </Field>
                <Field label="Dress code">
                  <Input value={form.dressCode} onChange={(e) => patch({ dressCode: e.target.value })} className="bg-surface-muted" />
                </Field>
              </div>
              <Field label="Informations complémentaires">
                <textarea
                  value={form.extraInfo}
                  onChange={(e) => patch({ extraInfo: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-foreground text-sm resize-none"
                />
              </Field>
            </div>
          </Section>

          <Section title="Style visuel">
            <InvitationTemplatePicker
              value={form.templateKey}
              onChange={(templateKey) => patch({ templateKey })}
              primaryColor={form.primaryColor || '#d4af37'}
              onPrimaryColorChange={(primaryColor) => patch({ primaryColor })}
            />
          </Section>

          <Section title="Infos pratiques & RSVP">
            <InvitationPracticalFields
              invitationId={invitation.id}
              value={form.practicalInfo}
              onChange={(practicalInfo) => patch({ practicalInfo })}
              phoneRequired={form.phoneRequired}
              onPhoneRequiredChange={(phoneRequired) => patch({ phoneRequired })}
              onServerImported={onUpdated}
              onToast={onToast}
            />
          </Section>

          <Section title="Repas, boissons & options invités">
            <InvitationServiceOptionsEditor
              value={form.serviceOptions}
              onChange={(serviceOptions) => patch({ serviceOptions })}
            />
          </Section>

          {error && <p className="text-rose-400 text-xs">{error}</p>}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <Button type="button" variant="primary" size="sm" disabled={saving} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Enregistrer les modifications
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={saving} onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" /> Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-primary/90 text-[10px] font-semibold uppercase tracking-[0.2em]">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-muted-foreground text-xs block mb-1">{label}</label>
      {children}
    </div>
  );
}
