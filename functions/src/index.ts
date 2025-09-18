
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
const cors = require('cors');

// Import Telegram services
import { TelegramService } from '../lib/telegram-service';
import { AlertRoleManager } from '../lib/alert-roles';
import { TelegramMessageTemplates, BookingNotificationData, EventTicketNotificationData } from '../lib/telegram-templates';

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Stripe
const stripe = new Stripe(functions.config().stripe.secret_key, {
  apiVersion: '2025-02-24.acacia',
});

// CORS configuration
const corsHandler = cors({ origin: true });

/**
 * Creates a payment intent for guest bookings
 */
export const createGuestBookingIntent = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      const { courseId, selectedDate, selectedTime, guestInfo, amount } = req.body;

      // Validate required fields
      if (!courseId || !selectedDate || !selectedTime || !guestInfo || !amount) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Validate guest info
      if (!guestInfo.email || !guestInfo.name || !guestInfo.phone) {
        res.status(400).json({ error: 'Missing guest information' });
        return;
      }

      // Create anonymous user for this booking
      const userRecord = await admin.auth().createUser({
        email: guestInfo.email,
        displayName: guestInfo.name,
      });

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          courseId,
          selectedDate,
          selectedTime,
          guestEmail: guestInfo.email,
          guestName: guestInfo.name,
          guestPhone: guestInfo.phone,
          userId: userRecord.uid,
          bookingType: 'guest',
        },
      });

      // Store booking draft in Firestore
      const bookingDraft = {
        courseId,
        selectedDate,
        selectedTime,
        guestInfo,
        amount,
        paymentIntentId: paymentIntent.id,
        userId: userRecord.uid,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
        ),
      };

      await admin.firestore()
        .collection('guestBookingDrafts')
        .doc(paymentIntent.id)
        .set(bookingDraft);

      res.status(200).json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        userId: userRecord.uid,
      });
    } catch (error) {
      console.error('Error creating guest booking intent:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

/**
 * Finalizes a guest booking after successful payment
 */
export const finalizeGuestBooking = functions.https.onRequest(async (req, res) => {
  return corsHandler(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        res.status(400).json({ error: 'Missing payment intent ID' });
        return;
      }

      // Verify payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        res.status(400).json({ error: 'Payment not completed' });
        return;
      }

      // Get booking draft
      const draftDoc = await admin.firestore()
        .collection('guestBookingDrafts')
        .doc(paymentIntentId)
        .get();

      if (!draftDoc.exists) {
        res.status(404).json({ error: 'Booking draft not found' });
        return;
      }

      const draftData = draftDoc.data()!;

      // Create final booking
      const booking = {
        courseId: draftData.courseId,
        userId: draftData.userId,
        selectedDate: draftData.selectedDate,
        selectedTime: draftData.selectedTime,
        guestInfo: draftData.guestInfo,
        amount: draftData.amount,
        paymentIntentId,
        status: 'confirmed',
        bookingType: 'guest',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentStatus: 'paid',
        stripePaymentIntent: {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
        },
      };

      // Save booking to main collection
      const bookingRef = await admin.firestore()
        .collection('bookings')
        .add(booking);

      // Delete the draft
      await draftDoc.ref.delete();

      // Send confirmation email (optional - implement if needed)
      // await sendBookingConfirmationEmail(booking);

      res.status(200).json({
        success: true,
        bookingId: bookingRef.id,
        booking,
      });
    } catch (error) {
      console.error('Error finalizing guest booking:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

/**
 * Webhook to handle Stripe events
 */
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  let endpointSecret;

  // Asegurarse de que el secreto del webhook está configurado
  if (functions.config().stripe && functions.config().stripe.webhook_secret) {
    endpointSecret = functions.config().stripe.webhook_secret;
  } else {
    console.error('Stripe webhook secret is not configured in Firebase functions config.');
    res.status(400).send('Webhook secret not configured.');
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log('Payment succeeded:', paymentIntent.id);
      
      try {
        await handleSuccessfulPayment(paymentIntent, 'stripe');
      } catch (error) {
        console.error('Error handling successful payment notification:', error);
      }
      break;
      
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object as Stripe.PaymentIntent;
      console.log('Payment failed:', failedPayment.id);
      
      try {
        await handleFailedPayment(failedPayment, 'stripe');
      } catch (error) {
        console.error('Error handling failed payment notification:', error);
      }
      break;
      
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

/**
 * Handle successful payment and send Telegram notifications
 */
async function handleSuccessfulPayment(paymentIntent: any, paymentMethod: string) {
  try {
    // Find the booking or event ticket associated with this payment
    const bookingData = await findBookingByPaymentIntent(paymentIntent.id);
    
    if (bookingData) {
      const telegramService = new TelegramService();
      const alertRoleManager = new AlertRoleManager();
      
      // Get users who should receive booking alerts
      const alertUsers = await alertRoleManager.getUsersForAlert('booking_confirmed');
      
      if (alertUsers.length > 0) {
        const notificationData: BookingNotificationData = {
          bookingId: bookingData.id,
          playerCount: bookingData.playerCount || 1,
          date: bookingData.date || new Date().toLocaleDateString('es-ES'),
          time: bookingData.time || new Date().toLocaleTimeString('es-ES'),
          paymentMethod: paymentMethod as any,
          transactionStatus: 'confirmed',
          amount: paymentIntent.amount / 100, // Stripe amounts are in cents
          currency: paymentIntent.currency,
          customerName: bookingData.customerName,
          customerEmail: bookingData.customerEmail,
          courseName: bookingData.courseName,
          transactionId: paymentIntent.id
        };
        
        const message = TelegramMessageTemplates.formatBookingNotification(notificationData);
        
        // Send notification to all configured users
        for (const user of alertUsers) {
          await telegramService.sendBookingAlert(user.telegramChatId, message, notificationData);
        }
        
        console.log(`Telegram notifications sent for successful booking payment: ${paymentIntent.id}`);
      }
    }
  } catch (error) {
    console.error('Error in handleSuccessfulPayment:', error);
  }
}

/**
 * Handle failed payment and send Telegram notifications
 */
async function handleFailedPayment(paymentIntent: any, paymentMethod: string) {
  try {
    // Find the booking or event ticket associated with this payment
    const bookingData = await findBookingByPaymentIntent(paymentIntent.id);
    
    if (bookingData) {
      const telegramService = new TelegramService();
      const alertRoleManager = new AlertRoleManager();
      
      // Get users who should receive payment failure alerts
      const alertUsers = await alertRoleManager.getUsersForAlert('payment_failed');
      
      if (alertUsers.length > 0) {
        const notificationData: BookingNotificationData = {
          bookingId: bookingData.id,
          playerCount: bookingData.playerCount || 1,
          date: bookingData.date || new Date().toLocaleDateString('es-ES'),
          time: bookingData.time || new Date().toLocaleTimeString('es-ES'),
          paymentMethod: paymentMethod as any,
          transactionStatus: 'failed',
          amount: paymentIntent.amount / 100, // Stripe amounts are in cents
          currency: paymentIntent.currency,
          customerName: bookingData.customerName,
          customerEmail: bookingData.customerEmail,
          courseName: bookingData.courseName,
          transactionId: paymentIntent.id
        };
        
        const message = TelegramMessageTemplates.formatPaymentFailedNotification(notificationData);
        
        // Send notification to all configured users
        for (const user of alertUsers) {
          await telegramService.sendBookingAlert(user.telegramChatId, message, notificationData);
        }
        
        console.log(`Telegram notifications sent for failed booking payment: ${paymentIntent.id}`);
      }
    }
  } catch (error) {
    console.error('Error in handleFailedPayment:', error);
  }
}

/**
 * Find booking data by payment intent ID
 */
async function findBookingByPaymentIntent(paymentIntentId: string): Promise<any> {
  try {
    // Search in guest bookings
    const guestBookingsQuery = await admin.firestore()
      .collection('guestBookings')
      .where('paymentIntentId', '==', paymentIntentId)
      .limit(1)
      .get();
    
    if (!guestBookingsQuery.empty) {
      const doc = guestBookingsQuery.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    
    // Search in regular bookings
    const bookingsQuery = await admin.firestore()
      .collection('bookings')
      .where('paymentIntentId', '==', paymentIntentId)
      .limit(1)
      .get();
    
    if (!bookingsQuery.empty) {
      const doc = bookingsQuery.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    
    // Search in event tickets
    const eventTicketsQuery = await admin.firestore()
      .collection('eventTickets')
      .where('paymentIntentId', '==', paymentIntentId)
      .limit(1)
      .get();
    
    if (!eventTicketsQuery.empty) {
      const doc = eventTicketsQuery.docs[0];
      return { id: doc.id, ...doc.data(), isEventTicket: true };
    }
    
    console.log(`No booking found for payment intent: ${paymentIntentId}`);
    return null;
  } catch (error) {
    console.error('Error finding booking by payment intent:', error);
    return null;
  }
}

/**
 * Clean up expired booking drafts
 * TODO: Implement scheduled function for cleanup
 */
// export const cleanupExpiredDrafts = functions.pubsub.schedule('every 10 minutes').onRun(async (context: functions.EventContext) => {
//     const now = admin.firestore.Timestamp.now();
//     
//     const expiredDrafts = await admin.firestore()
//       .collection('guestBookingDrafts')
//       .where('expiresAt', '<=', now)
//       .get();

//     const batch = admin.firestore().batch();
//     
//     expiredDrafts.docs.forEach((doc) => {
//       batch.delete(doc.ref);
//     });

//     await batch.commit();
//     
//     console.log(`Cleaned up ${expiredDrafts.size} expired booking drafts`);
//   });
