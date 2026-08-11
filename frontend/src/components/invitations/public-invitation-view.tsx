'use client';

import React, { useMemo, useState } from 'react';
import { Calendar, Clock, MapPin, Shirt, CheckCircle2, Sparkles, CalendarClock, Car, Hotel, Bus, Gift, Baby, Church, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PublicInvitation, GuestResponse, GuestPersonPreferences, InvitationGuest } from '@/lib/invitation-types';
import { normalizeServiceOptions, normalizePracticalInfo, MAX_RSVP_PERSONS, emptyPersonPreferences } from '@/lib/invitation-types';
import { submitPublicRsvp } from '@/lib/invitation-public-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatDisplayDate, guestPassUrl, isRsvpFormOpen, qrCodeImageUrl } from '@/lib/invitation-utils';

const TEMPLATE_STYLES: Record<string, { bg: string; accent: string; card: string; font: string }> = {
  elegant: {
    bg: 'bg-gradient-to-b from-zinc-950 via-zinc-900 to-black',
    accent: 'text-amber-400',
    card: 'border-amber-400/20 bg-zinc-950/80',
    font: 'font-serif',
  },
  modern: {
    bg: 'bg-gradient-to-br from-slate-950 via-zinc-900 to-indigo-950',
    accent: 'text-sky-400',
    card: 'border-sky-400/20 bg-zinc-950/70',
    font: 'font-sans',
  },
  minimal: {
    bg: 'bg-zinc-950',
    accent: 'text-zinc-100',
    card: 'border-zinc-700 bg-zinc-900/50',
    font: 'font-sans tracking-wide',
  },
  romantic: {
    bg: 'bg-gradient-to-b from-rose-950/40 via-zinc-950 to-zinc-950',
    accent: 'text-rose-300',
    card: 'border-rose-400/25 bg-zinc-950/75',
    font: 'font-serif italic',
  },
  premium: {
    bg: 'bg-gradient-to-b from-black via-zinc-950 to-amber-950/20',
    accent: 'text-amber-300',
    card: 'border-amber-500/30 bg-black/60 backdrop-blur-xl',
    font: 'font-serif',
  },
  classic: {
    bg: 'bg-gradient-to-b from-stone-950 to-zinc-950',
    accent: 'text-stone-200',
    card: 'border-stone-500/30 bg-stone-950/60',
    font: 'font-serif',
  },
};

interface RsvpPersonEntry {
  name: string;
  preferences: GuestPersonPreferences;
}

function createPersonEntry(name = ''): RsvpPersonEntry {
  return { name, preferences: emptyPersonPreferences() };
}

interface PublicInvitationViewProps {
  token: string;
  invitation: PublicInvitation;
}

