import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Negotiator from 'negotiator';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import { i18n } from './i18n-config';

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
    if (isBotRequest(request)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    const ip = getClientIp(request);
    const sensitive = Object.entries(SENSITIVE_LIMITS).find(([prefix]) => pathname.startsWith(prefix));
    const limit = sensitive ? sensitive[1] : { windowMs: API_RATE_LIMIT_WINDOW_MS, max: API_RATE_LIMIT_MAX };
    if (isRateLimited(`api:${ip}`, limit.windowMs, limit.max)) {
      return new NextResponse('Too Many Requests', { status: 429 });
    }
    return NextResponse.next();
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
