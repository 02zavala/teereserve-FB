/**
 * Script para validar las credenciales OAuth de Zoho Mail
 * Ejecutar con: node scripts/validate-oauth-credentials.js
 */

const https = require('https');
const querystring = require('querystring');

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const REQUIRED_VARS = [
  'ZOHO_MAIL_CLIENT_ID',
  'ZOHO_MAIL_CLIENT_SECRET',
  'ZOHO_MAIL_REFRESH_TOKEN',
  'ZOHO_MAIL_FROM'
];

function checkEnvironmentVariables() {
  console.log('🔍 Verificando variables de entorno...');
  
  const missing = [];
  const present = [];
  
  REQUIRED_VARS.forEach(varName => {
    if (process.env[varName]) {
      present.push(varName);
      console.log(`✅ ${varName}: Configurado`);
    } else {
      missing.push(varName);
      console.log(`❌ ${varName}: FALTANTE`);
    }
  });
  
  if (missing.length > 0) {
    console.log('\n❌ Variables faltantes:', missing.join(', '));
    return false;
  }
  
  console.log('\n✅ Todas las variables de entorno están configuradas');
  return true;
}

function validateCredentialFormat() {
  console.log('\n🔍 Validando formato de credenciales...');
  
  const clientId = process.env.ZOHO_MAIL_CLIENT_ID;
  const clientSecret = process.env.ZOHO_MAIL_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_MAIL_REFRESH_TOKEN;
  const fromEmail = process.env.ZOHO_MAIL_FROM;
  
  // Validar Client ID (formato típico de Zoho)
  if (!clientId.match(/^1000\.[A-Z0-9]+$/)) {
    console.log('⚠️  Client ID no tiene el formato esperado de Zoho');
  } else {
    console.log('✅ Client ID tiene formato válido');
  }
  
  // Validar Client Secret (debe ser hexadecimal)
  if (!clientSecret.match(/^[a-f0-9]{40,}$/)) {
    console.log('⚠️  Client Secret no tiene el formato esperado (hexadecimal)');
  } else {
    console.log('✅ Client Secret tiene formato válido');
  }
  
  // Validar Refresh Token
  if (!refreshToken.match(/^1000\.[a-f0-9]+\.[a-f0-9]+$/)) {
    console.log('⚠️  Refresh Token no tiene el formato esperado de Zoho');
  } else {
    console.log('✅ Refresh Token tiene formato válido');
  }
  
  // Validar email
  if (!fromEmail.includes('@')) {
    console.log('❌ Email FROM no es válido');
    return false;
  } else {
    console.log('✅ Email FROM es válido');
  }
  
  return true;
}

function testOAuthTokenRefresh() {
  return new Promise((resolve, reject) => {
    console.log('\n🔄 Probando renovación de token OAuth...');
    
    const postData = querystring.stringify({
      grant_type: 'refresh_token',
      client_id: process.env.ZOHO_MAIL_CLIENT_ID,
      client_secret: process.env.ZOHO_MAIL_CLIENT_SECRET,
      refresh_token: process.env.ZOHO_MAIL_REFRESH_TOKEN
    });
    
    const options = {
      hostname: 'accounts.zoho.com',
      port: 443,
      path: '/oauth/v2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
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
          
          if (res.statusCode === 200 && response.access_token) {
            console.log('✅ Token OAuth renovado exitosamente');
            console.log(`   - Access Token: ${response.access_token.substring(0, 20)}...`);
            console.log(`   - Expires in: ${response.expires_in} segundos`);
            resolve(response);
          } else {
            console.log('❌ Error renovando token OAuth:');
            console.log(`   - Status: ${res.statusCode}`);
            console.log(`   - Response: ${JSON.stringify(response, null, 2)}`);
            
            if (response.error === 'invalid_client') {
              console.log('\n💡 Sugerencias para error "invalid_client":');
              console.log('   1. Verificar que Client ID y Client Secret sean correctos');
              console.log('   2. Verificar que la aplicación esté activa en Zoho Developer Console');
              console.log('   3. Verificar que el dominio esté autorizado');
            }
            
            reject(new Error(`OAuth error: ${response.error || 'Unknown error'}`));
          }
        } catch (parseError) {
          console.log('❌ Error parsing response:', parseError.message);
          console.log('   Raw response:', data);
          reject(parseError);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Network error:', error.message);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('🧪 Iniciando validación de credenciales OAuth de Zoho Mail...\n');
  
  try {
    // 1. Verificar variables de entorno
    if (!checkEnvironmentVariables()) {
      process.exit(1);
    }
    
    // 2. Validar formato de credenciales
    if (!validateCredentialFormat()) {
      console.log('\n⚠️  Hay problemas con el formato de las credenciales');
    }
    
    // 3. Probar renovación de token
    await testOAuthTokenRefresh();
    
    console.log('\n🎉 ¡Todas las validaciones pasaron exitosamente!');
    console.log('\n📋 Próximos pasos:');
    console.log('   1. Las credenciales OAuth están configuradas correctamente');
    console.log('   2. Puedes proceder a probar el envío de emails');
    
  } catch (error) {
    console.log('\n❌ Validación fallida:', error.message);
    console.log('\n🔧 Acciones recomendadas:');
    console.log('   1. Verificar credenciales en Zoho Developer Console');
    console.log('   2. Regenerar Client Secret si es necesario');
    console.log('   3. Verificar que el Refresh Token no haya expirado');
    console.log('   4. Consultar la documentación: ZOHO_MAIL_SETUP.md');
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  checkEnvironmentVariables,
  validateCredentialFormat,
  testOAuthTokenRefresh
};