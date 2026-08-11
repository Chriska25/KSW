import apiClient from '@/lib/api-client';

const CLIENT_SESSION_KEY = 'studio_client_session';

export function getOrCreateClientSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = localStorage.getItem(CLIENT_SESSION_KEY);
    if (!id) {
      id = `cs-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(CLIENT_SESSION_KEY, id);
    }
    return id;
  } catch {
    return `cs-${Date.now()}`;
  }
}

export async function sendClientPresenceHeartbeat(path: string): Promise<void> {
  try {
    await apiClient.post('/client/presence/heartbeat', {
      path,
      session_id: getOrCreateClientSessionId(),
    });
  } catch {
    // Présence non bloquante
  }
}
