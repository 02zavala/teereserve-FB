import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent } from '@/ai/flows/create-payment-intent';

export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'usd', setup_future_usage } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    // Use the existing Genkit flow to create the payment intent
    const result = await createPaymentIntent({
      amount: Math.round(amount), // Ensure it's an integer
      currency,
      setup_future_usage,
    });

    return NextResponse.json({
      clientSecret: result.clientSecret,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}