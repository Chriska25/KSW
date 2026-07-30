'use client';

import { useState, useCallback } from 'react';
import { isDevMode, persistSession as saveSession, clearSession as wipeSession } from '@/lib/session';
import apiClient from '@/lib/api-client';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'photographer' | 'client' | 'assistant';
  status: 'active' | 'pending' | 'suspended';
  roles: Array<{ name: string }>;
  password?: string;
  require2FA?: boolean;
}

export const INITIAL_USERS: AuthUser[] = isDevMode()
  ? [
      {
        id: 'u-1',
        name: 'Photographe Master',
        email: 'admin@kswstudio.fr',
        role: 'admin',
        status: 'active',
        roles: [{ name: 'admin' }],
        require2FA: true,
      },
      {
        id: 'u-4',
        name: 'Sophie Dupont',
        email: 'sophie.d@email.com',
        role: 'client',
        status: 'active',
        roles: [{ name: 'client' }],
        require2FA: false,
      },
    ]
  : [];

function normalizeLoginEmail(email: string): string {
  const clean = email.toLowerCase().trim();
  if (clean === 'client@kswstudio.fr') return 'sophie.d@email.com';
  return clean;
}

function normalizeUser(raw: Partial<AuthUser> & { role?: string }): AuthUser {
  const role = (raw.role as AuthUser['role']) || 'client';
  return {
    id: String(raw.id || 'unknown'),
    name: raw.name || raw.email || 'Utilisateur',
    email: raw.email || '',
    role,
    status: raw.status || 'active',
    roles: raw.roles?.length ? raw.roles : [{ name: role }],
  };
}

