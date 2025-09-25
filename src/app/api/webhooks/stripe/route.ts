import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe'; // Asumiendo que hay un cliente de Stripe inicializado
import { logFailedPayment } from '@/lib/data';

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

      const { id, amount, currency, last_payment_error } = paymentIntent;

      await logFailedPayment({
        paymentIntentId: id,
        amount,
        currency,
        errorCode: last_payment_error?.code,
        errorDeclineCode: last_payment_error?.decline_code,
        errorMessage: last_payment_error?.message,
      });

      break;

    case 'payment_intent.succeeded':
      const pi_success = event.data.object as Stripe.PaymentIntent;
      console.log(`✅ Webhook: PaymentIntent ${pi_success.id} exitoso.`);
      // Aquí se podría añadir lógica adicional para la confirmación de pago,
      // como actualizar el estado de una reserva si no se hizo en el cliente.
      break;

    default:
      console.log(`🤷‍♀️ Webhook: Evento no manejado: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}