import type { AuthUser } from '@/hooks/use-auth';
import { clearAuthVerifyCache, markAuthVerified } from '@/lib/auth-verify-cache';

const USER_KEY = 'studio_current_user';
/** Legacy — le JWT est désormais en cookie HttpOnly (non lisible en JS). */
const TOKEN_KEY = 'studio_token';
export const TOKEN_COOKIE = 'studio_token';

export function getSession(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

/** Token en localStorage (legacy / dev) — préférer le cookie HttpOnly. */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** @deprecated Cookie posé par le backend (HttpOnly). */
export function syncAuthCookie(_token: string): void {
  // no-op — le serveur définit studio_token en HttpOnly
}

export function clearAuthCookie(): void {
  // no-op côté client — utiliser POST /auth/logout
}

export function persistSession(token: string, user: AuthUser): AuthUser {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (token && process.env.NODE_ENV === 'development') {
      localStorage.setItem(TOKEN_KEY, token);
    }
    markAuthVerified();
  } catch {
    // localStorage indisponible
  }
  return user;
}

export function clearSession(): void {
  clearAuthVerifyCache();
  try {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    if (typeof window !== 'undefined') {
      void import('@/lib/api-client').then(({ default: apiClient }) =>
        apiClient.post('/auth/logout').catch(() => undefined),
      );
    }
  } catch {
    // ignore
  }
}

export function isAdminUser(user: Partial<AuthUser> | null | undefined): boolean {
  if (!user) return false;
  return (
    user.role === 'admin' ||
    user.role === 'photographer' ||
    user.role === 'assistant' ||
    user.roles?.some(
      (r) => r.name === 'admin' || r.name === 'photographer' || r.name === 'assistant'
    ) === true
  );
}

export function isSuperUser(user: Partial<AuthUser> | null | undefined): boolean {
  return Boolean(user?.isSuperuser);
}

export function isClientUser(user: Partial<AuthUser> | null | undefined): boolean {
  if (!user) return false;
  if (isAdminUser(user)) return false;
  return user.role === 'client' || user.roles?.some((r) => r.name === 'client') === true;
}

export function isDevMode(): boolean {
  return process.env.NODE_ENV === 'development';
}
