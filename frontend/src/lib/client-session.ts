import { clearSession, getSession } from '@/lib/session';
import type { AuthUser } from '@/hooks/use-auth';

export function getClientSession(): AuthUser | null {
  return getSession();
}

export function clearClientSession(): void {
  clearSession();
}

export function getClientInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

export function normalizeClientEmail(email: string): string {
  const clean = email.toLowerCase().trim();
  return clean === 'client@kswstudio.fr' ? 'sophie.d@email.com' : clean;
}

export function galleryBelongsToClient(
  gallery: { clientEmail?: string; clientName?: string; isPrivate?: boolean },
  user: AuthUser
): boolean {
  if (!gallery.isPrivate) return false;
  const userEmail = normalizeClientEmail(user.email);
  const gEmail = (gallery.clientEmail || '').toLowerCase().trim();
  if (gEmail && gEmail === userEmail) return true;
  const firstName = user.name.split(/\s+/)[0]?.toLowerCase() || '';
  return Boolean(firstName && (gallery.clientName || '').toLowerCase().includes(firstName));
}
