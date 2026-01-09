# TeeReserve Golf Platform 🌍⛳

![TeeReserve](./workspace/public/logo.svg)

TeeReserve es una plataforma premium para reservar tee times y experiencias de golf, construida con Next.js App Router y un stack moderno. Este README describe la arquitectura remasterizada, el flujo completo del funnel de reservas y las integraciones clave.

---

## 📋 Índice

- [Descripción general](#-descripción-general)
- [Tecnologías principales](#-tecnologías-principales)
- [Arquitectura (Workspace)](#-arquitectura-workspace)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Flujo booking → checkout → success/cancel](#-flujo-booking--checkout--successcancel)
- [Funnel de eventos y monitoreo](#-funnel-de-eventos-y-monitoreo)
- [Cómo correr en desarrollo](#-cómo-correr-en-desarrollo)
- [Variables de entorno](#-variables-de-entorno)
- [Deploy](#-deploy)

---

## ✨ Descripción General

- Plataforma de reservas de golf con soporte multi-idioma (es/en), pagos seguros y panel administrativo.
- Experiencia cuidada de checkout con selección dinámica de método de pago, reintentos y fallback.
- Admin para gestión de cursos, horarios, reglas de precio, usuarios y contenido.

## 💻 Tecnologías Principales

- **Framework:** Next.js 15+ (App Router)
- **UI:** Tailwind CSS + shadcn/ui
- **Autenticación:** Firebase Authentication
- **Base de datos:** Firestore
- **Storage:** Firebase Storage
- **Pagos:** Stripe y PayPal
- **Observabilidad:** Sentry + logs en Firestore

## 🏗 Arquitectura (Workspace)

El proyecto ha sido reestructurado para utilizar un **monorepo simplificado** bajo la carpeta `workspace/`.
Toda la aplicación Next.js reside dentro de `workspace/`, manteniendo la raíz del repositorio limpia para configuraciones globales de Firebase y documentación.

- **Separación Server/Client:**
  - Páginas y rutas de API server-side por defecto.
  - Componentes interactivos marcan `"use client"` y consumen APIs/SDK cliente.
- **Middleware de i18n:** Segmentación `/[lang]` y propagación de `Locale`.
- **Sentry:** Configurado en `workspace/sentry.*.config.ts`.

## 📂 Estructura del Proyecto

```
/
├── docs/                   # Documentación técnica detallada
├── workspace/              # Aplicación Next.js principal
│   ├── src/
│   │   ├── app/
│   │   │   ├── [lang]/     # Rutas localizadas
│   │   │   ├── api/        # Endpoints API (Server Functions)
│   │   │   └── ...
│   │   ├── components/     # Componentes UI reutilizables
│   │   ├── lib/            # Lógica de negocio, clientes de API
│   │   └── ...
│   ├── public/             # Assets estáticos (imágenes, iconos)
│   ├── next.config.ts      # Configuración de Next.js
│   └── package.json        # Dependencias del proyecto
├── firebase.json           # Configuración de Hosting/Functions
└── README.md
```

## 🔁 Flujo Booking → Checkout → Success/Cancel

- **Booking:** Selección de curso/fecha/hora/jugadores.
- **Checkout:** Creación de `PaymentIntent` vía `POST /api/checkout/create-intent`.
- **Success:** Redirección a `/${lang}/book/success` con parámetros del booking.
- **Cancel:** Redirección a `/${lang}/book/cancel`.

## 📈 Funnel de Eventos y Monitoreo

- Hook `useLogger` registra etapas: `view | select | checkout | abandoned | paid` en `visit_logs`.
- Endpoint `POST /api/log-visits` enriquece con país y normaliza payload.

## 🧪 Cómo correr en desarrollo

**Prerrequisitos:** Node 18+, npm.

1.  **Entrar al workspace:**
    Es fundamental ejecutar los comandos desde la carpeta `workspace`.
    ```bash
    cd workspace
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno:**
    Copia `.env.example` a `.env.local` dentro de `workspace/` y completa las credenciales.
    ```bash
    cp .env.example .env.local
    ```

4.  **Iniciar servidor de desarrollo:**
    ```bash
    npm run dev
    ```
    Abre [http://localhost:3000](http://localhost:3000).

## 🔑 Variables de entorno

El archivo `.env.local` debe estar ubicado en `workspace/.env.local`.
Contiene claves para:
- Firebase (Cliente y Admin)
- Stripe / PayPal
- Sentry
- Resend (Emails)

## � Deploy

El proyecto está configurado para desplegarse en **Firebase Hosting** usando `firebase-frameworks` o soporte nativo de Next.js.
El archivo `firebase.json` en la raíz ya apunta a `workspace` como la fuente ("source").

```bash
firebase deploy
```
