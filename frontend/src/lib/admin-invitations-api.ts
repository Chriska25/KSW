import apiClient from '@/lib/api-client';
import type { ElectronicInvitation, InvitationGuest, InvitationStats } from '@/lib/invitation-types';

export async function fetchAdminInvitations(params?: {
  status?: string;
  q?: string;
}): Promise<ElectronicInvitation[]> {
  const res = await apiClient.get('/admin/invitations', { params });
  return (res.data?.data as ElectronicInvitation[]) || [];
}

export async function fetchAdminInvitation(id: string): Promise<ElectronicInvitation> {
  const res = await apiClient.get(`/admin/invitations/${id}`);
  return res.data?.data as ElectronicInvitation;
}

export async function updateAdminInvitation(
  id: string,
  patch: Partial<ElectronicInvitation>
): Promise<ElectronicInvitation> {
  const res = await apiClient.patch(`/admin/invitations/${id}`, patch);
  return res.data?.data as ElectronicInvitation;
}

export async function validateAdminInvitation(id: string): Promise<ElectronicInvitation> {
  const res = await apiClient.post(`/admin/invitations/${id}/validate`);
  return res.data?.data as ElectronicInvitation;
}

export async function rejectAdminInvitation(id: string, reason?: string): Promise<ElectronicInvitation> {
  const res = await apiClient.post(`/admin/invitations/${id}/reject`, null, { params: { reason } });
  return res.data?.data as ElectronicInvitation;
}

export async function generateInvitationLink(id: string): Promise<{ data: ElectronicInvitation; publicPath: string }> {
  const res = await apiClient.post(`/admin/invitations/${id}/generate-link`);
  return { data: res.data?.data, publicPath: res.data?.publicPath };
}

export async function toggleInvitationLink(id: string, active: boolean): Promise<ElectronicInvitation> {
  const res = await apiClient.post(`/admin/invitations/${id}/toggle-link`, null, { params: { active } });
  return res.data?.data as ElectronicInvitation;
}

export async function addAdminGuest(
  invitationId: string,
  guest: Partial<InvitationGuest>
): Promise<InvitationGuest> {
  const res = await apiClient.post(`/admin/invitations/${invitationId}/guests`, guest);
  return res.data?.data as InvitationGuest;
}

export async function updateAdminGuest(
  invitationId: string,
  guestId: string,
  guest: Partial<InvitationGuest>
): Promise<InvitationGuest> {
  const res = await apiClient.patch(`/admin/invitations/${invitationId}/guests/${guestId}`, guest);
  return res.data?.data as InvitationGuest;
}

export async function deleteAdminGuest(invitationId: string, guestId: string): Promise<void> {
  await apiClient.delete(`/admin/invitations/${invitationId}/guests/${guestId}`);
}

export async function downloadGuestsCsv(invitationId: string, filename: string): Promise<void> {
  const res = await apiClient.get(`/admin/invitations/${invitationId}/guests/export`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importInvitedGuestListCsv(
  invitationId: string,
  file: File,
  options?: { merge?: boolean; enableRestrict?: boolean }
): Promise<{ message: string; addedCount: number; totalCount: number; data: ElectronicInvitation }> {
  const form = new FormData();
  form.append('file', file);
  const res = await apiClient.post(
    `/admin/invitations/${invitationId}/guest-list/import`,
    form,
    {
      params: {
        merge: options?.merge !== false,
        enable_restrict: options?.enableRestrict !== false,
      },
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    }
  );
  return {
    message: res.data?.message || 'Import réussi.',
    addedCount: Number(res.data?.addedCount || 0),
    totalCount: Number(res.data?.totalCount || 0),
    data: res.data?.data as ElectronicInvitation,
  };
}

export async function downloadGuestListTemplateCsv(): Promise<void> {
  const res = await apiClient.get('/admin/invitations/guest-list/template.csv', {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modele-liste-invites.csv';
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadBlobResponse(
  res: { data: Blob; headers: Record<string, unknown> },
  fallbackName: string
) {
  const disposition = String(res.headers['content-disposition'] || res.headers['Content-Disposition'] || '');
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] || fallbackName;
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadInvitationPdf(
  invitationId: string,
  mode: 'system' | 'template' = 'system'
): Promise<void> {
  const res = await apiClient.get(`/admin/invitations/${invitationId}/pdf`, {
    params: { mode },
    responseType: 'blob',
  });
  await downloadBlobResponse(
    { data: res.data as Blob, headers: res.headers as Record<string, unknown> },
    `invitation-${mode}.pdf`
  );
}

export async function uploadInvitationPdfTemplate(
  invitationId: string,
  file: File,
  options?: { position?: string; save?: boolean; page?: number }
): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post(`/admin/invitations/${invitationId}/pdf-template`, formData, {
    params: {
      position: options?.position || 'bottom-right',
      save: options?.save !== false,
      page: options?.page ?? 0,
    },
    responseType: 'blob',
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  await downloadBlobResponse(
    { data: res.data as Blob, headers: res.headers as Record<string, unknown> },
    'invitation-modele.pdf'
  );
}

export async function downloadGuestPassPdf(invitationId: string, guestId: string): Promise<void> {
  const res = await apiClient.get(
    `/admin/invitations/${invitationId}/guests/${guestId}/pass.pdf`,
    { responseType: 'blob' }
  );
  await downloadBlobResponse(
    { data: res.data as Blob, headers: res.headers as Record<string, unknown> },
    `billet-${guestId}.pdf`
  );
}

export type { InvitationStats };
