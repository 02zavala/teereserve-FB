"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = exports.finalizeGuestBooking = exports.createGuestBookingIntent = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const cors = require('cors');
// Initialize Firebase Admin
admin.initializeApp();
// Initialize Stripe
const stripe = new stripe_1.default(functions.config().stripe.secret_key, {
    apiVersion: '2025-02-24.acacia',
});
// CORS configuration
const corsHandler = cors({ origin: true });
/**
 * Creates a payment intent for guest bookings
 */
exports.createGuestBookingIntent = functions.https.onRequest(async (req, res) => {
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
                expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
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
        }
        catch (error) {
            console.error('Error creating guest booking intent:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
});
/**
 * Finalizes a guest booking after successful payment
 */
exports.finalizeGuestBooking = functions.https.onRequest(async (req, res) => {
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
            const draftData = draftDoc.data();
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
        }
        catch (error) {
            console.error('Error finalizing guest booking:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
});
/**
 * Webhook to handle Stripe events
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let endpointSecret;
    // Asegurarse de que el secreto del webhook está configurado
    if (functions.config().stripe && functions.config().stripe.webhook_secret) {
        endpointSecret = functions.config().stripe.webhook_secret;
    }
    else {
        console.error('Stripe webhook secret is not configured in Firebase functions config.');
        res.status(400).send('Webhook secret not configured.');
        return;
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    }
    catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('Payment succeeded:', paymentIntent.id);
            // Aquí puedes agregar lógica para actualizar el estado de la reserva en Firestore
            break;
        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            console.log('Payment failed:', failedPayment.id);
            // Aquí puedes manejar el fallo del pago, como notificar al usuario
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }
    res.json({ received: true });
});
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
//# sourceMappingURL=index.js.map