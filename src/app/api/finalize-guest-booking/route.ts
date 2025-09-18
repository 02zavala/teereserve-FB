import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

interface FinalizeBookingRequest {
  draftId: string;
  paymentIntentId: string;
  userIdToLink?: string;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    const body: FinalizeBookingRequest = await request.json();
    const { draftId, paymentIntentId, userIdToLink } = body;

    if (!draftId || !paymentIntentId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // db is already imported from firebase-admin config
    
    // Get draft booking
    const draftDoc = await db.collection('guestBookingDrafts').doc(draftId).get();
    if (!draftDoc.exists) {
      return NextResponse.json(
        { error: 'Draft booking not found' },
        { status: 404 }
      );
    }

    const draftData = draftDoc.data()!;
    
    // Verify ownership
    if (draftData.createdByUid !== decodedToken.uid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Verify PaymentIntent status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Get pricing snapshot from temp_bookings
    const tempBookingDoc = await db.collection('temp_bookings').doc(paymentIntentId).get();
    let pricingSnapshot = null;
    
    if (tempBookingDoc.exists) {
      const tempData = tempBookingDoc.data()!;
      pricingSnapshot = tempData.pricing_snapshot;
      // Clean up temp booking
      await tempBookingDoc.ref.delete();
    }

    // Create confirmed booking
    const bookingRef = db.collection('bookings').doc();
    const bookingId = bookingRef.id;

    const bookingData = {
      courseId: draftData.courseId,
      date: draftData.date,
      teeTime: draftData.teeTime,
      players: draftData.players,
      amount: draftData.amount,
      currency: draftData.currency,
      paymentIntentId,
      status: 'confirmed',
      isGuest: !userIdToLink,
      userId: userIdToLink || null,
      guest: draftData.guest,
      pricing_snapshot: pricingSnapshot, // Store immutable pricing snapshot
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await bookingRef.set(bookingData);

    // Delete the draft
    await draftDoc.ref.delete();

    // Get the language from the draft data for redirect
    const lang = draftData.lang || 'es';
    const redirectUrl = `/${lang}/book/success?booking_id=${bookingId}&payment_intent=${paymentIntentId}`;

    return NextResponse.json({
      ok: true,
      bookingId,
      redirectUrl,
      message: 'Booking confirmed successfully'
    });
  } catch (error) {
    console.error('Error finalizing guest booking:', error);
    return NextResponse.json(
      { error: 'Failed to finalize booking' },
      { status: 500 }
    );
  }
}