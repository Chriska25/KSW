import type { AuthUser } from '@/hooks/use-auth';
import { clearAuthVerifyCache, markAuthVerified } from '@/lib/auth-verify-cache';

const USER_KEY = 'studio_current_user';
const TOKEN_KEY = 'studio_token';
const TOKEN_COOKIE = 'studio_token';

export function getSession(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function syncAuthCookie(token: string): void {
  if (typeof document === 'undefined') return;
  const maxAge = 60 * 60 * 24;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function clearAuthCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function persistSession(token: string, user: AuthUser): AuthUser {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    syncAuthCookie(token);
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
    clearAuthCookie();
  } catch {
    // ignore
  }
}

export function isAdminUser(user: Partial<AuthUser> | null | undefined): boolean {
  if (!user) return false;
  return (
    user.role === 'admin' ||
    user.role === 'photographer' ||
    user.roles?.some((r) => r.name === 'admin' || r.name === 'photographer') === true
  );
}

export function isClientUser(user: Partial<AuthUser> | null | undefined): boolean {
  if (!user) return false;
  if (isAdminUser(user)) return false;
  return user.role === 'client' || user.roles?.some((r) => r.name === 'client') === true;
}

export function isDevMode(): boolean {
  return process.env.NODE_ENV === 'development';
}
