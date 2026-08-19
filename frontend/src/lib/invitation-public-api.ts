import apiClient from '@/lib/api-client';
import type {
  PublicInvitation,
  GuestResponse,
  GuestPreferences,
  GuestPersonPreferences,
  InvitationGuest,
  GuestPass,
} from '@/lib/invitation-types';

export async function fetchPublicInvitation(token: string): Promise<PublicInvitation> {
  const res = await apiClient.get(`/invitations/public/${encodeURIComponent(token)}`);
  return res.data?.data as PublicInvitation;
}

export async function submitPublicRsvp(
  token: string,
  payload: {
    fullName: string;
    phone?: string;
    response: GuestResponse;
    guestCount: number;
    companions?: string[];
    message?: string;
    preferences?: GuestPreferences & { persons?: GuestPersonPreferences[] };
  }
): Promise<{ message: string; guest?: InvitationGuest }> {
  const res = await apiClient.post(`/invitations/public/${encodeURIComponent(token)}/rsvp`, payload);
  return {
    message: res.data?.message || 'Réponse enregistrée.',
    guest: res.data?.data as InvitationGuest | undefined,
  };
}

export async function fetchGuestPass(token: string): Promise<GuestPass> {
  const res = await apiClient.get(`/invitations/pass/${encodeURIComponent(token)}`);
  return res.data?.data as GuestPass;
}

export async function checkInGuestPass(
  token: string
): Promise<{ alreadyCheckedIn: boolean; data: GuestPass }> {
  const res = await apiClient.post(`/invitations/pass/${encodeURIComponent(token)}/check-in`);
  return {
    alreadyCheckedIn: Boolean(res.data?.alreadyCheckedIn),
    data: res.data?.data as GuestPass,
  };
}
