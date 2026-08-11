import apiClient from '@/lib/api-client';

/** Upload image invitation (admin, sans filigrane). */
export async function uploadAdminInvitationImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post('/upload?skip_watermark=1', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const url = res.data?.url as string | undefined;
  if (!url) throw new Error('Réponse upload invalide.');
  return url;
}
