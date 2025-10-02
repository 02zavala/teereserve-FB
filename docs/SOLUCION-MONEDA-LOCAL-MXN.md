# Solución para Procesamiento en Moneda Local (MXN)

## Resumen Ejecutivo

Este documento propone una solución integral para procesar pagos directamente en pesos mexicanos (MXN) utilizando una cuenta Stripe México, eliminando la necesidad del fallback USD-MXN y proporcionando una experiencia de pago más fluida para usuarios mexicanos.

## Problema Actual

- **Backend configurado en USD**: Todos los precios y cálculos se manejan en dólares
- **Cuenta Stripe MX**: La cuenta de Stripe está configurada para México pero el sistema intenta procesar en USD
- **Fallback complejo**: Sistema actual requiere intentar USD primero, luego convertir a MXN
- **Experiencia de usuario**: Los usuarios ven precios en USD pero pueden ser cobrados en MXN

## Solución Propuesta

### Opción 1: Configuración Dual de Monedas (Recomendada)

#### 1.1 Detección Automática de Región
```typescript
// Nuevo servicio de detección de región
export class RegionService {
  static detectUserRegion(request: NextRequest): 'MX' | 'US' | 'INTL' {
    // Detectar por IP, headers, configuración de usuario
    const country = request.geo?.country || 'US';
    return country === 'MX' ? 'MX' : country === 'US' ? 'US' : 'INTL';
  }
  
  static getCurrencyForRegion(region: string): 'MXN' | 'USD' {
    return region === 'MX' ? 'MXN' : 'USD';
  }
}
```

#### 1.2 Sistema de Precios Dinámicos
```typescript
// Modificar el sistema de cotización
interface EnhancedQuoteRequest extends QuoteRequest {
  preferredCurrency?: 'MXN' | 'USD';
  userRegion?: string;
}

interface EnhancedQuoteResponse extends QuoteResponse {
  currency: 'MXN' | 'USD';
  exchange_rate?: number;
  original_currency?: 'MXN' | 'USD';
}
```

#### 1.3 Configuración de Precios Base
```typescript
// Actualizar modelo de campos de golf
interface GolfCourse {
  // ... campos existentes
  basePriceUSD: number;
  basePriceMXN: number; // Nuevo campo
  preferredCurrency: 'MXN' | 'USD' | 'AUTO'; // Nuevo campo
}
```

### Opción 2: Migración Completa a MXN (Alternativa)

#### 2.1 Conversión de Base de Datos
- Convertir todos los precios base de USD a MXN
- Mantener histórico en USD para reportes
- Actualizar todos los cálculos para usar MXN como moneda base

#### 2.2 Configuración de Stripe
- Usar exclusivamente la cuenta Stripe México
- Procesar todos los pagos en MXN
- Mostrar precios en MXN a todos los usuarios

## Implementación Detallada (Opción 1)

### Fase 1: Infraestructura Base

#### 1. Actualizar Variables de Entorno
```env
# Configuración de monedas
DEFAULT_CURRENCY=MXN
ENABLE_MULTI_CURRENCY=true
USD_TO_MXN_RATE=20.00
AUTO_DETECT_REGION=true

# Configuración Stripe
STRIPE_ACCOUNT_COUNTRY=MX
STRIPE_DEFAULT_CURRENCY=MXN
```

#### 2. Servicio de Conversión de Monedas
```typescript
// src/lib/currency-service.ts
export class CurrencyService {
  private static readonly USD_TO_MXN_RATE = parseFloat(process.env.USD_TO_MXN_RATE || '20.00');
  
  static convertUSDToMXN(amountUSD: number): number {
    return amountUSD * this.USD_TO_MXN_RATE;
  }
  
  static convertMXNToUSD(amountMXN: number): number {
    return amountMXN / this.USD_TO_MXN_RATE;
  }
  
  static formatCurrency(amount: number, currency: 'MXN' | 'USD'): string {
    return new Intl.NumberFormat(currency === 'MXN' ? 'es-MX' : 'en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }
}
```

### Fase 2: Actualización del Sistema de Cotización

#### 1. API de Cotización Mejorada
```typescript
// src/app/api/checkout/quote/route.ts
export async function POST(request: NextRequest) {
  const body: EnhancedQuoteRequest = await request.json();
  
  // Detectar región y moneda preferida
  const userRegion = RegionService.detectUserRegion(request);
  const preferredCurrency = body.preferredCurrency || 
    CurrencyService.getCurrencyForRegion(userRegion);
  
  // Calcular precios en la moneda preferida
  let basePriceCents: number;
  if (preferredCurrency === 'MXN') {
    // Si el precio base está en USD, convertir a MXN
    basePriceCents = Math.round(CurrencyService.convertUSDToMXN(body.basePrice) * 100);
  } else {
    basePriceCents = Math.round(body.basePrice * 100);
  }
  
  // Resto de la lógica de cálculo...
  
  return NextResponse.json({
    currency: preferredCurrency,
    subtotal_cents: basePriceCents,
    // ... resto de campos
  });
}
```

