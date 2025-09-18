import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth, db } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;
    
    const { 
      paymentMethodId, 
      amount, 
      currency = 'usd',
      bookingData 
    } = await request.json();

    if (!paymentMethodId || !amount || !bookingData) {
      return NextResponse.json({ 
        error: 'Payment method ID, amount, and booking data are required' 
      }, { status: 400 });
    }

    // Obtener el Stripe Customer ID del usuario
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData?.stripeCustomerId) {
      return NextResponse.json({ 
        error: 'No customer found for this user' 
      }, { status: 400 });
    }

    // Verificar que el método de pago pertenece al customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.customer !== userData.stripeCustomerId) {
      return NextResponse.json({ 
        error: 'Payment method does not belong to this customer' 
      }, { status: 403 });
    }

    // Crear el Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convertir a centavos
      currency,
      customer: userData.stripeCustomerId,
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/book/success`,
      // Force 3D Secure authentication for all card payments
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic'
        }
      },
      metadata: {
        userId,
        courseId: bookingData.courseId,
        courseName: bookingData.courseName,
        date: bookingData.date,
        time: bookingData.time,
        players: bookingData.players.toString(),
        holes: bookingData.holes?.toString() || '18',
      },
    });

    if (paymentIntent.status === 'requires_action') {
      return NextResponse.json({
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
      });
    } else if (paymentIntent.status === 'succeeded') {
      // El pago fue exitoso, crear la reserva
      const { createBooking } = await import('@/lib/data');
      
      try {
        const bookingId = await createBooking({
          userId,
          userName: userData.displayName || userData.email || 'Unknown User',
          courseId: bookingData.courseId,
          courseName: bookingData.courseName,
          date: bookingData.date,
          time: bookingData.time,
          players: parseInt(bookingData.players),
          holes: bookingData.holes ? parseInt(bookingData.holes) : 18,
          totalPrice: amount,
          status: 'confirmed',
          teeTimeId: bookingData.teeTimeId,
          comments: bookingData.comments,
          couponCode: bookingData.couponCode,
        }, bookingData.lang || 'en');

        return NextResponse.json({
          success: true,
          bookingId,
          paymentIntent: {
            id: paymentIntent.id,
            status: paymentIntent.status,
          },
        });
      } catch (bookingError) {
        console.error('Failed to create booking after payment:', bookingError);
        return NextResponse.json({ 
          error: 'Payment successful but booking creation failed. Please contact support.' 
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({
        error: 'Payment failed',
        status: paymentIntent.status,
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing saved payment:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}