## Problema
El dev server de Next usa React Refresh (HMR) y runtime que requiere `eval`. Nuestra CSP unificada quitó `unsafe-eval`, provocando `EvalError` en desarrollo.

## Solución (solo desarrollo)
- Actualizar `next.config.mjs` para aplicar CSP condicional:
  - En producción: mantener `script-src` sin `unsafe-eval` (más estricto).
  - En desarrollo: incluir `'unsafe-eval'` en `script-src` para habilitar React Refresh.

## Cambios Propuestos
- `next.config.mjs` → `headers()`
  - Calcular `isDev = process.env.NODE_ENV !== 'production'`.
  - Construir directiva `script-src` agregando `'unsafe-eval'` cuando `isDev`.
  - Mantener el resto de orígenes (Stripe, PayPal, Firebase, localhost) y demás directivas iguales.
- No tocar `firebase.json` (no afecta dev server de Next).

## Validación
- `npm run dev` sin `EvalError`.
- HMR/React Refresh funciona.
- `stripe listen` y UI siguen operativos.
- En producción, CSP continúa sin `unsafe-eval`.

¿Apruebas aplicar esta actualización condicional en `next.config.mjs`?