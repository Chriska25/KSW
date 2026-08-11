import type { NextConfig } from 'next';
import os from 'os';

function getBackendOrigin(): string {
  const raw = process.env.BACKEND_INTERNAL_URL;
  if (raw && /^https?:\/\//.test(raw)) {
    return raw.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  }
  if (process.env.RUNNING_IN_DOCKER === 'true') {
    return 'http://backend:8000';
  }
  return 'http://localhost:8050';
}

/** IP/hostname LAN pour accès réseau en mode dev (ex: 10.107.0.63) */
function getLanDevOrigins(): string[] {
  const hosts = new Set<string>();

  try {
    const nets = os.networkInterfaces();
    for (const ifaces of Object.values(nets)) {
      for (const net of ifaces ?? []) {
        if (net.family === 'IPv4' && !net.internal) {
          hosts.add(net.address);
          hosts.add(`${net.address}:3000`);
        }
      }
    }
  } catch {
    // ignore
  }

  const fromEnv = (process.env.ALLOWED_DEV_ORIGINS || process.env.ALLOWED_DEV_ORIGIN || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);

  fromEnv.forEach((entry) => {
    const host = entry.split('://').pop()?.split('/')[0] || entry;
    hosts.add(host);
    if (!host.includes(':')) {
      hosts.add(`${host}:3000`);
    }
  });

  return Array.from(hosts);
}

/** Plages IP privées — accès téléphone / autre machine sur le Wi-Fi en dev */
const PRIVATE_LAN_WILDCARDS = [
  '10.*.*.*',
  '192.168.*.*',
  '172.16.*.*',
  '172.17.*.*',
  '172.18.*.*',
  '172.19.*.*',
  '172.20.*.*',
  '172.21.*.*',
  '172.22.*.*',
  '172.23.*.*',
  '172.24.*.*',
  '172.25.*.*',
  '172.26.*.*',
  '172.27.*.*',
  '172.28.*.*',
  '172.29.*.*',
  '172.30.*.*',
  '172.31.*.*',
];

const lanOrigins = getLanDevOrigins();

function getDevAllowedOrigins(): string[] {
  return [
    '*.ngrok-free.app',
    '*.ngrok-free.dev',
    '*.ngrok.io',
    '*.loca.lt',
    'localhost',
    '127.0.0.1',
    'localhost:3000',
    '127.0.0.1:3000',
    ...PRIVATE_LAN_WILDCARDS,
    ...lanOrigins,
  ];
}

const nextConfig: NextConfig = {
  compress: true,
  reactStrictMode: true,
  // Obligatoire pour accès via IP réseau / ngrok en mode `next dev`
  // Sans cela Next.js bloque les chunks JS (403) → page sans interactivité
  allowedDevOrigins: getDevAllowedOrigins(),
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
    serverActions: {
      allowedOrigins: getDevAllowedOrigins(),
    },
  },
  async rewrites() {
    const backendOrigin = getBackendOrigin();
    return [
      {
        source: '/api/v1/:path*',
        destination: `${backendOrigin}/api/v1/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendOrigin}/uploads/:path*`,
      },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'studiolumiere.fr' },
      { protocol: 'https', hostname: 'kswstudio.fr' },
      { protocol: 'http', hostname: 'localhost', port: '8050', pathname: '/uploads/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '8050', pathname: '/uploads/**' },
    ],
  },
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
      {
        source: '/api/v1/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
      {
        source: '/:_path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
            : []),
        ],
      },
      {
        source: '/static/:_path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
