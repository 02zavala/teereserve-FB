## Objetivo
Aplicar versionado controlado, CSP unificada, reglas de Storage más estrictas, rate limit distribuido y verificación CSRF en endpoints sensibles, sin romper la funcionalidad actual.

## Cambios
1. Versionado y CI: fijar Next/React/Stripe; activar typecheck y lint; bypass sólo en preview.
2. CSP: consolidar en `next.config.mjs`; eliminar duplicado dinámico en `firebase.json`; sin `unsafe-eval`.
3. Storage rules: escritura en `courses/site-content/team-avatars` sólo admin.
4. Rate limit distribuido: wrapper Redis REST; fallback en memoria si no hay env.
5. CSRF: validación en endpoints POST llamados desde navegador.

## Archivos
- `package.json`, `next.config.mjs`, `firebase.json`, `storage.rules`, `src/lib/ratelimit.ts`, `src/middleware.ts`, endpoints POST clave.

## Validación
- `ci:check` en preview; revisar CSP; pruebas de uploads admin; simulación rate limit.

Procedo a aplicar los cambios y compartir resultados.