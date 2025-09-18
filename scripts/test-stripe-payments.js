/**
 * Script de prueba para verificar el funcionamiento del sistema de pagos con Stripe
 */

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

async function testStripePayments() {
  console.log('🧪 Iniciando prueba del sistema de pagos con Stripe...');
  console.log('🔑 Secret Key configurada:', process.env.STRIPE_SECRET_KEY ? 'Sí' : 'No');
  console.log('🔑 Publishable Key configurada:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? 'Sí' : 'No');
  console.log('🌍 Webhook Secret configurado:', process.env.STRIPE_WEBHOOK_SECRET ? 'Sí' : 'No');
  
  try {
    // Prueba 1: Verificar conexión con Stripe
    console.log('\n1️⃣ Verificando conexión con Stripe...');
    const account = await stripe.accounts.retrieve();
    console.log('✅ Conexión exitosa con Stripe');
    console.log('   - Account ID:', account.id);
    console.log('   - Country:', account.country);
    console.log('   - Currency:', account.default_currency);
    console.log('   - Charges enabled:', account.charges_enabled);
    console.log('   - Payouts enabled:', account.payouts_enabled);
    
    // Prueba 2: Crear un Payment Intent de prueba
    console.log('\n2️⃣ Creando Payment Intent de prueba...');
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 5000, // $50.00 USD
      currency: 'usd',
      description: 'TeeReserve - Prueba de reserva de golf',
      metadata: {
        type: 'test_booking',
        course: 'Campo de Golf de Prueba',
        date: new Date().toISOString().split('T')[0],
        players: '2',
        holes: '18'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });
    
    console.log('✅ Payment Intent creado exitosamente');
    console.log('   - ID:', paymentIntent.id);
    console.log('   - Amount:', `$${(paymentIntent.amount / 100).toFixed(2)}`);
    console.log('   - Status:', paymentIntent.status);
    console.log('   - Client Secret:', paymentIntent.client_secret ? 'Generado' : 'No generado');
    
    // Prueba 3: Crear un Setup Intent para guardar métodos de pago
    console.log('\n3️⃣ Creando Setup Intent para métodos de pago...');
    const setupIntent = await stripe.setupIntents.create({
      usage: 'off_session',
      metadata: {
        type: 'save_payment_method',
        user_id: 'test_user_123'
      }
    });
    
    console.log('✅ Setup Intent creado exitosamente');
    console.log('   - ID:', setupIntent.id);
    console.log('   - Status:', setupIntent.status);
    console.log('   - Client Secret:', setupIntent.client_secret ? 'Generado' : 'No generado');
    
    // Prueba 4: Listar productos (si existen)
    console.log('\n4️⃣ Verificando productos configurados...');
    const products = await stripe.products.list({ limit: 5 });
    console.log(`✅ Productos encontrados: ${products.data.length}`);
    products.data.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.name} (${product.id})`);
    });
    
    // Prueba 5: Verificar webhooks endpoints
    console.log('\n5️⃣ Verificando webhooks configurados...');
    const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 10 });
    console.log(`✅ Webhook endpoints configurados: ${webhookEndpoints.data.length}`);
    webhookEndpoints.data.forEach((endpoint, index) => {
      console.log(`   ${index + 1}. ${endpoint.url}`);
      console.log(`      - Status: ${endpoint.status}`);
      console.log(`      - Events: ${endpoint.enabled_events.length} configurados`);
    });
    
    // Prueba 6: Crear un cargo de validación de $1
    console.log('\n6️⃣ Probando cargo de validación de tarjeta...');
    const validationIntent = await stripe.paymentIntents.create({
      amount: 100, // $1.00 USD
      currency: 'usd',
      description: 'TeeReserve - Card Validation Charge',
      metadata: {
        type: 'card_validation',
        timestamp: new Date().toISOString()
      },
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic'
        }
      }
    });
    
    console.log('✅ Cargo de validación creado exitosamente');
    console.log('   - ID:', validationIntent.id);
    console.log('   - Amount:', `$${(validationIntent.amount / 100).toFixed(2)}`);
    console.log('   - 3D Secure:', 'Habilitado automáticamente');
    
    console.log('\n🎉 ¡Todas las pruebas de Stripe completadas exitosamente!');
    console.log('📊 Resumen:');
    console.log('   - Conexión con Stripe: ✅');
    console.log('   - Payment Intents: ✅');
    console.log('   - Setup Intents: ✅');
    console.log('   - Productos: ✅');
    console.log('   - Webhooks: ✅');
    console.log('   - Validación de tarjetas: ✅');
    console.log('\n🚀 El sistema de pagos está listo para procesar transacciones!');
    
  } catch (error) {
    console.error('❌ Error en las pruebas de Stripe:', error.message);
    
    if (error.type === 'StripeAuthenticationError') {
      console.log('\n💡 Sugerencias para errores de autenticación:');
      console.log('   1. Verifica que STRIPE_SECRET_KEY esté configurado correctamente');
      console.log('   2. Asegúrate de usar la clave secreta correcta (sk_test_... para test)');
      console.log('   3. Verifica que la clave no haya expirado');
    } else if (error.type === 'StripeAPIError') {
      console.log('\n💡 Sugerencias para errores de API:');
      console.log('   1. Verifica tu conexión a internet');
      console.log('   2. Revisa el estado de la API de Stripe');
      console.log('   3. Verifica los parámetros enviados');
    } else {
      console.log('\n💡 Sugerencias generales:');
      console.log('   1. Revisa la documentación de Stripe');
      console.log('   2. Verifica todas las variables de entorno');
      console.log('   3. Asegúrate de tener permisos suficientes en tu cuenta de Stripe');
    }
    
    process.exit(1);
  }
}

// Ejecutar pruebas
testStripePayments();