import apiClient from '@/lib/api-client';
import type { PublicInvitation, GuestResponse, GuestPreferences, GuestPersonPreferences } from '@/lib/invitation-types';

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
): Promise<{ message: string }> {
  const res = await apiClient.post(`/invitations/public/${encodeURIComponent(token)}/rsvp`, payload);
  return { message: res.data?.message || 'Réponse enregistrée.' };
}
