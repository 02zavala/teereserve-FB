import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// Simple TRG-XXXXXX confirmation generator (6 chars)
function generateConfirmationNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'TRG-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

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

    // Verify PaymentIntent status (expand payment_method to access card details)
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['payment_method'] });
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

    const confirmationNumber = generateConfirmationNumber();

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
      userPhone: draftData.guest?.phone,
      guest: draftData.guest,
      confirmationNumber,
      pricing_snapshot: pricingSnapshot, // Store immutable pricing snapshot
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await bookingRef.set(bookingData);

    // Delete the draft
    await draftDoc.ref.delete();

    // Send admin alerts for confirmed booking
    try {
      const { sendAdminBookingAlert } = await import('@/lib/admin-alerts-service');

      // Try to enrich with card brand/last4 from Stripe
      let cardLast4: string | undefined;
      let cardBrand: string | undefined;
      try {
        const pm = paymentIntent.payment_method as any;
        if (pm && typeof pm === 'object' && pm.card) {
          cardLast4 = pm.card.last4;
          cardBrand = pm.card.brand;
        } else if (pm && typeof pm === 'string') {
          const pmObj = await stripe.paymentMethods.retrieve(pm);
          if (pmObj && pmObj.card) {
            cardLast4 = pmObj.card.last4;
            cardBrand = pmObj.card.brand;
          }
        }
      } catch (stripeInfoError) {
        console.warn('Unable to enrich admin alert with card info:', stripeInfoError);
      }

      const adminAlertData = {
        bookingId: bookingId,
        courseName: draftData.courseName || 'Unknown Course',
        customerName: draftData.guest ? `${draftData.guest.firstName} ${draftData.guest.lastName}` : 'Unknown Customer',
        customerEmail: draftData.guest?.email || 'unknown@email.com',
        customerPhone: draftData.guest?.phone,
        date: draftData.date,
        time: draftData.teeTime,
        players: draftData.players,
        totalAmount: draftData.amount,
        currency: draftData.currency || 'USD',
        paymentMethod: 'stripe',
        transactionId: paymentIntentId,
        bookingUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://teereserve.golf'}/booking/${bookingId}`,
        createdAt: new Date(),
        cardLast4,
        cardBrand
      };

      await sendAdminBookingAlert(adminAlertData);
      console.log(`Admin alerts sent for confirmed guest booking: ${bookingId}`);
    } catch (adminAlertError) {
      console.error(`Guest booking ${bookingId} created, but admin alerts failed:`, adminAlertError);
      // Don't throw error to user, as booking was successful. Log for monitoring.
    }

    // Get the language from the draft data for redirect
    const lang = draftData.lang || 'es';
    const redirectUrl = `/${lang}/book/success?booking_id=${bookingId}&payment_intent=${paymentIntentId}`;

    // Send receipt email with PDF to guest
    try {
      // Fetch course data to enrich email details
      const courseDoc = await db.collection('courses').doc(draftData.courseId).get();
      const courseData = courseDoc.exists ? courseDoc.data() as any : {};
      const courseName = courseData?.name || courseData?.courseName || 'Unknown Course';
      const courseLocation = courseData?.location || courseData?.city || courseData?.address || undefined;
      const holes = courseData?.holes || 18;

      const recipientEmail = draftData.guest?.email;
      if (recipientEmail) {
        // Extraer últimos 4 dígitos y marca de tarjeta del PaymentIntent
        let receiptCardLast4: string | undefined;
        let receiptCardBrand: string | undefined;
        try {
          const pm = paymentIntent.payment_method as any;
          if (pm && typeof pm === 'object' && pm.card) {
            receiptCardLast4 = pm.card.last4;
            receiptCardBrand = pm.card.brand;
          } else if (pm && typeof pm === 'string') {
            const pmObj = await stripe.paymentMethods.retrieve(pm);
            if (pmObj && pmObj.card) {
              receiptCardLast4 = pmObj.card.last4;
              receiptCardBrand = pmObj.card.brand;
            }
          }
        } catch (stripePmErr) {
          console.warn('Unable to attach card info to receipt details:', stripePmErr);
        }

        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ? '' : ''}/api/send-booking-receipt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientEmail,
            bookingDetails: {
              confirmationNumber,
              playerName: `${draftData.guest?.firstName || ''} ${draftData.guest?.lastName || ''}`.trim() || 'Cliente',
              courseName,
              courseLocation,
              date: draftData.date,
              time: draftData.teeTime,
              players: draftData.players,
              holes,
              totalPrice: draftData.amount,
              pricing_snapshot: pricingSnapshot,
              // Datos para alertas/recibo
              paymentMethod: 'stripe',
              transactionId: paymentIntentId,
              cardLast4: receiptCardLast4,
              cardBrand: receiptCardBrand,
              customerPhone: draftData.guest?.phone,
            },
          }),
        });

        if (!emailResponse.ok) {
          const err = await emailResponse.json().catch(() => ({}));
          console.error('Failed to send guest booking receipt:', emailResponse.status, err);
        }
      }
    } catch (sendError) {
      console.error('Error while sending booking receipt email:', sendError);
      // Do not fail booking finalization due to email issues
    }

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