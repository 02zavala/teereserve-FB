import { NextRequest, NextResponse } from 'next/server';
import { createPaymentIntent } from '@/ai/flows/create-payment-intent';

export async function POST(request: NextRequest) {
  try {
    const { amount, currency = 'usd', setup_future_usage } = await request.json();

    // Validar que amount sea un número válido
    if (!amount || typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid positive amount is required' },
        { status: 400 }
      );
    }

    // Convertir de dólares a centavos correctamente
    const amountInCents = Math.round(amount * 100);
    
    // Validar que el resultado no sea negativo o NaN después de la conversión
    if (isNaN(amountInCents) || amountInCents <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount after conversion to cents' },
        { status: 400 }
      );
    }

    console.log(`💰 Creating PaymentIntent: $${amount.toFixed(2)} USD (${amountInCents} cents)`);

    // Use the existing Genkit flow to create the payment intent
    const result = await createPaymentIntent({
      amount: amountInCents,
      currency: typeof currency === 'string' ? currency.toLowerCase() : 'usd',
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