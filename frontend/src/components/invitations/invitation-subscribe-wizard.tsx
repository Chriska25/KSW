'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ImagePlus,
  Loader2,
  LogIn,
  Mail,
  Send,
  UserPlus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { InvitationSubscribeStepper } from '@/components/invitations/invitation-subscribe-stepper';
import {
  InvitationServiceOptionsEditor,
  summarizeServiceOptions,
} from '@/components/invitations/invitation-service-options-editor';
import { InvitationProgramEditor, summarizeProgram } from '@/components/invitations/invitation-program-editor';
import { InvitationTemplatePicker } from '@/components/invitations/invitation-template-picker';
import {
  InvitationPracticalFields,
  summarizePracticalInfo,
} from '@/components/invitations/invitation-practical-fields';
import { TEMPLATE_OPTIONS } from '@/lib/invitation-types';
import {
  subscribeInvitationService,
  uploadInvitationImageForSession,
} from '@/lib/client-invitations-api';
import { EVENT_TYPE_OPTIONS, type InvitationEventType } from '@/lib/invitation-types';
import {
  draftToSubscribePayload,
  EMPTY_INVITATION_DRAFT,
  type InvitationDraft,
  INVITATION_RESUME_PATH,
  clearInvitationDraft,
  isInvitationPendingSubmit,
  loadInvitationDraft,
  saveInvitationDraft,
  setInvitationPendingSubmit,
} from '@/lib/invitation-draft';
import { getApiErrorMessage } from '@/lib/api-error';
import { resolveAvatarUrl } from '@/lib/profile-api';
import { getToken, getSession, isClientUser } from '@/lib/session';

interface InvitationSubscribeWizardProps {
  backHref?: string;
  successHref?: string;
}

