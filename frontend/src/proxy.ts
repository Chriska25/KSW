import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const TOKEN_COOKIE = 'studio_token';

function hasAuthToken(request: NextRequest): boolean {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  return Boolean(token && token.length > 10);
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
    if (!hasAuthToken(request)) {
      return loginRedirect(request, pathname, true);
    }
  }

  const isGalleryViewer = isGalleryKeyAccessPath(pathname);

  if (pathname.startsWith('/client') && !isGalleryViewer) {
    if (!hasAuthToken(request)) {
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
