import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const isDev = process.env.NODE_ENV === 'development';
  
  // Generar nonce único para cada petición
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // Construir CSP
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://js.stripe.com https://www.paypal.com https://www.paypalobjects.com https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:", // Added blob: for some map/image libs
    "font-src 'self' data: https:",
    "frame-src 'self' https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com",
    "connect-src 'self' https://api.stripe.com https://api-m.paypal.com https://api-m.sandbox.paypal.com https://www.google-analytics.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://www.googleapis.com", // Added Firebase domains
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; ');

  // Setear headers en la respuesta y request (para que Server Components puedan leerlo)
  res.headers.set('Content-Security-Policy', cspHeader);
  res.headers.set('x-nonce', nonce);
  
  // También necesitamos pasar el nonce al request para que layout.tsx pueda leerlo
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
