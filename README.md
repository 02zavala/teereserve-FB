# TeeReserve Golf Platform 🌍⛳

![TeeReserve](./public/logo.svg)

TeeReserve es una plataforma premium para reservar tee times y experiencias de golf, construida con Next.js App Router y un stack moderno. Este README describe la arquitectura remasterizada, el flujo completo del funnel de reservas y las integraciones clave.

---

## 📋 Índice

- Descripción general
- Tecnologías principales
- Arquitectura remasterizada (SSR/CSR)
- Estructura del App Router
- Flujo booking → checkout → success/cancel
- Funnel de eventos y monitoreo
- Cómo correr en desarrollo
- Variables de entorno
- Deploy
- Troubleshooting
- Notas de seguridad

---

## ✨ Descripción General

- Plataforma de reservas de golf con soporte multi-idioma (es/en), pagos seguros y panel administrativo.
- Experiencia cuidada de checkout con selección dinámica de método de pago, reintentos y fallback.
- Admin para gestión de cursos, horarios, reglas de precio, usuarios y contenido.

## 💻 Tecnologías Principales

- Framework: Next.js (App Router)
- UI: Tailwind CSS + shadcn/ui
- Autenticación: Firebase Authentication
- Base de datos: Firestore
- Storage: Firebase Storage
- Pagos: Stripe y PayPal
- Observabilidad: Sentry + logs en Firestore

## 🏗 Arquitectura Remasterizada (SSR/CSR)

- Separación estricta de server/client acorde a App Router:
  - Páginas y rutas de API server-side por defecto.
  - Componentes interactivos marcan `"use client"` y consumen APIs/SDK cliente.
- SSR para páginas públicas y datos iniciales; CSR en flujos con alto nivel de interacción (checkout, perfil, admin en tabs específicas).
- Middleware de i18n para segmentar `/[lang]` y propagar `Locale`.
- Sentry configurado con `next.config.mjs` y headers CSP dinámicos por entorno.

## 📂 Estructura del App Router

```
src/
├── app/
│   ├── [lang]/
│   │   ├── book/checkout/page.tsx        # Checkout (Stripe Elements)
│   │   ├── book/cancel/page.tsx          # Cancelación de pago
│   │   ├── admin/...                      # Panel administrativo
│   │   └── ...
│   ├── api/...
│   └── (otras rutas)
├── app/[lang]/book/success/page.tsx      # Página de éxito (client)
├── components/CheckoutForm.tsx           # Componente principal de checkout
├── lib/payments/...                      # Integración y utilidades de pagos
├── hooks/useLogger.ts                    # Log de funnel en Firestore
└── i18n-config.ts                        # Tipado y locales
```

Notas:
- La página de éxito vive en `src/app/[lang]/book/success/page.tsx` y se accede desde `/${lang}/book/success`. Asegura incluir el segmento de idioma en la URL de retorno.

## 🔁 Flujo Booking → Checkout → Success/Cancel

- Booking: selección de curso/fecha/hora/jugadores; generación de `quote` vía `POST /api/checkout/quote`.
- Checkout: creación de `PaymentIntent` vía `POST /api/checkout/create-intent`; render de Stripe Elements y/o PayPal.
- Success: redirección a `/${lang}/book/success` con parámetros del booking y confirmaciones.
- Cancel: redirección a `/${lang}/book/cancel` y registro de evento `abandoned`.

Puntos de referencia:
- Confirmación Stripe: `src/components/CheckoutForm.tsx:536`.
- Redirección éxito: `src/components/CheckoutForm.tsx:966–981`.
- Cancelación: `src/app/[lang]/book/cancel/page.tsx:22–35`.

## 📈 Funnel de Eventos y Monitoreo

- Hook `useLogger` registra etapas: `view | select | checkout | abandoned | paid` en `visit_logs`.
- Endpoint `POST /api/log-visits` enriquece con país y normaliza payload.
- Sentry captura errores de cliente/servidor; ver avisos de instrumentación en desarrollo.

## 🧪 Cómo correr en desarrollo

