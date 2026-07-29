import type { AuthUser } from '@/hooks/use-auth';
import { getSession } from '@/lib/session';

const AUTH_VERIFY_TTL_MS = 5 * 60 * 1000;

let lastVerifiedAt = 0;

export function markAuthVerified(): void {
  lastVerifiedAt = Date.now();
}

export function clearAuthVerifyCache(): void {
  lastVerifiedAt = 0;
}

export function isAuthRecentlyVerified(): boolean {
  return lastVerifiedAt > 0 && Date.now() - lastVerifiedAt < AUTH_VERIFY_TTL_MS;
}

export function canSkipAuthVerify(checkRole: (user: AuthUser) => boolean): boolean {
  if (typeof window === 'undefined') return false;
  const user = getSession();
  return Boolean(user && checkRole(user) && isAuthRecentlyVerified());
}
