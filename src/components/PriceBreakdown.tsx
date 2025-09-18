"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PricingData, money, formatTaxRate } from '@/lib/money-utils';
import { PricingSnapshot, QuoteResponse } from '@/types';
import { cn } from '@/lib/utils';

// Union type for all supported pricing formats
type SupportedPricing = PricingData | PricingSnapshot | QuoteResponse;

interface PriceBreakdownProps {
  pricing: SupportedPricing;
  className?: string;
  showDiscountWhenZero?: boolean;
  locale?: string;
  labels?: {
    subtotal?: string;
    tax?: string;
    discount?: string;
    total?: string;
  };
}

// Helper function to normalize pricing data
function normalizePricing(pricing: SupportedPricing): PricingData {
  // If it's already PricingData, return as is
  if ('tax_rate' in pricing) {
    return pricing as PricingData;
  }
  
  // Convert PricingSnapshot or QuoteResponse to PricingData
  const snapshot = pricing as PricingSnapshot | QuoteResponse;
  return {
    subtotal_cents: snapshot.subtotal_cents,
    tax_cents: snapshot.tax_cents,
    discount_cents: snapshot.discount_cents,
    total_cents: snapshot.total_cents,
    currency: snapshot.currency,
    tax_rate: snapshot.tax_rate,
    discount_code: snapshot.promoCode
  };
}

/**
 * Componente reutilizable para mostrar el desglose de precios
 * Muestra subtotal, impuestos, descuentos y total con formato consistente
 */
export function PriceBreakdown({
  pricing,
  className,
  showDiscountWhenZero = true,
  locale = 'es-MX',
  labels
}: PriceBreakdownProps) {
  const normalizedPricing = normalizePricing(pricing);
  
  const defaultLabels = {
    subtotal: 'Subtotal',
    tax: `Impuestos (${formatTaxRate(normalizedPricing.tax_rate)})`,
    discount: 'Descuento',
    total: 'Total'
  };
  
  const finalLabels = { ...defaultLabels, ...labels };
  const formatAmount = (cents: number) => money(cents, normalizedPricing.currency, locale);
  
  const hasDiscount = normalizedPricing.discount_cents > 0;
  const showDiscountLine = hasDiscount || showDiscountWhenZero;

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Desglose de Precios
          </h3>
          
          {/* Subtotal */}
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-muted-foreground">{finalLabels.subtotal}</span>
            <span className="font-medium text-foreground">
              {formatAmount(normalizedPricing.subtotal_cents)}
            </span>
          </div>

          {/* Impuestos */}
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-muted-foreground">{finalLabels.tax}</span>
            <span className="font-medium text-foreground">
              {formatAmount(normalizedPricing.tax_cents)}
            </span>
          </div>

          {/* Descuento (condicional) */}
          {showDiscountLine && (
            <div className="flex justify-between items-center py-2 border-b border-border">
              <div className="flex flex-col">
                <span className="text-muted-foreground">{finalLabels.discount}</span>
                {normalizedPricing.discount_code && (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Código: {normalizedPricing.discount_code}
                  </span>
                )}
              </div>
              <span className={cn(
                "font-medium",
                hasDiscount ? "text-green-600 dark:text-green-400" : "text-foreground"
              )}>
                {hasDiscount ? '-' : ''}{formatAmount(normalizedPricing.discount_cents)}
              </span>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between items-center py-3 border-t-2 border-border mt-4">
            <span className="text-lg font-bold text-foreground">{finalLabels.total}</span>
            <span className="text-lg font-bold text-foreground">
              {formatAmount(normalizedPricing.total_cents)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Versión compacta del desglose de precios para espacios reducidos
 */
export function PriceBreakdownCompact({
  pricing,
  className,
  locale = 'es-MX'
}: Omit<PriceBreakdownProps, 'showDiscountWhenZero' | 'labels'>) {
  const normalizedPricing = normalizePricing(pricing);
  const formatAmount = (cents: number) => money(cents, normalizedPricing.currency, locale);
  const hasDiscount = normalizedPricing.discount_cents > 0;

  return (
    <div className={cn("space-y-2 text-sm", className)}>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal:</span>
        <span className="text-foreground">{formatAmount(normalizedPricing.subtotal_cents)}</span>
      </div>
      
      <div className="flex justify-between">
        <span className="text-muted-foreground">Impuestos ({formatTaxRate(normalizedPricing.tax_rate)}):</span>
        <span className="text-foreground">{formatAmount(normalizedPricing.tax_cents)}</span>
      </div>
      
      {hasDiscount && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Descuento:</span>
          <span className="text-green-600 dark:text-green-400">-{formatAmount(normalizedPricing.discount_cents)}</span>
        </div>
      )}
      
      <div className="flex justify-between font-bold text-base border-t border-border pt-2">
        <span className="text-foreground">Total:</span>
        <span className="text-foreground">{formatAmount(normalizedPricing.total_cents)}</span>
      </div>
    </div>
  );
}

/**
 * Hook para calcular el desglose de precios desde un total
 */
export function usePriceBreakdown(
  total_cents: number,
  tax_rate: number = 0.16,
  discount_cents: number = 0,
  currency: string = 'USD',
  discount_code?: string
): PricingData {
  return React.useMemo(() => {
    // Calcular subtotal: (total + descuento) / (1 + tax_rate)
    const subtotal_cents = Math.round((total_cents + discount_cents) / (1 + tax_rate));
    
    // Calcular impuestos: subtotal * tax_rate
    const tax_cents = Math.round(subtotal_cents * tax_rate);
    
    // Ajustar subtotal para que los cálculos cuadren exactamente
    const adjusted_subtotal_cents = total_cents + discount_cents - tax_cents;
    
    return {
      subtotal_cents: adjusted_subtotal_cents,
      tax_cents,
      discount_cents,
      total_cents,
      currency,
      tax_rate,
      discount_code
    };
  }, [total_cents, tax_rate, discount_cents, currency, discount_code]);
}

export default PriceBreakdown;