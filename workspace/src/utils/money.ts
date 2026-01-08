/**
 * Utility function to format money amounts consistently across the application
 * @param cents - Amount in cents (integer)
 * @param currency - Currency code (e.g., 'USD', 'MXN')
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted money string with 2 decimal places
 */
export function money(cents: number, currency: string = 'USD', locale: string = 'en-US'): string {
  const amount = cents / 100;
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Convert dollars to cents
 * @param dollars - Amount in dollars (can have decimals)
 * @returns Amount in cents (integer)
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars
 * @param cents - Amount in cents (integer)
 * @returns Amount in dollars (with decimals)
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Calculate tax amount in cents
 * @param subtotalCents - Subtotal amount in cents
 * @param taxRate - Tax rate as decimal (e.g., 0.16 for 16%)
 * @returns Tax amount in cents (integer)
 */
export function calculateTaxCents(subtotalCents: number, taxRate: number): number {
  return Math.round(subtotalCents * taxRate);
}

/**
 * Calculate discount amount in cents
 * @param subtotalCents - Subtotal amount in cents
 * @param discountType - Type of discount ('percentage' or 'fixed')
 * @param discountValue - Discount value (percentage as decimal or fixed amount in dollars)
 * @returns Discount amount in cents (integer)
 */
export function calculateDiscountCents(
  subtotalCents: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number
): number {
  if (discountType === 'percentage') {
    return Math.round(subtotalCents * discountValue);
  } else {
    return dollarsToCents(discountValue);
  }
}