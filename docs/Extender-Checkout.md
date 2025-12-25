# Extender Checkout

Agregar métodos de pago
- Añadir componentes bajo `src/components/*` y habilitar tabs en `CheckoutForm`.
- Actualizar lógica de preselección con `fallback-service` según salud del servicio.

Agregar idiomas
- Añadir diccionarios, actualizar rutas en `src/app/[lang]` y propagar `Locale`.
- Verificar redirecciones y `return_url` preservando el segmento `/[lang]`.

Copys y reintentos
- Actualizar mensajes en `CheckoutForm` y `stripe-error-handler` para guiar al usuario en fallbacks.

