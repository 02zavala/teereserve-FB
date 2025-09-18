/**
 * Script de prueba para verificar el funcionamiento del sistema de pagos con PayPal
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');

async function testPayPalPayments() {
  console.log('🧪 Iniciando prueba del sistema de pagos con PayPal...');
  console.log('🔑 Client ID configurado:', process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ? 'Sí' : 'No');
  console.log('🔑 Client Secret configurado:', process.env.PAYPAL_CLIENT_SECRET ? 'Sí' : 'No');
  console.log('🌍 Environment:', process.env.PAYPAL_ENVIRONMENT || 'sandbox');
  
  if (!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    console.log('❌ Faltan credenciales de PayPal');
    console.log('💡 Asegúrate de configurar:');
    console.log('   - NEXT_PUBLIC_PAYPAL_CLIENT_ID');
    console.log('   - PAYPAL_CLIENT_SECRET');
    return;
  }
  
  try {
    // Prueba 1: Obtener token de acceso
    console.log('\n1️⃣ Obteniendo token de acceso de PayPal...');
    const accessToken = await getPayPalAccessToken();
    console.log('✅ Token de acceso obtenido exitosamente');
    console.log('   - Token length:', accessToken.length);
    
    // Prueba 2: Crear una orden de prueba
    console.log('\n2️⃣ Creando orden de prueba...');
    const order = await createPayPalOrder(accessToken);
    console.log('✅ Orden de PayPal creada exitosamente');
    console.log('   - Order ID:', order.id);
    console.log('   - Status:', order.status);
    console.log('   - Amount:', order.purchase_units[0].amount.value, order.purchase_units[0].amount.currency_code);
    
    // Prueba 3: Obtener detalles de la orden
    console.log('\n3️⃣ Obteniendo detalles de la orden...');
    const orderDetails = await getPayPalOrderDetails(accessToken, order.id);
    console.log('✅ Detalles de orden obtenidos exitosamente');
    console.log('   - Order ID:', orderDetails.id);
    console.log('   - Status:', orderDetails.status);
    console.log('   - Create time:', orderDetails.create_time);
    
    console.log('\n🎉 ¡Todas las pruebas de PayPal completadas exitosamente!');
    console.log('📊 Resumen:');
    console.log('   - Autenticación: ✅');
    console.log('   - Creación de órdenes: ✅');
    console.log('   - Consulta de órdenes: ✅');
    console.log('\n🚀 El sistema de pagos PayPal está listo para procesar transacciones!');
    
  } catch (error) {
    console.error('❌ Error en las pruebas de PayPal:', error.message);
    
    if (error.message.includes('AUTHENTICATION_FAILURE')) {
      console.log('\n💡 Sugerencias para errores de autenticación:');
      console.log('   1. Verifica que NEXT_PUBLIC_PAYPAL_CLIENT_ID esté configurado correctamente');
      console.log('   2. Verifica que PAYPAL_CLIENT_SECRET esté configurado correctamente');
      console.log('   3. Asegúrate de usar las credenciales correctas para el entorno (sandbox/live)');
    } else if (error.message.includes('INVALID_REQUEST')) {
      console.log('\n💡 Sugerencias para errores de solicitud:');
      console.log('   1. Verifica el formato de los datos enviados');
      console.log('   2. Revisa la documentación de la API de PayPal');
      console.log('   3. Asegúrate de que el entorno esté configurado correctamente');
    } else {
      console.log('\n💡 Sugerencias generales:');
      console.log('   1. Verifica tu conexión a internet');
      console.log('   2. Revisa el estado de la API de PayPal');
      console.log('   3. Verifica todas las variables de entorno');
    }
    
    process.exit(1);
  }
}

function getPayPalAccessToken() {
  return new Promise((resolve, reject) => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
    const baseUrl = environment === 'sandbox' 
      ? 'api-m.sandbox.paypal.com'
      : 'api-m.paypal.com';
    
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const postData = 'grant_type=client_credentials';
    
    const options = {
      hostname: baseUrl,
      port: 443,
      path: '/v1/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error(`PayPal authentication failed: ${data}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse PayPal response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`PayPal request failed: ${error.message}`));
    });
    
    req.write(postData);
    req.end();
  });
}

function createPayPalOrder(accessToken) {
  return new Promise((resolve, reject) => {
    const environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
    const baseUrl = environment === 'sandbox' 
      ? 'api-m.sandbox.paypal.com'
      : 'api-m.paypal.com';
    
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: '50.00'
        },
        description: 'TeeReserve - Prueba de reserva de golf'
      }],
      application_context: {
        brand_name: 'TeeReserve',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: 'https://teereserve.golf/payment/success',
        cancel_url: 'https://teereserve.golf/payment/cancel'
      }
    };
    
    const postData = JSON.stringify(orderData);
    
    const options = {
      hostname: baseUrl,
      port: 443,
      path: '/v2/checkout/orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.id) {
            resolve(response);
          } else {
            reject(new Error(`PayPal order creation failed: ${data}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse PayPal response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`PayPal request failed: ${error.message}`));
    });
    
    req.write(postData);
    req.end();
  });
}

function getPayPalOrderDetails(accessToken, orderId) {
  return new Promise((resolve, reject) => {
    const environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
    const baseUrl = environment === 'sandbox' 
      ? 'api-m.sandbox.paypal.com'
      : 'api-m.paypal.com';
    
    const options = {
      hostname: baseUrl,
      port: 443,
      path: `/v2/checkout/orders/${orderId}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.id) {
            resolve(response);
          } else {
            reject(new Error(`PayPal order details failed: ${data}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse PayPal response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`PayPal request failed: ${error.message}`));
    });
    
    req.end();
  });
}

// Ejecutar pruebas
testPayPalPayments();