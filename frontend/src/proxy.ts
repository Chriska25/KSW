import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const TOKEN_COOKIE = 'studio_token';

function parseJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function hasValidAuthToken(request: NextRequest, adminOnly = false): boolean {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  if (!token || token.length < 20) return false;
  const payload = parseJwtPayload(token);
  if (!payload) return false;
  const exp = typeof payload.exp === 'number' ? payload.exp : 0;
  if (exp > 0 && exp * 1000 < Date.now()) return false;
  if (payload.pre_2fa) return false;
  const role = String(payload.role || 'client');
  if (adminOnly) {
    return ['admin', 'photographer', 'assistant'].includes(role) && payload['2fa_verified'] !== false;
  }
  return true;
}

function loginRedirect(request: NextRequest, pathname: string, admin = false): NextResponse {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  if (admin) {
    loginUrl.searchParams.set('admin', '1');
  }
  return NextResponse.redirect(loginUrl);
}

import { isGalleryKeyAccessPath } from '@/lib/gallery-access-path';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (process.env.NODE_ENV === 'production' && pathname.startsWith('/debug')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (pathname.startsWith('/admin')) {
    if (!hasValidAuthToken(request, true)) {
      return loginRedirect(request, pathname, true);
    }
  }

  const isGalleryViewer = isGalleryKeyAccessPath(pathname);

  if (pathname.startsWith('/client') && !isGalleryViewer) {
    if (!hasValidAuthToken(request, false)) {
      return loginRedirect(request, pathname);
    }
  }

  const response = NextResponse.next();

  if (process.env.NODE_ENV !== 'production') {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  if (
    process.env.NODE_ENV === 'production' &&
    !request.nextUrl.pathname.startsWith('/_next/static')
  ) {
    response.headers.set('Cache-Control', 'no-store, must-revalidate');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