### Fase 3: Actualización del Sistema de Pagos

#### 1. API de Payment Intent Simplificada
```typescript
// src/app/api/create-payment-intent/route.ts
export async function POST(request: NextRequest) {
  const { amount, currency, bookingId, customerId } = await request.json();
  
  // Validar que la moneda sea soportada
  if (!['MXN', 'USD'].includes(currency)) {
    return NextResponse.json({ error: 'Currency not supported' }, { status: 400 });
  }
  
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convertir a centavos
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        bookingId,
        originalCurrency: currency,
        // Eliminar metadata de fallback
      },
      ...(customerId && { customer: customerId })
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      currency: currency
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 500 });
  }
}
```

### Fase 4: Actualización del Frontend

#### 1. Componente de Checkout Mejorado
```typescript
// Actualizar CheckoutForm.tsx
const [preferredCurrency, setPreferredCurrency] = useState<'MXN' | 'USD'>('MXN');

// Función para cambiar moneda
const handleCurrencyChange = (currency: 'MXN' | 'USD') => {
  setPreferredCurrency(currency);
  fetchQuote(appliedCoupon?.code, currency);
};

// Actualizar fetchQuote para incluir moneda preferida
const fetchQuote = async (promoCode?: string, currency?: 'MXN' | 'USD') => {
  const quoteRequest: EnhancedQuoteRequest = {
    // ... campos existentes
    preferredCurrency: currency || preferredCurrency,
  };
  // ... resto de la lógica
};
```

#### 2. Selector de Moneda
```tsx
// Nuevo componente CurrencySelector
export function CurrencySelector({ 
  value, 
  onChange 
}: { 
  value: 'MXN' | 'USD', 
  onChange: (currency: 'MXN' | 'USD') => void 
}) {
  return (
    <div className="flex items-center space-x-2">
      <Label>Moneda:</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="MXN">MXN</SelectItem>
          <SelectItem value="USD">USD</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
```

## Ventajas de la Solución

### Opción 1 (Dual Currency)
✅ **Flexibilidad**: Soporta usuarios mexicanos e internacionales
✅ **Experiencia mejorada**: Usuarios ven precios en su moneda local
✅ **Compatibilidad**: Mantiene funcionalidad existente
✅ **Escalabilidad**: Fácil agregar más monedas en el futuro

### Opción 2 (Solo MXN)
✅ **Simplicidad**: Elimina complejidad de conversiones
✅ **Optimización local**: Enfoque 100% en mercado mexicano
✅ **Costos reducidos**: Sin conversiones de moneda
✅ **Compliance**: Mejor cumplimiento con regulaciones locales

## Cronograma de Implementación

### Semana 1: Preparación
- [ ] Configurar variables de entorno
- [ ] Crear servicios de moneda y región
- [ ] Actualizar modelos de datos

### Semana 2: Backend
- [ ] Actualizar API de cotización
- [ ] Simplificar API de payment intent
- [ ] Actualizar webhook de Stripe

### Semana 3: Frontend
- [ ] Implementar selector de moneda
- [ ] Actualizar componentes de checkout
- [ ] Actualizar formateo de precios

### Semana 4: Testing y Deploy
- [ ] Pruebas exhaustivas
- [ ] Testing con diferentes escenarios
- [ ] Deploy gradual

## Consideraciones Técnicas

### Base de Datos
- Agregar campos de moneda a cursos de golf
- Mantener histórico de conversiones
- Actualizar índices para consultas por moneda

### Stripe
- Verificar configuración de cuenta México
- Confirmar monedas soportadas
- Actualizar webhooks para nueva estructura

### SEO y UX
- URLs con parámetros de moneda
- Meta tags con precios localizados
- Breadcrumbs con información de moneda

## Migración de Datos Existentes

```sql
-- Ejemplo de migración (Firestore)
// Agregar campos de moneda a cursos existentes
courses.forEach(course => {
  course.basePriceMXN = course.basePrice * 20; // Conversión inicial
  course.preferredCurrency = 'AUTO';
});
```

## Monitoreo y Métricas

- Conversiones por moneda
- Tasas de abandono por moneda
- Revenue por moneda
- Errores de procesamiento por moneda

## Conclusión

La **Opción 1 (Configuración Dual)** es la recomendada porque:
1. Mantiene compatibilidad con usuarios internacionales
2. Mejora la experiencia para usuarios mexicanos
3. Permite crecimiento futuro
4. Reduce la complejidad del sistema actual de fallback

Esta solución eliminará la necesidad del complejo sistema USD-MXN fallback actual y proporcionará una experiencia de pago más directa y confiable.