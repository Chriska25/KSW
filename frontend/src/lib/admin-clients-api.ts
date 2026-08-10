import apiClient from '@/lib/api-client';

export interface ClientLocationInfo {
  city: string;
  country: string;
  ip: string;
}

export interface ClientLastAction {
  action: string;
  detail: string;
  at: string;
  path: string;
}

export interface AdminClientOverviewItem {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  createdAt?: string;
  lastLoginAt?: string;
  lastSeenAt?: string;
  isOnline: boolean;
  currentPath: string;
  location: ClientLocationInfo;
  lastAction: ClientLastAction;
}

export interface AdminOnlineSession {
  sessionId: string;
  userId: string;
  email: string;
  name: string;
  phone?: string;
  ip?: string;
  city?: string;
  country?: string;
  currentPath?: string;
  loggedInAt?: string;
  lastSeenAt?: string;
  isOnline?: boolean;
}

export interface AdminClientsOverview {
  onlineCount: number;
  totalClients: number;
  online: AdminOnlineSession[];
  clients: AdminClientOverviewItem[];
}

export interface ClientActivityTimelineItem {
  type: string;
  title: string;
  description: string;
  path?: string;
  location?: string;
  createdAt: string;
  relatedId?: string;
}

export interface AdminClientActivityPayload {
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: string;
    lastLoginAt?: string;
    lastSeenAt?: string;
    location: ClientLocationInfo;
  };
  timeline: ClientActivityTimelineItem[];
  stats: {
    bookings: number;
    galleries: number;
    invitations: number;
    messages: number;
    presenceEvents: number;
  };
}

export async function fetchAdminClientsOverview(): Promise<AdminClientsOverview> {
  const res = await apiClient.get('/admin/clients/overview');
  return res.data?.data as AdminClientsOverview;
}

export async function fetchAdminClientActivity(userId: string): Promise<AdminClientActivityPayload> {
  const res = await apiClient.get(`/admin/clients/${userId}/activity`);
  return res.data?.data as AdminClientActivityPayload;
}

export function formatClientPath(path?: string): string {
  if (!path) return '—';
  const labels: Record<string, string> = {
    '/client/dashboard': 'Tableau de bord',
    '/client/galeries': 'Mes galeries',
    '/client/invitations': 'Invitations',
    '/client/reservations': 'Réservations',
    '/client/documents': 'Factures',
    '/client/notifications': 'Notifications',
    '/client/profile': 'Mon profil',
    '/login': 'Connexion',
    '/auth/me': 'Vérification session',
  };
  if (labels[path]) return labels[path];
  if (path.startsWith('/client/galeries/')) return 'Galerie client';
  if (path.startsWith('/client/invitations/')) return 'Invitation client';
  return path;
}

export function activityTypeLabel(type: string): string {
  switch (type) {
    case 'booking':
      return 'Réservation';
    case 'payment':
      return 'Paiement';
    case 'gallery':
      return 'Galerie';
    case 'invitation':
      return 'Invitation';
    case 'contact':
      return 'Contact';
    case 'presence':
      return 'Activité';
    default:
      return type;
  }
}
