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
  actorEmail?: string;
  actorName?: string;
  actorId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  ip?: string;
  city?: string;
  country?: string;
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
    actorEmail: row.actorEmail ? String(row.actorEmail) : undefined,
    actorName: row.actorName ? String(row.actorName) : undefined,
    actorId: row.actorId ? String(row.actorId) : undefined,
    method: row.method ? String(row.method) : undefined,
    path: row.path ? String(row.path) : undefined,
    statusCode: typeof row.statusCode === 'number' ? row.statusCode : undefined,
    ip: row.ip ? String(row.ip) : undefined,
    city: row.city ? String(row.city) : undefined,
    country: row.country ? String(row.country) : undefined,
  }));
}

export async function downloadAdminLogFile(): Promise<void> {
  const res = await apiClient.get('/admin/logs/export', { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `admin-activity-${new Date().toISOString().slice(0, 10)}.log`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
