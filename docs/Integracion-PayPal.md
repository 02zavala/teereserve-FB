# Integración con PayPal

Componente
- `src/components/PayPalButton.tsx` con `@paypal/react-paypal-js`.
- `createOrder` y `onApprove` capturan el pago y notifican al usuario.

Webhooks
- `src/app/api/paypal/webhook/route.ts` maneja eventos:
  - `PAYMENT.CAPTURE.COMPLETED`, `CHECKOUT.ORDER.APPROVED`, `CHECKOUT.ORDER.COMPLETED`, entre otros.
- Enviar alertas y actualizar estado del booking cuando corresponda.

Configuración
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`.
- CSP y `frame-src` habilitan dominios de PayPal en `next.config.mjs`.

