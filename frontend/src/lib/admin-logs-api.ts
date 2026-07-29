import apiClient from '@/lib/api-client';

export type AdminLogLevel = 'info' | 'success' | 'warning' | 'error';
export type AdminLogSource = 'booking' | 'contact' | 'payment' | 'system' | 'user' | 'email' | 'security' | string;

export interface AdminActivityLog {
  id: string;
  level: AdminLogLevel;
  source: AdminLogSource;
  title: string;
  message: string;
  recipient?: string;
  channels?: string[];
  createdAt: string;
  relatedId?: string;
}

export async function fetchAdminActivityLogs(): Promise<AdminActivityLog[]> {
  const res = await apiClient.get(`/admin/logs?t=${Date.now()}`);
  if (!Array.isArray(res.data?.data)) return [];
  return res.data.data.map((row: Record<string, unknown>) => ({
    id: String(row.id || ''),
    level: (row.level as AdminLogLevel) || 'info',
    source: String(row.source || 'system'),
    title: String(row.title || ''),
    message: String(row.message || ''),
    recipient: row.recipient ? String(row.recipient) : undefined,
    channels: Array.isArray(row.channels) ? (row.channels as string[]) : [],
    createdAt: String(row.createdAt || ''),
    relatedId: row.relatedId ? String(row.relatedId) : undefined,
  }));
}
