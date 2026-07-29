import apiClient from '@/lib/api-client';

export type AdminSearchResultType = 'user' | 'booking' | 'contact' | 'blog' | 'gallery';

export interface AdminSearchResult {
  id: string;
  type: AdminSearchResultType;
  title: string;
  subtitle: string;
  href: string;
}

export const ADMIN_SEARCH_TYPE_LABELS: Record<AdminSearchResultType, string> = {
  user: 'Utilisateur',
  booking: 'Réservation',
  contact: 'Contact',
  blog: 'Article',
  gallery: 'Galerie',
};

export async function searchAdmin(query: string): Promise<AdminSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const res = await apiClient.get('/admin/search', { params: { q } });
  return Array.isArray(res.data?.data) ? res.data.data : [];
}

export async function downloadAdminBackup(): Promise<void> {
  const res = await apiClient.get('/admin/backup/export');
  const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const link = document.createElement('a');
  link.href = url;
  link.download = `ksw-studio-backup-${stamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
