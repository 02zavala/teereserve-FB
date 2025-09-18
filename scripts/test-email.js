/**
 * Script para probar la configuración de email de Zoho Mail
 * Ejecutar con: node scripts/test-email.js
 */

const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

async function testEmailConfiguration() {
  console.log('🧪 Probando configuración de email de Zoho Mail...');
  
  // Verificar variables de entorno
  const requiredEnvVars = [
    'ZOHO_MAIL_CLIENT_ID',
    'ZOHO_MAIL_CLIENT_SECRET', 
    'ZOHO_MAIL_REFRESH_TOKEN',
    'ZOHO_MAIL_FROM'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Variables de entorno faltantes:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.log('\n📖 Consulta ZOHO_MAIL_SETUP.md para obtener estas variables.');
    process.exit(1);
  }
  
  // Verificar que el refresh token no sea el placeholder
  if (process.env.ZOHO_MAIL_REFRESH_TOKEN === 'your-zoho-mail-refresh-token') {
    console.error('❌ ZOHO_MAIL_REFRESH_TOKEN aún contiene el valor placeholder.');
    console.log('📖 Consulta ZOHO_MAIL_SETUP.md para obtener el token real.');
    process.exit(1);
  }
  
  console.log('✅ Variables de entorno configuradas correctamente');
  
  try {
    // Crear transporter
    const transporter = nodemailer.createTransporter({
      service: 'Zoho',
      auth: {
        type: 'OAuth2',
        user: process.env.ZOHO_MAIL_FROM,
        clientId: process.env.ZOHO_MAIL_CLIENT_ID,
        clientSecret: process.env.ZOHO_MAIL_CLIENT_SECRET,
        refreshToken: process.env.ZOHO_MAIL_REFRESH_TOKEN
      }
    });
    
    console.log('✅ Transporter creado exitosamente');
    
    // Verificar conexión
    console.log('🔍 Verificando conexión con Zoho Mail...');
    await transporter.verify();
    console.log('✅ Conexión verificada exitosamente');
    
    // Enviar email de prueba
    const testEmail = {
      from: process.env.ZOHO_MAIL_FROM,
      to: process.env.ZOHO_MAIL_FROM, // Enviar a nosotros mismos
      subject: '🧪 Prueba de configuración - TeeReserve',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10B981;">✅ Configuración de Email Exitosa</h2>
          <p>Este es un email de prueba para verificar que la configuración de Zoho Mail está funcionando correctamente.</p>
          <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Detalles de la configuración:</h3>
            <ul>
              <li><strong>Servicio:</strong> Zoho Mail</li>
              <li><strong>Método:</strong> OAuth2</li>
              <li><strong>Desde:</strong> ${process.env.ZOHO_MAIL_FROM}</li>
              <li><strong>Fecha:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          <p style="color: #6B7280;">Si recibes este email, la configuración está funcionando perfectamente.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
          <p style="font-size: 12px; color: #9CA3AF;">TeeReserve - Sistema de Reservas de Golf</p>
        </div>
      `
    };
    
    console.log('📧 Enviando email de prueba...');
    const result = await transporter.sendMail(testEmail);
    
    console.log('✅ Email enviado exitosamente!');
    console.log(`📬 Message ID: ${result.messageId}`);
    console.log(`📨 Enviado a: ${testEmail.to}`);
    
    console.log('\n🎉 ¡Configuración de email completada exitosamente!');
    console.log('💡 Ahora puedes usar las funciones de envío de email en la aplicación.');
    
  } catch (error) {
    console.error('❌ Error al probar la configuración de email:');
    console.error(error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n💡 Sugerencias para resolver el error de autenticación:');
      console.log('   1. Verifica que el ZOHO_MAIL_REFRESH_TOKEN sea correcto');
      console.log('   2. Asegúrate de que el CLIENT_ID y CLIENT_SECRET sean válidos');
      console.log('   3. Verifica que el email ZOHO_MAIL_FROM esté autorizado');
      console.log('   4. Consulta ZOHO_MAIL_SETUP.md para regenerar el token');
    }
    
    process.exit(1);
  }
}

// Ejecutar la prueba
testEmailConfiguration().catch(console.error);