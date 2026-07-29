/** Origine HTTP du backend FastAPI (sans /api/v1). */
export function getBackendOrigin(): string {
  const raw = process.env.BACKEND_INTERNAL_URL;
  if (raw && /^https?:\/\//.test(raw)) {
    return raw.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  }
  if (process.env.RUNNING_IN_DOCKER === 'true') {
    return 'http://backend:8000';
  }
  return 'http://localhost:8050';
}

export function getBackendApiBase(): string {
  return `${getBackendOrigin()}/api/v1`;
}
