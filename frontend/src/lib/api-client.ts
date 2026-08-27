import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { clearSession } from '@/lib/session';
import { buildLoginUrl, isAdminLoginContext } from '@/lib/auth-login-url';
import { isApiNetworkError, isApiTimeout } from '@/lib/api-error';

const API_TIMEOUT_MS = 60_000;
const API_WRITE_TIMEOUT_MS = 120_000;
const API_SMTP_TEST_TIMEOUT_MS = 20_000;

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
  timeout: API_TIMEOUT_MS,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      config.baseURL = getApiBaseUrl();

      const legacyToken = localStorage.getItem('studio_token');
      if (legacyToken && config.headers && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${legacyToken}`;
      }
      if (config.headers) {
        config.headers['ngrok-skip-browser-warning'] = 'true';
        const path = config.url || '';
        const isAdminGet =
          typeof window !== 'undefined' &&
          (window.location.pathname.startsWith('/admin') || path.includes('/admin/'));
        if (isAdminGet && (config.method ?? 'get').toLowerCase() === 'get') {
          config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
          config.headers['Pragma'] = 'no-cache';
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const config = error.config as (typeof error.config & { __retry?: boolean }) | undefined;
    if (
      config &&
      !config.__retry &&
      isApiTimeout(error) &&
      (config.method ?? 'get').toLowerCase() === 'get'
    ) {
      config.__retry = true;
      await new Promise((resolve) => setTimeout(resolve, 800));
      return apiClient.request(config);
    }

    if (!error.response) {
      if (isApiTimeout(error)) {
        console.warn('[API Client] Délai dépassé — le backend ne répond pas assez vite (vérifiez port 8050 / docker).');
      } else if (isApiNetworkError(error)) {
        console.warn('[API Client] Backend injoignable. Démarrez : docker compose up -d backend');
      } else {
        console.warn('[API Client] Impossible de contacter l\'API backend (/api/v1).');
      }
    } else {
      const status = error.response.status;
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const requestUrl = String(error.config?.url || '');
      const isPublicGallery =
        path.startsWith('/galerie') || requestUrl.includes('/galleries/');
      const isAnalyticsVisit = requestUrl.includes('/analytics/visit');

      if (isPublicGallery && (status === 403 || status === 404)) {
        console.warn(`[API Client] Galerie — ${status === 403 ? 'accès refusé' : 'ressource introuvable'}.`);
      } else if (isAnalyticsVisit) {
        // Tracking visiteurs — non critique, pas de log d'erreur
      } else {
        const payload = error.response.data;
        const isHtml404 =
          error.response.status === 404 &&
          typeof payload === 'string' &&
          /<!DOCTYPE html|<html[\s>]/i.test(payload);
        if (isHtml404) {
          console.error(
            `[API Client Error] ${status}: route API introuvable (réponse HTML). Vérifiez le backend (docker compose up -d backend).`
          );
        } else {
          console.error(`[API Client Error] ${status}:`, payload);
        }
      }

      if ((status === 401 || status === 403) && typeof window !== 'undefined') {
        if (!isPublicGallery && (path.startsWith('/admin') || path.startsWith('/client'))) {
          clearSession();
          if (!path.startsWith('/login')) {
            window.location.href = buildLoginUrl({
              redirect: path,
              admin: path.startsWith('/admin'),
            });
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export { API_WRITE_TIMEOUT_MS, API_SMTP_TEST_TIMEOUT_MS };
export default apiClient;
