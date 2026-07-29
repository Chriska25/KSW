/** Extrait un message lisible depuis une erreur Axios / FastAPI. */
export function getApiErrorMessage(err: unknown, fallback = 'Une erreur est survenue.'): string {
  if (isApiTimeout(err)) {
    return 'Le serveur met trop de temps à répondre. Vérifiez que le backend est démarré (port 8050 ou docker compose up).';
  }

  if (isApiNetworkError(err)) {
    return 'Impossible de contacter l\'API. Démarrez le backend : docker compose up -d backend ou uvicorn sur le port 8050.';
  }

  const data = (err as { response?: { data?: unknown; status?: number } })?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data && typeof data === 'object') {
    const detail = (data as { detail?: unknown; message?: unknown }).detail;
    if (typeof detail === 'string' && detail.trim()) {
      if (detail === 'Not Found') {
        return 'Service API indisponible. Redémarrez le backend (docker compose up -d backend).';
      }
      return detail;
    }
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string };
      if (first?.msg) return first.msg;
    }
    const message = (data as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function isApiTimeout(err: unknown): boolean {
  const axiosErr = err as { code?: string; message?: string };
  if (axiosErr.code === 'ECONNABORTED') return true;
  const msg = axiosErr.message || '';
  return /timeout/i.test(msg);
}

export function isApiNetworkError(err: unknown): boolean {
  const axiosErr = err as { response?: unknown; code?: string; message?: string };
  if (axiosErr.response) return false;
  const code = axiosErr.code || '';
  return code === 'ERR_NETWORK' || code === 'ECONNREFUSED' || code === 'ENOTFOUND';
}

export function isAuthApiError(err: unknown): boolean {
  const status = (err as { response?: { status?: number } })?.response?.status;
  return status === 401 || status === 403;
}
