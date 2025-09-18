/**
 * Script de prueba para verificar el funcionamiento del sistema de email con Resend
 */

require('dotenv').config({ path: '.env.local' });
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function testResendEmail() {
  console.log('🧪 Iniciando prueba del sistema de email con Resend...');
  console.log('📧 API Key configurada:', process.env.RESEND_API_KEY ? 'Sí' : 'No');
  console.log('📨 Email origen:', process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM);
  
  try {
    // Prueba 1: Email de bienvenida
    console.log('\n1️⃣ Probando email de bienvenida...');
    const welcomeResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'info@teereserve.golf',
      to: ['oscraramon@gmail.com'], // Email de prueba
      subject: '🧪 Prueba - Email de Bienvenida TeeReserve',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🧪 Prueba de Email</h1>
          </div>
          <div style="padding: 30px 20px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">¡Sistema de Email Funcionando!</h2>
            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
              Este es un email de prueba para verificar que el sistema de notificaciones de TeeReserve está funcionando correctamente.
            </p>
            <p style="color: #4b5563; line-height: 1.6;">
              ✅ Resend API configurado<br>
              ✅ Plantillas HTML funcionando<br>
              ✅ Sistema listo para producción
            </p>
          </div>
          <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; margin: 0; font-size: 14px;">
              © 2025 TeeReserve - Sistema de Prueba
            </p>
          </div>
        </div>
      `,
    });
    
    console.log('✅ Email de bienvenida enviado:', welcomeResult.data?.id);
    
    // Prueba 2: Email de confirmación de reserva
    console.log('\n2️⃣ Probando email de confirmación de reserva...');
    const bookingResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'info@teereserve.golf',
      to: ['oscraramon@gmail.com'],
      subject: '🧪 Prueba - Confirmación de Reserva',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🧪 Reserva de Prueba</h1>
          </div>
          <div style="padding: 30px 20px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Detalles de Reserva (Prueba)</h2>
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
              <p style="margin: 0 0 10px 0; color: #1f2937;"><strong>Campo:</strong> Campo de Golf de Prueba</p>
              <p style="margin: 0 0 10px 0; color: #1f2937;"><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
              <p style="margin: 0 0 10px 0; color: #1f2937;"><strong>Hora:</strong> 10:00</p>
              <p style="margin: 0 0 10px 0; color: #1f2937;"><strong>Jugadores:</strong> 2</p>
              <p style="margin: 0; color: #1f2937;"><strong>Precio Total:</strong> €50.00</p>
            </div>
            <p style="color: #4b5563; line-height: 1.6;">
              ✅ Sistema de confirmaciones funcionando correctamente
            </p>
          </div>
        </div>
      `,
    });
    
    console.log('✅ Email de confirmación enviado:', bookingResult.data?.id);
    
    // Prueba 3: Email de contacto
    console.log('\n3️⃣ Probando email de contacto...');
    const contactResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'info@teereserve.golf',
      to: [process.env.CONTACT_FORM_RECIPIENT || 'info@teereserve.golf'],
      subject: '🧪 Prueba - Mensaje de Contacto',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f59e0b; padding: 30px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🧪 Mensaje de Prueba</h1>
          </div>
          <div style="padding: 30px 20px; background: #f9fafb;">
            <div style="background: white; padding: 20px; border-radius: 8px;">
              <p style="margin: 0 0 10px 0; color: #1f2937;"><strong>Nombre:</strong> Oscar Ramon</p>
              <p style="margin: 0 0 10px 0; color: #1f2937;"><strong>Email:</strong> oscraramon@gmail.com</p>
              <p style="margin: 0 0 10px 0; color: #1f2937;"><strong>Asunto:</strong> Prueba del sistema</p>
              <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 15px;">
                <p style="margin: 0 0 10px 0; color: #1f2937; font-weight: bold;">Mensaje:</p>
                <p style="margin: 0; color: #4b5563; line-height: 1.6;">Este es un mensaje de prueba para verificar que el sistema de contacto funciona correctamente.</p>
              </div>
            </div>
          </div>
        </div>
      `,
    });
    
    console.log('✅ Email de contacto enviado:', contactResult.data?.id);
    
    console.log('\n🎉 ¡Todas las pruebas completadas exitosamente!');
    console.log('📊 Resumen:');
    console.log('   - Email de bienvenida: ✅');
    console.log('   - Confirmación de reserva: ✅');
    console.log('   - Formulario de contacto: ✅');
    console.log('\n🚀 El sistema de notificaciones está listo para producción!');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
    
    if (error.message?.includes('API key')) {
      console.log('\n💡 Sugerencias:');
      console.log('   1. Verifica que RESEND_API_KEY esté configurado correctamente');
      console.log('   2. Asegúrate de que la API key sea válida');
      console.log('   3. Verifica que el dominio esté verificado en Resend');
    }
    
    process.exit(1);
  }
}

// Ejecutar pruebas
testResendEmail();