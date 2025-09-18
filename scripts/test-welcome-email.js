/**
 * Script para probar el envío del correo de bienvenida
 * Ejecutar con: node scripts/test-welcome-email.js
 */

const { Resend } = require('resend');
const nodemailer = require('nodemailer');

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

// Email de prueba
const TEST_EMAIL = 'test@example.com';
const TEST_USER_NAME = 'Usuario de Prueba';

function createTestEmailTemplate() {
  return {
    subject: '¡Bienvenido a TeeReserve Golf!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2c5530;">¡Bienvenido a TeeReserve Golf!</h1>
        <p>Hola ${TEST_USER_NAME},</p>
        <p>¡Gracias por unirte a TeeReserve Golf! Estamos emocionados de tenerte en nuestra comunidad.</p>
        <p>Ahora puedes:</p>
        <ul>
          <li>Reservar campos de golf</li>
          <li>Explorar cursos disponibles</li>
          <li>Gestionar tus reservas</li>
        </ul>
        <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
        <p>¡Que disfrutes del golf!</p>
        <p>El equipo de TeeReserve Golf</p>
      </div>
    `,
    text: `¡Bienvenido a TeeReserve Golf!\n\nHola ${TEST_USER_NAME},\n\n¡Gracias por unirte a TeeReserve Golf! Estamos emocionados de tenerte en nuestra comunidad.\n\nAhora puedes reservar campos de golf, explorar cursos disponibles y gestionar tus reservas.\n\nSi tienes alguna pregunta, no dudes en contactarnos.\n\n¡Que disfrutes del golf!\n\nEl equipo de TeeReserve Golf`
  };
}

async function testResend() {
  console.log('\n🧪 Probando envío con Resend...');
  
  if (!process.env.RESEND_API_KEY) {
    console.log('❌ RESEND_API_KEY no configurado');
    return false;
  }
  
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const template = createTestEmailTemplate();
    
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'TeeReserve Golf <noreply@teereserve.com>',
      to: TEST_EMAIL,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    
    if (result.error) {
      console.log('❌ Error con Resend:', result.error.message);
      return false;
    }
    
    console.log('✅ Email enviado exitosamente con Resend');
    console.log(`   - Message ID: ${result.data?.id}`);
    return true;
    
  } catch (error) {
    console.log('❌ Error con Resend:', error.message);
    return false;
  }
}

async function testZoho() {
  console.log('\n🧪 Probando envío con Zoho...');
  
  const requiredVars = ['ZOHO_MAIL_FROM', 'ZOHO_MAIL_CLIENT_ID', 'ZOHO_MAIL_CLIENT_SECRET', 'ZOHO_MAIL_REFRESH_TOKEN'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.log('❌ Variables de Zoho faltantes:', missing.join(', '));
    return false;
  }
  
  try {
    const transporter = nodemailer.createTransporter({
      host: 'smtp.zoho.com',
      port: 465,
      secure: true,
      auth: {
        type: 'OAuth2',
        user: process.env.ZOHO_MAIL_FROM,
        clientId: process.env.ZOHO_MAIL_CLIENT_ID,
        clientSecret: process.env.ZOHO_MAIL_CLIENT_SECRET,
        refreshToken: process.env.ZOHO_MAIL_REFRESH_TOKEN,
      },
    });
    
    const template = createTestEmailTemplate();
    
    const info = await transporter.sendMail({
      from: `"TeeReserve Golf" <${process.env.ZOHO_MAIL_FROM}>`,
      to: TEST_EMAIL,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    
    console.log('✅ Email enviado exitosamente con Zoho');
    console.log(`   - Message ID: ${info.messageId}`);
    return true;
    
  } catch (error) {
    console.log('❌ Error con Zoho:', error.message);
    
    if (error.message.includes('invalid_client')) {
      console.log('\n💡 Sugerencias para error "invalid_client":');
      console.log('   1. Verificar Client ID y Client Secret en Zoho Developer Console');
      console.log('   2. Regenerar el Refresh Token');
      console.log('   3. Verificar que la aplicación esté activa');
    }
    
    return false;
  }
}

async function testEmailProviders() {
  console.log('🧪 Iniciando pruebas de proveedores de email...\n');
  console.log(`📧 Email de prueba: ${TEST_EMAIL}`);
  console.log(`👤 Usuario de prueba: ${TEST_USER_NAME}\n`);
  
  const results = {
    resend: false,
    zoho: false
  };
  
  // Probar Resend
  results.resend = await testResend();
  
  // Probar Zoho
  results.zoho = await testZoho();
  
  // Resumen
  console.log('\n📊 Resumen de pruebas:');
  console.log(`   - Resend: ${results.resend ? '✅ Funcionando' : '❌ Fallando'}`);
  console.log(`   - Zoho: ${results.zoho ? '✅ Funcionando' : '❌ Fallando'}`);
  
  if (results.resend || results.zoho) {
    console.log('\n🎉 ¡Al menos un proveedor está funcionando!');
    if (results.resend && results.zoho) {
      console.log('   - Configuración ideal: Resend principal, Zoho fallback');
    } else if (results.resend) {
      console.log('   - Usando Resend como único proveedor');
    } else {
      console.log('   - Usando Zoho como único proveedor');
    }
  } else {
    console.log('\n❌ Ningún proveedor está funcionando');
    console.log('\n🔧 Acciones recomendadas:');
    console.log('   1. Verificar variables de entorno');
    console.log('   2. Validar credenciales de API');
    console.log('   3. Revisar configuración de dominios');
    process.exit(1);
  }
}

if (require.main === module) {
  testEmailProviders().catch(error => {
    console.error('\n❌ Error en las pruebas:', error.message);
    process.exit(1);
  });
}

module.exports = {
  testResend,
  testZoho,
  testEmailProviders
};