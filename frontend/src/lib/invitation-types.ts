export type InvitationEventType =
  | 'mariage'
  | 'anniversaire'
  | 'bapteme'
  | 'communion'
  | 'professionnel'
  | 'autre';

export type InvitationStatus =
  | 'pending'
  | 'validated'
  | 'rejected'
  | 'in_preparation'
  | 'active'
  | 'completed';

export type InvitationTemplateKey =
  | 'elegant'
  | 'modern'
  | 'minimal'
  | 'romantic'
  | 'premium'
  | 'classic';

export type GuestResponse = 'yes' | 'no' | 'maybe';

export interface InvitationProgramItem {
  time?: string;
  label?: string;
}

export interface InvitationCustomization {
  primaryColor?: string;
  fontFamily?: string;
  backgroundStyle?: string;
  serviceOptions?: InvitationServiceOptions;
  practicalInfo?: InvitationPracticalInfo;
  /** Modèle PDF uploadé par l'admin pour génération avec QR. */
  pdfTemplateUrl?: string;
}

/** Infos pratiques & paramètres affichés aux invités. */
export interface InvitationPracticalInfo {
  rsvpDeadline?: string;
  parkingInfo?: string;
  accommodationInfo?: string;
  transportInfo?: string;
  giftRegistry?: string;
  childrenPolicy?: string;
  hashtag?: string;
  ceremonyVenue?: string;
  ceremonyTime?: string;
  receptionVenue?: string;
  receptionTime?: string;
  /** Noms des invités autorisés (un par entrée). */
  invitedGuestNames?: string[];
  /** Si true, seuls les noms de invitedGuestNames peuvent confirmer. */
  restrictRsvpToGuestList?: boolean;
}

export function createEmptyPracticalInfo(): InvitationPracticalInfo {
  return {};
}

export function normalizePracticalInfo(raw?: Partial<InvitationPracticalInfo> | null): InvitationPracticalInfo {
  if (!raw || typeof raw !== 'object') return createEmptyPracticalInfo();
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    rsvpDeadline: str(raw.rsvpDeadline),
    parkingInfo: str(raw.parkingInfo),
    accommodationInfo: str(raw.accommodationInfo),
    transportInfo: str(raw.transportInfo),
    giftRegistry: str(raw.giftRegistry),
    childrenPolicy: str(raw.childrenPolicy),
    hashtag: str(raw.hashtag),
    ceremonyVenue: str(raw.ceremonyVenue),
    ceremonyTime: str(raw.ceremonyTime),
    receptionVenue: str(raw.receptionVenue),
    receptionTime: str(raw.receptionTime),
    invitedGuestNames: Array.isArray(raw.invitedGuestNames)
      ? raw.invitedGuestNames.map((n) => String(n).trim()).filter(Boolean)
      : [],
    restrictRsvpToGuestList: raw.restrictRsvpToGuestList === true,
  };
}

/** Options configurables par l'organisateur pour le RSVP invités. */
export interface InvitationServiceOptionGroup {
  enabled: boolean;
  required: boolean;
  label: string;
  choices: string[];
}

export interface InvitationServiceOptions {
  meals: InvitationServiceOptionGroup;
  drinks: InvitationServiceOptionGroup;
  others: InvitationServiceOptionGroup;
}

export interface GuestPreferences {
  meal?: string;
  drink?: string;
  other?: string;
  /** Préférences par personne (index 0 = invité principal). */
  persons?: GuestPersonPreferences[];
}

export interface GuestPersonPreferences {
  meal?: string;
  drink?: string;
  other?: string;
}

export const MAX_RSVP_PERSONS = 3;

export function emptyPersonPreferences(): GuestPersonPreferences {
  return {};
}

export function formatGuestPreferencesSummary(prefs?: GuestPreferences | null): string {
  if (!prefs) return '—';
  const persons = prefs.persons;
  if (Array.isArray(persons) && persons.length > 0) {
    return persons
      .map((p, i) => {
        const parts = [p.meal, p.drink, p.other].filter(Boolean);
        if (!parts.length) return null;
        return `P${i + 1}: ${parts.join(', ')}`;
      })
      .filter(Boolean)
      .join(' · ') || '—';
  }
  const legacy = [prefs.meal, prefs.drink, prefs.other].filter(Boolean);
  return legacy.length ? legacy.join(', ') : '—';
}

export const DEFAULT_MEAL_CHOICES = ['Viande', 'Poisson', 'Végétarien', 'Vegan'];
export const DEFAULT_DRINK_CHOICES = ['Vin rouge', 'Vin blanc', 'Champagne', 'Soft / sans alcool'];

export function createDefaultServiceOptions(): InvitationServiceOptions {
  return {
    meals: {
      enabled: true,
      required: true,
      label: 'Choix du menu',
      choices: [...DEFAULT_MEAL_CHOICES],
    },
    drinks: {
      enabled: true,
      required: false,
      label: 'Boisson',
      choices: [...DEFAULT_DRINK_CHOICES],
    },
    others: {
      enabled: false,
      required: false,
      label: 'Autre',
      choices: [],
    },
  };
}