export function PublicInvitationView({ token, invitation }: PublicInvitationViewProps) {
  const style = TEMPLATE_STYLES[invitation.templateKey] || TEMPLATE_STYLES.elegant;
  const primary = invitation.customization?.primaryColor;

  const [phone, setPhone] = useState('');
  const [response, setResponse] = useState<GuestResponse>('yes');
  const [persons, setPersons] = useState<RsvpPersonEntry[]>([createPersonEntry()]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedGuest, setConfirmedGuest] = useState<InvitationGuest | null>(null);

  const guestCount = persons.length;

  const setGuestCount = (count: number) => {
    const next = Math.max(1, Math.min(MAX_RSVP_PERSONS, count));
    setPersons((prev) => {
      if (next > prev.length) {
        return [...prev, ...Array.from({ length: next - prev.length }, () => createPersonEntry())];
      }
      return prev.slice(0, next);
    });
  };

  const updatePerson = (index: number, patch: Partial<RsvpPersonEntry>) => {
    setPersons((prev) =>
      prev.map((person, i) => (i === index ? { ...person, ...patch } : person))
    );
  };

  const updatePersonPreferences = (index: number, patch: Partial<GuestPersonPreferences>) => {
    setPersons((prev) =>
      prev.map((person, i) =>
        i === index ? { ...person, preferences: { ...person.preferences, ...patch } } : person
      )
    );
  };

  const mapUrl = useMemo(() => {
    if (invitation.mapLat != null && invitation.mapLng != null) {
      return `https://www.google.com/maps?q=${invitation.mapLat},${invitation.mapLng}&z=15&output=embed`;
    }
    if (invitation.address) {
      return `https://www.google.com/maps?q=${encodeURIComponent(invitation.address)}&output=embed`;
    }
    return null;
  }, [invitation]);

  const serviceOptions = useMemo(
    () =>
      normalizeServiceOptions(
        invitation.serviceOptions || invitation.customization?.serviceOptions
      ),
    [invitation]
  );

  const practicalInfo = useMemo(
    () =>
      normalizePracticalInfo(
        invitation.practicalInfo || invitation.customization?.practicalInfo
      ),
    [invitation]
  );

  const rsvpFormOpen = useMemo(
    () =>
      isRsvpFormOpen(
        invitation.rsvpDeadline || practicalInfo.rsvpDeadline,
        invitation.rsvpFormOpen
      ),
    [invitation, practicalInfo.rsvpDeadline]
  );

  const showPreferenceFields = response === 'yes';

  const validatePersonPreferences = (): string | null => {
    for (let i = 0; i < persons.length; i += 1) {
      if (!persons[i].name.trim()) {
        return i === 0
          ? 'Indiquez votre nom complet.'
          : `Indiquez le nom de la personne ${i + 1}.`;
      }
    }
    if (response !== 'yes') return null;

    const groups: { key: keyof GuestPersonPreferences; group: typeof serviceOptions.meals }[] = [
      { key: 'meal', group: serviceOptions.meals },
      { key: 'drink', group: serviceOptions.drinks },
      { key: 'other', group: serviceOptions.others },
    ];
    for (let i = 0; i < persons.length; i += 1) {
      for (const { key, group } of groups) {
        if (group.enabled && group.required && !persons[i].preferences[key]?.trim()) {
          const who = persons.length > 1 ? ` (personne ${i + 1})` : '';
          return `Choisissez ${group.label.toLowerCase()}${who}.`;
        }
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!rsvpFormOpen) {
      setError('Le formulaire de confirmation est fermé.');
      return;
    }
    if (invitation.phoneRequired && !phone.trim()) {
      setError('Le téléphone est obligatoire.');
      return;
    }
    const prefError = validatePersonPreferences();
    if (prefError) {
      setError(prefError);
      return;
    }
    if (!persons[0]?.name.trim()) {
      setError('Indiquez votre nom complet.');
      return;
    }
    setSubmitting(true);
    try {
      const personPrefs = persons.map((p) => {
        const entry: GuestPersonPreferences = {};
        if (p.preferences.meal?.trim()) entry.meal = p.preferences.meal.trim();
        if (p.preferences.drink?.trim()) entry.drink = p.preferences.drink.trim();
        if (p.preferences.other?.trim()) entry.other = p.preferences.other.trim();
        return entry;
      });

      const result = await submitPublicRsvp(token, {
        fullName: persons[0].name.trim(),
        phone: phone.trim() || undefined,
        response,
        guestCount: persons.length,
        companions: persons.slice(1).map((p) => p.name.trim()).filter(Boolean),
        message: message.trim() || undefined,
        preferences: { persons: personPrefs },
      });
      setConfirmedGuest(result.guest ?? null);
      setConfirmed(true);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Impossible d\'enregistrer votre réponse.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    const passToken = confirmedGuest?.checkInToken;
    const passLink = passToken ? guestPassUrl(passToken) : null;

    return (
      <div className={`min-h-screen ${style.bg} flex items-center justify-center p-6`}>
        <div className={`max-w-md w-full text-center p-10 rounded-3xl border ${style.card}`}>
          <CheckCircle2 className={`h-16 w-16 mx-auto mb-4 ${style.accent}`} style={{ color: primary }} />
          <h1 className="text-2xl font-bold text-white mb-2">Merci !</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Votre réponse a bien été transmise aux organisateurs. À très bientôt !
          </p>
          {passToken && passLink && (
            <div className="mt-8 pt-6 border-t border-zinc-800/80 space-y-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Votre QR code personnel est prêt — imprimez-le sur votre invitation papier pour l&apos;accès le jour J.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeImageUrl(passLink, 200)}
                alt="QR code billet"
                className="mx-auto rounded-xl border border-zinc-800 bg-white p-2"
                width={200}
                height={200}
              />
              <a
                href={passLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs text-amber-400 hover:underline"
              >
                Ouvrir mon billet numérique
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${style.bg} ${style.font} text-zinc-100`}>
      {invitation.coverUrl && (
        <div className="relative h-56 sm:h-72 md:h-96 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={invitation.coverUrl} alt="" className="w-full h-full object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 sm:px-6 -mt-16 sm:-mt-20 relative z-10 pb-16 space-y-6">
        <header className={`text-center p-8 rounded-3xl border ${style.card} shadow-2xl`}>
          {invitation.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={invitation.logoUrl} alt="" className="h-12 mx-auto mb-4 object-contain" />
          )}
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-3">Vous êtes cordialement invité(e)</p>
          <h1
            className={`text-3xl sm:text-4xl font-bold mb-2 ${style.accent}`}
            style={primary ? { color: primary } : undefined}
          >
            {invitation.organizerNames}
          </h1>
          {invitation.eventTypeLabel && (
            <p className="text-zinc-400 text-sm">{invitation.eventTypeLabel}</p>
          )}
          {invitation.description && (
            <p className="text-zinc-300 text-sm mt-4 leading-relaxed whitespace-pre-wrap">{invitation.description}</p>
          )}
          {practicalInfo.hashtag && (
            <p className="text-amber-400/90 text-sm mt-3 font-medium">{practicalInfo.hashtag}</p>
          )}
        </header>

        {practicalInfo.rsvpDeadline && (
          <div className={`p-4 rounded-2xl border ${style.card} flex items-center gap-3 text-sm`}>
            <CalendarClock className={`h-5 w-5 shrink-0 ${style.accent}`} />
            <p className="text-zinc-300">
              Merci de confirmer votre présence{' '}
              <span className="text-white font-semibold">avant le {formatDisplayDate(practicalInfo.rsvpDeadline)}</span>
            </p>
          </div>
        )}

        <section className={`p-6 rounded-2xl border ${style.card} space-y-4 text-sm`}>
          <div className="flex items-start gap-3">
            <Calendar className={`h-5 w-5 shrink-0 ${style.accent}`} />
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider">Date</p>
              <p className="text-white font-medium">{invitation.eventDate}</p>
            </div>
          </div>
          {invitation.eventTime && (
            <div className="flex items-start gap-3">
              <Clock className={`h-5 w-5 shrink-0 ${style.accent}`} />
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wider">Heure</p>
                <p className="text-white font-medium">{invitation.eventTime}</p>
              </div>
            </div>
          )}
          {(invitation.venue || invitation.address) && (
            <div className="flex items-start gap-3">
              <MapPin className={`h-5 w-5 shrink-0 ${style.accent}`} />
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wider">Lieu</p>
                {invitation.venue && <p className="text-white font-medium">{invitation.venue}</p>}
                {invitation.address && <p className="text-zinc-400">{invitation.address}</p>}
              </div>
            </div>
          )}
          {invitation.dressCode && (
            <div className="flex items-start gap-3">
              <Shirt className={`h-5 w-5 shrink-0 ${style.accent}`} />
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wider">Dress code</p>
                <p className="text-white">{invitation.dressCode}</p>
              </div>
            </div>
          )}
          {(practicalInfo.ceremonyVenue || practicalInfo.ceremonyTime) && (
            <InfoRow icon={Church} accent={style.accent} label="Cérémonie">
              {[practicalInfo.ceremonyTime, practicalInfo.ceremonyVenue].filter(Boolean).join(' · ')}
            </InfoRow>
          )}
          {(practicalInfo.receptionVenue || practicalInfo.receptionTime) && (
            <InfoRow icon={PartyPopper} accent={style.accent} label="Réception">
              {[practicalInfo.receptionTime, practicalInfo.receptionVenue].filter(Boolean).join(' · ')}
            </InfoRow>
          )}
        </section>

        <PracticalDetailsSection info={practicalInfo} style={style} />

        {invitation.program && invitation.program.length > 0 && (
          <section className={`p-6 rounded-2xl border ${style.card}`}>
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Sparkles className={`h-4 w-4 ${style.accent}`} /> Programme
            </h2>
            <ul className="space-y-3">
              {invitation.program.map((item, i) => (
                <li key={i} className="flex gap-4 text-sm border-b border-zinc-800/80 pb-3 last:border-0 last:pb-0">
                  <span className="text-zinc-500 w-16 shrink-0">{item.time || '—'}</span>
                  <span className="text-zinc-200">{item.label}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {mapUrl && (
          <section className={`overflow-hidden rounded-2xl border ${style.card}`}>
            <iframe title="Localisation" src={mapUrl} className="w-full h-52 border-0" loading="lazy" />
          </section>
        )}

        {invitation.extraInfo && (
          <p className="text-center text-zinc-400 text-sm px-2 whitespace-pre-wrap">{invitation.extraInfo}</p>
        )}

        {invitation.galleryUrls && invitation.galleryUrls.length > 0 && (
          <section className={`p-4 rounded-2xl border ${style.card}`}>
            <h2 className="text-white font-semibold mb-3 text-sm">Galerie</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {invitation.galleryUrls.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url.startsWith('http') ? url : url}
                  alt=""
                  className="rounded-lg aspect-square object-cover w-full border border-zinc-800"
                />
              ))}
            </div>
          </section>
        )}

        <section className={`p-6 sm:p-8 rounded-2xl border ${style.card} space-y-4`}>
          <h2 className="text-xl font-bold text-white text-center">Confirmation de présence</h2>

          {!rsvpFormOpen ? (
            <div className="text-center space-y-2 py-4">
              <p className="text-zinc-300 text-sm">
                Le formulaire de confirmation n&apos;est plus disponible.
              </p>
              {(invitation.rsvpDeadline || practicalInfo.rsvpDeadline) && (
                <p className="text-zinc-500 text-xs">
                  Date limite dépassée :{' '}
                  {formatDisplayDate(invitation.rsvpDeadline || practicalInfo.rsvpDeadline || '')}
                </p>
              )}
              <p className="text-zinc-500 text-xs">
                Pour toute question, contactez directement les organisateurs.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
          {invitation.restrictRsvpToGuestList && (
            <p className="text-amber-400/90 text-xs text-center bg-amber-400/5 border border-amber-400/20 rounded-xl px-3 py-2">
              Seuls les invités figurant sur la liste officielle peuvent confirmer. Utilisez le nom indiqué sur votre invitation.
            </p>
          )}

          <div>
            <label className="text-zinc-400 text-xs block mb-2">Serez-vous présent(e) ?</label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { v: 'yes' as const, l: 'Oui, je serai présent(e)' },
                { v: 'no' as const, l: 'Non, je ne pourrai pas être présent(e)' },
                { v: 'maybe' as const, l: 'Je ne suis pas encore sûr(e)' },
              ].map((opt) => (
                <label
                  key={opt.v}
                  className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-sm ${
                    response === opt.v ? 'border-amber-400/50 bg-amber-400/10 text-white' : 'border-zinc-800 text-zinc-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="response"
                    checked={response === opt.v}
                    onChange={() => setResponse(opt.v)}
                    className="accent-amber-400"
                  />
                  {opt.l}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-zinc-400 text-xs block mb-1">
              Téléphone {invitation.phoneRequired ? '*' : '(optionnel)'}
            </label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-zinc-900/80" />
          </div>

          <div>
            <label className="text-zinc-400 text-xs block mb-1">Nombre de personnes (max. {MAX_RSVP_PERSONS})</label>
            <select
              value={guestCount}
              onChange={(e) => setGuestCount(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-white"
            >
              {Array.from({ length: MAX_RSVP_PERSONS }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} personne{n > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4 pt-2 border-t border-zinc-800/80">
            <p className="text-zinc-300 text-xs font-medium">
              {showPreferenceFields ? 'Participants & préférences' : 'Participants'}
            </p>
            {persons.map((person, index) => (
              <div
                key={index}
                className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-3"
              >
                <p className="text-[10px] uppercase tracking-wider text-amber-400/80">
                  Personne {index + 1}
                  {index === 0 ? ' — vous' : ''}
                </p>
                <div>
                  <label className="text-zinc-400 text-xs block mb-1">Nom complet *</label>
                  <Input
                    value={person.name}
                    onChange={(e) => updatePerson(index, { name: e.target.value })}
                    placeholder={index === 0 ? 'Votre nom' : `Accompagnant ${index}`}
                    className="bg-zinc-900/80"
                  />
                </div>
                {showPreferenceFields && (
                  <PersonPreferenceSelectors
                    options={serviceOptions}
                    preferences={person.preferences}
                    onChange={(prefs) => updatePersonPreferences(index, prefs)}
                  />
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="text-zinc-400 text-xs block mb-1">Message pour les organisateurs</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-white resize-none"
            />
          </div>

          {error && <p className="text-rose-400 text-xs text-center">{error}</p>}

          <Button type="submit" variant="gold" className="w-full" disabled={submitting}>
            {submitting ? 'Envoi…' : 'Confirmer ma présence'}
          </Button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  accent,
  label,
  children,
}: {
  icon: typeof MapPin;
  accent: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className={`h-5 w-5 shrink-0 ${accent}`} />
      <div>
        <p className="text-zinc-500 text-xs uppercase tracking-wider">{label}</p>
        <p className="text-white font-medium">{children}</p>
      </div>
    </div>
  );
}

function PracticalDetailsSection({
  info,
  style,
}: {
  info: ReturnType<typeof normalizePracticalInfo>;
  style: { card: string; accent: string };
}) {
  const rows: { icon: typeof Car; label: string; value?: string }[] = [
    { icon: Car, label: 'Parking & accès', value: info.parkingInfo },
    { icon: Bus, label: 'Transport', value: info.transportInfo },
    { icon: Hotel, label: 'Hébergement', value: info.accommodationInfo },
    { icon: Gift, label: 'Cadeaux & cagnotte', value: info.giftRegistry },
    { icon: Baby, label: 'Enfants', value: info.childrenPolicy },
  ];
  const visible = rows.filter((r) => r.value?.trim());
  if (!visible.length) return null;

  return (
    <section className={`p-6 rounded-2xl border ${style.card} space-y-4 text-sm`}>
      <h2 className="text-white font-semibold">Informations pratiques</h2>
      {visible.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-start gap-3">
          <Icon className={`h-5 w-5 shrink-0 ${style.accent}`} />
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-wider">{label}</p>
            <p className="text-zinc-200 whitespace-pre-wrap leading-relaxed">{value}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

function PersonPreferenceSelectors({
  options,
  preferences,
  onChange,
}: {
  options: ReturnType<typeof normalizeServiceOptions>;
  preferences: GuestPersonPreferences;
  onChange: (prefs: GuestPersonPreferences) => void;
}) {
  const groups: {
    key: keyof GuestPersonPreferences;
    group: (typeof options)['meals'];
  }[] = [
    { key: 'meal', group: options.meals },
    { key: 'drink', group: options.drinks },
    { key: 'other', group: options.others },
  ];

  const active = groups.filter(({ group }) => group.enabled && group.choices.filter(Boolean).length > 0);
  if (!active.length) return null;

  return (
    <div className="space-y-3">
      {active.map(({ key, group }) => (
        <div key={key}>
          <label className="text-zinc-400 text-xs block mb-1">
            {group.label}
            {group.required ? ' *' : ' (optionnel)'}
          </label>
          <select
            value={preferences[key] || ''}
            onChange={(e) => onChange({ ...preferences, [key]: e.target.value })}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-white"
          >
            <option value="">— Sélectionner —</option>
            {group.choices.filter(Boolean).map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
