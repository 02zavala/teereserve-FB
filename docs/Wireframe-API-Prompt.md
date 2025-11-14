# Wireframe API v1 — teereserve.golf

Este documento es un prompt reutilizable para implementar y evolucionar el API canónico `/v1` de TeeReserve. Úsalo tal cual en una futura sesión para que el asistente continúe el trabajo con el contexto correcto.

## Contexto actual
- Proyecto Next.js con App Router bajo `src/app/`.
- Endpoints ya existentes para recibo PDF; `pdfkit` externalizado en `next.config.mjs` y funcionando con `runtime: 'nodejs'`.
- Objetivo: definir y scaffoldear `/api/teereserve.golf/v1/...` con datos mock y arquitectura de adaptadores.

## Objetivo
- Crear el Wireframe API con endpoints canónicos: cursos, disponibilidad, tarifas, pagos, reservas, cancelaciones y recibos.
- Documentar con OpenAPI y dejar lista la capa de adaptadores (`mock` y futura `teemanage`).

## Entregables
- Rutas en `src/app/api/v1/` con handlers stub y respuestas válidas JSON.
- `docs/api.yaml` (OpenAPI) describiendo los endpoints y esquemas base.
- `src/lib/integrations/mock/` con interfaz `TeeSheetProvider` y datos realistas.
- Switch de proveedor vía env `TEE_PROVIDER`.

## Criterios de aceptación
- Endpoints responden 200 con estructuras JSON coherentes y estables.
- `POST /v1/bookings` y `POST /v1/payments/intent` aceptan `Idempotency-Key`.
- `POST /v1/receipts` stream de PDF (Node runtime) funciona con payload mock.
- OpenAPI compila sin errores; JSON Schemas referenciados correctamente.

## Pasos de implementación sugeridos
1. Crear directorio `src/app/api/v1/` con subrutas:
   - `courses`, `courses/[id]`, `courses/[id]/availability`, `courses/[id]/rates`.
   - `payments/intent`, `bookings`, `bookings/[id]`, `bookings/[id]/cancel`.
   - `receipts` (usa `src/lib/receipt-pdf.ts`, runtime Node).
2. Añadir `docs/api.yaml` con OpenAPI (versión 3.1) y esquemas `Course`, `Availability`, `Rate`, `Booking`, `Customer`, `PaymentIntent`, `ReceiptRequest`.
3. Crear `src/lib/integrations/TeeSheetProvider.ts` (interfaz) y `src/lib/integrations/mock/index.ts` (implementación base).
4. Implementar un `providerRouter` que resuelva adaptador según `process.env.TEE_PROVIDER` (por defecto `mock`).
5. Incluir idempotencia en endpoints de creación y logs estructurados.

## Prompt reutilizable (copia y pega)

Responde siempre en español.

Contexto: Estoy en un proyecto Next.js (App Router) con endpoints existentes para PDF usando `pdfkit` externalizado. Quiero implementar el Wireframe API canónico bajo `src/app/api/v1/` y documentarlo con OpenAPI.

Objetivo: 
- Scaffold de endpoints: `GET /v1/courses`, `GET /v1/courses/{id}`, `GET /v1/courses/{id}/availability`, `GET /v1/courses/{id}/rates`, `POST /v1/payments/intent`, `POST /v1/bookings`, `GET /v1/bookings/{id}`, `POST /v1/bookings/{id}/cancel`, `POST /v1/receipts`.
- Capa de adaptadores con interfaz `TeeSheetProvider` y `mock` por defecto.
- OpenAPI en `docs/api.yaml` con JSON Schemas.
- Idempotencia (`Idempotency-Key`) en `POST /bookings` y `POST /payments/intent`.

Alcance y restricciones:
- Usar `NextResponse.json()` para endpoints JSON y `runtime: 'nodejs'` donde dependamos de SDKs Node (pagos, PDF).
- Mantener `serverExternalPackages` para `pdfkit` y cualquier SDK de terceros que lo requiera.
- No romper rutas actuales; todo nuevo bajo `/v1`.

Entregables concretos:
- Archivos en `src/app/api/v1/...` con handlers y tipos básicos.
- `src/lib/integrations/TeeSheetProvider.ts` y `src/lib/integrations/mock/index.ts` con datos realistas.
- `docs/api.yaml` con los endpoints y esquemas.

Aceptación:
- Respuestas 200 válidas con estructuras JSON consistentes.
- `POST /v1/receipts` genera un PDF válido con los datos mock (stream Web / Node).
- OpenAPI válido (sin errores de lint/parseo).

Acciones:
1) Crear los directorios/archivos y handlers stub.
2) Implementar el adaptador `mock` y el `providerRouter`.
3) Escribir `docs/api.yaml` con ejemplos de request/response.
4) Probar con `curl`/script que cada endpoint responde correctamente.
5) Documentar envs (`TEE_PROVIDER`, claves de prueba) y notas de despliegue.

Por favor, procede a implementar el scaffolding y deja todo listo con datos mock y OpenAPI. No hagas cambios en UI.