export function InvitationSubscribeWizard({
  backHref = '/prestations',
  successHref = '/client/invitations',
}: InvitationSubscribeWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const resumeStarted = useRef(false);

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<InvitationDraft>(EMPTY_INVITATION_DRAFT);
  const [uploading, setUploading] = useState<'cover' | 'logo' | 'gallery' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const patchDraft = useCallback((partial: Partial<InvitationDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...partial };
      saveInvitationDraft(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const stored = loadInvitationDraft();
    if (stored) setDraft(stored);
    setAuthenticated(Boolean(getToken()) && isClientUser(getSession()));
  }, []);

  const submitDraft = useCallback(
    async (payload: InvitationDraft) => {
      setSubmitting(true);
      setError('');
      try {
        await subscribeInvitationService(draftToSubscribePayload(payload));
        clearInvitationDraft();
        router.push(successHref);
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'Envoi de la demande impossible.'));
        throw err;
      } finally {
        setSubmitting(false);
      }
    },
    [router, successHref]
  );

  useEffect(() => {
    if (resumeStarted.current) return;
    const shouldResume =
      searchParams.get('resume') === '1' || isInvitationPendingSubmit();
    if (!shouldResume || !getToken() || !isClientUser(getSession())) return;

    const stored = loadInvitationDraft();
    if (!stored?.organizerNames.trim() || !stored.eventDate.trim()) return;

    resumeStarted.current = true;
    setDraft(stored);
    setStep(4);
    setAuthenticated(true);
    setInvitationPendingSubmit(false);
    void submitDraft(stored);
  }, [searchParams, submitDraft]);

  const validateStep = (current: number): string | null => {
    if (current === 1) {
      if (!draft.organizerNames.trim()) return 'Indiquez le(s) nom(s) des organisateurs.';
      if (!draft.eventDate.trim()) return 'Indiquez la date de l\'événement.';
    }
    return null;
  };

  const goNext = () => {
    const msg = validateStep(step);
    if (msg) {
      setError(msg);
      return;
    }
    setError('');
    saveInvitationDraft(draft);
    setStep((s) => Math.min(4, s + 1));
  };

  const goBack = () => {
    setError('');
    setShowAuthGate(false);
    setStep((s) => Math.max(1, s - 1));
  };

  const handleImageUpload = async (file: File, kind: 'cover' | 'logo' | 'gallery') => {
    setError('');
    setUploading(kind);
    try {
      const url = await uploadInvitationImageForSession(file, authenticated);
      if (kind === 'cover') patchDraft({ coverUrl: url });
      else if (kind === 'logo') patchDraft({ logoUrl: url });
      else {
        setDraft((prev) => {
          const next = { ...prev, galleryUrls: [...prev.galleryUrls, url] };
          saveInvitationDraft(next);
          return next;
        });
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Échec du téléversement.'));
    } finally {
      setUploading(null);
    }
  };

  const handleValidate = async () => {
    const msg = validateStep(1);
    if (msg) {
      setError(msg);
      setStep(1);
      return;
    }
    saveInvitationDraft(draft);

    if (!getToken() || !isClientUser(getSession())) {
      setShowAuthGate(true);
      setInvitationPendingSubmit(true);
      return;
    }

    await submitDraft(draft);
  };

  const authRedirect = encodeURIComponent(INVITATION_RESUME_PATH);

  const eventTypeLabel =
    EVENT_TYPE_OPTIONS.find((o) => o.value === draft.eventType)?.label || draft.eventType;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16">
      <Link href={backHref} className="inline-flex items-center text-zinc-400 text-sm hover:text-white">
        <ArrowLeft className="h-4 w-4 mr-1" /> Retour
      </Link>

      <div className="space-y-2">
        <Badge variant="gold" className="text-[10px] uppercase tracking-wider">
          Invitation électronique
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Créez votre <span className="gold-gradient-text">invitation digitale</span>
        </h1>
        <p className="text-sm text-zinc-400">
          Remplissez toutes les étapes librement — la connexion n&apos;est demandée qu&apos;à la validation finale.
        </p>
      </div>

      <InvitationSubscribeStepper currentStep={step} />

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-white text-lg">
            {step === 1 && 'Votre événement'}
            {step === 2 && 'Visuels & identité'}
            {step === 3 && 'Informations complémentaires'}
            {step === 4 && 'Récapitulatif'}
          </CardTitle>
          <CardDescription>
            {step === 1 && 'Type, organisateurs, date et lieu.'}
            {step === 2 && 'Couverture, logo, galerie et style visuel.'}
            {step === 3 && 'Programme, infos pratiques, RSVP, repas et boissons.'}
            {step === 4 && 'Vérifiez avant d\'envoyer votre demande au studio.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          {step === 1 && (
            <>
              <div>
                <label className="text-zinc-400 block mb-1">Type d&apos;événement</label>
                <select
                  value={draft.eventType}
                  onChange={(e) => patchDraft({ eventType: e.target.value as InvitationEventType })}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
                >
                  {EVENT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <Field
                label="Nom(s) des organisateurs *"
                value={draft.organizerNames}
                onChange={(v) => patchDraft({ organizerNames: v })}
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Date *" value={draft.eventDate} onChange={(v) => patchDraft({ eventDate: v })} type="date" />
                <Field label="Heure" value={draft.eventTime} onChange={(v) => patchDraft({ eventTime: v })} type="time" />
              </div>
              <Field label="Lieu" value={draft.venue} onChange={(v) => patchDraft({ venue: v })} />
              <Field label="Adresse complète" value={draft.address} onChange={(v) => patchDraft({ address: v })} />

              <div className="pt-2 border-t border-zinc-800">
                <InvitationProgramEditor
                  value={draft.program}
                  onChange={(program) => patchDraft({ program })}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <ImageUploadBlock
                label="Photo de couverture"
                previewUrl={draft.coverUrl}
                uploading={uploading === 'cover'}
                inputRef={coverInputRef}
                onPick={(f) => void handleImageUpload(f, 'cover')}
                onClear={() => patchDraft({ coverUrl: '' })}
              />
              <ImageUploadBlock
                label="Logo (optionnel)"
                previewUrl={draft.logoUrl}
                uploading={uploading === 'logo'}
                inputRef={logoInputRef}
                onPick={(f) => void handleImageUpload(f, 'logo')}
                onClear={() => patchDraft({ logoUrl: '' })}
                compact
              />
              <GalleryBlock
                urls={draft.galleryUrls}
                uploading={uploading === 'gallery'}
                inputRef={galleryInputRef}
                onAdd={(f) => void handleImageUpload(f, 'gallery')}
                onRemove={(i) =>
                  patchDraft({ galleryUrls: draft.galleryUrls.filter((_, j) => j !== i) })
                }
              />

              <div className="pt-4 border-t border-zinc-800">
                <InvitationTemplatePicker
                  value={draft.templateKey}
                  onChange={(templateKey) => patchDraft({ templateKey })}
                  primaryColor={draft.primaryColor || '#d4af37'}
                  onPrimaryColorChange={(primaryColor) => patchDraft({ primaryColor })}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="text-zinc-400 block mb-1">Message / description</label>
                <textarea
                  value={draft.description}
                  onChange={(e) => patchDraft({ description: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white resize-none"
                />
              </div>
              <Field label="Contact (téléphone ou email)" value={draft.contact} onChange={(v) => patchDraft({ contact: v })} />
              <Field label="Dress code" value={draft.dressCode} onChange={(v) => patchDraft({ dressCode: v })} />
              <Field label="Informations complémentaires" value={draft.extraInfo} onChange={(v) => patchDraft({ extraInfo: v })} />

              <InvitationPracticalFields
                value={draft.practicalInfo}
                onChange={(practicalInfo) => patchDraft({ practicalInfo })}
                phoneRequired={draft.phoneRequired}
                onPhoneRequiredChange={(phoneRequired) => patchDraft({ phoneRequired })}
              />

              <InvitationServiceOptionsEditor
                value={draft.serviceOptions}
                onChange={(serviceOptions) => patchDraft({ serviceOptions })}
              />
            </>
          )}

          {step === 4 && (
            <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
              <RecapRow label="Événement" value={`${eventTypeLabel} — ${draft.organizerNames}`} />
              <RecapRow
                label="Date & lieu"
                value={[draft.eventDate, draft.eventTime, draft.venue, draft.address].filter(Boolean).join(' · ')}
              />
              {draft.description && <RecapRow label="Message" value={draft.description} />}
              {draft.contact && <RecapRow label="Contact" value={draft.contact} />}
              {draft.dressCode && <RecapRow label="Dress code" value={draft.dressCode} />}
              {draft.extraInfo && <RecapRow label="Infos compl." value={draft.extraInfo} />}
              {draft.program.length > 0 && (
                <RecapRow label="Programme" value={summarizeProgram(draft.program)} />
              )}
              <RecapRow
                label="Style"
                value={`${TEMPLATE_OPTIONS.find((t) => t.value === draft.templateKey)?.label || draft.templateKey}${
                  draft.primaryColor ? ` · accent ${draft.primaryColor}` : ''
                }`}
              />
              <RecapRow
                label="Infos pratiques"
                value={summarizePracticalInfo(draft.practicalInfo, draft.phoneRequired)}
              />
              <RecapRow label="Options RSVP" value={summarizeServiceOptions(draft.serviceOptions)} />
              <RecapRow
                label="Visuels"
                value={[
                  draft.coverUrl ? 'Couverture' : null,
                  draft.logoUrl ? 'Logo' : null,
                  draft.galleryUrls.length ? `${draft.galleryUrls.length} photo(s) galerie` : null,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Aucun (le studio pourra en ajouter)'}
              />

              {showAuthGate && !authenticated && (
                <div className="mt-4 p-5 rounded-xl border border-amber-400/30 bg-amber-400/5 space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-semibold">Connectez-vous pour valider</p>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        Vos informations sont sauvegardées. Créez un compte ou connectez-vous pour que la demande
                        soit enregistrée et suivie dans votre espace client.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link href={`/login?redirect=${authRedirect}`} className="flex-1">
                      <Button variant="gold" className="w-full">
                        <LogIn className="h-4 w-4 mr-2" /> Se connecter
                      </Button>
                    </Link>
                    <Link href={`/register?redirect=${authRedirect}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <UserPlus className="h-4 w-4 mr-2" /> Créer un compte
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-rose-400 text-xs">{error}</p>}

          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2 border-t border-zinc-800">
            {step > 1 && (
              <Button type="button" variant="outline" onClick={goBack} disabled={submitting}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
              </Button>
            )}
            <div className="flex-1" />
            {step < 4 ? (
              <Button type="button" variant="gold" onClick={goNext} disabled={uploading !== null}>
                Suivant <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="gold"
                onClick={() => void handleValidate()}
                disabled={submitting || uploading !== null}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {authenticated ? 'Envoyer ma demande' : 'Valider ma demande'}
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-zinc-400 block mb-1">{label}</label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="bg-zinc-900" />
    </div>
  );
}

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      <p className="text-zinc-200 text-sm mt-0.5 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function ImageUploadBlock({
  label,
  previewUrl,
  uploading,
  inputRef,
  onPick,
  onClear,
  compact,
}: {
  label: string;
  previewUrl: string;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file: File) => void;
  onClear: () => void;
  compact?: boolean;
}) {
  return (
    <div>
      <label className="text-zinc-400 block mb-2">{label}</label>
      {previewUrl ? (
        <div className={`relative ${compact ? 'h-20 w-20' : 'h-40 w-full max-w-sm'} rounded-xl overflow-hidden border border-zinc-700 mb-2`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resolveAvatarUrl(previewUrl)} alt="" className="h-full w-full object-cover" />
          <button type="button" onClick={onClear} className="absolute top-2 right-2 bg-black/70 rounded-full p-1">
            <X className="h-4 w-4 text-white" />
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
      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
        {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ImagePlus className="h-4 w-4 mr-1" />}
        {previewUrl ? 'Changer' : 'Téléverser'}
      </Button>
    </div>
  );
}

function GalleryBlock({
  urls,
  uploading,
  inputRef,
  onAdd,
  onRemove,
}: {
  urls: string[];
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onAdd: (file: File) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div>
      <label className="text-zinc-400 block mb-2">Galerie photos (optionnel)</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {urls.map((url, i) => (
          <div key={`${url}-${i}`} className="relative h-16 w-16 rounded-lg overflow-hidden border border-zinc-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolveAvatarUrl(url)} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5"
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onAdd(f);
          e.target.value = '';
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
        {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ImagePlus className="h-4 w-4 mr-1" />}
        Ajouter une photo
      </Button>
    </div>
  );
}
