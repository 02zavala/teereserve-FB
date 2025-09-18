/**
 * Utilidades centralizadas para el manejo de moneda y cálculos de precios
 * Todos los cálculos se realizan en centavos para evitar problemas de precisión
 */

export interface PricingData {
  subtotal_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
  currency: string;
  tax_rate: number; // e.g., 0.16 for 16%
  discount_code?: string;
}

/**
 * Formatea un monto en centavos a string de moneda
 * @param cents - Monto en centavos
 * @param currency - Código de moneda (USD, MXN, etc.)
 * @param locale - Locale para formateo (default: en-US)
 * @returns String formateado con 2 decimales exactos
 */
export function money(
  cents: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  const amount = cents / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Calcula el desglose de precios basado en un total
 * @param total_cents - Total en centavos
 * @param tax_rate - Tasa de impuesto (e.g., 0.16 para 16%)
 * @param discount_cents - Descuento en centavos (default: 0)
 * @param currency - Moneda (default: USD)
 * @returns Objeto con desglose completo
 */
export function calculatePriceBreakdown(
  total_cents: number,
  tax_rate: number = 0.16,
  discount_cents: number = 0,
  currency: string = 'USD'
): PricingData {
  // Calcular subtotal: (total + descuento) / (1 + tax_rate)
  const subtotal_cents = Math.round((total_cents + discount_cents) / (1 + tax_rate));
  
  // Calcular impuestos: subtotal * tax_rate
  const tax_cents = Math.round(subtotal_cents * tax_rate);
  
  // Validar que los cálculos sean correctos
  const calculated_total = subtotal_cents - discount_cents + tax_cents;
  
  // Si hay diferencia por redondeo, ajustar el subtotal
  const adjusted_subtotal_cents = total_cents + discount_cents - tax_cents;
  
  return {
    subtotal_cents: adjusted_subtotal_cents,
    tax_cents,
    discount_cents,
    total_cents,
    currency,
    tax_rate
  };
}

/**
 * Calcula el desglose de precios desde un subtotal
 * @param subtotal_cents - Subtotal en centavos (antes de impuestos)
 * @param tax_rate - Tasa de impuesto (e.g., 0.16 para 16%)
 * @param discount_cents - Descuento en centavos (default: 0)
 * @param currency - Moneda (default: USD)
 * @returns Objeto con desglose completo
 */
export function calculateFromSubtotal(
  subtotal_cents: number,
  tax_rate: number = 0.16,
  discount_cents: number = 0,
  currency: string = 'USD'
): PricingData {
  const tax_cents = Math.round(subtotal_cents * tax_rate);
  const total_cents = subtotal_cents - discount_cents + tax_cents;
  
  return {
    subtotal_cents,
    tax_cents,
    discount_cents,
    total_cents,
    currency,
    tax_rate
  };
}

/**
 * Valida que los cálculos de precios sean correctos
 * @param pricing - Datos de precios a validar
 * @returns true si los cálculos son correctos
 */
export function validatePricing(pricing: PricingData): boolean {
  const calculated_total = pricing.subtotal_cents - pricing.discount_cents + pricing.tax_cents;
  return Math.abs(calculated_total - pricing.total_cents) <= 1; // Tolerancia de 1 centavo por redondeo
}

/**
 * Convierte un monto en dólares a centavos
 * @param dollars - Monto en dólares
 * @returns Monto en centavos
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convierte un monto en centavos a dólares
 * @param cents - Monto en centavos
 * @returns Monto en dólares
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Formatea el porcentaje de impuestos
 * @param tax_rate - Tasa de impuesto (e.g., 0.16)
 * @returns String formateado (e.g., "16%")
 */
export function formatTaxRate(tax_rate: number): string {
  return `${Math.round(tax_rate * 100)}%`;
}

/**
 * Crea un objeto de precios compatible con Stripe
 * @param pricing - Datos de precios
 * @returns Objeto compatible con Stripe PaymentIntent
 */
export function toStripeAmounts(pricing: PricingData) {
  return {
    amount: pricing.total_cents,
    amount_subtotal: pricing.subtotal_cents,
    amount_tax: pricing.tax_cents,
    amount_discount: pricing.discount_cents,
    currency: pricing.currency.toLowerCase()
  };
}

/**
 * Crea un objeto de precios desde datos de Stripe
 * @param stripeData - Datos de Stripe PaymentIntent
 * @param tax_rate - Tasa de impuesto aplicada
 * @returns Objeto PricingData
 */
export function fromStripeAmounts(
  stripeData: {
    amount: number;
    amount_subtotal?: number;
    amount_tax?: number;
    amount_discount?: number;
    currency: string;
  },
  tax_rate: number = 0.16
): PricingData {
  return {
    total_cents: stripeData.amount,
    subtotal_cents: stripeData.amount_subtotal || 0,
    tax_cents: stripeData.amount_tax || 0,
    discount_cents: stripeData.amount_discount || 0,
    currency: stripeData.currency.toUpperCase(),
    tax_rate
  };
}