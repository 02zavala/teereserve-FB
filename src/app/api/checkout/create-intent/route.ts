import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import Stripe from 'stripe';
import { db } from '@/lib/firebase-admin';

interface CreateIntentRequest {
  courseId: string;
  date: string;
  time: string;
  players: number;
  holes: number;
  currency: string;
  tax_rate: number;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  quote_hash: string;
  expires_at: string;
  promoCode?: string;
  guestEmail?: string;
  guestName?: string;
}

interface PricingSnapshot {
  currency: string;
  tax_rate: number;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  quote_hash: string;
  createdAt: string;
  promoCode?: string;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

const QUOTE_SECRET = process.env.QUOTE_SECRET || 'fallback-secret-key';

function validateQuoteHash(quoteData: Omit<CreateIntentRequest, 'courseId' | 'date' | 'time' | 'players' | 'holes' | 'quote_hash' | 'promoCode' | 'guestEmail' | 'guestName'>): string {
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
    const body: CreateIntentRequest = await request.json();
    
    // Validate required fields
    if (!body.courseId || !body.date || !body.time || !body.players || !body.holes || 
        !body.currency || body.tax_rate === undefined || body.subtotal_cents === undefined ||
        body.discount_cents === undefined || body.tax_cents === undefined || 
        body.total_cents === undefined || !body.quote_hash || !body.expires_at) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if quote has expired
    const expiresAt = new Date(body.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Quote has expired' },
        { status: 400 }
      );
    }

    // Validate quote hash
    const expectedHash = validateQuoteHash({
      currency: body.currency,
      tax_rate: body.tax_rate,
      subtotal_cents: body.subtotal_cents,
      discount_cents: body.discount_cents,
      tax_cents: body.tax_cents,
      total_cents: body.total_cents,
      expires_at: body.expires_at
    });

    if (expectedHash !== body.quote_hash) {
      return NextResponse.json(
        { error: 'Invalid quote hash' },
        { status: 400 }
      );
    }

    // Create pricing snapshot (filter out undefined values for Firestore)
    const pricingSnapshot: PricingSnapshot = {
      currency: body.currency,
      tax_rate: body.tax_rate,
      subtotal_cents: body.subtotal_cents,
      discount_cents: body.discount_cents,
      tax_cents: body.tax_cents,
      total_cents: body.total_cents,
      quote_hash: body.quote_hash,
      createdAt: new Date().toISOString(),
      ...(body.promoCode && { promoCode: body.promoCode })
    };

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: body.total_cents,
      currency: body.currency.toLowerCase(),
      metadata: {
        courseId: body.courseId,
        date: body.date,
        time: body.time,
        players: body.players.toString(),
        holes: body.holes.toString(),
        quote_hash: body.quote_hash,
        guestEmail: body.guestEmail || '',
        guestName: body.guestName || '',
        promoCode: body.promoCode || ''
      }
    });

    // Store pricing snapshot in a temporary collection (will be moved to booking on success)
    const tempBookingRef = db.collection('temp_bookings').doc(paymentIntent.id);
    await tempBookingRef.set({
      paymentIntentId: paymentIntent.id,
      courseId: body.courseId,
      date: body.date,
      time: body.time,
      players: body.players,
      holes: body.holes,
      pricing_snapshot: pricingSnapshot,
      guestEmail: body.guestEmail,
      guestName: body.guestName,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      pricing_snapshot: pricingSnapshot
    });
    
  } catch (error) {
    console.error('Error in create-intent endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}