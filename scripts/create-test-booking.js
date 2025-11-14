
// Crear una reserva de prueba confirmada y lista para enviar alerta
require('dotenv').config({ path: '.env.local' });

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const Stripe = require('stripe');

async function main() {
  const {
    STRIPE_SECRET_KEY,
    ADMIN_API_KEY,
    FIREBASE_PROJECT_ID,
  } = process.env;

  if (!STRIPE_SECRET_KEY) {
    throw new Error('Falta STRIPE_SECRET_KEY en .env.local');
  }

  // Inicializar Stripe
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  // Inicializar Firebase Admin con variables de entorno (cert)
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error('Faltan variables de entorno del Admin SDK de Firebase');
  }
  initializeApp({
    credential: require('firebase-admin/app').cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
  const db = getFirestore();

  // Parámetros de la reserva de prueba
  const amountCents = 15000; // 150.00 USD
  const currency = 'usd';
  const courseId = 'solmar-golf-links';
  const courseName = 'Solmar Golf Links';
  const players = 2;
  const teeDate = new Date();
  teeDate.setDate(teeDate.getDate() + 1); // mañana
  const dateStr = teeDate.toISOString().slice(0, 10);
  const timeStr = '11:00';

  // Crear y confirmar PaymentIntent con tarjeta de prueba
  console.log('Creando PaymentIntent de prueba y confirmándolo...');
  const pi = await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    payment_method_types: ['card'],
    payment_method: 'pm_card_visa',
    confirm: true,
    description: 'Reserva de prueba TeeReserve',
    metadata: { test_booking: 'true' },
    expand: ['payment_method']
  });

  const brand = pi.payment_method?.card?.brand || 'unknown';
  const last4 = pi.payment_method?.card?.last4 || '0000';
  console.log(`PaymentIntent confirmado: ${pi.id} (${brand} •••• ${last4})`);

  // Generar número de confirmación estilo TRG-XXXXXXX
  const confirmationNumber = generateConfirmationNumber();
  console.log(`Número de confirmación: ${confirmationNumber}`);

  // Construir documento de reserva
  const bookingDoc = {
    confirmationNumber,
    status: 'confirmed',
    courseId,
    courseName,
    date: dateStr,
    time: timeStr,
    players,
    totalPrice: amountCents / 100,
    currency: 'USD',
    paymentMethod: 'stripe',
    paymentIntentId: pi.id,
    // Datos cliente de prueba
    userId: 'guest',
    userName: 'Test User',
    userEmail: 'test.user@example.com',
    userPhone: '+34123456789',
    createdAt: new Date().toISOString(),
  };

  // Escribir en Firestore
  console.log('Guardando reserva de prueba en Firestore...');
  const ref = await db.collection('bookings').add(bookingDoc);
  console.log(`Reserva creada: docId=${ref.id}`);

  // Mostrar instrucciones para enviar alerta
  console.log('\nReserva lista para alerta. Ejecuta:');
  console.log(`  node scripts/trace-confirmation.js ${confirmationNumber}`);
  console.log('\nEsto enriquecerá con Stripe y enviará la alerta a admin.');
}

function generateConfirmationNumber() {
  // TRG- + 6 caracteres alfanuméricos
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `TRG-${code}`;
}

main().catch((err) => {
  console.error('Error creando reserva de prueba:', err);
  process.exit(1);
});