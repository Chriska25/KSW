import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { clearSession } from '@/lib/session';

function normalizeApiV1Url(base: string): string {
  const trimmed = base.replace(/\/$/, '');
  return trimmed.endsWith('/api/v1') ? trimmed : `${trimmed}/api/v1`;
}

/**
 * Résout l'URL de l'API selon le contexte :
 * - Navigateur sur réseau/ngrok → chemin relatif /api/v1 (proxy Next.js, même origine)
 * - Navigateur sur localhost avec URL localhost explicite → OK
 * - SSR / serveur → BACKEND_INTERNAL_URL
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Toujours le proxy same-origin : fonctionne en localhost, IP réseau et ngrok
    return '/api/v1';
  }

  const internal = process.env.BACKEND_INTERNAL_URL || 'http://localhost:8050';
  if (internal.startsWith('/')) {
    return internal;
  }
  return normalizeApiV1Url(internal.replace(/\/api\/v1\/?$/, '').replace(/\/$/, ''));
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'ngrok-skip-browser-warning': 'true',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      config.baseURL = getApiBaseUrl();

      const token = localStorage.getItem('studio_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      if (config.headers) {
        config.headers['ngrok-skip-browser-warning'] = 'true';
        config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        config.headers['Pragma'] = 'no-cache';
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (!error.response) {
      console.warn('[API Client] Impossible de contacter l\'API backend. Vérifiez que le serveur est accessible sur le même domaine (/api/v1).');
    } else {
      console.error(`[API Client Error] ${error.response.status}:`, error.response.data);
      const status = error.response.status;
      if ((status === 401 || status === 403) && typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path.startsWith('/admin') || path.startsWith('/client')) {
          clearSession();
          const redirect = encodeURIComponent(path);
          if (!path.startsWith('/login')) {
            window.location.href = `/login?redirect=${redirect}`;
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
