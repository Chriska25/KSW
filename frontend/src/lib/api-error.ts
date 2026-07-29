/** Extrait un message lisible depuis une erreur Axios / FastAPI. */
export function getApiErrorMessage(err: unknown, fallback = 'Une erreur est survenue.'): string {
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
