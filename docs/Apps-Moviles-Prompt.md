# Apps Móviles — iOS y Android

Este documento es un prompt reutilizable para iniciar y evolucionar las apps móviles (iOS/Android) de TeeReserve. Úsalo tal cual en una futura sesión para continuar el trabajo con el contexto correcto.

## Contexto
- Backend canónico `v1` expuesto en `api.teereserve.golf/v1` (pendiente de finalizar Wireframe).
- Flujo web de reservas y PDF de recibo ya probado en servidor Node.
- Objetivo: definir y scaffoldear app móvil con login, cursos, disponibilidad, reserva, pago y recibo.

## Objetivo
- Crear base de app móvil (recomendado: React Native con Expo o PWA+Capacitor) que consuma `/v1`.
- Dejar estructura de pantallas, navegación y servicios de API lista para iterar.

## Entregables
- Proyecto inicial (Expo RN o PWA+Capacitor) con:
  - Pantallas: Login, Lista de campos, Disponibilidad (calendario/slots), Detalle/Tarifas, Checkout, Confirmación y Recibo.
  - Servicios: `apiClient` para `/v1` (auth, courses, availability, rates, bookings, payments, receipts).
  - Config: envs, navegación, theming, internacionalización (ES/EN).
  - Push notifications (APNs/FCM) y deep links (estructura lista, activación posterior).

## Criterios de aceptación
- Flujo básico: selección de campo → disponibilidad → tarifas → checkout → confirmación → recibo (vista o descarga).
- Manejo de errores y estados de carga; soporte offline limitado (caché básica de disponibilidad).
- Preparación para publicación: íconos, splash, textos base y estructura de CI/CD.

## Pasos de implementación sugeridos
1. Elegir stack (Expo RN recomendado por velocidad) y crear proyecto.
2. Configurar navegación y i18n; crear servicios `apiClient` hacia `/v1`.
3. Scaffold de pantallas y flujos con mocks, conectando progresivamente al backend real.
4. Integrar pasarela de pagos (externa para bienes del mundo real) y manejo de recibos (PDF viewer/descarga).
5. Configurar push y deep links; preparar assets y metadatos para stores.

## Prompt reutilizable (copia y pega)

Responde siempre en español.

Contexto: Necesito iniciar la app móvil de TeeReserve (iOS/Android) consumiendo el API canónico `/v1` (`api.teereserve.golf/v1`). El backend tendrá endpoints para cursos, disponibilidad, tarifas, pagos, reservas y recibos.

Objetivo:
- Crear un proyecto base (preferible Expo React Native) con navegación, i18n ES/EN, servicios de API y pantallas clave del flujo de reserva.
- Preparar la app para publicación futura (assets, configuración, CI/CD básico).

Alcance y restricciones:
- Pagos para bienes del mundo real: usar pasarela externa (Stripe/PayPal). No usar IAP para reservas.
- Recibos en PDF: soporte de visualización/descarga (webview o visor compatible).
- Optimizar para performance y UX móvil (carga incremental, estados claros).

Entregables concretos:
- Proyecto Expo con pantallas: Login, Courses, Availability, Rates, Checkout, Confirmation, Receipt.
- Servicios `apiClient` para `/v1` y manejo de auth (API Key/JWT).
- Configuración de i18n, theming y navegación.
- Base para push (APNs/FCM) y deep links.

Aceptación:
- Flujo completo navegable con datos mock; integración progresiva al backend real.
- Estructura lista para compilar y probar en dispositivos.

Acciones:
1) Inicializar el proyecto y la navegación.
2) Crear `apiClient` y pantallas con datos mock.
3) Conectar `/v1` para cursos → disponibilidad → tarifas.
4) Implementar checkout y confirmación; añadir recibo.
5) Configurar push/deep links (estructura) y assets.

Por favor, procede a crear el scaffolding de la app móvil (Expo RN) con los servicios y pantallas indicadas, listo para conectar al backend `/v1`.