import { NextRequest, NextResponse } from 'next/server';
import { buildSafeBackendUrl } from '@/lib/safe-proxy';

const PROXY_TIMEOUT_MS = 15000;

type RouteContext = { params: Promise<{ path: string[] }> };

const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'host']);

async function proxyToBackend(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  const segment = path?.join('/') ?? '';
  const target = buildSafeBackendUrl(path ?? []);
  if (!target) {
    return NextResponse.json({ detail: 'Chemin API invalide.' }, { status: 400 });
  }

  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  headers.set('ngrok-skip-browser-warning', 'true');
  headers.set('Accept', 'application/json');

  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    '127.0.0.1';
  headers.set('X-Forwarded-For', clientIp);
  headers.set('X-Real-IP', clientIp);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const body = await request.arrayBuffer();
    if (body.byteLength > 0) {
      init.body = body;
    }
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
    let upstream: Response;
    try {
      upstream = await fetch(target.toString(), { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    const responseHeaders = new Headers();
    const contentType = upstream.headers.get('Content-Type');
    if (contentType) responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    return new NextResponse(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError';
    return NextResponse.json(
      {
        detail: isTimeout
          ? 'Backend trop lent ou injoignable (timeout). Vérifiez docker compose up -d backend ou le port 8050.'
          : 'Backend indisponible. Vérifiez que le serveur API est démarré.',
      },
      { status: 503 }
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}
