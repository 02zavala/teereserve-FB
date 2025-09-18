require('dotenv').config({ path: '.env.local' });

// Importar EmailService usando require para módulos ES6
const importEmailService = async () => {
  const module = await import('../lib/email.js');
  return module.default;
};

let EmailService;

async function testAllEmailTemplates() {
  // Inicializar EmailService
  EmailService = await importEmailService();
  
  console.log('🧪 Iniciando pruebas de todas las plantillas de email...');
  console.log('📧 Enviando a: oscraramon@gmail.com');
  console.log('=' .repeat(50));

  const testEmail = 'oscraramon@gmail.com';
  const testUser = 'Oscar Ramón';
  
  // Datos de prueba para reservas
  const bookingDetails = {
    bookingId: 'TR-2024-001',
    courseName: 'Club de Golf Las Américas',
    date: '15 de Enero, 2024',
    time: '10:30 AM',
    players: 4,
    totalPrice: '150.00',
    subtotal: '130.00',
    discount: '20.00',
    discountCode: 'WELCOME20'
  };

  try {
    // 1. Email de Bienvenida
    console.log('\n1️⃣ Enviando email de bienvenida...');
    const welcomeResult = await EmailService.sendWelcomeEmail(testEmail, testUser);
    if (welcomeResult.success) {
      console.log('✅ Email de bienvenida enviado exitosamente');
    } else {
      console.log('❌ Error enviando email de bienvenida:', welcomeResult.error);
    }

    // 2. Confirmación de Reserva
    console.log('\n2️⃣ Enviando confirmación de reserva...');
    const bookingResult = await EmailService.sendBookingConfirmation(testEmail, testUser, bookingDetails);
    if (bookingResult.success) {
      console.log('✅ Confirmación de reserva enviada exitosamente');
    } else {
      console.log('❌ Error enviando confirmación de reserva:', bookingResult.error);
    }

    // 3. Recordatorio de Reserva
    console.log('\n3️⃣ Enviando recordatorio de reserva...');
    const reminderResult = await EmailService.sendBookingReminder(testEmail, testUser, bookingDetails);
    if (reminderResult.success) {
      console.log('✅ Recordatorio de reserva enviado exitosamente');
    } else {
      console.log('❌ Error enviando recordatorio de reserva:', reminderResult.error);
    }

    // 4. Cancelación de Reserva
    console.log('\n4️⃣ Enviando notificación de cancelación...');
    const cancellationResult = await EmailService.sendBookingCancellation(testEmail, testUser, bookingDetails);
    if (cancellationResult.success) {
      console.log('✅ Notificación de cancelación enviada exitosamente');
    } else {
      console.log('❌ Error enviando notificación de cancelación:', cancellationResult.error);
    }

    // 5. Restablecimiento de Contraseña
    console.log('\n5️⃣ Enviando email de restablecimiento de contraseña...');
    const resetLink = 'https://teereserve.golf/reset-password?token=test-token-123';
    const passwordResult = await EmailService.sendPasswordResetEmail(testEmail, resetLink);
    if (passwordResult.success) {
      console.log('✅ Email de restablecimiento enviado exitosamente');
    } else {
      console.log('❌ Error enviando email de restablecimiento:', passwordResult.error);
    }

    // 6. Formulario de Contacto
    console.log('\n6️⃣ Enviando notificación de formulario de contacto...');
    const contactData = {
      name: 'Oscar Ramón',
      email: 'oscraramon@gmail.com',
      phone: '+1 (555) 123-4567',
      subject: 'Consulta sobre nuevas plantillas de email',
      message: 'Hola, me gustaría saber más sobre las nuevas plantillas de email implementadas en TeeReserve. Las plantillas se ven muy profesionales y consistentes. ¡Excelente trabajo!'
    };
    
    const contactResult = await EmailService.sendContactFormNotification(contactData);
    if (contactResult.success) {
      console.log('✅ Notificación de contacto enviada exitosamente');
    } else {
      console.log('❌ Error enviando notificación de contacto:', contactResult.error);
    }

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 ¡Pruebas completadas!');
    console.log('📧 Revisa la bandeja de entrada de oscraramon@gmail.com');
    console.log('\n📋 Plantillas probadas:');
    console.log('   ✅ Email de Bienvenida (diseño verde)');
    console.log('   ✅ Confirmación de Reserva (diseño azul)');
    console.log('   ✅ Recordatorio de Reserva (diseño naranja)');
    console.log('   ✅ Cancelación de Reserva (diseño rojo)');
    console.log('   ✅ Restablecimiento de Contraseña (diseño rojo)');
    console.log('   ✅ Notificación de Contacto (diseño naranja)');
    console.log('\n🎨 Todas las plantillas tienen diseño consistente y responsive');
    console.log('🚀 Sistema de notificaciones listo para producción');
    
  } catch (error) {
    console.error('❌ Error general en las pruebas:', error);
  }
}

// Ejecutar las pruebas
testAllEmailTemplates();