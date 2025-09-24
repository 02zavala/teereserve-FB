// Script de prueba para las alertas de admin
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testAdminAlerts() {
  const baseUrl = 'http://localhost:3001';
  const apiKey = 'test-admin-key-123';
  
  console.log('🧪 Iniciando pruebas de alertas de admin...\n');
  
  try {
    // Test 1: Verificar estado del servicio
    console.log('📊 Test 1: Verificando estado del servicio...');
    const statusResponse = await fetch(`${baseUrl}/api/test-admin-alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ type: 'status' })
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ Estado del servicio:', JSON.stringify(statusData, null, 2));
    } else {
      console.log('❌ Error en estado del servicio:', statusResponse.status, statusResponse.statusText);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 2: Enviar alertas de prueba
    console.log('🔔 Test 2: Enviando alertas de prueba...');
    const testResponse = await fetch(`${baseUrl}/api/test-admin-alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ type: 'test' })
    });
    
    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log('✅ Resultado de alertas de prueba:', JSON.stringify(testData, null, 2));
    } else {
      console.log('❌ Error en alertas de prueba:', testResponse.status, testResponse.statusText);
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test 3: Simular alerta de reserva confirmada
    console.log('📅 Test 3: Simulando alerta de reserva confirmada...');
    const bookingData = {
      bookingId: 'TEST-' + Date.now(),
      courseName: 'Campo de Golf de Prueba',
      customerName: 'Juan Pérez',
      customerEmail: 'juan.perez@example.com',
      customerPhone: '+34123456789',
      date: new Date().toISOString().split('T')[0],
      time: '10:00',
      players: 4,
      totalAmount: 120.00,
      currency: 'EUR',
      paymentMethod: 'Stripe'
    };
    
    const bookingResponse = await fetch(`${baseUrl}/api/test-admin-alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ 
        type: 'booking',
        bookingData: bookingData
      })
    });
    
    if (bookingResponse.ok) {
      const bookingResult = await bookingResponse.json();
      console.log('✅ Resultado de alerta de reserva:', JSON.stringify(bookingResult, null, 2));
    } else {
      console.log('❌ Error en alerta de reserva:', bookingResponse.status, bookingResponse.statusText);
    }
    
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
  }
  
  console.log('\n🏁 Pruebas completadas.');
}

// Ejecutar las pruebas
testAdminAlerts();