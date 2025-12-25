# Reglas Firestore (cliente)

Principios
- Lecturas/escrituras sensibles solo desde server (Admin SDK) o endpoints autenticados.
- Colecciones cliente (p.ej. `visit_logs`) deben evitar PII y limitarse a datos técnicos.

Recomendaciones
- Implementar reglas que restrinjan `users/*`, `bookings/*` según `request.auth.uid` y roles.
- Validar estructura mínima y tipos (usando `rules` y `validate`).
- Para operaciones admin (precios, cursos), usar rutas `src/app/api/admin/*` con verificación de token.

