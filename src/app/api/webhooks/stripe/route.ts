import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe'; // Asumiendo que hay un cliente de Stripe inicializado
import { logFailedPayment, logSuccessfulPayment } from '@/lib/data';

const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get('stripe-signature') as string;

  if (!stripeWebhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET no está configurado.');
    return NextResponse.json({ error: 'Webhook secret no configurado.' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
  } catch (err: any) {
    console.error(`❌ Error en la verificación de la firma del webhook: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Manejar el evento
  switch (event.type) {
    case 'payment_intent.payment_failed':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`🔔 Webhook: PaymentIntent ${paymentIntent.id} falló.`);

      const { id, amount, currency, last_payment_error, metadata } = paymentIntent;

      await logFailedPayment({
        paymentIntentId: id,
        amount,
        currency,
        errorCode: last_payment_error?.code,
        errorDeclineCode: last_payment_error?.decline_code,
        errorMessage: last_payment_error?.message,
        bookingId: metadata.bookingId,
        fxRate: parseFloat(metadata.fxRate || '1.0'),
        currencyAttempt: metadata.currencyAttempt || 'usd',
        priceUsd: parseFloat(metadata.priceUsd || '0')
      });

      break;

    case 'payment_intent.succeeded':
      const pi_success = event.data.object as Stripe.PaymentIntent;
      console.log(`✅ Webhook: PaymentIntent ${pi_success.id} exitoso.`);
      
      // Persistir datos de moneda final y FX
      const metadata = pi_success.metadata;
      if (metadata.bookingId) {
        await logSuccessfulPayment({
          paymentIntentId: pi_success.id,
          bookingId: metadata.bookingId,
          final_currency: pi_success.currency.toUpperCase(),
          amount_received: pi_success.amount,
          fxRate: parseFloat(metadata.fxRate || '1.0'),
          currencyAttempt: metadata.currencyAttempt || 'usd',
          priceUsd: parseFloat(metadata.priceUsd || '0')
        });
      }
      break;

    default:
      console.log(`🤷‍♀️ Webhook: Evento no manejado: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}