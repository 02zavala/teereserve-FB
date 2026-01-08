import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

// Helper para obtener el tipo de cambio
function getFxRate(): number {
  const fallbackRate = parseFloat(process.env.FX_RATE_FALLBACK || '20.00');
  // Aquí podrías inyectar un servicio de tipo de cambio externo
  // Por ahora usamos el fallback configurado
  return fallbackRate;
}

// Función para detectar si el error es por política de moneda
function isCurrencyPolicyError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code;
  const declineCode = error.decline_code;
  
  // Códigos y mensajes que indican rechazo por política de moneda
  const currencyErrorCodes = ['currency_not_supported', 'restricted_card', 'card_declined'];
  const currencyErrorMessages = [
    'your card is not supported',
    'currency not supported',
    'card does not support this currency',
    'restricted card',
    'currency restriction'
  ];
  
  return (
    currencyErrorCodes.includes(errorCode) ||
    currencyErrorCodes.includes(declineCode) ||
    currencyErrorMessages.some(msg => errorMessage.includes(msg))
  );
}

export async function POST(request: NextRequest) {
  try {
    const { amountUsd, bookingId, customerId } = await request.json();

    if (!amountUsd || amountUsd <= 0) {
      return NextResponse.json(
        { error: 'Valid amountUsd is required' },
        { status: 400 }
      );
    }

    if (!bookingId) {
      return NextResponse.json(
        { error: 'bookingId is required' },
        { status: 400 }
      );
    }

    const fxRate = getFxRate();

    // Intentar crear PaymentIntent en USD primero
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amountUsd * 100), // Convertir a centavos
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        payment_method_options: {
          card: {
            request_three_d_secure: 'automatic'
          }
        },
        metadata: {
          bookingId,
          fxRate: fxRate.toString(),
          currencyAttempt: 'usd',
          priceUsd: amountUsd.toString()
        },
        ...(customerId && { customer: customerId })
      });

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        currency: 'usd',
        wasRetried: false
      });

    } catch (error: any) {
      console.log('USD PaymentIntent creation failed:', error.message);
      
      // Si el error es por política de moneda, mantén USD y devuelve error claro
      if (isCurrencyPolicyError(error)) {
        return NextResponse.json(
          { error: 'Payment failed due to currency policy. USD is required.' },
          { status: 400 }
        );
      } else {
        // Si no es error de moneda, devolver el error original
        throw error;
      }
    }

  } catch (error: any) {
    console.error('Error in createOrRetryPaymentIntent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}