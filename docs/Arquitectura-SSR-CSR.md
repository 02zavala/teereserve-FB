# Arquitectura SSR/CSR

- App Router de Next.js 15 con separación estricta server/client.
- Server-side:
  - Rutas API bajo `src/app/api/*` con `export async function GET/POST`.
  - Páginas sin `"use client"` realizan SSR por defecto.
- Client-side:
  - Componentes interactivos declaran `"use client"` y consumen SDKs (Stripe, PayPal, Firebase cliente).
  - Ejemplos: `src/app/[lang]/book/checkout/page.tsx` y `src/components/CheckoutForm.tsx`.
- i18n por segmento:
  - `src/app/[lang]` con `Locale` tipado, propagado por params, pathname y hooks.
- Observabilidad y seguridad:
  - Sentry instrumentado vía `next.config.mjs` y headers CSP; avisos en dev si falta instrumentation file.
  - CSP dinámico en desarrollo para permitir React Refresh (`'unsafe-eval'`).

Buenas prácticas
- Mantener lógica sensible en server (validación, creación de intents, administración).
- No exponer secretos en cliente; usar variables `NEXT_PUBLIC_*` solo para claves públicas.
- Evitar PII en logs y metadatos.

