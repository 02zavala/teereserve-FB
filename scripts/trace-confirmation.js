// Script para trazar una reserva por número de confirmación y enviar alerta admin si corresponde
require('dotenv').config({ path: '.env.local' });
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fetch = globalThis.fetch;

const CONFIRMATION = (process.argv[2] || '').trim().toUpperCase();
if (!CONFIRMATION) {
  console.error('Uso: node scripts/trace-confirmation.js <CONFIRMATION_NUMBER>');
  process.exit(1);
}

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3002';

// Inicializar Firebase Admin
try {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.error('Faltan variables de entorno del Admin SDK de Firebase');
    process.exit(1);
  }
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
} catch (err) {
  console.error('Error inicializando Firebase Admin:', err);
  process.exit(1);
}

const db = getFirestore();

(async () => {
  console.log(`🔎 Buscando reserva con número de confirmación: ${CONFIRMATION}`);
  try {
    const snap = await db.collection('bookings')
      .where('confirmationNumber', '==', CONFIRMATION)
      .limit(1)
      .get();

    if (snap.empty) {
      console.log('❌ No se encontró ninguna reserva con ese número de confirmación');
      process.exit(2);
    }

    const doc = snap.docs[0];
    const data = doc.data();

    const bookingInfo = {
      id: doc.id,
      confirmationNumber: CONFIRMATION,
      status: data.status,
      date: data.date,
      time: data.time,
      players: data.players,
      totalPrice: data.totalPrice,
      paymentMethod: data.paymentMethod || 'desconocido',
      paymentIntentId: data.paymentIntentId,
      paypalOrderId: data.paypalOrderId,
      userId: data.userId,
      userName: data.userName,
      userEmail: data.userEmail,
      guestEmail: data.guest?.email,
      userPhone: data.userPhone,
      guestPhone: data.guest?.phone,
      courseId: data.courseId,
      courseName: data.courseName,
      createdAt: data.createdAt,
    };

    console.log('📄 Datos de la reserva:', bookingInfo);

    const emailToUse = data?.guest?.email || data?.userEmail || '';
    const phoneToUse = data?.guest?.phone || data?.userPhone || '';
    const transactionId = data?.paymentIntentId || data?.paypalOrderId || data?.transactionId || '';

    // Try to enrich with Stripe card details if available
    let cardLast4 = undefined;
    let cardBrand = undefined;
    try {
      const pmeth = (data.paymentMethod || '').toLowerCase();
      if (process.env.STRIPE_SECRET_KEY && data.paymentIntentId && pmeth.includes('stripe')) {
        const Stripe = require('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const pi = await stripe.paymentIntents.retrieve(data.paymentIntentId, { expand: ['payment_method'] });
        const pm = pi.payment_method;
        if (pm && typeof pm === 'object') {
          if (pm.card && pm.card.last4) {
            cardLast4 = pm.card.last4;
            cardBrand = pm.card.brand;
          }
        } else if (pi.charges && pi.charges.data && pi.charges.data.length > 0) {
          const charge = pi.charges.data[0];
          const paymentMethodDetails = charge.payment_method_details;
          if (paymentMethodDetails && paymentMethodDetails.card) {
            cardLast4 = paymentMethodDetails.card.last4;
            cardBrand = paymentMethodDetails.card.brand;
          }
        }
      }
    } catch (stripeErr) {
      console.warn('No se pudo enriquecer datos de tarjeta desde Stripe:', stripeErr?.message || stripeErr);
    }

    const bookingAlertData = {
      bookingId: doc.id,
      courseName: data.courseName || 'Campo',
      customerName: data.userName || 'Cliente',
      customerEmail: emailToUse,
      customerPhone: phoneToUse,
      date: data.date || new Date().toLocaleDateString('es-ES'),
      time: data.time || '10:00',
      players: data.players || 1,
      totalAmount: data.totalPrice || 0,
      currency: (data.currency || (data.pricing_snapshot?.currency) || 'USD'),
      paymentMethod: (data.paymentMethod || 'stripe').toLowerCase(),
      transactionId,
      bookingUrl: `${process.env.NEXT_PUBLIC_BASE_URL || BASE_URL}/booking/${doc.id}`,
      createdAt: new Date().toISOString(),
      cardLast4,
      cardBrand
    };

    if (String(data.status).toLowerCase() === 'confirmed') {
      if (!ADMIN_API_KEY) {
        console.error('Falta ADMIN_API_KEY en entorno. No puedo llamar al endpoint de prueba.');
        process.exit(3);
      }
      const url = `${BASE_URL.replace(/\/$/, '')}/api/test-admin-alerts`;
      console.log('🚀 Enviando alerta admin simulada con datos reales a:', url);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_API_KEY}`,
        },
        body: JSON.stringify({ type: 'booking', bookingData: bookingAlertData }),
      });
      const text = await res.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = null; }
      console.log('📬 Respuesta del endpoint:', parsed || text);
      console.log('✅ Si el envío fue exitoso, deberías recibir la alerta en Telegram.');
    } else {
      console.log('⚠️ La reserva no está en estado "confirmed". El flujo de alerta admin no se dispara en createBooking para otros estados.');
    }
  } catch (error) {
    console.error('Error durante la traza de la reserva:', error);
    process.exit(1);
  }
})();