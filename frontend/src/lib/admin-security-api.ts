import apiClient, { API_SMTP_TEST_TIMEOUT_MS, API_WRITE_TIMEOUT_MS } from '@/lib/api-client';

export interface SecurityOverviewCounts {
  staffUsers: number;
  clients: number;
  bookings: number;
  galleries: number;
  activeGalleries: number;
  privateGalleries: number;
  blogPosts: number;
}

export interface SecurityBackupPreview {
  version: number;
  exportedAt: string;
  counts: Record<string, number>;
  secretsRedacted: boolean;
}

export interface SecurityOverview {
  environment: 'production' | 'development' | string;
  httpsEnabled: boolean;
  jwtConfigured: boolean;
  force2FAForAdmin: boolean;
  sessionLifetimeHours: number;
  smtpConfigured: boolean;
  gmailApiConfigured?: boolean;
  gmailApiMissing?: string[];
  gmailUseApi?: boolean;
  rateLimitEnabled: boolean;
  corsOriginsCount: number;
  counts: SecurityOverviewCounts;
  backupPreview: SecurityBackupPreview;
  recommendations: string[];
}

export async function fetchSecurityOverview(): Promise<SecurityOverview> {
  const res = await apiClient.get('/admin/security/overview');
  return res.data?.data as SecurityOverview;
}

export interface SmtpTestConfig {
  liveDelivery?: boolean;
  smtpEnabled?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFrom?: string;
  gmailUseApi?: boolean;
}

export async function sendAdminTestEmail(to: string, smtp?: SmtpTestConfig): Promise<string> {
  const body: Record<string, unknown> = { to, liveDelivery: smtp?.liveDelivery ?? true };
  if (smtp) {
    for (const [key, value] of Object.entries(smtp)) {
      if (value === undefined || value === null) continue;
      if (typeof value === 'string' && !value.trim()) continue;
      body[key] = value;
    }
  }
  const res = await apiClient.post('/admin/email/test', body, { timeout: API_SMTP_TEST_TIMEOUT_MS });
  return (res.data?.message as string) || 'Email de test envoyé.';
}

export const LAST_BACKUP_STORAGE_KEY = 'ksw_last_backup_at';

export function getLastBackupLabel(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(LAST_BACKUP_STORAGE_KEY);
  if (!raw) return null;
  try {
    return new Date(raw).toLocaleString('fr-FR');
  } catch {
    return raw;
  }
}

export function rememberBackupTimestamp(exportedAt?: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_BACKUP_STORAGE_KEY, exportedAt || new Date().toISOString());
}

export interface BackupRestoreResult {
  restored: Record<string, number>;
  message: string;
  exportedAt?: string;
}

function parseBackupPayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Fichier JSON invalide.');
  }
  const data = raw as Record<string, unknown>;
  const hasContent =
    data.settings ||
    data.bookings ||
    data.galleries ||
    data.services ||
    data.testimonials ||
    data.blogPosts ||
    data.faqItems ||
    data.contactMessages;
  if (!hasContent) {
    throw new Error('Ce fichier ne contient pas une sauvegarde KSW Studio reconnue.');
  }
  return data;
}

export async function restoreAdminBackup(file: File): Promise<BackupRestoreResult> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Le fichier n\'est pas un JSON valide.');
  }

  const payload = parseBackupPayload(parsed);
  const res = await apiClient.post(
    '/admin/backup/restore',
    { ...payload, confirm: true },
    { timeout: API_WRITE_TIMEOUT_MS }
  );

  if (res.data?.status === 'error') {
    throw new Error((res.data.message as string) || 'Restauration impossible.');
  }

  const exportedAt = (res.data?.exportedAt as string | undefined) || (payload.exportedAt as string | undefined);
  if (exportedAt) {
    rememberBackupTimestamp(exportedAt);
  }

  return {
    restored: (res.data?.restored as Record<string, number>) || {},
    message: (res.data?.message as string) || 'Sauvegarde restaurée avec succès.',
    exportedAt,
  };
}
