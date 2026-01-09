import { NextRequest, NextResponse } from 'next/server';
import Negotiator from 'negotiator';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import { i18n } from './i18n-config';
import { isRateLimitedDistributed } from '@/lib/ratelimit';

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
const API_RATE_LIMIT_MAX = process.env.NODE_ENV === 'development' ? 1000 : 60; // 60 req/min por IP (1000 en dev)
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
function isRateLimitedLocal(key: string, windowMs: number, max: number): boolean {
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

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname || '/';

  // --- Tope de 28 días para sesiones con "No cerrar sesión" ---
  // Aplicar principalmente en rutas protegidas (admin)
  const isApi = pathname.startsWith('/api');
  const isStatic = pathname.startsWith('/_next') || pathname.startsWith('/assets') || pathname.startsWith('/static');
  const isAdmin = pathname.includes('/admin');

  if (!isApi && !isStatic && isAdmin) {
    const remember = request.cookies.get('tr_remember')?.value === '1';
    const loginTsSecStr = request.cookies.get('tr_login_ts')?.value;
    const loginTsSec = loginTsSecStr ? parseInt(loginTsSecStr, 10) : undefined;
    const nowSec = Math.floor(Date.now() / 1000);
    const TWENTY_EIGHT_DAYS = 28 * 24 * 60 * 60; // segundos

    if (remember && loginTsSec && nowSec - loginTsSec > TWENTY_EIGHT_DAYS) {
      // Expiró el tope de 28 días: limpiar cookies y redirigir a login
      const res = NextResponse.redirect(new URL(`/${pathname.split('/')[1] || 'es'}/login?reason=expired`, request.url));
      res.cookies.set('tr_remember', '', { maxAge: 0, path: '/' });
      res.cookies.set('tr_login_ts', '', { maxAge: 0, path: '/' });
      return res;
    }
  }

  const origin = url.origin;

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
    const key = `api:${ip}`;
    const dist = await isRateLimitedDistributed(key, limit.windowMs, limit.max);
    if (dist === true || (dist === null && isRateLimitedLocal(key, limit.windowMs, limit.max))) {
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

  const res = NextResponse.next();
  const isDev = process.env.NODE_ENV !== 'production';
  const cspDev = [
    "default-src 'self' data: blob: https:",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://www.paypal.com https://www.paypalobjects.com https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: blob: https:",
    "frame-src https://js.stripe.com https://www.paypal.com",
    "connect-src 'self' https: ws:"
  ].join('; ');
  const cspProd = [
    "default-src 'self'",
    "script-src 'self' https://js.stripe.com https://www.paypal.com https://www.paypalobjects.com https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "frame-src https://js.stripe.com https://www.paypal.com",
    "connect-src 'self' https://api.stripe.com https://api-m.paypal.com https://api-m.sandbox.paypal.com https://www.google-analytics.com"
  ].join('; ');
  res.headers.set('Content-Security-Policy', isDev ? cspDev : cspProd);
  return res;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
