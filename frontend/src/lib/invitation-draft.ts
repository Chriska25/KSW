import type {
  InvitationEventType,
  InvitationProgramItem,
  InvitationPracticalInfo,
  InvitationServiceOptions,
  InvitationTemplateKey,
} from '@/lib/invitation-types';
import {
  createDefaultServiceOptions,
  createEmptyPracticalInfo,
  normalizePracticalInfo,
  normalizeServiceOptions,
} from '@/lib/invitation-types';

export const INVITATION_DRAFT_KEY = 'studio_invitation_draft';
export const INVITATION_PENDING_SUBMIT_KEY = 'studio_invitation_pending_submit';
export const INVITATION_RESUME_PATH = '/invitations/nouvelle?resume=1';

export interface InvitationDraft {
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
  coverUrl: string;
  logoUrl: string;
  galleryUrls: string[];
  program: InvitationProgramItem[];
  templateKey: InvitationTemplateKey;
  primaryColor: string;
  phoneRequired: boolean;
  practicalInfo: InvitationPracticalInfo;
  serviceOptions: InvitationServiceOptions;
}

export const EMPTY_INVITATION_DRAFT: InvitationDraft = {
  eventType: 'mariage',
  organizerNames: '',
  eventDate: '',
  eventTime: '',
  venue: '',
  address: '',
  description: '',
  contact: '',
  dressCode: '',
  extraInfo: '',
  coverUrl: '',
  logoUrl: '',
  galleryUrls: [],
  program: [],
  templateKey: 'elegant',
  primaryColor: '',
  phoneRequired: false,
  practicalInfo: createEmptyPracticalInfo(),
  serviceOptions: createDefaultServiceOptions(),
};

export function saveInvitationDraft(draft: InvitationDraft): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(INVITATION_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // quota dépassée — on ignore
  }
}

export function loadInvitationDraft(): InvitationDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(INVITATION_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InvitationDraft>;
    return {
      ...EMPTY_INVITATION_DRAFT,
      ...parsed,
      program: Array.isArray(parsed.program) ? parsed.program : [],
      practicalInfo: normalizePracticalInfo(parsed.practicalInfo),
      serviceOptions: normalizeServiceOptions(parsed.serviceOptions),
    };
  } catch {
    return null;
  }
}

export function clearInvitationDraft(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(INVITATION_DRAFT_KEY);
  sessionStorage.removeItem(INVITATION_PENDING_SUBMIT_KEY);
}

export function setInvitationPendingSubmit(pending: boolean): void {
  if (typeof window === 'undefined') return;
  if (pending) {
    sessionStorage.setItem(INVITATION_PENDING_SUBMIT_KEY, '1');
  } else {
    sessionStorage.removeItem(INVITATION_PENDING_SUBMIT_KEY);
  }
}

export function isInvitationPendingSubmit(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(INVITATION_PENDING_SUBMIT_KEY) === '1';
}

function stripEmptyPractical(info: InvitationPracticalInfo): InvitationPracticalInfo | undefined {
  const entries = Object.entries(info).filter(([, v]) => typeof v === 'string' && v.trim());
  if (!entries.length) return undefined;
  return Object.fromEntries(entries) as InvitationPracticalInfo;
}

export function draftToSubscribePayload(draft: InvitationDraft) {
  const program = draft.program.filter((p) => p.label?.trim());
  const practicalInfo = stripEmptyPractical(draft.practicalInfo);

  return {
    eventType: draft.eventType,
    organizerNames: draft.organizerNames.trim(),
    eventDate: draft.eventDate,
    eventTime: draft.eventTime || undefined,
    venue: draft.venue || undefined,
    address: draft.address || undefined,
    description: draft.description || undefined,
    contact: draft.contact || undefined,
    dressCode: draft.dressCode || undefined,
    extraInfo: draft.extraInfo || undefined,
    coverUrl: draft.coverUrl || undefined,
    logoUrl: draft.logoUrl || undefined,
    galleryUrls: draft.galleryUrls.length ? draft.galleryUrls : undefined,
    program: program.length ? program : undefined,
    templateKey: draft.templateKey,
    phoneRequired: draft.phoneRequired,
    customization: {
      serviceOptions: draft.serviceOptions,
      ...(practicalInfo ? { practicalInfo } : {}),
      ...(draft.primaryColor.trim() ? { primaryColor: draft.primaryColor.trim() } : {}),
    },
  };
}
