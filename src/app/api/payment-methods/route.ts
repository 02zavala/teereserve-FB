import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth, db } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// GET - Obtener métodos de pago guardados del usuario
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Obtener el Stripe Customer ID del usuario
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData?.stripeCustomerId) {
      return NextResponse.json({ ok: true, data: { paymentMethods: [] } });
    }

    // Obtener métodos de pago de Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: userData.stripeCustomerId,
      type: 'card',
    });

    return NextResponse.json({ 
      ok: true,
      data: {
        paymentMethods: paymentMethods.data.map(pm => ({
          id: pm.id,
          card: {
            brand: pm.card?.brand,
            last4: pm.card?.last4,
            exp_month: pm.card?.exp_month,
            exp_year: pm.card?.exp_year,
          },
          created: pm.created,
        }))
      }
    });
  } catch (error) {
    console.error({ scope: 'fetchPaymentMethods', err: error });
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Guardar un nuevo método de pago
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;
    const { paymentMethodId } = await request.json();

    if (!paymentMethodId) {
      return NextResponse.json({ ok: false, error: 'Payment method ID is required' }, { status: 400 });
    }

    // Check for idempotency key
    const idempotencyKey = request.headers.get('idempotency-key');
    
    // Obtener o crear Stripe Customer
    const userDoc = await db.collection('users').doc(userId).get();
    let userData = userDoc.data();
    let customerId = userData?.stripeCustomerId;

    if (!customerId) {
      // Crear nuevo customer en Stripe
      const customer = await stripe.customers.create({
        metadata: { firebaseUserId: userId },
        email: userData?.email || decodedToken.email,
        name: userData?.displayName || decodedToken.name,
      });
      
      customerId = customer.id;
      
      // Guardar el customer ID en Firestore
      await db.collection('users').doc(userId).update({
        stripeCustomerId: customerId,
      });
    }

    // Check if payment method is already attached (for idempotency)
    const existingMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    
    const alreadyAttached = existingMethods.data.find(pm => pm.id === paymentMethodId);
    if (alreadyAttached) {
      return NextResponse.json({
        ok: true,
        data: {
          paymentMethod: {
            id: alreadyAttached.id,
            card: {
              brand: alreadyAttached.card?.brand,
              last4: alreadyAttached.card?.last4,
              exp_month: alreadyAttached.card?.exp_month,
              exp_year: alreadyAttached.card?.exp_year,
            },
            created: alreadyAttached.created,
          }
        }
      });
    }

    // Crear PaymentIntent de verificación de $1 USD 
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 100, // $1 USD fijo
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      capture_method: 'automatic',
      description: 'Verification charge (non-refundable)',
      ...(idempotencyKey && { idempotency_key: idempotencyKey }),
    });

    // Verificar que el pago fue exitoso
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({
        ok: false,
        error: `Payment verification failed: ${paymentIntent.status}`
      }, { status: 400 });
    }

    // Obtener los detalles del método de pago
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    // Guardar información del PaymentIntent en Firestore para registro
    await db.collection('payment_verifications').add({
      userId,
      paymentMethodId,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      createdAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      data: {
        paymentMethod: {
          id: paymentMethod.id,
          card: {
            brand: paymentMethod.card?.brand,
            last4: paymentMethod.card?.last4,
            exp_month: paymentMethod.card?.exp_month,
            exp_year: paymentMethod.card?.exp_year,
          },
          created: paymentMethod.created,
        }
      }
    });
  } catch (error: any) {
    console.error({ scope: 'savePaymentMethod', err: error, userId: request.headers.get('authorization')?.split(' ')[1] });
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json({ 
        ok: false, 
        error: `No se pudo procesar el cargo de verificación ($1 USD fijo). ${error.message}` 
      }, { status: 400 });
    }
    
    if (error.code === 'card_declined') {
      return NextResponse.json({ 
        ok: false, 
        error: 'No se pudo procesar el cargo de verificación ($1 USD fijo). Tarjeta declinada.' 
      }, { status: 400 });
    }
    
    if (error.code === 'insufficient_funds') {
      return NextResponse.json({ 
        ok: false, 
        error: 'No se pudo procesar el cargo de verificación ($1 USD fijo). Fondos insuficientes.' 
      }, { status: 400 });
    }
    
    if (error.code === 'resource_already_exists') {
      return NextResponse.json({ ok: false, error: 'Payment method already exists' }, { status: 409 });
    }
    
    return NextResponse.json({ 
      ok: false, 
      error: 'No se pudo procesar el cargo de verificación ($1 USD fijo). Revise su tarjeta.' 
    }, { status: 500 });
  }
}

// DELETE - Eliminar un método de pago
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const { paymentMethodId } = await request.json();

    if (!paymentMethodId) {
      return NextResponse.json({ ok: false, error: 'Payment method ID is required' }, { status: 400 });
    }

    // Desadjuntar el método de pago
    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({ ok: true, data: { success: true } });
  } catch (error: any) {
    console.error({ scope: 'deletePaymentMethod', err: error, paymentMethodId: request.body });
    
    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
      return NextResponse.json({ ok: false, error: 'Payment method not found' }, { status: 404 });
    }
    
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}