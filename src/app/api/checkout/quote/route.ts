import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { validateCoupon } from '@/lib/data';
import { PricingEngine } from '@/lib/pricing-engine';
import { db } from '@/lib/firebase-admin';

interface QuoteRequest {
  courseId: string;
  date: string;
  time: string;
  players: number;
  holes: number;
  basePrice?: number; // optional fallback
  promoCode?: string;
  userId?: string;
  userEmail?: string;
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

function getHoleMultiplier(holes: number): number {
  if (holes === 9) return 0.6;
  if (holes === 27) return 1.4;
  return 1;
}

async function loadCoursePricingData(courseId: string) {
  try {
    const [seasonsSnap, timeBandsSnap, priceRulesSnap, overridesSnap, baseProductDoc] = await Promise.all([
      db.collection('pricing').doc(courseId).collection('seasons').get().catch(() => null),
      db.collection('pricing').doc(courseId).collection('timeBands').get().catch(() => null),
      db.collection('pricing').doc(courseId).collection('priceRules').get().catch(() => null),
      db.collection('pricing').doc(courseId).collection('specialOverrides').get().catch(() => null),
      db.collection('pricing').doc(courseId).collection('baseProducts').doc('default').get().catch(() => null)
    ]);

    const seasons = seasonsSnap ? seasonsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];
    const timeBands = timeBandsSnap ? timeBandsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];
    const priceRules = priceRulesSnap ? priceRulesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];
    const specialOverrides = overridesSnap ? overridesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) : [];

    let baseProduct: any = null;
    if (baseProductDoc && baseProductDoc.exists) {
      const bp = baseProductDoc.data() as any;
      baseProduct = {
        id: baseProductDoc.id,
        courseId,
        greenFeeBaseUsd: typeof bp.greenFeeBaseUsd === 'number' ? bp.greenFeeBaseUsd : (typeof bp.basePrice === 'number' ? bp.basePrice : 0),
        cartFeeUsd: bp.cartFeeUsd ?? undefined,
        caddieFeeUsd: bp.caddieFeeUsd ?? undefined,
        insuranceFeeUsd: bp.insuranceFeeUsd ?? undefined,
        updatedAt: bp.updatedAt || new Date().toISOString()
      };
    }

    return { seasons, timeBands, priceRules, specialOverrides, baseProduct };
  } catch (error) {
    console.error('Failed to load pricing data for quote:', error);
    return null;
  }
}

async function calculateDiscount(amountUsd: number, promoCode?: string, userId?: string, userEmail?: string): Promise<number> {
  if (!promoCode) {
    return 0;
  }
  
  try {
    const coupon = await validateCoupon(promoCode, { userId, userEmail });
    
    if (coupon.discountType === 'percentage') {
      return amountUsd * (coupon.discountValue / 100);
    } else {
      // Fixed amount discount
      return Math.min(coupon.discountValue, amountUsd); // Don't exceed base price
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
    
    // Validate required fields (basePrice optional)
    if (!body.courseId || !body.date || !body.time || !body.players || !body.holes) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const holeMultiplier = getHoleMultiplier(body.holes);

    // Initialize and load pricing data
    const engine = new PricingEngine();
    const pricingData = await loadCoursePricingData(body.courseId);
    // Siempre importar precios desde Firestore si están disponibles
    // para que los cambios desde Admin persistan y se reflejen en checkout.
    if (pricingData) {
      engine.importPricingData(body.courseId, pricingData as any);
    }

    // Calculate dynamic subtotal (USD)
    let subtotalUsd: number;
    try {
      const result = await engine.calculatePrice({
        courseId: body.courseId,
        date: body.date,
        time: body.time,
        players: body.players
      });
      const perPlayer = result.finalPricePerPlayer * holeMultiplier;
      subtotalUsd = perPlayer * body.players;
    } catch (err) {
      // Fallback to provided basePrice if engine cannot calculate
      if (typeof body.basePrice === 'number' && body.basePrice > 0) {
        subtotalUsd = body.basePrice * body.players * holeMultiplier;
      } else {
        return NextResponse.json(
          { error: 'Pricing unavailable' },
          { status: 500 }
        );
      }
    }

    const discountUsd = await calculateDiscount(subtotalUsd, body.promoCode, body.userId, body.userEmail);

    const subtotal_cents = Math.round(subtotalUsd * 100);
    const discount_cents = Math.round(discountUsd * 100);
    const taxable_amount_cents = Math.max(subtotal_cents - discount_cents, 0);
    const tax_cents = Math.round(taxable_amount_cents * TAX_RATE);
    const total_cents = taxable_amount_cents + tax_cents;

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