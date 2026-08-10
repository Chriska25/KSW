import { getApiBaseUrl } from '@/lib/api-client';

export interface VisitAnalyticsSummary {
  totalPageViews: number;
  totalUniqueVisitors: number;
  todayViews: number;
  todayUniqueVisitors: number;
  weekViews: number;
  weekUniqueVisitors: number;
  monthViews: number;
  monthUniqueVisitors: number;
  dailyChart: Array<{
    date: string;
    label: string;
    views: number;
    uniqueVisitors: number;
  }>;
  topPages: Array<{ path: string; views: number }>;
  topCities: Array<{ location: string; views: number }>;
  topCountries: Array<{ country: string; views: number }>;
  recentVisits: Array<{
    id: string;
    path: string;
    ip: string;
    city: string;
    country: string;
    countryCode: string;
    region: string;
    sessionId: string;
    referrer?: string;
    createdAt: string;
  }>;
  allConnections?: ConnectionLogEntry[];
  connectionsCount?: number;
  lastTrackedAt?: string;
}

export interface ConnectionLogEntry {
  id: string;
  kind: 'public' | 'client';
  label: string;
  path: string;
  ip: string;
  city: string;
  country: string;
  region?: string;
  countryCode?: string;
  userName?: string;
  email?: string;
  sessionId?: string;
  referrer?: string;
  createdAt: string;
}

const SESSION_KEY = 'studio_visit_session';
const LAST_TRACK_KEY = 'studio_visit_last_track';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `v-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `v-${Date.now()}`;
  }
}

function shouldSkipPath(path: string): boolean {
  return (
    path.startsWith('/admin') ||
    path.startsWith('/client') ||
    path.startsWith('/api') ||
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/verify-2fa') ||
    path.startsWith('/forgot-password') ||
    path.startsWith('/reset-password') ||
    path.startsWith('/debug')
  );
}

export async function trackPageVisit(path: string): Promise<void> {
  if (typeof window === 'undefined' || shouldSkipPath(path)) return;

  const dedupeKey = `${path}:${Math.floor(Date.now() / 10000)}`;
  try {
    const last = sessionStorage.getItem(LAST_TRACK_KEY);
    if (last === dedupeKey) return;
    sessionStorage.setItem(LAST_TRACK_KEY, dedupeKey);
  } catch {
    // ignore
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/analytics/visit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        path,
        session_id: getOrCreateSessionId(),
        referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
      }),
      keepalive: true,
    });
    if (!res.ok) {
      // Analytics non bloquant — pas de bruit console
      return;
    }
  } catch {
    // Réseau indisponible — ignorer
  }
}

export async function fetchVisitAnalytics(): Promise<VisitAnalyticsSummary> {
  const { default: apiClient } = await import('@/lib/api-client');
  const res = await apiClient.get('/admin/analytics/visits');
  return res.data?.data as VisitAnalyticsSummary;
}