- Requisitos: Node 18+, npm/yarn/pnpm, proyecto Firebase configurado.
- Instalación:
  - `npm install`
  - Copiar `.env.example` a `.env.local` y completar variables.
  - `npm run dev` y abrir `http://localhost:3000`.

## 🔑 Variables de entorno

Guía completa para configurar entornos.

### Desarrollo (`.env.local`)

Configura las siguientes variables con claves reales:

```
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000

NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

NEXT_PUBLIC_PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
NEXT_PUBLIC_PAYPAL_ENVIRONMENT=sandbox
PAYPAL_WEBHOOK_ID=...

GA4_API_SECRET=...

NEXT_PUBLIC_RECAPTCHA_SITE_KEY=...
RECAPTCHA_SECRET_KEY=...
```

Reglas:
- Evita valores que contengan `your` o `placeholder`.
- No dupliques variables.
- Reinicia el servidor tras cambios.

### Producción (`.env`)

Solo variables genéricas, sin secretos:

```
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_APP_URL=https://teereserve.golf
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
```

Configura los secretos en el proveedor (Firebase Hosting, Vercel, etc.).

### Uso correcto en código

- Stripe (cliente): `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- PayPal (cliente): `NEXT_PUBLIC_PAYPAL_CLIENT_ID`.
- GA4 (server): `GA4_API_SECRET`.
- reCAPTCHA: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` en cliente y `RECAPTCHA_SECRET_KEY` en servidor.

### Validación automática

Ejecuta `node scripts/check-env-vars.js` para validar variables críticas.

## 🚀 Deploy

- Opción 1: Firebase App Hosting (recomendado con `output: 'standalone'`).
  - Build: `npm run build`
  - Deploy siguiendo guía de App Hosting.
- Opción 2: Vercel/Node server
  - `npm run build && npm run start`
  - Configurar variables y secretos en el proveedor.

## 🛠 Troubleshooting

- Sentry: avisos de "instrumentation" y "global-error" en dev si falta archivo de instrumentación; no bloquea.
- Next.js workspace root: si hay lockfiles en distintos directorios, ajustar `outputFileTracingRoot` si es necesario.
- Stripe en local: revisar CSP y claves válidas.
- PayPal SDK: si no carga, confirmar `NEXT_PUBLIC_PAYPAL_CLIENT_ID` y `components: 'buttons'`.
- Verificación email 404: ver sección específica más abajo.

## 🔒 Notas de seguridad

- Stripe/PayPal: nunca loguear PII; usar `metadata` solo para IDs y datos técnicos.
- Firestore cliente: reglas deben impedir lecturas/escrituras sensibles; los logs (`visit_logs`) no deben almacenar datos personales.
- Variables: nunca commitear secretos; usar `.env.local`.

---

## 🔑 Environment Variables

Crear `.env.local` con variables. A continuación un índice de grupos; no pegues valores reales.

### 🔥 Firebase (Cliente/Admin)
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="..."
```

### 💳 Pagos
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

NEXT_PUBLIC_PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
NEXT_PUBLIC_PAYPAL_ENVIRONMENT=
PAYPAL_WEBHOOK_ID=
```

### 📧 Email
```bash
RESEND_API_KEY=
EMAIL_FROM=
RESEND_FROM_EMAIL=
CONTACT_FORM_RECIPIENT=
```

### 🛡 Observabilidad y otros
```bash
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_ENVIRONMENT=
SENTRY_ORG=
SENTRY_PROJECT=
NEXT_PUBLIC_SITE_URL=
```

---

## 📜 Scripts disponibles

- `npm run dev`: servidor de desarrollo
- `npm run build`: build producción
- `npm run start`: servidor producción
- `npm run lint`: lint del proyecto

---

## 🧹 Mantenimiento de Precios: Deduplicación en Firestore

Sección operativa para admins; ver detalles y endpoint en esta misma página.

## ⚠️ Solución a 404 en enlaces de verificación de email

Guía para ajustar dominios y `continueUrl` en flujos de verificación.

## 🔌 Toggle: desactivar verificación de email temporalmente

Control mediante `NEXT_PUBLIC_REQUIRE_EMAIL_VERIFICATION=false` durante pruebas.
