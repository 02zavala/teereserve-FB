import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { validateCoupon } from '@/lib/data';

interface QuoteRequest {
  courseId: string;
  date: string;
  time: string;
  players: number;
  holes: number;
  basePrice: number;
  promoCode?: string;
}

interface QuoteResponse {
  currency: string;
  tax_rate: number;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  quote_hash: string;
  expires_at: string;
  promo_code?: string;
}

const TAX_RATE = 0.16;
const QUOTE_TTL_MINUTES = 10;

// Secret key for HMAC (should be in environment variables)
const QUOTE_SECRET = process.env.QUOTE_SECRET || 'fallback-secret-key';

async function calculateDiscount(basePrice: number, promoCode?: string): Promise<number> {
  if (!promoCode) {
    return 0;
  }
  
  try {
    const coupon = await validateCoupon(promoCode);
    
    if (coupon.discountType === 'percentage') {
      return basePrice * (coupon.discountValue / 100);
    } else {
      // Fixed amount discount
      return Math.min(coupon.discountValue, basePrice); // Don't exceed base price
    }
  } catch (error) {
    // If coupon validation fails, return 0 discount
    console.log('Coupon validation failed:', error);
    return 0;
  }
}

function generateQuoteHash(quoteData: Omit<QuoteResponse, 'quote_hash'>): string {
  const dataString = JSON.stringify({
    currency: quoteData.currency,
    tax_rate: quoteData.tax_rate,
    subtotal_cents: quoteData.subtotal_cents,
    discount_cents: quoteData.discount_cents,
    tax_cents: quoteData.tax_cents,
    total_cents: quoteData.total_cents,
    expires_at: quoteData.expires_at
  });
  
  return crypto.createHmac('sha256', QUOTE_SECRET)
    .update(dataString)
    .digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body: QuoteRequest = await request.json();
    
    // Validate required fields
    if (!body.courseId || !body.date || !body.time || !body.players || !body.holes || !body.basePrice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate pricing in cents
    const subtotal_cents = Math.round(body.basePrice * 100);
    const discount_cents = Math.round((await calculateDiscount(body.basePrice, body.promoCode)) * 100);
    const taxable_amount_cents = subtotal_cents - discount_cents;
    const tax_cents = Math.round(taxable_amount_cents * TAX_RATE);
    const total_cents = subtotal_cents - discount_cents + tax_cents;

    // Set expiration time
    const expires_at = new Date(Date.now() + QUOTE_TTL_MINUTES * 60 * 1000).toISOString();

    // Create quote data without hash first
    const quoteData: Omit<QuoteResponse, 'quote_hash'> = {
      currency: 'USD',
      tax_rate: TAX_RATE,
      subtotal_cents,
      discount_cents,
      tax_cents,
      total_cents,
      expires_at,
      promo_code: body.promoCode
    };

    // Generate hash
    const quote_hash = generateQuoteHash(quoteData);

    // Final response
    const response: QuoteResponse = {
      ...quoteData,
      quote_hash
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in quote endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}