function getApiErrorMessage(err: unknown, fallback: string): string {
  const axiosErr = err as {
    response?: { data?: { message?: string; detail?: string | { msg: string }[] } };
    message?: string;
  };
  const data = axiosErr.response?.data;
  if (data?.message) return data.message;
  if (typeof data?.detail === 'string') return data.detail;
  if (Array.isArray(data?.detail) && data.detail[0]?.msg) return data.detail[0].msg;
  if (axiosErr.message && !axiosErr.message.includes('Network Error')) return axiosErr.message;
  return fallback;
}

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persistSession = useCallback((token: string, user: Partial<AuthUser>) => {
    const normalized = normalizeUser(user);
    return saveSession(token, normalized);
  }, []);

  const getStoredUsers = (): AuthUser[] => {
    try {
      const stored = localStorage.getItem('studio_users');
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return isDevMode() ? INITIAL_USERS : [];
  };

  const tryLocalLogin = (email: string, password: string) => {
    const normalizedEmail = normalizeLoginEmail(email);
    const storedUsers = getStoredUsers();
    const user = storedUsers.find(
      (u) =>
        u.email.toLowerCase() === normalizedEmail ||
        u.email.toLowerCase() === email.toLowerCase().trim()
    );

    if (!user) return null;

    const validPasswords = [user.password, 'Password123!', 'password'].filter(Boolean);
    if (!validPasswords.includes(password)) return null;

    if (user.status === 'pending') {
      throw new Error('Votre compte client est en attente de validation par l\'administrateur.');
    }
    if (user.status === 'suspended') {
      throw new Error('Ce compte a été temporairement suspendu par l\'administration.');
    }

    const resUser = normalizeUser(user);
    const token = `demo-token-${Date.now()}`;
    persistSession(token, resUser);

    return {
      token,
      user: resUser,
      requires_2fa: user.require2FA ?? user.role === 'admin',
      user_id: resUser.id,
    };
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post(
        '/auth/login',
        { email: email.trim(), password },
        { timeout: 15000 }
      );
      const data = response.data;

      if (data?.status === 'error') {
        throw new Error(data.message || 'Erreur de connexion');
      }

      if (!data?.token || !data?.user) {
        throw new Error('Réponse serveur invalide. Réessayez.');
      }

      const normalized = normalizeUser(data.user);
      if (!data.requires_2fa) {
        persistSession(data.token, normalized);
      } else if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('studio_pending_2fa_user', JSON.stringify(normalized));
          sessionStorage.setItem('studio_pre_2fa_token', data.token);
        } catch {
          // ignore
        }
      }

      setLoading(false);
      return {
        ...data,
        user: normalized,
      };
    } catch (err: unknown) {
      if (isDevMode()) {
        try {
          const local = tryLocalLogin(email, password);
          if (local) {
            setLoading(false);
            return local;
          }
        } catch (localErr: unknown) {
          setLoading(false);
          const msg = localErr instanceof Error ? localErr.message : 'Connexion impossible.';
          setError(msg);
          throw localErr;
        }
      }

      setLoading(false);
      const msg = getApiErrorMessage(
        err,
        'Identifiants incorrects. Vérifiez votre email et mot de passe.'
      );
      setError(msg);
      throw new Error(msg);
    }
  };

  const verify2FA = async (userId: string, code: string) => {
    setLoading(true);
    setError(null);

    try {
      const pre2fa =
        typeof window !== 'undefined' ? sessionStorage.getItem('studio_pre_2fa_token') : null;
      const response = await apiClient.post(
        '/auth/verify-2fa',
        { user_id: userId, code },
        {
          timeout: 15000,
          headers: pre2fa ? { Authorization: `Bearer ${pre2fa}` } : undefined,
        }
      );
      const data = response.data;
      if (data?.token && data?.user) {
        persistSession(data.token, data.user);
      }
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('studio_pre_2fa_token');
        sessionStorage.removeItem('studio_pending_2fa_user');
      }
      setLoading(false);
      return { ...data, user: normalizeUser(data.user) };
    } catch {
      if (isDevMode() && (code === '123456' || /^\d{6}$/.test(code))) {
        const storedUsers = getStoredUsers();
        const user = storedUsers.find((u) => u.id === userId) || storedUsers[0];
        const token = `demo-2fa-token-${Date.now()}`;
        persistSession(token, user);
        setLoading(false);
        return { token, user: normalizeUser(user) };
      }
      setLoading(false);
      const msg = 'Code 2FA invalide.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const register = async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post(
        '/auth/register',
        {
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          password: data.password,
        },
        { timeout: 15000 }
      );
      const resData = response.data;
      if (resData?.token && resData?.user && (resData.user.status || 'active') === 'active') {
        persistSession(resData.token, resData.user);
      }
      setLoading(false);
      return resData;
    } catch (err: unknown) {
      if (!isDevMode()) {
        setLoading(false);
        throw err;
      }
      const storedUsers = getStoredUsers();
      const newUser: AuthUser = normalizeUser({
        id: `usr-${Date.now()}`,
        name: `${data.firstName} ${data.lastName}`.trim(),
        email: data.email,
        role: 'client',
        status: 'active',
        password: data.password,
      });

      storedUsers.push(newUser);
      try {
        localStorage.setItem('studio_users', JSON.stringify(storedUsers));
      } catch {
        // ignore
      }

      persistSession(`local-token-${newUser.id}`, newUser);
      setLoading(false);
      return { message: 'Compte créé avec succès', user: newUser };
    }
  };

  const forgotPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      setLoading(false);
      return response.data;
    } catch (err: unknown) {
      setLoading(false);
      const message = getApiErrorMessage(err, 'Impossible d\'envoyer l\'email de réinitialisation.');
      setError(message);
      throw err;
    }
  };

  const resetPassword = async (token: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/auth/reset-password', { token, password });
      setLoading(false);
      return response.data;
    } catch (err: unknown) {
      setLoading(false);
      const message = getApiErrorMessage(err, 'Lien invalide ou expiré.');
      setError(message);
      throw err;
    }
  };

  const clearError = () => setError(null);

  return { login, verify2FA, register, forgotPassword, resetPassword, loading, error, clearError };
}

export { isAdminUser } from '@/lib/session';
