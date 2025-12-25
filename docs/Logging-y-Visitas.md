# Logging y /api/log-visits

Objetivo
- Registrar el funnel del usuario para análisis: `view`, `select`, `checkout`, `abandoned`, `paid`.

Hook `useLogger`
- Archivo: `src/hooks/useLogger.ts`.
- Función: `logEvent(eventName, data)` agrega un documento en `visit_logs` (Firestore) con:
  - `event`, `courseId`, `teeTime`, `stage`, `timestamp`, `userAgent`, `device`, `referrer`, `url`, `lang`, `timezone`, `country`, `extra`.

Endpoint `/api/log-visits`
- Archivo: `src/app/api/log-visits/route.ts`.
- Formato de request:
  - Body JSON: `{ courseId: string, teeTime: string, stage: string, lang?: string }`.
- Respuesta:
  - JSON enriquecido con `{ country?: string }`.

Buenas prácticas
- No almacenar PII (evitar email, nombre, etc.).
- Usar `extra` para datos técnicos anonimizados.
- En producción, revisar cuotas de Firestore y agregar retención si necesario.

