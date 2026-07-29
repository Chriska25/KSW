import apiClient from '@/lib/api-client';

export type NotificationType = 'booking' | 'contact' | 'payment' | 'system';
export type NotificationChannel = 'internal' | 'email' | 'sms' | 'whatsapp' | 'push';

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  recipient: string;
  channels: NotificationChannel[];
  status: 'recorded' | 'sent' | 'delivered' | 'failed';
  createdAt: string;
  relatedId?: string;
  read?: boolean;
}

export async function fetchAdminNotifications(): Promise<{
  data: AdminNotification[];
  unreadCount: number;
}> {
  const res = await apiClient.get('/admin/notifications');
  return {
    data: res.data?.data || [],
    unreadCount: res.data?.unreadCount ?? 0,
  };
}

export async function markNotificationsRead(options: { ids?: string[]; all?: boolean }): Promise<void> {
  await apiClient.post('/admin/notifications/mark-read', options);
}

export async function sendTestNotification(): Promise<AdminNotification> {
  const res = await apiClient.post('/admin/notifications/test');
  return res.data?.data;
}

export async function sendAdminTestEmail(to?: string): Promise<void> {
  await apiClient.post('/admin/email/test', { to: to || undefined });
}

export function notificationIcon(type: NotificationType): 'booking' | 'contact' | 'payment' | 'system' {
  switch (type) {
    case 'payment':
      return 'payment';
    case 'contact':
      return 'contact';
    case 'system':
      return 'system';
    default:
      return 'booking';
  }
}
