import apiClient from '@/lib/api-client';

export type ClientNotificationType = 'booking' | 'payment' | 'gallery';

export interface ClientNotification {
  id: string;
  type: ClientNotificationType;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  relatedId?: string;
  accessKey?: string;
}

export async function fetchClientNotifications(): Promise<{
  data: ClientNotification[];
  unreadCount: number;
}> {
  const res = await apiClient.get('/client/notifications');
  return {
    data: res.data?.data || [],
    unreadCount: res.data?.unreadCount ?? 0,
  };
}

export async function markClientNotificationsRead(options: {
  ids?: string[];
  all?: boolean;
}): Promise<void> {
  await apiClient.post('/client/notifications/mark-read', options);
}
