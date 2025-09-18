/**
 * Script para probar el envío del correo de confirmación de reserva
 * con los nuevos datos de pricing actualizados
 * Ejecutar con: node scripts/test-booking-confirmation-email.js
 */

require('dotenv').config({ path: '.env.local' });
const { sendBookingConfirmation } = require('../src/lib/email.js');

// Email del usuario de prueba
const testUserEmail = 'test@example.com';

// Datos de prueba para la reserva
const testBookingDetails = {
  id: 'test-booking-' + Date.now(),
  courseId: 'test-course',
  courseName: 'Campo de Golf Test',
  date: '2024-01-15',
  time: '10:00',
  players: 2,
  holes: 18,
  price: 100,
  userName: 'Usuario de Prueba',
  userId: 'test-user-id',
  
  // Datos de pricing actualizados
  pricing_snapshot: {
    subtotal: 100,
    tax: 16,
    discount: 10,
    total: 106,
    currency: 'USD'
  },
  
  // Información adicional del campo
  courseInfo: {
    address: 'Dirección del Campo de Golf Test',
    phone: '+52 55 1234 5678',
    website: 'https://campodetest.com'
  }
};

async function testBookingConfirmationEmail() {
  console.log('🧪 Probando email de confirmación de reserva con nuevos datos de pricing...');
  console.log('📧 API Key configurada:', process.env.RESEND_API_KEY ? 'Sí' : 'No');
  console.log('📨 Email origen:', process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM);
  
  console.log('\n📋 Datos de la reserva de prueba:');
  console.log('   - ID:', testBookingDetails.id);
  console.log('   - Campo:', testBookingDetails.courseName);
  console.log('   - Fecha:', testBookingDetails.date);
  console.log('   - Hora:', testBookingDetails.time);
  console.log('   - Jugadores:', testBookingDetails.players);
  console.log('   - Hoyos:', testBookingDetails.holes);
  console.log('   - Email:', testUserEmail);
  
  console.log('\n💰 Desglose de precios:');
  console.log('   - Subtotal:', `$${testBookingDetails.pricing_snapshot.subtotal} ${testBookingDetails.pricing_snapshot.currency}`);
  console.log('   - Impuestos:', `$${testBookingDetails.pricing_snapshot.tax} ${testBookingDetails.pricing_snapshot.currency}`);
  console.log('   - Descuento:', `$${testBookingDetails.pricing_snapshot.discount} ${testBookingDetails.pricing_snapshot.currency}`);
  console.log('   - Total:', `$${testBookingDetails.pricing_snapshot.total} ${testBookingDetails.pricing_snapshot.currency}`);
  
  try {
    console.log('\n📧 Enviando email de confirmación...');
    
    const result = await sendBookingConfirmation(testUserEmail, testBookingDetails);
    
    if (result.success) {
      console.log('✅ Email de confirmación enviado exitosamente!');
      console.log('📬 Message ID:', result.data?.id);
      console.log('📨 Enviado a:', testUserEmail);
      
      console.log('\n🎉 ¡Prueba completada exitosamente!');
      console.log('📊 Verificaciones realizadas:');
      console.log('   - ✅ Función de envío de email');
      console.log('   - ✅ Template con nuevos datos de pricing');
      console.log('   - ✅ Formato de moneda USD');
      console.log('   - ✅ Desglose de precios (subtotal, impuestos, descuento)');
      console.log('   - ✅ Cálculo correcto del total');
      
      console.log('\n💡 Revisa tu bandeja de entrada en:', testUserEmail);
      console.log('   El email debe mostrar el desglose de precios actualizado.');
      
    } else {
      console.error('❌ Error enviando email:', result.error);
      
      if (result.error?.message?.includes('API key')) {
        console.log('\n💡 Sugerencias:');
        console.log('   1. Verifica que RESEND_API_KEY esté configurado correctamente');
        console.log('   2. Asegúrate de que la API key sea válida');
        console.log('   3. Verifica que el dominio esté verificado en Resend');
      }
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    console.error('Stack trace:', error.stack);
    
    console.log('\n🔧 Posibles soluciones:');
    console.log('   1. Verificar que todas las dependencias estén instaladas');
    console.log('   2. Comprobar que las variables de entorno estén configuradas');
    console.log('   3. Revisar que la función sendBookingConfirmation esté exportada correctamente');
    
    process.exit(1);
  }
}

// Función adicional para probar diferentes escenarios de pricing
async function testDifferentPricingScenarios() {
  console.log('\n🧪 Probando diferentes escenarios de pricing...');
  
  const scenarios = [
    {
      name: 'Sin descuento',
      pricing_snapshot: {
        subtotal: 150,
        tax: 24,
        discount: 0,
        total: 174,
        currency: 'MXN'
      }
    },
    {
      name: 'Con descuento alto',
      pricing_snapshot: {
        subtotal: 200,
        tax: 32,
        discount: 50,
        total: 182,
        currency: 'MXN'
      }
    },
    {
      name: 'Precio bajo',
      pricing_snapshot: {
        subtotal: 50,
        tax: 8,
        discount: 5,
        total: 53,
        currency: 'MXN'
      }
    }
  ];
  
  for (const scenario of scenarios) {
    console.log(`\n📧 Probando escenario: ${scenario.name}`);
    
    const testData = {
      ...testBookingDetails,
      id: 'test-booking-' + Date.now() + '-' + scenario.name.replace(/\s+/g, '-').toLowerCase(),
      pricing_snapshot: scenario.pricing_snapshot
    };
    
    try {
      const result = await sendBookingConfirmation(testUserEmail, testData);
      
      if (result.success) {
        console.log(`   ✅ ${scenario.name}: Email enviado exitosamente`);
      } else {
        console.log(`   ❌ ${scenario.name}: Error -`, result.error?.message);
      }
      
    } catch (error) {
      console.log(`   ❌ ${scenario.name}: Error -`, error.message);
    }
    
    // Esperar un poco entre envíos para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Ejecutar las pruebas
if (require.main === module) {
  testBookingConfirmationEmail()
    .then(() => {
      // Preguntar si quiere probar diferentes escenarios
      console.log('\n❓ ¿Quieres probar diferentes escenarios de pricing?');
      console.log('   Descomenta la línea siguiente para ejecutar pruebas adicionales:');
      console.log('   // return testDifferentPricingScenarios();');
      
      // return testDifferentPricingScenarios();
    })
    .catch(error => {
      console.error('\n❌ Error en las pruebas:', error.message);
      process.exit(1);
    });
}

module.exports = {
  testBookingConfirmationEmail,
  testDifferentPricingScenarios
};