import { getBackendApiBase } from '@/lib/backend-url';

export function isSafeProxySegment(segment: string): boolean {
  if (!segment) return false;
  const lowered = segment.toLowerCase();
  if (lowered.includes('..') || lowered.includes('%2e') || segment.includes('\\')) {
    return false;
  }
  return true;
}

export function buildSafeBackendUrl(pathSegments: string[]): URL | null {
  const base = getBackendApiBase().replace(/\/$/, '');
  for (const segment of pathSegments) {
    if (!isSafeProxySegment(segment)) return null;
  }
  const joined = pathSegments.join('/');
  const target = new URL(`${base}/${joined}`);
  const baseUrl = new URL(`${base}/`);
  if (!target.href.startsWith(baseUrl.href)) return null;
  return target;
}
