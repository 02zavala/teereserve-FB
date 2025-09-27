# Sistema de Fallback USD → MXN

## Descripción General

Este sistema implementa un mecanismo de fallback automático que permite procesar pagos en pesos mexicanos (MXN) cuando Stripe rechaza un pago en dólares estadounidenses (USD) debido a restricciones de política de moneda.

## Flujo de Funcionamiento

### 1. Intento Inicial en USD
- El sistema intenta crear un Payment Intent en USD
- Si es exitoso, procede normalmente con el pago en USD

### 2. Detección de Error de Política de Moneda
- Si Stripe rechaza el pago con un error de tipo `card_error` y código `currency_not_supported`
- El sistema detecta automáticamente esta condición

### 3. Fallback Automático a MXN
- Convierte el monto de USD a MXN usando la tasa de cambio configurada
- Crea un nuevo Payment Intent en MXN
- Intenta procesar el pago nuevamente

### 4. Persistencia de Datos
- Registra información detallada del pago en Firestore
- Incluye metadatos sobre la moneda final, tasa de cambio y intento de moneda

## Componentes Implementados

### 1. API Route: `/api/create-or-retry-payment-intent`
**Ubicación:** `src/app/api/create-or-retry-payment-intent/route.ts`

**Funcionalidades:**
- Maneja la creación de Payment Intents con fallback automático
- Detecta errores de política de moneda de Stripe
- Convierte montos usando tasa de cambio configurable
- Incluye metadatos completos para tracking

**Parámetros de entrada:**
```typescript
{
  amountUsd: number,
  customerId?: string,
  tempBookingId: string
}
```

**Respuesta exitosa:**
```typescript
{
  clientSecret: string,
  paymentIntentId: string,
  currency: 'usd' | 'mxn',
  amount: number,
  retried?: boolean
}
```

### 2. Webhook de Stripe Actualizado
**Ubicación:** `src/app/api/webhooks/stripe/route.ts`

**Mejoras implementadas:**
- Persiste datos de pagos exitosos con `logSuccessfulPayment`
- Incluye metadatos de fallback en logs de pagos fallidos
- Registra información de moneda final, tasa de cambio y booking ID

### 3. Funciones de Logging
**Ubicación:** `src/lib/data.ts`

**Nuevas interfaces:**
```typescript
interface SuccessfulPaymentLog {
  paymentIntentId: string;
  bookingId: string;
  final_currency: string;
  amount_received: number;
  fxRate?: string;
  currencyAttempt?: string;
  priceUsd?: number;
  createdAt: Timestamp;
}

interface FailedPaymentLog {
  // ... campos existentes
  bookingId?: string;
  fxRate?: string;
  currencyAttempt?: string;
  priceUsd?: number;
}
```

### 4. Frontend Actualizado
**Ubicación:** `src/components/CheckoutForm.tsx`

**Mejoras implementadas:**
- Integración con nueva API de fallback
- Manejo de segundo intento de `confirmPayment` si es necesario
- Nota informativa opcional para pagos procesados en MXN
- Estado `showFxNote` para mostrar información al usuario

## Configuración

### Variables de Entorno

Agregar al archivo `.env.local`:

```bash
# Tasa de cambio de fallback (USD a MXN)
FX_RATE_FALLBACK=20.00

# Mostrar nota de FX en el frontend (opcional)
NEXT_PUBLIC_SHOW_FX_NOTE=false
```

### Configuración de Tasa de Cambio

La tasa de cambio se configura mediante la variable `FX_RATE_FALLBACK`:
- **Valor por defecto:** 20.00 (si no se especifica)
- **Formato:** Número decimal (ej: 20.50)
- **Uso:** 1 USD = FX_RATE_FALLBACK MXN

### Nota de FX en Frontend

Para mostrar una nota informativa cuando se procesa un pago en MXN:
- Establecer `NEXT_PUBLIC_SHOW_FX_NOTE=true`
- La nota aparece como: *"Pago procesado en MXN equivalente a tu tarifa en USD."*

## Datos Persistidos

### Pagos Exitosos
Se almacenan en la colección `successful_payments` de Firestore:
- Payment Intent ID
- Booking ID
- Moneda final del pago
- Monto recibido
- Tasa de cambio utilizada (si aplica)
- Intento de moneda original
- Precio original en USD (si se convirtió)

### Pagos Fallidos
Se almacenan en la colección `failed_payments` de Firestore con metadatos adicionales:
- Información estándar de error de Stripe
- Booking ID asociado
- Tasa de cambio utilizada (si aplica)
- Intento de moneda
- Precio original en USD

## Casos de Uso

### Caso 1: Pago Exitoso en USD
1. Usuario ingresa datos de tarjeta
2. Sistema crea Payment Intent en USD
3. Pago se procesa exitosamente
4. Se registra en `successful_payments` con `final_currency: 'usd'`

### Caso 2: Fallback a MXN
1. Usuario ingresa datos de tarjeta
2. Sistema intenta crear Payment Intent en USD
3. Stripe rechaza por restricción de moneda
4. Sistema convierte a MXN y crea nuevo Payment Intent
5. Pago se procesa exitosamente en MXN
6. Se registra en `successful_payments` con metadatos de conversión
7. Usuario ve nota informativa (si está habilitada)

### Caso 3: Fallo en Ambas Monedas
1. Usuario ingresa datos de tarjeta
2. Sistema intenta USD, falla por restricción de moneda
3. Sistema intenta MXN, falla por otro motivo
4. Se registra en `failed_payments` con metadatos completos
5. Usuario recibe mensaje de error apropiado

## Monitoreo y Debugging

### Logs de Aplicación
- Todos los intentos de pago se registran con nivel INFO
- Errores se registran con nivel ERROR
- Conversiones de moneda se registran con metadatos completos

### Webhook de Stripe
- Eventos `payment_intent.succeeded` y `payment_intent.payment_failed`
- Incluyen metadatos completos para análisis posterior
- Permiten tracking de tasas de éxito por moneda

### Firestore Collections
- `successful_payments`: Análisis de pagos exitosos
- `failed_payments`: Análisis de fallos y patrones de error

## Consideraciones de Seguridad

1. **Tasa de Cambio:** Se usa una tasa fija configurable, no APIs externas en tiempo real
2. **Validación:** Todos los montos se validan antes de la conversión
3. **Metadatos:** Se incluye información completa para auditoría
4. **Logs:** No se registran datos sensibles de tarjetas

## Mantenimiento

### Actualización de Tasa de Cambio
1. Modificar `FX_RATE_FALLBACK` en variables de entorno
2. Reiniciar la aplicación
3. La nueva tasa se aplicará a todos los pagos subsecuentes

### Monitoreo de Performance
- Revisar logs de Firestore para patrones de fallback
- Analizar tasas de éxito por moneda
- Monitorear tiempos de respuesta de la API

## Testing

### Casos de Prueba Recomendados
1. Pago exitoso en USD
2. Pago con fallback a MXN
3. Fallo en ambas monedas
4. Validación de metadatos en Firestore
5. Funcionamiento de nota de FX en frontend

### Tarjetas de Prueba
Usar tarjetas de prueba de Stripe que generen errores específicos de moneda para validar el fallback.