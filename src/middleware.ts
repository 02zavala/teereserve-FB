import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Negotiator from 'negotiator';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import { i18n } from './i18n-config';

// Allowlist de CORS (producción y staging)
const ALLOWED_ORIGINS = [
  'https://teereserve.golf',
  'https://www.teereserve.golf',
  process.env.NEXT_PUBLIC_BASE_URL || '',
  process.env.NEXT_PUBLIC_FIREBASE_HOSTING_URL || '',
  // Posibles dominios de preview/staging pueden agregarse vía env CORS_ALLOWLIST (comma-separated)
  ...(process.env.CORS_ALLOWLIST ? process.env.CORS_ALLOWLIST.split(',').map((s) => s.trim()).filter(Boolean) : []),
].filter(Boolean);

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // Permitir llamadas server-to-server o CLI sin header Origin
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Permitir localhost en desarrollo
  if (/^https?:\/\/localhost(?::\d+)?$/i.test(origin)) return true;
  // Permitir previews en Vercel del proyecto (subdominios *.vercel.app)
  if (/\.vercel\.app$/i.test(origin)) return true;
  // Permitir dominios de Firebase Hosting preview
  if (/\.web\.app$/i.test(origin) || /\.firebaseapp\.com$/i.test(origin)) return true;
  return false;
}

// Protecciones para API: rate limiting y detección de bots
const API_RATE_LIMIT_WINDOW_MS = 60_000; // 1 minuto
const API_RATE_LIMIT_MAX = 60; // 60 req/min por IP
const SENSITIVE_LIMITS: Record<string, { windowMs: number; max: number }> = {
  '/api/contact': { windowMs: 60_000, max: 10 },
};
const requestTimestamps = new Map<string, number[]>();
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return (
    (request as any).ip ||
    (forwarded ? forwarded.split(',')[0].trim() : '') ||
    realIp ||
    'unknown'
  );
}
function isRateLimited(key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  const arr = requestTimestamps.get(key) || [];
  const recent = arr.filter((ts) => ts > windowStart);
  if (recent.length >= max) {
    requestTimestamps.set(key, recent);
    return true;
  }
  recent.push(now);
  requestTimestamps.set(key, recent);
  return false;
}
const BOT_UA_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scrape/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /httpclient/i,
  /axios/i,
  /java/i,
];
function isBotRequest(request: NextRequest): boolean {
  const ua = request.headers.get('user-agent') || '';
  return BOT_UA_PATTERNS.some((re) => re.test(ua));
}

function detectLocale(request: NextRequest): string {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((v, k) => (negotiatorHeaders[k] = v));
  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
  return matchLocale(languages, i18n.locales, i18n.defaultLocale) || i18n.defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // Aplicar protecciones para API
  if (pathname.startsWith('/api')) {
    // Bloqueo básico por User-Agent de scraper/bot
    if (isBotRequest(request)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const originHeader = request.headers.get('origin');

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      if (!isOriginAllowed(originHeader)) {
        return new NextResponse('Forbidden', { status: 403 });
      }
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': originHeader || '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
          'Vary': 'Origin',
        },
      });
    }

    // Rate limiting por IP
    const ip = getClientIp(request);
    const sensitive = Object.entries(SENSITIVE_LIMITS).find(([prefix]) => pathname.startsWith(prefix));
    const limit = sensitive ? sensitive[1] : { windowMs: API_RATE_LIMIT_WINDOW_MS, max: API_RATE_LIMIT_MAX };
    if (isRateLimited(`api:${ip}`, limit.windowMs, limit.max)) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }

    // Restringir CORS para solicitudes con Origin no permitido
    if (originHeader && !isOriginAllowed(originHeader)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Propagar headers CORS para orígenes permitidos
    const response = originHeader && isOriginAllowed(originHeader)
      ? NextResponse.next({
          headers: new Headers({
            'Access-Control-Allow-Origin': originHeader,
            'Vary': 'Origin',
          }),
        })
      : NextResponse.next();

    return response;
  }

  if (
    pathname.startsWith('/_next') ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const hasLocale = i18n.locales.some(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)
  );

  if (!hasLocale) {
    const locale = detectLocale(request);
    const rest = pathname === '/' ? '' : pathname;
    return NextResponse.redirect(new URL(`/${locale}${rest}`, origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
