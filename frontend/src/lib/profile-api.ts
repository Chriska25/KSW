import apiClient from '@/lib/api-client';
import type { AuthUser } from '@/hooks/use-auth';
import { getSession, getToken, persistSession } from '@/lib/session';

export interface UserProfile {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: AuthUser['role'];
  status: AuthUser['status'];
  roles: Array<{ name: string }>;
  isSuperuser?: boolean;
}

export interface ProfileUpdatePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
}

function normalizeProfile(raw: Record<string, unknown>): UserProfile {
  const role = (raw.role as AuthUser['role']) || 'client';
  const firstName = String(raw.firstName ?? raw.first_name ?? '').trim();
  const lastName = String(raw.lastName ?? raw.last_name ?? '').trim();
  const name =
    String(raw.name || '').trim() ||
    `${firstName} ${lastName}`.trim() ||
    String(raw.email || 'Utilisateur');

  return {
    id: String(raw.id || ''),
    name,
    firstName,
    lastName,
    email: String(raw.email || ''),
    phone: String(raw.phone || '').trim() || undefined,
    avatarUrl: String(raw.avatarUrl ?? raw.avatar_url ?? '').trim() || undefined,
    role,
    status: (raw.status as AuthUser['status']) || 'active',
    roles: Array.isArray(raw.roles) ? (raw.roles as Array<{ name: string }>) : [{ name: role }],
    isSuperuser: raw.isSuperuser === true,
  };
}

export function profileToAuthUser(profile: UserProfile): AuthUser {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    status: profile.status,
    roles: profile.roles,
    isSuperuser: profile.isSuperuser,
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    avatarUrl: profile.avatarUrl,
  };
}

export function resolveAvatarUrl(avatarUrl?: string): string | undefined {
  const raw = (avatarUrl || '').trim();
  if (!raw) return undefined;
  if (raw.startsWith('data:') || raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  if (typeof window === 'undefined') {
    return raw.startsWith('/') ? raw : `/${raw}`;
  }
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return `${window.location.origin}${path}`;
}

export async function fetchUserProfile(): Promise<UserProfile> {
  const res = await apiClient.get('/profile');
  return normalizeProfile(res.data?.data || res.data?.user || {});
}

export async function updateUserProfile(payload: ProfileUpdatePayload): Promise<UserProfile> {
  const res = await apiClient.patch('/profile', {
    first_name: payload.firstName,
    last_name: payload.lastName,
    phone: payload.phone,
    avatar_url: payload.avatarUrl,
  });
  const profile = normalizeProfile(res.data?.data || {});
  if (getSession()) {
    persistSession(getToken() || '', profileToAuthUser(profile));
  }
  return profile;
}

export async function changeUserPassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post('/profile/password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export async function uploadProfileAvatar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post('/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const url = res.data?.url as string | undefined;
  if (!url) {
    throw new Error('Réponse upload invalide.');
  }
  return url;
}

export function getProfileInitials(name?: string, fallback = '—'): string {
  if (!name?.trim()) return fallback;
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function roleLabel(role?: string): string {
  switch (role) {
    case 'admin':
      return 'Administrateur';
    case 'photographer':
      return 'Photographe';
    case 'assistant':
      return 'Assistant';
    case 'client':
      return 'Client';
    default:
      return role || 'Utilisateur';
  }
}
