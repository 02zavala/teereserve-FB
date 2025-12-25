# Integración con Stripe

Flujo general
- Quote: `POST /api/checkout/quote` genera `subtotal/total` y moneda.
- Intent: `POST /api/checkout/create-intent` crea `PaymentIntent` (Stripe) con `automatic_payment_methods` y `metadata`.
- Elements: Render en `src/app/[lang]/book/checkout/page.tsx` y confirmación en `src/components/CheckoutForm.tsx`.
- Redirección: éxito a `/${lang}/book/success`, cancelación a `/${lang}/book/cancel`.

Metadata utilizada
- `bookingId`, `fxRate`, `currencyAttempt`, `priceUsd` (ver `src/app/api/create-or-retry-payment-intent/route.ts`).

Manejo de errores
- Utilidad `src/lib/payments/stripe-error-handler.ts` mapea `code/decline_code` a mensajes de usuario y propone fallbacks (`paypal`, `link`).

Validación de método guardado
- Endpoint `src/app/api/validate-card/route.ts` crea un cargo de validación de $1 USD con `request_three_d_secure: 'automatic'`.

Seguridad
- No incluir PII en `metadata`.
- Backend debe verificar montos y moneda; nunca confiar en valores del cliente.