export function normalizeServiceOptions(raw?: Partial<InvitationServiceOptions> | null): InvitationServiceOptions {
  const defaults = createDefaultServiceOptions();
  if (!raw) return defaults;
  const mergeGroup = (
    key: keyof InvitationServiceOptions,
    fallback: InvitationServiceOptionGroup
  ): InvitationServiceOptionGroup => {
    const group = raw[key];
    if (!group || typeof group !== 'object') return fallback;
    return {
      enabled: group.enabled ?? fallback.enabled,
      required: group.required ?? fallback.required,
      label: group.label?.trim() || fallback.label,
      choices: Array.isArray(group.choices)
        ? group.choices.map((c) => String(c).trim()).filter(Boolean)
        : fallback.choices,
    };
  };
  return {
    meals: mergeGroup('meals', defaults.meals),
    drinks: mergeGroup('drinks', defaults.drinks),
    others: mergeGroup('others', defaults.others),
  };
}

export interface InvitationStats {
  totalResponses: number;
  confirmed: number;
  declined: number;
  pending: number;
  expectedPeople: number;
  percentages: { yes: number; no: number; maybe: number };
}

export interface ElectronicInvitation {
  id: string;
  clientUserId?: string;
  clientEmail: string;
  clientName: string;
  eventType: InvitationEventType;
  eventTypeLabel?: string;
  status: InvitationStatus;
  statusLabel?: string;
  rejectionReason?: string;
  organizerNames: string;
  eventDate: string;
  eventTime?: string;
  venue?: string;
  address?: string;
  description?: string;
  contact?: string;
  coverUrl?: string;
  logoUrl?: string;
  galleryUrls?: string[];
  dressCode?: string;
  program?: InvitationProgramItem[];
  extraInfo?: string;
  mapLat?: number;
  mapLng?: number;
  templateKey: InvitationTemplateKey;
  customization?: InvitationCustomization;
  publicToken?: string;
  linkActive?: boolean;
  linkActiveFrom?: string;
  linkActiveUntil?: string;
  /** État réel après vérification des dates programmées. */
  linkEffectiveActive?: boolean;
  linkScheduleStatus?: 'active' | 'disabled' | 'scheduled' | 'expired';
  phoneRequired?: boolean;
  createdAt?: string;
  updatedAt?: string;
  guestResponsesCount?: number;
  stats?: InvitationStats;
  guests?: InvitationGuest[];
}

export interface InvitationGuest {
  id: string;
  invitationId: string;
  fullName: string;
  phone?: string;
  response: GuestResponse;
  guestCount: number;
  companions?: string[];
  message?: string;
  preferences?: GuestPreferences;
  source?: string;
  respondedAt?: string;
}

export interface PublicInvitation {
  organizerNames: string;
  eventType: InvitationEventType;
  eventTypeLabel?: string;
  eventDate: string;
  eventTime?: string;
  venue?: string;
  address?: string;
  description?: string;
  coverUrl?: string;
  logoUrl?: string;
  galleryUrls?: string[];
  dressCode?: string;
  program?: InvitationProgramItem[];
  extraInfo?: string;
  mapLat?: number;
  mapLng?: number;
  templateKey: InvitationTemplateKey;
  customization?: InvitationCustomization;
  serviceOptions?: InvitationServiceOptions;
  practicalInfo?: InvitationPracticalInfo;
  phoneRequired?: boolean;
  linkActive?: boolean;
  linkActiveFrom?: string;
  linkActiveUntil?: string;
  linkEffectiveActive?: boolean;
  linkScheduleStatus?: 'active' | 'disabled' | 'scheduled' | 'expired';
  /** false après la date limite RSVP. */
  rsvpFormOpen?: boolean;
  rsvpDeadline?: string;
  restrictRsvpToGuestList?: boolean;
}

export const EVENT_TYPE_OPTIONS: { value: InvitationEventType; label: string }[] = [
  { value: 'mariage', label: 'Mariage' },
  { value: 'anniversaire', label: 'Anniversaire' },
  { value: 'bapteme', label: 'Baptême' },
  { value: 'communion', label: 'Communion' },
  { value: 'professionnel', label: 'Événement professionnel' },
  { value: 'autre', label: 'Autre' },
];

export const INVITATION_STATUS_OPTIONS: { value: InvitationStatus; label: string }[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'validated', label: 'Validée' },
  { value: 'rejected', label: 'Refusée' },
  { value: 'in_preparation', label: 'En préparation' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Terminée' },
];

export const TEMPLATE_OPTIONS: { value: InvitationTemplateKey; label: string }[] = [
  { value: 'elegant', label: 'Élégant' },
  { value: 'modern', label: 'Moderne' },
  { value: 'minimal', label: 'Minimaliste' },
  { value: 'romantic', label: 'Romantique' },
  { value: 'premium', label: 'Premium' },
  { value: 'classic', label: 'Classique' },
];
