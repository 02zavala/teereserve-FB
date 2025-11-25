# Esquema del Proyecto TeeReserve

Este documento ofrece una visión general rápida del proyecto, su estructura y los flujos clave, para facilitar onboarding y mantenimiento.

## Visión General
- Plataforma de reservas de golf construida con `Next.js (App Router)`.
- Autenticación y base de datos en `Firebase` (Auth + Firestore + Storage).
- Pasarelas de pago: `Stripe` (principal) y `PayPal` (opcional).
- Panel Admin para gestionar cursos, precios, temporadas, bandas horarias y más.

## Estructura de Directorios (resumen)
```
src/
├─ app/                  # Rutas (App Router)
│  ├─ [lang]/            # Páginas localizadas (en/es)
│  │  └─ admin/          # Panel administrativo
│  ├─ api/               # Endpoints internos (Edge/Node)
│  │  └─ admin/pricing/  # Carga/guardado/dedupe de precios
│  ├─ layout.tsx         # Layout global
│  └─ globals.css        # Estilos globales
├─ components/           # UI y vistas
│  ├─ admin/             # Vistas y controles de administración
│  ├─ ui/                # Componentes shadcn/ui
│  └─ checkout/          # Flujo de pago
├─ lib/                  # Lógica de negocio y utilidades
│  ├─ firebase.ts        # Cliente Firebase
│  ├─ firebase-admin.ts  # Admin SDK Firebase
│  ├─ pricing-engine.ts  # Motor de precios (cliente)
│  ├─ pricing-backend.ts # Utilidades servidor para pricing
│  ├─ analytics.ts       # Integración Analytics
│  └─ payments/          # Integraciones de pago
├─ context/              # Contextos React (Auth, etc.)
├─ hooks/                # Hooks reutilizables
├─ ai/                   # Flujos Genkit/AI
└─ types/                # Tipos compartidos
```

## Módulos Principales
- `AuthContext` (`src/context/AuthContext.tsx`): provee estado de autenticación e ID token.
- `pricing-engine.ts`:
  - Mantiene caches en memoria de `seasons`, `timeBands`, `priceRules` por `courseId`.
  - Carga/guarda pricing y expone utilidades de deduplicación (cliente + Firestore).
- Endpoints Admin Pricing (`src/app/api/admin/pricing/*`):
  - `load/route.ts`: carga datos de pricing desde Firestore.
  - `save/route.ts`: persiste cambios de pricing.
  - `dedupe/route.ts`: elimina duplicados en Firestore (reglas y bandas).
- Componentes Admin (p.ej. `src/components/admin/PricingManager.tsx`): UI para gestionar reglas, temporadas y bandas.

## Flujo de Deduplicación de Precios
1. Desde el Panel Admin (curso `puerto-los-cabos` u otros), el botón verde “Eliminar duplicados por nombre” llama a:
   - `pricingEngine.dedupePriceRulesByNameInFirestore(courseId, strategy)`.
2. El cliente realiza `POST /api/admin/pricing/dedupe` con:
   ```json
   { "courseId": "<id>", "type": "priceRulesByName", "strategy": "highest_priority" }
   ```
3. El endpoint valida `Authorization: Bearer <idToken>` y que el usuario sea admin.
4. En Firestore:
   - Agrupa por `name` (normalizado).
   - Conserva una por nombre según `strategy` (`highest_priority` o `latest`).
   - Elimina las demás en batch.
5. La respuesta incluye `removedCount` y la UI recarga datos (`loadData()`).

Notas específicas:
- Para `puerto-los-cabos`, las reglas sin `timeBandId` (generales) se preservan; por banda se mantiene la de mayor prioridad.
- El botón rojo “Eliminar duplicados en Firestore” usa una clave compuesta exacta y es útil para duplicados idénticos.

## API Clave
- `POST /api/admin/pricing/dedupe`:
  - Body: `{ courseId, type: 'timeBands'|'priceRules'|'priceRulesByName'|'all', strategy? }`.
  - Respuesta: `{ success, removedCount, message }` o `{ error, details }`.
- Todos los endpoints Admin requieren cabecera `Authorization: Bearer <idToken>` y rol `admin/superadmin`.

## Frontend Clave
- `PricingManager.tsx`: controla acciones de dedupe (por nombre y exacto) y recarga los datos tras operación.
- `components/ui/input.tsx`: componente de entrada ajustado para no forzar estado controlado cuando no corresponde.

## Desarrollo y Scripts
- `npm run dev`: servidor de desarrollo en `http://localhost:3000`.
- `scripts/test-quote-local.js`: pruebas de cotización local.
- `scripts/deploy.js`: utilidades de despliegue.

## Glosario Rápido
- `Season`: Temporada con fechas y reglas asociadas.
- `TimeBand`: Banda horaria (p. ej., Early Morning).
- `PriceRule`: Regla de precio con condiciones y `priority`.
- `removedCount`: número de documentos eliminados durante dedupe.