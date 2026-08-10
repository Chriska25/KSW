import apiClient from '@/lib/api-client';
import type {
  ElectronicInvitation,
  InvitationEventType,
  InvitationServiceOptions,
  InvitationPracticalInfo,
  InvitationTemplateKey,
} from '@/lib/invitation-types';

export interface SubscribeInvitationPayload {
  eventType: InvitationEventType;
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
  program?: { time?: string; label?: string }[];
  extraInfo?: string;
  mapLat?: number;
  mapLng?: number;
  customization?: {
    serviceOptions?: InvitationServiceOptions;
    practicalInfo?: InvitationPracticalInfo;
    primaryColor?: string;
  };
  templateKey?: InvitationTemplateKey;
  phoneRequired?: boolean;
}

export async function fetchClientInvitations(): Promise<ElectronicInvitation[]> {
  const res = await apiClient.get('/client/invitations');
  return (res.data?.data as ElectronicInvitation[]) || [];
}

export async function fetchClientInvitation(id: string): Promise<ElectronicInvitation> {
  const res = await apiClient.get(`/client/invitations/${id}`);
  return res.data?.data as ElectronicInvitation;
}

export async function subscribeInvitationService(
  payload: SubscribeInvitationPayload
): Promise<ElectronicInvitation> {
  const res = await apiClient.post('/client/invitations/subscribe', payload);
  return res.data?.data as ElectronicInvitation;
}

export async function uploadInvitationImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post('/client/invitations/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const url = res.data?.url as string | undefined;
  if (!url) throw new Error('Réponse upload invalide.');
  return url;
}

/** Upload sans connexion — parcours public invitation. */
export async function uploadGuestInvitationImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post('/invitations/guest-upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const url = res.data?.url as string | undefined;
  if (!url) throw new Error('Réponse upload invalide.');
  return url;
}

export async function uploadInvitationImageForSession(file: File, authenticated: boolean): Promise<string> {
  if (authenticated) {
    try {
      return await uploadInvitationImage(file);
    } catch {
      return uploadGuestInvitationImage(file);
    }
  }
  return uploadGuestInvitationImage(file);
}
