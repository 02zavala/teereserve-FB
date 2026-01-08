import { PricingData } from './money-utils';

/**
 * Backend pricing calculations working with cents
 * All calculations are done in cents to avoid floating point precision issues
 */

export interface BookingPricingInput {
  basePrice: number; // in dollars
  numberOfPlayers: number;
  discountCode?: string;
  discountAmount?: number; // in dollars
  taxRate?: number; // percentage (default 16%)
}

export interface BookingPricingResult {
  subtotal_cents: number;
  tax_cents: number;
  discount_cents: number;
  total_cents: number;
  currency: string;
  breakdown: {
    basePrice_cents: number;
    playersMultiplier: number;
    discountApplied: boolean;
    discountCode?: string;
  };
}

/**
 * Calculate booking pricing in cents
 * @param input - Pricing input parameters
 * @returns Complete pricing breakdown in cents
 */
export function calculateBookingPricing(input: BookingPricingInput): BookingPricingResult {
  const {
    basePrice,
    numberOfPlayers,
    discountCode,
    discountAmount = 0,
    taxRate = 16
  } = input;

  // Convert base price to cents
  const basePrice_cents = Math.round(basePrice * 100);
  
  // Calculate subtotal (base price * number of players)
  const subtotal_cents = basePrice_cents * numberOfPlayers;
  
  // Calculate discount in cents
  const discount_cents = Math.round(discountAmount * 100);
  
  // Calculate tax on (subtotal - discount)
  const taxableAmount_cents = Math.max(0, subtotal_cents - discount_cents);
  const tax_cents = Math.round(taxableAmount_cents * (taxRate / 100));
  
  // Calculate total
  const total_cents = subtotal_cents - discount_cents + tax_cents;

  return {
    subtotal_cents,
    tax_cents,
    discount_cents,
    total_cents,
    currency: 'USD',
    breakdown: {
      basePrice_cents,
      playersMultiplier: numberOfPlayers,
      discountApplied: discount_cents > 0,
      discountCode
    }
  };
}

/**
 * Validate pricing calculation
 * Ensures total_cents === subtotal_cents - discount_cents + tax_cents
 */
export function validatePricingCalculation(pricing: BookingPricingResult): boolean {
  const expectedTotal = pricing.subtotal_cents - pricing.discount_cents + pricing.tax_cents;
  return pricing.total_cents === expectedTotal;
}

/**
 * Convert backend pricing result to frontend PricingData format
 */
export function toPricingData(result: BookingPricingResult): PricingData {
  return {
    subtotal_cents: result.subtotal_cents,
    tax_cents: result.tax_cents,
    discount_cents: result.discount_cents,
    total_cents: result.total_cents,
    currency: result.currency,
    tax_rate: result.tax_cents / result.subtotal_cents // Calculate tax rate from amounts
  };
}

/**
 * Calculate pricing for Stripe integration
 * Returns amounts compatible with Stripe's expected format
 */
export function toStripeAmounts(pricing: BookingPricingResult) {
  return {
    amount_subtotal: pricing.subtotal_cents,
    amount_tax: pricing.tax_cents,
    amount_discount: pricing.discount_cents,
    amount_total: pricing.total_cents,
    currency: pricing.currency.toLowerCase()
  };
}

/**
 * Validation function to ensure pricing integrity
 */
export function validatePricingIntegrity(pricing: BookingPricingResult): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate that total equals subtotal - discount + tax
  const expectedTotal = pricing.subtotal_cents - pricing.discount_cents + pricing.tax_cents;
  if (pricing.total_cents !== expectedTotal) {
    errors.push(`Total mismatch: expected ${expectedTotal}, got ${pricing.total_cents}`);
  }
  
  // Validate non-negative values
  if (pricing.subtotal_cents < 0) errors.push('Subtotal cannot be negative');
  if (pricing.tax_cents < 0) errors.push('Tax cannot be negative');
  if (pricing.discount_cents < 0) errors.push('Discount cannot be negative');
  if (pricing.total_cents < 0) errors.push('Total cannot be negative');
  
  // Validate that all values are integers (cents)
  if (!Number.isInteger(pricing.subtotal_cents)) errors.push('Subtotal must be integer cents');
  if (!Number.isInteger(pricing.tax_cents)) errors.push('Tax must be integer cents');
  if (!Number.isInteger(pricing.discount_cents)) errors.push('Discount must be integer cents');
  if (!Number.isInteger(pricing.total_cents)) errors.push('Total must be integer cents');
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Test function with the required values from the task
 * Subtotal $288.00, IVA 16% = $46.08, Descuento $0.00, Total $334.08
 */
export function testPricingCalculation(): BookingPricingResult {
  const testInput: BookingPricingInput = {
    basePrice: 288.00,
    numberOfPlayers: 1,
    discountAmount: 0,
    taxRate: 16
  };
  
  const result = calculateBookingPricing(testInput);
  
  // Validate the calculation
  const isValid = validatePricingCalculation(result);
  const integrity = validatePricingIntegrity(result);
  
  console.log('Test Pricing Calculation:');
  console.log('Input:', testInput);
  console.log('Result:', result);
  console.log('Validation passed:', isValid);
  console.log('Integrity check:', integrity);
  console.log('Expected: Subtotal $288.00, Tax $46.08, Discount $0.00, Total $334.08');
  console.log('Actual:', {
    subtotal: `$${(result.subtotal_cents / 100).toFixed(2)}`,
    tax: `$${(result.tax_cents / 100).toFixed(2)}`,
    discount: `$${(result.discount_cents / 100).toFixed(2)}`,
    total: `$${(result.total_cents / 100).toFixed(2)}`
  });
  
  if (!integrity.isValid) {
    console.error('❌ Validation failed:', integrity.errors);
  } else {
    console.log('✅ All validations passed');
  }
  
  return result;
}

/**
 * Apply discount code to pricing calculation
 */
export function applyDiscountCode(pricing: BookingPricingResult, discountCode: string, discountAmount: number): BookingPricingResult {
  const discountAmount_cents = Math.round(discountAmount * 100);
  
  // Recalculate with discount
  const newSubtotal = pricing.subtotal_cents;
  const newDiscount = discountAmount_cents;
  const taxableAmount = Math.max(0, newSubtotal - newDiscount);
  const newTax = Math.round(taxableAmount * 0.16); // 16% tax
  const newTotal = newSubtotal - newDiscount + newTax;
  
  return {
    ...pricing,
    discount_cents: newDiscount,
    tax_cents: newTax,
    total_cents: newTotal,
    breakdown: {
      ...pricing.breakdown,
      discountApplied: true,
      discountCode
    }
  };
}